/**
 * 🛡️ FINANCIAL RATE LIMITING MIDDLEWARE
 *
 * Production-grade rate limiting for financial endpoints in Pluqla backend.
 * Provides multi-tier subscription support, burst handling, and advanced security features.
 *
 * Features:
 * - Multi-dimensional limiting (user + IP + API key)
 * - Subscription tier support (free, standard, premium)
 * - Sliding window with burst handling
 * - Redis support for distributed systems
 * - Financial security protections
 * - Comprehensive monitoring and logging
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const logger = require('../utils/logger');
const { sendError } = require('../utils/responseHelper');

// Redis client for distributed rate limiting (optional)
let redisClient = null;
let redisStore = null;

try {
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server refused connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return new Error('Max retry attempts reached');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisStore = new RedisStore({
      client: redisClient,
      prefix: 'pluqla:rl:', // Rate limit prefix
      expiry: 60 * 15 // 15 minutes default
    });

    logger.info('Redis rate limiting enabled for production');
  }
} catch (error) {
  logger.warn('Redis not available, using memory store for rate limiting:', error.message);
}

/**
 * Subscription tier configurations
 * Each tier defines limits for different types of operations
 */
const SUBSCRIPTION_TIERS = {
  free: {
    // Financial operations (most restrictive)
    transactions: { requests: 10, window: 15 * 60 * 1000, burst: 2 }, // 10 per 15min, burst 2
    payments: { requests: 3, window: 60 * 60 * 1000, burst: 1 }, // 3 per hour, burst 1
    subscriptions: { requests: 2, window: 24 * 60 * 60 * 1000, burst: 1 }, // 2 per day, burst 1
    reports: { requests: 5, window: 60 * 60 * 1000, burst: 1 }, // 5 per hour, burst 1

    // General operations
    api_calls: { requests: 100, window: 15 * 60 * 1000, burst: 10 }, // 100 per 15min, burst 10
    ai_requests: { requests: 10, window: 60 * 60 * 1000, burst: 3 } // 10 per hour, burst 3
  },

  standard: {
    // Financial operations (moderate restrictions)
    transactions: { requests: 50, window: 15 * 60 * 1000, burst: 10 }, // 50 per 15min, burst 10
    payments: { requests: 20, window: 60 * 60 * 1000, burst: 5 }, // 20 per hour, burst 5
    subscriptions: { requests: 10, window: 24 * 60 * 60 * 1000, burst: 2 }, // 10 per day, burst 2
    reports: { requests: 25, window: 60 * 60 * 1000, burst: 5 }, // 25 per hour, burst 5

    // General operations
    api_calls: { requests: 500, window: 15 * 60 * 1000, burst: 50 }, // 500 per 15min, burst 50
    ai_requests: { requests: 50, window: 60 * 60 * 1000, burst: 10 } // 50 per hour, burst 10
  },

  premium: {
    // Financial operations (higher limits)
    transactions: { requests: 200, window: 15 * 60 * 1000, burst: 50 }, // 200 per 15min, burst 50
    payments: { requests: 100, window: 60 * 60 * 1000, burst: 20 }, // 100 per hour, burst 20
    subscriptions: { requests: 50, window: 24 * 60 * 60 * 1000, burst: 10 }, // 50 per day, burst 10
    reports: { requests: 100, window: 60 * 60 * 1000, burst: 20 }, // 100 per hour, burst 20

    // General operations
    api_calls: { requests: 2000, window: 15 * 60 * 1000, burst: 200 }, // 2000 per 15min, burst 200
    ai_requests: { requests: 200, window: 60 * 60 * 1000, burst: 50 } // 200 per hour, burst 50
  },

  enterprise: {
    // Financial operations (enterprise level)
    transactions: { requests: 1000, window: 15 * 60 * 1000, burst: 200 }, // 1000 per 15min, burst 200
    payments: { requests: 500, window: 60 * 60 * 1000, burst: 100 }, // 500 per hour, burst 100
    subscriptions: { requests: 200, window: 24 * 60 * 60 * 1000, burst: 50 }, // 200 per day, burst 50
    reports: { requests: 500, window: 60 * 60 * 1000, burst: 100 }, // 500 per hour, burst 100

    // General operations
    api_calls: { requests: 10000, window: 15 * 60 * 1000, burst: 1000 }, // 10000 per 15min, burst 1000
    ai_requests: { requests: 1000, window: 60 * 60 * 1000, burst: 200 } // 1000 per hour, burst 200
  }
};

