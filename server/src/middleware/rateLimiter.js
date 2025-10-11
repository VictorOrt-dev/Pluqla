/**
 * 🛡️ ENHANCED RATE LIMITING MIDDLEWARE
 *
 * Production-grade rate limiting with Redis support, user-tier awareness,
 * and comprehensive error handling for the Pluqla backend.
 *
 * Features:
 * - Redis-backed distributed rate limiting with in-memory fallback
 * - User-tier aware (free vs premium limits)
 * - Per-IP, per-user, and per-endpoint limiting
 * - Clear 429 responses with retry-after information
 * - Integration with AI quota system
 * - Comprehensive logging and monitoring
 * - Emergency bypass for admins
 *
 * @module rateLimiter
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const logger = require('../utils/logger');

// ===== REDIS CONFIGURATION =====

let redisClient = null;
let redisStore = null;
let redisAvailable = false;

/**
 * Initialize Redis client for distributed rate limiting
 */
async function initializeRedis() {
  try {
    if (process.env.REDIS_URL) {
      logger.info('🔴 Initializing Redis for rate limiting...');

      redisClient = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis max retries reached, falling back to memory store');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      redisClient.on('error', (err) => {
        logger.warn('⚠️  Redis client error:', err.message);
        redisAvailable = false;
      });

      redisClient.on('connect', () => {
        logger.info('✅ Redis connected for rate limiting');
        redisAvailable = true;
      });

      redisClient.on('ready', () => {
        logger.info('✅ Redis ready for rate limiting');
        redisAvailable = true;
      });

      await redisClient.connect();

      // Test Redis connection
      await redisClient.ping();

      redisStore = new RedisStore({
        // @ts-expect-error - Known issue with types, but works correctly
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'pluqla:rl:', // Rate limit prefix
      });

      redisAvailable = true;
      logger.info('✅ Redis rate limiting enabled');

      return true;
    } else {
      logger.info('ℹ️  No REDIS_URL configured, using in-memory rate limiting');
      return false;
    }
  } catch (error) {
    logger.warn('⚠️  Redis initialization failed, using in-memory fallback:', error.message);
    redisAvailable = false;
    return false;
  }
}

// Initialize Redis on module load
initializeRedis().catch(err => {
  logger.warn('Redis initialization error:', err.message);
});

/**
 * Get the appropriate store for rate limiting
 * @returns {Object|undefined} RedisStore or undefined (for memory store)
 */
function getStore() {
  if (redisAvailable && redisStore) {
    return redisStore;
  }

  if (process.env.REDIS_URL && !redisAvailable) {
    logger.warn('⚠️  Redis configured but not available, using memory store');
  }

  return undefined; // express-rate-limit uses memory store by default
}

// ===== RATE LIMIT CONFIGURATIONS =====

/**
 * User tier configurations
 * Defines limits for free, premium, and enterprise users
 */
const USER_TIER_LIMITS = {
  free: {
    global: { requests: 100, window: 15 * 60 * 1000 }, // 100 per 15min
    auth: { requests: 10, window: 15 * 60 * 1000 }, // 10 per 15min
    ai: { requests: 50, window: 60 * 60 * 1000 }, // 50 per hour (matches quota)
    upload: { requests: 10, window: 60 * 60 * 1000 }, // 10 per hour
    standard: { requests: 200, window: 15 * 60 * 1000 }, // 200 per 15min
    analytics: { requests: 100, window: 5 * 60 * 1000 }, // 100 per 5min
  },
  premium: {
    global: { requests: 1000, window: 15 * 60 * 1000 }, // 1000 per 15min
    auth: { requests: 50, window: 15 * 60 * 1000 }, // 50 per 15min
    ai: { requests: 500, window: 60 * 60 * 1000 }, // 500 per hour (matches quota)
    upload: { requests: 100, window: 60 * 60 * 1000 }, // 100 per hour
    standard: { requests: 2000, window: 15 * 60 * 1000 }, // 2000 per 15min
    analytics: { requests: 1000, window: 5 * 60 * 1000 }, // 1000 per 5min
  },
  admin: {
    global: { requests: 10000, window: 15 * 60 * 1000 }, // 10000 per 15min
    auth: { requests: 1000, window: 15 * 60 * 1000 }, // 1000 per 15min
    ai: { requests: 5000, window: 60 * 60 * 1000 }, // 5000 per hour
    upload: { requests: 1000, window: 60 * 60 * 1000 }, // 1000 per hour
    standard: { requests: 10000, window: 15 * 60 * 1000 }, // 10000 per 15min
    analytics: { requests: 10000, window: 5 * 60 * 1000 }, // 10000 per 5min
  }
};

