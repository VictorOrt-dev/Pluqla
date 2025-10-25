/**
 * Redis Configuration
 *
 * Configuration centralisée pour les connexions Redis
 * Utilisé par Bull queues, rate limiting, session store, cache
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

// Configuration selon environnement
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  lazyConnect: false
};

// Configuration Bull (sans enableReadyCheck et maxRetriesPerRequest pour subscribers)
// https://github.com/OptimalBits/bull/issues/1873
const bullRedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null, // IMPORTANT: null pour Bull
  enableReadyCheck: false,    // IMPORTANT: false pour Bull
  enableOfflineQueue: true,
  connectTimeout: 10000
};

// Client Redis principal (singleton)
let redisClient = null;

/**
 * Get or create Redis client
 * @returns {Redis} Redis client instance
 */
function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
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
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing Redis connection...');
      await redisClient.quit();
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, closing Redis connection...');
      await redisClient.quit();
    });
  }

  return redisClient;
}

/**
 * Test Redis connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const client = getRedisClient();
    const pong = await client.ping();

    if (pong === 'PONG') {
      logger.info('Redis connection test successful');
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Redis connection test failed', {
      error: error.message
    });
    return false;
  }
}

/**
 * Get Redis info
 * @returns {Promise<Object>} Redis server info
 */
async function getInfo() {
  try {
    const client = getRedisClient();
    const info = await client.info();

    return {
      connected: client.status === 'ready',
      version: info.match(/redis_version:([^\r\n]+)/)?.[1],
      uptime: info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1],
      usedMemory: info.match(/used_memory_human:([^\r\n]+)/)?.[1],
      connectedClients: info.match(/connected_clients:([^\r\n]+)/)?.[1]
    };
  } catch (error) {
    logger.error('Failed to get Redis info', { error: error.message });
    return null;
  }
}

/**
 * Clear all keys matching pattern (use with caution)
 * @param {string} pattern - Pattern to match (e.g., "cache:*")
 * @returns {Promise<number>} Number of keys deleted
 */
async function clearPattern(pattern) {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
      logger.info('No keys found matching pattern', { pattern });
      return 0;
    }

    const result = await client.del(...keys);
    logger.info('Keys cleared', { pattern, count: result });

    return result;
  } catch (error) {
    logger.error('Failed to clear keys', {
      pattern,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  redisConfig,
  bullRedisConfig,
  getRedisClient,
  testConnection,
  getInfo,
  clearPattern
};
