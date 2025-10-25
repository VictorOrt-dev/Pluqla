/**
 * Cache Service for Recipes API
 *
 * Implements Redis caching with node-cache fallback for resilience
 */

const NodeCache = require('node-cache');
const logger = require('../../utils/logger');

// Try to import Redis client (optional dependency)
let redisClient = null;
try {
  const { createClient } = require('redis');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis unavailable');
        }
        return Math.min(retries * 50, 500);
      }
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected successfully');
  });

  redisClient.connect().catch((err) => {
    logger.warn('Redis connection failed, falling back to node-cache', {
      error: err.message
    });
    redisClient = null;
  });

} catch (error) {
  logger.warn('Redis not available, using node-cache only', {
    error: error.message
  });
}

// Node-cache fallback (always available)
const nodeCache = new NodeCache({
  stdTTL: 86400, // 24h default
  checkperiod: 600, // Cleanup every 10 min
  useClones: false
});

class CacheService {
  constructor() {
    this.redis = redisClient;
    this.fallback = nodeCache;
    this.stats = {
      hits: 0,
      misses: 0,
      redisHits: 0,
      fallbackHits: 0,
      errors: 0
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<string|null>} - Cached value or null
   */
  async get(key) {
    try {
      // Try Redis first
      if (this.redis && this.redis.isOpen) {
        const value = await this.redis.get(key);
        if (value) {
          this.stats.hits++;
          this.stats.redisHits++;
          return value;
        }
      }

      // Fallback to node-cache
      const value = this.fallback.get(key);
      if (value) {
        this.stats.hits++;
        this.stats.fallbackHits++;
        return value;
      }

      this.stats.misses++;
      return null;

    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      this.stats.errors++;

      // Try fallback on Redis error
      const value = this.fallback.get(key);
      if (value) {
        this.stats.fallbackHits++;
        return value;
      }

      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {string} value - Value to cache (must be string)
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 86400) {
    try {
      // Set in both caches for redundancy
      const promises = [];

      // Redis
      if (this.redis && this.redis.isOpen) {
        promises.push(
          this.redis.setEx(key, ttl, value)
            .catch(err => {
              logger.warn('Redis set failed', { key, error: err.message });
            })
        );
      }

      // Node-cache fallback
      this.fallback.set(key, value, ttl);

      await Promise.allSettled(promises);
      return true;

    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      this.stats.errors++;

      // At least try to set in node-cache
      try {
        this.fallback.set(key, value, ttl);
        return true;
      } catch (fallbackError) {
        logger.error('Fallback cache set also failed', {
          key,
          error: fallbackError.message
        });
        return false;
      }
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      const promises = [];

      if (this.redis && this.redis.isOpen) {
        promises.push(this.redis.del(key));
      }

      this.fallback.del(key);

      await Promise.allSettled(promises);
      return true;

    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} - Success status
   */
  async clear() {
    try {
      const promises = [];

      if (this.redis && this.redis.isOpen) {
        promises.push(this.redis.flushDb());
      }

      this.fallback.flushAll();

      await Promise.allSettled(promises);
      logger.info('Cache cleared successfully');
      return true;

    } catch (error) {
      logger.error('Cache clear error', { error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      totalRequests,
      hitRate: `${hitRate}%`,
      redisAvailable: this.redis && this.redis.isOpen,
      fallbackKeys: this.fallback.keys().length
    };
  }

  /**
   * Check if cache is healthy
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const testKey = '__health_check__';
      const testValue = Date.now().toString();

      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.del(testKey);

      return retrieved === testValue;

    } catch (error) {
      logger.error('Cache health check failed', { error: error.message });
      return false;
    }
  }
}

// Singleton instance
let cacheInstance = null;

/**
 * Get or create CacheService instance
 */
function getCacheService() {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

module.exports = {
  getCacheService,
  CacheService
};