/**
 * Determine user tier from request
 * @param {Object} req - Express request object
 * @returns {string} User tier (free, premium, admin)
 */
function getUserTier(req) {
  if (!req.user) {
    return 'free'; // Unauthenticated users default to free tier
  }

  if (req.user.role === 'admin') {
    return 'admin';
  }

  if (req.user.isPremium) {
    return 'premium';
  }

  return 'free';
}

/**
 * Get rate limit configuration for user tier
 * @param {string} limitType - Type of limit (global, auth, ai, etc.)
 * @param {string} tier - User tier
 * @returns {Object} Rate limit configuration
 */
function getRateLimitConfig(limitType, tier) {
  return USER_TIER_LIMITS[tier]?.[limitType] || USER_TIER_LIMITS.free[limitType];
}

/**
 * Create a tier-aware rate limiter
 * @param {string} limitType - Type of limit (global, auth, ai, etc.)
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
function createTierAwareLimiter(limitType, options = {}) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return async (req, res, next) => {
    // Skip in development if configured
    if (isDevelopment && process.env.SKIP_RATE_LIMIT === 'true') {
      return next();
    }

    // Bypass for admins if configured
    if (options.bypassAdmin && req.user?.role === 'admin') {
      logger.debug('Rate limit bypassed for admin user', { userId: req.user.id });
      return next();
    }

    const tier = getUserTier(req);
    const config = getRateLimitConfig(limitType, tier);

    // Create dynamic rate limiter based on user tier
    const limiter = rateLimit({
      windowMs: config.window,
      max: isDevelopment ? config.requests * 10 : config.requests, // 10x in dev
      store: getStore(),
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers

      // Key generator: use user ID if authenticated, otherwise IP
      keyGenerator: (req) => {
        if (options.keyGenerator) {
          return options.keyGenerator(req);
        }
        return req.user?.id || req.ip || 'unknown';
      },

      // Skip requests that should not count towards limit
      skip: (req) => {
        // Skip successful requests for auth endpoints (configurable)
        if (options.skipSuccessful && req.statusCode < 400) {
          return true;
        }
        return false;
      },

      // Custom handler for rate limit exceeded
      handler: (req, res) => {
        const resetTime = new Date(Date.now() + config.window);
        const retryAfter = Math.ceil(config.window / 1000);
        const windowMinutes = config.window / 60000;

        logger.warn('🚫 Rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.id,
          tier,
          limitType,
          url: req.url,
          method: req.method,
          userAgent: req.get('User-Agent'),
          resetTime: resetTime.toISOString()
        });

        // Set standard rate limit headers
        res.setHeader('X-RateLimit-Limit', config.requests);
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', resetTime.getTime());
        res.setHeader('Retry-After', retryAfter);

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: tier === 'free'
            ? `You have exceeded the free tier limit of ${config.requests} requests per ${windowMinutes} minutes. Upgrade to premium for higher limits!`
            : `You have exceeded your ${tier} tier limit of ${config.requests} requests per ${windowMinutes} minutes.`,
          details: {
            limit: config.requests,
            windowMs: config.window,
            windowMinutes,
            tier,
            resetAt: resetTime.toISOString(),
            retryAfterSeconds: retryAfter,
            upgradeUrl: tier === 'free' ? '/premium' : null
          }
        });
      }
    });

    return limiter(req, res, next);
  };
}

// ===== EXPORTED LIMITERS =====

/**
 * Global rate limiter for all API endpoints
 */
