/**
 * Frontend API Response Caching Service
 *
 * Provides intelligent caching for API responses with:
 * - TTL (Time To Live) based expiration
 * - Memory-based storage with LRU eviction
 * - Cache invalidation strategies
 * - Cache hit/miss metrics
 * - Background refresh for stale data
 */

import { frontendPerformanceMonitor } from '../utils/performanceMonitor';

class CacheService {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Maximum number of cached entries
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      refreshes: 0
    };

    // Cache configuration for different endpoints
    this.cacheConfig = {
      // Financial data - cache for 2 minutes
      '/financial/summary': { ttl: 2 * 60 * 1000, backgroundRefresh: true },
      '/financial/dashboard': { ttl: 2 * 60 * 1000, backgroundRefresh: true },
      '/transactions/stats': { ttl: 2 * 60 * 1000, backgroundRefresh: true },

      // User profile - cache for 10 minutes
      '/users/profile': { ttl: 10 * 60 * 1000, backgroundRefresh: false },
      '/users/me': { ttl: 10 * 60 * 1000, backgroundRefresh: false },

      // AI suggestions - cache for 5 minutes
      '/ai/suggestions': { ttl: 5 * 60 * 1000, backgroundRefresh: true },

      // Categories and static data - cache for 30 minutes
      '/categories': { ttl: 30 * 60 * 1000, backgroundRefresh: false },
      '/categories/list': { ttl: 30 * 60 * 1000, backgroundRefresh: false },

      // Analytics - cache for 1 minute
      '/analytics/overview': { ttl: 1 * 60 * 1000, backgroundRefresh: true },

      // Strikes - cache for 30 seconds (real-time feel)
      '/strikes/current': { ttl: 30 * 1000, backgroundRefresh: true },
      '/strikes/stats': { ttl: 2 * 60 * 1000, backgroundRefresh: true }
    };
  }

  /**
   * Generate cache key from endpoint and parameters
   */
  generateKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    return paramString ? `${endpoint}?${paramString}` : endpoint;
  }

  /**
   * Get cache configuration for endpoint
   */
  getCacheConfig(endpoint) {
    // Find matching config by checking if endpoint starts with any configured path
    for (const [configPath, config] of Object.entries(this.cacheConfig)) {
      if (endpoint.startsWith(configPath)) {
        return config;
      }
    }

    // Default configuration
    return { ttl: this.defaultTTL, backgroundRefresh: false };
  }

  /**
   * Check if cached entry is valid
   */
  isValid(entry) {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Check if cached entry is stale (expired but can be served while refreshing)
   */
  isStale(entry) {
    const stalePeriod = 30 * 1000; // 30 seconds grace period
    return Date.now() < (entry.expiresAt + stalePeriod);
  }

  /**
   * Evict least recently used entries to make space
   */
  evictLRU() {
    if (this.cache.size >= this.maxSize) {
      // Find oldest entry by access time
      let oldestKey = null;
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.metrics.evictions++;
        console.debug(`Cache evicted LRU entry: ${oldestKey}`);
      }
    }
  }

  /**
   * Get cached response
   */
  get(endpoint, params = {}) {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Update access time
    entry.lastAccessed = Date.now();

    if (this.isValid(entry)) {
      this.metrics.hits++;
      console.debug(`Cache HIT: ${key}`, {
        age: Date.now() - entry.cachedAt,
        expiresIn: entry.expiresAt - Date.now()
      });
      return entry.data;
    }

    // Entry is expired - check if we can serve stale data
    if (this.isStale(entry)) {
      const config = this.getCacheConfig(endpoint);
      if (config.backgroundRefresh) {
        this.metrics.hits++;
        console.debug(`Cache STALE HIT: ${key} (serving stale data, will refresh in background)`);
        return { ...entry.data, _isStale: true };
      }
    }

    // Entry is too old, remove it
    this.cache.delete(key);
    this.metrics.misses++;
    return null;
  }

  /**
   * Store response in cache
   */
  set(endpoint, params = {}, data, customTTL = null) {
    const key = this.generateKey(endpoint, params);
    const config = this.getCacheConfig(endpoint);
    const ttl = customTTL || config.ttl;

    // Evict old entries if needed
    this.evictLRU();

    const entry = {
      data: { ...data }, // Clone to prevent mutations
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
      endpoint,
      params,
      ttl
    };

    this.cache.set(key, entry);

    console.debug(`Cache SET: ${key}`, {
      ttl,
      expiresIn: ttl
    });
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern) {
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(pattern) || entry.endpoint.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    console.debug(`Cache invalidated ${deletedCount} entries matching: ${pattern}`);
    return deletedCount;
  }

  /**
   * Clear specific endpoint cache
   */
  clearEndpoint(endpoint) {
    return this.invalidate(endpoint);
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.metrics = { hits: 0, misses: 0, evictions: 0, refreshes: 0 };
    console.debug(`Cache cleared ${size} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests * 100).toFixed(1) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      ...this.metrics,
      totalRequests,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of cache
   */
  getMemoryUsage() {
    let estimatedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key size + JSON size of data
      estimatedSize += key.length * 2; // UTF-16 characters
      estimatedSize += JSON.stringify(entry.data).length * 2;
      estimatedSize += 100; // Metadata overhead
    }

    return {
      bytes: estimatedSize,
      kb: (estimatedSize / 1024).toFixed(1),
      mb: (estimatedSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Get cache entries summary
   */
  getEntriesSummary() {
    const entries = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        endpoint: entry.endpoint,
        age: Date.now() - entry.cachedAt,
        expiresIn: Math.max(0, entry.expiresAt - Date.now()),
        isValid: this.isValid(entry),
        isStale: this.isStale(entry),
        lastAccessed: entry.lastAccessed,
        dataSize: JSON.stringify(entry.data).length
      });
    }

    return entries.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  /**
   * Background cleanup of expired entries
   */
  cleanup() {
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry) && !this.isStale(entry)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.debug(`Cache cleanup removed ${deletedCount} expired entries`);
    }

    return deletedCount;
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    // Cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Preload frequently accessed endpoints
   */
  async preload(endpoints, apiFetch) {
    const preloadPromises = endpoints.map(async ({ endpoint, params = {} }) => {
      try {
        const response = await apiFetch(endpoint, params);
        this.set(endpoint, params, response);
        console.debug(`Cache preloaded: ${endpoint}`);
      } catch (error) {
        console.warn(`Cache preload failed for ${endpoint}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Auto-start cleanup
cacheService.startCleanup();

// Make cache service available globally for debugging
if (typeof window !== 'undefined') {
  window.cacheService = cacheService;
}

export default cacheService;