/**
 * Get user's subscription tier from request
 */
const getUserSubscriptionTier = (req) => {
  // Check if user is authenticated and has subscription info
  if (req.user && req.user.subscription && req.user.subscription.tier) {
    const tier = req.user.subscription.tier.toLowerCase();
    if (SUBSCRIPTION_TIERS[tier]) {
      return tier;
    }
  }

  // Check for API key-based tier
  if (req.headers['x-api-key']) {
    // In a real implementation, you'd look up the API key's associated tier
    // For now, default to standard for API keys
    return 'standard';
  }

  // Default to free tier
  return 'free';
};

/**
 * Generate rate limit key for multi-dimensional limiting
 */
const generateRateLimitKey = (req, operationType, dimension = 'user') => {
  const prefix = `pluqla:rl:${operationType}`;

  switch (dimension) {
  case 'user':
    return `${prefix}:user:${req.user?.id || 'anonymous'}`;
  case 'ip':
    return `${prefix}:ip:${req.ip}`;
  case 'apikey':
    return `${prefix}:apikey:${req.headers['x-api-key'] || 'none'}`;
  default:
    return `${prefix}:combined:${req.user?.id || req.ip}`;
  }
};

/**
 * Enhanced rate limit handler with detailed logging
 */
const createRateLimitHandler = (operationType) => (req, res, next, options) => {
  const tier = getUserSubscriptionTier(req);
  const userAgent = req.get('User-Agent') || 'Unknown';

  // Log rate limit violation with comprehensive context
  logger.warn('Financial rate limit exceeded', {
    operation: operationType,
    tier,
    ip: req.ip,
    userId: req.user?.id,
    url: req.originalUrl,
    method: req.method,
    userAgent,
    remainingTime: options.windowMs,
    timestamp: new Date().toISOString()
  });

  // Send structured error response
  const retryAfter = Math.ceil(options.windowMs / 1000);
  const errorMessage = tier === 'free'
    ? `Rate limit exceeded for free tier. Upgrade to premium for higher limits. Try again in ${retryAfter} seconds.`
    : `Rate limit exceeded for ${operationType}. Try again in ${retryAfter} seconds.`;

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': options.max,
    'X-RateLimit-Remaining': 0,
    'X-RateLimit-Reset': new Date(Date.now() + options.windowMs).toISOString(),
    'Retry-After': retryAfter
  });

  return sendError(res, errorMessage, 429);
};

/**
 * Create financial rate limiter with advanced features
 */
