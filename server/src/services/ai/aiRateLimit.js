/**
 * AI Rate Limiting Service
 *
 * Implements sophisticated rate limiting for AI requests to prevent abuse,
 * control costs, and ensure fair usage across users.
 */

const Redis = require('redis');
const logger = require('../../utils/logger');

class AIRateLimit {
  constructor() {
    this.isRedisAvailable = false;
    this.memoryCache = new Map();
    this.config = {
      // Rate limits per user per time window
      limits: {
        free: {
          requests: 10,
          window: 3600000, // 1 hour in milliseconds
          tokens: 50000
        },
        premium: {
          requests: 100,
          window: 3600000, // 1 hour in milliseconds
          tokens: 500000
        },
        enterprise: {
          requests: 1000,
          window: 3600000, // 1 hour in milliseconds
          tokens: 5000000
        }
      },
      // Global limits
      global: {
        requests: 10000,
        window: 3600000, // 1 hour
        tokens: 50000000
      },
      // Cost control
      maxCostPerRequest: parseFloat(process.env.AI_MAX_COST_PER_REQUEST) || 1.0,
      maxDailyCostPerUser: parseFloat(process.env.AI_MAX_DAILY_COST_PER_USER) || 50.0,
      maxMonthlyCost: parseFloat(process.env.AI_MAX_MONTHLY_COST) || 5000.0
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection for distributed rate limiting
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = Redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 5000,
            lazyConnect: true
          }
        });

        this.redis.on('error', (err) => {
          logger.warn('Redis connection error for AI rate limiting', {
            error: err.message
          });
          this.isRedisAvailable = false;
        });

        this.redis.on('connect', () => {
          logger.info('Redis connected for AI rate limiting');
          this.isRedisAvailable = true;
        });

        await this.redis.connect();
      } else {
        logger.info('Redis not configured, using memory-based rate limiting');
      }
    } catch (error) {
      logger.warn('Failed to initialize Redis for AI rate limiting', {
        error: error.message
      });
      this.isRedisAvailable = false;
    }
  }

  /**
   * Check if request is within rate limits
   */
  async checkLimit(userId, requestType = 'general', estimatedTokens = 1000) {
    try {
      const userTier = await this.getUserTier(userId);
      const now = Date.now();

      // Check multiple rate limit dimensions
      const checks = await Promise.all([
        this.checkRequestLimit(userId, userTier, now),
        this.checkTokenLimit(userId, userTier, estimatedTokens, now),
        this.checkGlobalLimit(now),
        this.checkCostLimit(userId, requestType, estimatedTokens)
      ]);

      const failedChecks = checks.filter(check => !check.allowed);

      if (failedChecks.length > 0) {
        const errors = failedChecks.map(check => check.reason);

        logger.warn('AI request rate limited', {
          userId,
          userTier,
          requestType,
          estimatedTokens,
          errors
        });

        throw new Error(`Rate limit exceeded: ${errors.join(', ')}`);
      }

      // Record successful request
      await this.recordRequest(userId, userTier, estimatedTokens, now);

      logger.debug('AI rate limit check passed', {
        userId,
        userTier,
        requestType,
        estimatedTokens
      });

      return {
        allowed: true,
        remaining: await this.getRemainingLimits(userId, userTier)
      };

    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) {
        throw error;
      }

      logger.error('Rate limit check failed', {
        userId,
        error: error.message
      });

      // Fail open for availability, but log the issue
      return { allowed: true, error: 'Rate limit check failed' };
    }
  }

  /**
   * Check request count limits
   */
  async checkRequestLimit(userId, userTier, now) {
    const limits = this.config.limits[userTier];
    const windowStart = now - limits.window;

    const requestCount = await this.getRequestCount(userId, 'requests', windowStart, now);

    return {
      allowed: requestCount < limits.requests,
      reason: requestCount >= limits.requests ?
        `Request limit exceeded (${requestCount}/${limits.requests} per hour)` : null,
      current: requestCount,
      limit: limits.requests
    };
  }

  /**
   * Check token usage limits
   */
  async checkTokenLimit(userId, userTier, estimatedTokens, now) {
    const limits = this.config.limits[userTier];
    const windowStart = now - limits.window;

    const tokenUsage = await this.getTokenUsage(userId, windowStart, now);
    const projectedUsage = tokenUsage + estimatedTokens;

    return {
      allowed: projectedUsage <= limits.tokens,
      reason: projectedUsage > limits.tokens ?
        `Token limit exceeded (${projectedUsage}/${limits.tokens} per hour)` : null,
      current: tokenUsage,
      limit: limits.tokens,
      estimated: estimatedTokens
    };
  }

  /**
   * Check global system limits
   */
  async checkGlobalLimit(now) {
    const windowStart = now - this.config.global.window;

    const globalRequests = await this.getRequestCount('GLOBAL', 'requests', windowStart, now);
    const globalTokens = await this.getTokenUsage('GLOBAL', windowStart, now);

    const requestsAllowed = globalRequests < this.config.global.requests;
    const tokensAllowed = globalTokens < this.config.global.tokens;

    if (!requestsAllowed) {
      return {
        allowed: false,
        reason: `Global request limit exceeded (${globalRequests}/${this.config.global.requests})`
      };
    }

    if (!tokensAllowed) {
      return {
        allowed: false,
        reason: `Global token limit exceeded (${globalTokens}/${this.config.global.tokens})`
      };
    }

    return { allowed: true };
  }

  /**
   * Check cost-based limits
   */
  async checkCostLimit(userId, requestType, estimatedTokens) {
    const estimatedCost = this.estimateRequestCost(requestType, estimatedTokens);

    // Check per-request cost limit
    if (estimatedCost > this.config.maxCostPerRequest) {
      return {
        allowed: false,
        reason: `Request cost too high ($${estimatedCost.toFixed(4)} > $${this.config.maxCostPerRequest})`
      };
    }

    // Check daily user cost limit
    const today = new Date().toISOString().split('T')[0];
    const dailyCost = await this.getDailyCost(userId, today);

    if (dailyCost + estimatedCost > this.config.maxDailyCostPerUser) {
      return {
        allowed: false,
        reason: `Daily cost limit exceeded ($${(dailyCost + estimatedCost).toFixed(4)} > $${this.config.maxDailyCostPerUser})`
      };
    }

    // Check monthly global cost limit
    const monthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyCost = await this.getMonthlyCost(monthKey);

    if (monthlyCost + estimatedCost > this.config.maxMonthlyCost) {
      return {
        allowed: false,
        reason: `Monthly cost limit exceeded ($${(monthlyCost + estimatedCost).toFixed(4)} > $${this.config.maxMonthlyCost})`
      };
    }

    return { allowed: true, estimatedCost };
  }

  /**
   * Record successful request for tracking
   */
  async recordRequest(userId, userTier, tokens, timestamp) {
    const promises = [];

    // Record request count
    promises.push(this.incrementCounter(`requests:${userId}`, timestamp));
    promises.push(this.incrementCounter('requests:GLOBAL', timestamp));

    // Record token usage
    promises.push(this.addTokenUsage(`tokens:${userId}`, tokens, timestamp));
    promises.push(this.addTokenUsage('tokens:GLOBAL', tokens, timestamp));

    // Record cost
    const cost = this.estimateRequestCost('general', tokens);
    const today = new Date(timestamp).toISOString().split('T')[0];
    const monthKey = new Date(timestamp).toISOString().substring(0, 7);

    promises.push(this.addCost(`cost:daily:${userId}:${today}`, cost));
    promises.push(this.addCost(`cost:monthly:${monthKey}`, cost));

    await Promise.all(promises);
  }

  /**
   * Get user tier for rate limiting
   */
  async getUserTier(userId) {
    if (!userId || userId === 'anonymous') {
      return 'free';
    }

    try {
      // This would typically check user subscription from database
      // For now, return based on environment or default to free
      const userTier = process.env.DEFAULT_USER_TIER || 'free';
      return ['free', 'premium', 'enterprise'].includes(userTier) ? userTier : 'free';
    } catch (error) {
      logger.warn('Failed to get user tier, defaulting to free', {
        userId,
        error: error.message
      });
      return 'free';
    }
  }

  /**
   * Get request count from storage
   */
  async getRequestCount(userId, type, windowStart, windowEnd) {
    const key = `${type}:${userId}`;

    if (this.isRedisAvailable) {
      try {
        const results = await this.redis.zcount(key, windowStart, windowEnd);
        return parseInt(results) || 0;
      } catch (error) {
        logger.warn('Redis error getting request count', { error: error.message });
      }
    }

    // Fallback to memory cache
    return this.getMemoryCount(key, windowStart, windowEnd);
  }

  /**
   * Get token usage from storage
   */
  async getTokenUsage(userId, windowStart, windowEnd) {
    const key = `tokens:${userId}`;

    if (this.isRedisAvailable) {
      try {
        const results = await this.redis.zrangebyscore(key, windowStart, windowEnd);
        return results.reduce((total, item) => total + parseInt(item), 0);
      } catch (error) {
        logger.warn('Redis error getting token usage', { error: error.message });
      }
    }

    // Fallback to memory cache
    return this.getMemoryTokens(key, windowStart, windowEnd);
  }

  /**
   * Increment request counter
   */
  async incrementCounter(key, timestamp) {
    if (this.isRedisAvailable) {
      try {
        await this.redis.zadd(key, timestamp, timestamp);
        await this.redis.expire(key, Math.ceil(this.config.limits.premium.window / 1000));
        return;
      } catch (error) {
        logger.warn('Redis error incrementing counter', { error: error.message });
      }
    }

    // Fallback to memory cache
    this.incrementMemoryCounter(key, timestamp);
  }

  /**
   * Add token usage
   */
  async addTokenUsage(key, tokens, timestamp) {
    if (this.isRedisAvailable) {
      try {
        await this.redis.zadd(key, timestamp, tokens);
        await this.redis.expire(key, Math.ceil(this.config.limits.premium.window / 1000));
        return;
      } catch (error) {
        logger.warn('Redis error adding token usage', { error: error.message });
      }
    }

    // Fallback to memory cache
    this.addMemoryTokens(key, tokens, timestamp);
  }

  /**
   * Memory cache fallback methods
   */
  getMemoryCount(key, windowStart, windowEnd) {
    const entries = this.memoryCache.get(key) || [];
    return entries.filter(timestamp => timestamp >= windowStart && timestamp <= windowEnd).length;
  }

  getMemoryTokens(key, windowStart, windowEnd) {
    const entries = this.memoryCache.get(key) || [];
    return entries
      .filter(entry => entry.timestamp >= windowStart && entry.timestamp <= windowEnd)
      .reduce((total, entry) => total + entry.tokens, 0);
  }

  incrementMemoryCounter(key, timestamp) {
    const entries = this.memoryCache.get(key) || [];
    entries.push(timestamp);

    // Clean old entries
    const cutoff = Date.now() - this.config.limits.premium.window;
    const filtered = entries.filter(ts => ts >= cutoff);

    this.memoryCache.set(key, filtered);
  }

  addMemoryTokens(key, tokens, timestamp) {
    const entries = this.memoryCache.get(key) || [];
    entries.push({ tokens, timestamp });

    // Clean old entries
    const cutoff = Date.now() - this.config.limits.premium.window;
    const filtered = entries.filter(entry => entry.timestamp >= cutoff);

    this.memoryCache.set(key, filtered);
  }

  /**
   * Cost tracking methods
   */
  async getDailyCost(userId, date) {
    const key = `cost:daily:${userId}:${date}`;

    if (this.isRedisAvailable) {
      try {
        const cost = await this.redis.get(key);
        return parseFloat(cost) || 0;
      } catch (error) {
        logger.warn('Redis error getting daily cost', { error: error.message });
      }
    }

    return parseFloat(this.memoryCache.get(key)) || 0;
  }

  async getMonthlyCost(monthKey) {
    const key = `cost:monthly:${monthKey}`;

    if (this.isRedisAvailable) {
      try {
        const cost = await this.redis.get(key);
        return parseFloat(cost) || 0;
      } catch (error) {
        logger.warn('Redis error getting monthly cost', { error: error.message });
      }
    }

    return parseFloat(this.memoryCache.get(key)) || 0;
  }

  async addCost(key, cost) {
    if (this.isRedisAvailable) {
      try {
        await this.redis.incrbyfloat(key, cost);
        await this.redis.expire(key, 86400 * 32); // 32 days
        return;
      } catch (error) {
        logger.warn('Redis error adding cost', { error: error.message });
      }
    }

    // Memory fallback
    const current = parseFloat(this.memoryCache.get(key)) || 0;
    this.memoryCache.set(key, current + cost);
  }

  /**
   * Estimate request cost based on tokens and provider
   */
  estimateRequestCost(requestType, tokens) {
    // Cost estimates per 1K tokens (approximate)
    const costPer1K = {
      'openai': 0.002,  // GPT-4 input pricing
      'anthropic': 0.003, // Claude pricing
      'mistral': 0.0007, // Mistral pricing
      'azure': 0.002,   // Azure OpenAI pricing
      'default': 0.002
    };

    const provider = process.env.AI_PROVIDER || 'default';
    const rate = costPer1K[provider] || costPer1K.default;

    return (tokens / 1000) * rate;
  }

  /**
   * Get remaining limits for user
   */
  async getRemainingLimits(userId, userTier) {
    const limits = this.config.limits[userTier];
    const now = Date.now();
    const windowStart = now - limits.window;

    const [requestCount, tokenUsage] = await Promise.all([
      this.getRequestCount(userId, 'requests', windowStart, now),
      this.getTokenUsage(userId, windowStart, now)
    ]);

    return {
      requests: {
        used: requestCount,
        remaining: Math.max(0, limits.requests - requestCount),
        limit: limits.requests,
        windowMs: limits.window
      },
      tokens: {
        used: tokenUsage,
        remaining: Math.max(0, limits.tokens - tokenUsage),
        limit: limits.tokens,
        windowMs: limits.window
      },
      resetAt: new Date(now + limits.window).toISOString()
    };
  }

  /**
   * Clear rate limit data for a user (admin function)
   */
  async clearUserLimits(userId) {
    const keys = [
      `requests:${userId}`,
      `tokens:${userId}`,
      `cost:daily:${userId}:${new Date().toISOString().split('T')[0]}`
    ];

    if (this.isRedisAvailable) {
      try {
        await Promise.all(keys.map(key => this.redis.del(key)));
      } catch (error) {
        logger.error('Failed to clear user limits in Redis', {
          userId,
          error: error.message
        });
      }
    }

    // Clear from memory cache
    keys.forEach(key => this.memoryCache.delete(key));

    logger.info('Cleared AI rate limits for user', { userId });
  }
}

// Export singleton instance
const aiRateLimit = new AIRateLimit();

module.exports = aiRateLimit;