const globalLimiter = createTierAwareLimiter('global', {
  bypassAdmin: false // Admins also subject to global limits
});

/**
 * Authentication rate limiter (strict, skip successful logins)
 */
const authLimiter = createTierAwareLimiter('auth', {
  skipSuccessful: true, // Don't count successful logins
  bypassAdmin: false // Security: even admins are limited
});

/**
 * AI endpoints rate limiter (coordinates with AI quota system)
 */
const aiLimiter = createTierAwareLimiter('ai', {
  bypassAdmin: true // Admins can bypass for testing
});

/**
 * Upload rate limiter
 */
const uploadLimiter = createTierAwareLimiter('upload', {
  bypassAdmin: true
});

/**
 * Standard operations rate limiter
 */
const standardLimiter = createTierAwareLimiter('standard', {
  bypassAdmin: true
});

/**
 * Analytics rate limiter (high volume expected)
 */
const analyticsLimiter = createTierAwareLimiter('analytics', {
  bypassAdmin: true
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Very strict
  store: getStore(),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  handler: (req, res) => {
    logger.warn('🚫 Strict rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      url: req.url
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests for this sensitive operation. Please try again in 15 minutes.',
      details: {
        limit: 20,
        window: 15 * 60 * 1000,
        retryAfter: '900 seconds'
      }
    });
  }
});

/**
 * Slow operations rate limiter (exports, reports)
 */
const slowLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    const tier = getUserTier(req);
    return tier === 'premium' ? 50 : tier === 'admin' ? 500 : 10;
  },
  store: getStore(),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
  handler: (req, res) => {
    const tier = getUserTier(req);
    const limit = tier === 'premium' ? 50 : tier === 'admin' ? 500 : 10;

    logger.warn('🚫 Slow operation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      tier,
      url: req.url
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: `You have exceeded your ${tier} tier limit of ${limit} slow operations per hour.`,
      details: {
        limit,
        window: 60 * 60 * 1000,
        tier,
        retryAfter: '3600 seconds'
      }
    });
  }
});

// ===== UTILITY FUNCTIONS =====

/**
 * Get rate limiter health status
 * @returns {Object} Health status
 */
async function getHealthStatus() {
  const health = {
    store: redisAvailable ? 'redis' : 'memory',
    redisAvailable,
    redisUrl: process.env.REDIS_URL ? '***configured***' : 'not configured',
    timestamp: new Date().toISOString(),
    limits: USER_TIER_LIMITS
  };

  if (redisAvailable && redisClient) {
    try {
      const start = Date.now();
      await redisClient.ping();
      const latency = Date.now() - start;
      health.redisPing = 'success';
      health.redisLatency = `${latency}ms`;
    } catch (error) {
      health.redisPing = 'failed';
      health.redisError = error.message;
    }
  }

  return health;
}

/**
 * Reset rate limit for a specific key (admin utility)
 * @param {string} key - Rate limit key to reset
 * @returns {Promise<boolean>} Success status
 */
async function resetRateLimit(key) {
  try {
    if (redisAvailable && redisClient) {
      const pattern = `pluqla:rl:${key}*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('Reset rate limits', { key, count: keys.length });
        return true;
      }
    }

    logger.info('Rate limit reset requested but no keys found or Redis not available', { key });
    return false;
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    return false;
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis client closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis client:', error);
    }
  }
}

// ===== EXPORTS =====

module.exports = {
  // Main limiters
  globalLimiter,
  authLimiter,
  aiLimiter,
  uploadLimiter,
  standardLimiter,
  analyticsLimiter,
  strictLimiter,
  slowLimiter,

  // Factory functions
  createTierAwareLimiter,
  getUserTier,
  getRateLimitConfig,

  // Utilities
  getHealthStatus,
  resetRateLimit,
  cleanup,

  // Redis access (for advanced use)
  redisClient,
  redisAvailable: () => redisAvailable,

  // For testing
  initializeRedis,
  USER_TIER_LIMITS
};