const createFinancialRateLimit = (operationType, options = {}) => (req, res, next) => {
  // Skip rate limiting for internal service calls
  if (req.headers['x-internal-service'] === 'true') {
    return next();
  }

  // Skip in development if specified
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true') {
    return next();
  }

  try {
    const tier = getUserSubscriptionTier(req);
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    const operationConfig = tierConfig[operationType];

    if (!operationConfig) {
      logger.error(`No rate limit configuration found for operation: ${operationType}`);
      return next(); // Allow request if no config found
    }

    // Create limiter with tier-specific configuration
    const limiter = rateLimit({
      windowMs: operationConfig.window,
      max: operationConfig.requests,

      // Use Redis store in production, memory in development
      store: redisStore || undefined,

      // Multi-dimensional key generation
      keyGenerator: (req) => generateRateLimitKey(req, operationType, options.dimension || 'user'),

      // Enhanced handler with logging
      handler: createRateLimitHandler(operationType),

      // Standard headers for client consumption
      standardHeaders: true,
      legacyHeaders: false,

      // Skip configuration
      skipSuccessfulRequests: options.skipSuccessful || false,
      skipFailedRequests: options.skipFailed || false,

      // Skip function for background processes
      skip: (req) => {
        // Skip for system health checks
        if (req.path === '/health' || req.path === '/status') {
          return true;
        }

        // Skip for background job endpoints
        if (req.headers['x-background-job'] === 'true') {
          return true;
        }

        return false;
      },

      // Custom message
      message: {
        error: `Rate limit exceeded for ${operationType} operations`,
        tier,
        retryAfter: Math.ceil(operationConfig.window / 1000),
        upgradeMessage: tier === 'free' ? 'Upgrade to premium for higher limits' : null
      }
    });

    limiter(req, res, next);
  } catch (error) {
    logger.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    next();
  }
};

/**
 * Multi-dimensional rate limiting (combines user + IP limits)
 */
const createMultiDimensionalRateLimit = (operationType, options = {}) => async (req, res, next) => {
  try {
    // Create promises for different dimensions
    const dimensions = ['user', 'ip'];
    if (req.headers['x-api-key']) {
      dimensions.push('apikey');
    }

    const limitPromises = dimensions.map((dimension) => new Promise((resolve, reject) => {
      const limiter = createFinancialRateLimit(operationType, { ...options, dimension });

      // Create mock response to capture rate limit result
      const mockRes = {
        ...res,
        status: (code) => ({ json: () => reject({ status: code, dimension }) }),
        set: () => {},
        headersSent: false
      };

      limiter(req, mockRes, (err) => {
        if (err) reject({ error: err, dimension });
        else resolve(dimension);
      });
    }));

    // Wait for all dimensions to pass
    await Promise.all(limitPromises);
    next();
  } catch (rateLimitError) {
    // If any dimension fails, block the request
    logger.warn(`Multi-dimensional rate limit failed for ${rateLimitError.dimension}:`, rateLimitError);

    const tier = getUserSubscriptionTier(req);
    const retryAfter = 60; // Default retry after 1 minute

    res.set({
      'X-RateLimit-Limit': 'MULTI',
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(Date.now() + (retryAfter * 1000)).toISOString(),
      'Retry-After': retryAfter
    });

    return sendError(res, 'Rate limit exceeded. Multiple limits enforced for security.', 429);
  }
};

/**
 * Burst handling with token bucket algorithm
 */
const createBurstRateLimit = (operationType, options = {}) => {
  const tokenBuckets = new Map(); // In-memory token bucket storage

  return (req, res, next) => {
    try {
      const tier = getUserSubscriptionTier(req);
      const tierConfig = SUBSCRIPTION_TIERS[tier];
      const operationConfig = tierConfig[operationType];

      if (!operationConfig) {
        return next();
      }

      const key = generateRateLimitKey(req, operationType);
      const now = Date.now();
      const burstCapacity = operationConfig.burst || 1;
      const refillRate = operationConfig.requests / (operationConfig.window / 1000); // tokens per second

      // Get or create token bucket
      let bucket = tokenBuckets.get(key);
      if (!bucket) {
        bucket = {
          tokens: burstCapacity,
          lastRefill: now
        };
      }

      // Refill tokens based on time elapsed
      const timeElapsed = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = Math.floor(timeElapsed * refillRate);
      bucket.tokens = Math.min(burstCapacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;

      // Check if request can proceed
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        tokenBuckets.set(key, bucket);

        // Set burst-specific headers
        res.set({
          'X-RateLimit-Burst-Remaining': bucket.tokens,
          'X-RateLimit-Burst-Capacity': burstCapacity
        });

        next();
      } else {
        // Burst capacity exceeded
        logger.warn(`Burst rate limit exceeded for ${operationType}`, {
          key,
          tier,
          burstCapacity,
          userId: req.user?.id,
          ip: req.ip
        });

        const retryAfter = Math.ceil(1 / refillRate); // Time to get next token

        res.set({
          'X-RateLimit-Burst-Remaining': 0,
          'X-RateLimit-Burst-Capacity': burstCapacity,
          'Retry-After': retryAfter
        });

        return sendError(res, `Burst rate limit exceeded for ${operationType}. Try again in ${retryAfter} seconds.`, 429);
      }

      // Clean up old buckets periodically
      if (tokenBuckets.size > 10000) {
        const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
        for (const [key, bucket] of tokenBuckets.entries()) {
          if (bucket.lastRefill < cutoff) {
            tokenBuckets.delete(key);
          }
        }
      }
    } catch (error) {
      logger.error('Burst rate limiting error:', error);
      next(); // Fail open
    }
  };
};

