/**
 * Redis Client Singleton
 *
 * Shared Redis connection for caching and queue operations
 * Uses ioredis for robust Redis connectivity
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Create and configure Redis client
 * @returns {Redis} Redis client instance
 */
function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    lazyConnect: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    }
  };

  redisClient = new Redis(config);

  // Event handlers
  redisClient.on('connect', () => {
    logger.info('Redis client connected', {
      host: config.host,
      port: config.port,
      db: config.db
    });
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error', {
      error: err.message,
      stack: err.stack
    });
  });

  redisClient.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Redis client reconnecting');
  });

  // Connect
  redisClient.connect().catch(err => {
    logger.error('Failed to connect to Redis', {
      error: err.message
    });
  });

  return redisClient;
}

/**
 * Get or create Redis client
 * @returns {Redis} Redis client instance
 */
function getRedisClient() {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis client disconnected');
  }
}

// Export singleton instance
module.exports = getRedisClient();

// Export management functions
module.exports.getRedisClient = getRedisClient;
module.exports.closeRedisClient = closeRedisClient;