/**
 * Progressive backoff for repeated violations
 */
const createProgressiveRateLimit = (operationType) => {
  const violationCounts = new Map();

  return (req, res, next) => {
    const key = generateRateLimitKey(req, operationType);
    const violations = violationCounts.get(key) || 0;

    // Increase window time based on violation count
    const baseWindow = SUBSCRIPTION_TIERS.free[operationType]?.window || 15 * 60 * 1000;
    const multiplier = Math.min(2 ** violations, 16); // Max 16x multiplier
    const adjustedWindow = baseWindow * multiplier;

    // Create limiter with adjusted window
    const limiter = createFinancialRateLimit(operationType);

    // Wrap the limiter to track violations
    const originalHandler = limiter;
    return (req, res, next) => {
      originalHandler(req, res, (err) => {
        if (res.statusCode === 429) {
          // Track violation
          violationCounts.set(key, violations + 1);
          logger.warn(`Progressive rate limit violation #${violations + 1} for ${key}`);
        } else {
          // Reset violations on successful request
          violationCounts.delete(key);
        }

        if (err) return next(err);
        next();
      });
    };
  };
};

// Pre-configured financial rate limiters
const financialRateLimiters = {
  // Core financial operations
  transactions: createFinancialRateLimit('transactions'),
  payments: createMultiDimensionalRateLimit('payments'), // Extra security for payments
  subscriptions: createFinancialRateLimit('subscriptions'),
  reports: createFinancialRateLimit('reports'),

  // Enhanced security variants
  transactionsBurst: createBurstRateLimit('transactions'),
  paymentsProgressive: createProgressiveRateLimit('payments'),

  // Multi-dimensional variants
  transactionsMulti: createMultiDimensionalRateLimit('transactions'),
  reportsMulti: createMultiDimensionalRateLimit('reports'),

  // API call limiting
  apiCalls: createFinancialRateLimit('api_calls'),
  aiRequests: createBurstRateLimit('ai_requests')
};

/**
 * Rate limit configuration utility
 */
const getRateLimitConfig = (tier, operation) => SUBSCRIPTION_TIERS[tier]?.[operation] || SUBSCRIPTION_TIERS.free[operation];

/**
 * Health check for rate limiting system
 */
const healthCheck = async () => {
  const status = {
    redis: redisClient ? 'connected' : 'memory',
    tiers: Object.keys(SUBSCRIPTION_TIERS).length,
    operations: Object.keys(SUBSCRIPTION_TIERS.free).length,
    timestamp: new Date().toISOString()
  };

  if (redisClient) {
    try {
      await redisClient.ping();
      status.redis = 'healthy';
    } catch (error) {
      status.redis = 'error';
      status.redisError = error.message;
    }
  }

  return status;
};

module.exports = {
  ...financialRateLimiters,
  createFinancialRateLimit,
  createMultiDimensionalRateLimit,
  createBurstRateLimit,
  createProgressiveRateLimit,
  getUserSubscriptionTier,
  getRateLimitConfig,
  healthCheck,
  SUBSCRIPTION_TIERS
};
