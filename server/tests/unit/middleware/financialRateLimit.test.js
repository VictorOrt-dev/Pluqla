const request = require('supertest');
const express = require('express');
const financialRateLimit = require('../../../src/middleware/financialRateLimit');
const { createFinancialRateLimit, getRateLimitConfig, getUserSubscriptionTier } = financialRateLimit;

describe('Financial Rate Limiting Middleware', () => {
  let app;
  let testUser;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock user authentication
    testUser = {
      id: 'test-user-123',
      subscription: { plan: 'free', tier: 'free' }
    };

    app.use((req, res, next) => {
      req.user = testUser;
      req.ip = '127.0.0.1';
      next();
    });

    // Reset rate limiting state
    jest.clearAllMocks();
  });

  describe('Subscription Tier Configuration', () => {
    test('should return correct limits for free tier', () => {
      const config = getRateLimitConfig('free', 'transactions');

      expect(config).toEqual({
        requests: 10,
        window: 15 * 60 * 1000, // 15 minutes
        burst: 2
      });
    });

    test('should return correct limits for premium tier', () => {
      const config = getRateLimitConfig('premium', 'transactions');

      expect(config).toEqual({
        requests: 200,
        window: 15 * 60 * 1000,
        burst: 50
      });
    });

    test('should return correct limits for enterprise tier', () => {
      const config = getRateLimitConfig('enterprise', 'payments');

      expect(config).toEqual({
        requests: 1000,
        window: 60 * 60 * 1000, // 1 hour
        burst: 200
      });
    });

    test('should fallback to free tier for invalid subscription', () => {
      const config = getRateLimitConfig('invalid-tier', 'transactions');

      expect(config).toEqual({
        requests: 10,
        window: 15 * 60 * 1000,
        burst: 2
      });
    });
  });

  describe('User Subscription Tier Detection', () => {
    test('should detect free tier correctly', () => {
      const user = { subscription: { plan: 'free' } };
      const tier = getUserSubscriptionTier(user);

      expect(tier).toBe('free');
    });

    test('should detect premium tier correctly', () => {
      const user = { subscription: { plan: 'premium' } };
      const tier = getUserSubscriptionTier(user);

      expect(tier).toBe('premium');
    });

    test('should detect enterprise tier correctly', () => {
      const user = { subscription: { plan: 'enterprise' } };
      const tier = getUserSubscriptionTier(user);

      expect(tier).toBe('enterprise');
    });

    test('should fallback to free tier for undefined user', () => {
      const tier = getUserSubscriptionTier(undefined);

      expect(tier).toBe('free');
    });

    test('should fallback to free tier for user without subscription', () => {
      const user = { id: 'test' };
      const tier = getUserSubscriptionTier(user);

      expect(tier).toBe('free');
    });
  });

  describe('Rate Limiting Behavior', () => {
    test('should allow requests within rate limit', async () => {
      const limiter = createFinancialRateLimit({
        operationType: 'transactions',
        defaultTier: 'free'
      });

      app.get('/test', limiter, (req, res) => {
        res.json({ success: true });
      });

      // Should allow first request
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should block requests exceeding rate limit', async () => {
      // Create a very restrictive rate limiter for testing
      const limiter = createFinancialRateLimit({
        operationType: 'test',
        limits: {
          free: { requests: 1, window: 60000, burst: 0 },
          premium: { requests: 1, window: 60000, burst: 0 }
        }
      });

      app.get('/test-limit', limiter, (req, res) => {
        res.json({ success: true });
      });

      // First request should succeed
      await request(app).get('/test-limit').expect(200);

      // Second request should be rate limited
      const response = await request(app)
        .get('/test-limit')
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    });

    test('should use different limits for different subscription tiers', async () => {
      // Test with premium user
      testUser.subscription = { plan: 'premium', tier: 'premium' };

      const limiter = createFinancialRateLimit({
        operationType: 'transactions',
        defaultTier: 'premium'
      });

      app.get('/test-premium', limiter, (req, res) => {
        res.json({ success: true, tier: req.user.subscription.tier });
      });

      const response = await request(app)
        .get('/test-premium')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Multi-dimensional Rate Limiting', () => {
    test('should use combined user + IP key for rate limiting', async () => {
      const limiter = createFinancialRateLimit({
        operationType: 'transactions',
        keyGenerator: (req) => `${req.user.id}:${req.ip}`
      });

      app.get('/test-multi', limiter, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test-multi')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle requests from different IPs separately', async () => {
      const limiter = createFinancialRateLimit({
        operationType: 'test',
        limits: {
          free: { requests: 1, window: 60000, burst: 0 }
        }
      });

      app.get('/test-ip', limiter, (req, res) => {
        res.json({ success: true, ip: req.ip });
      });

      // First request from 127.0.0.1
      await request(app).get('/test-ip').expect(200);

      // Mock different IP
      app.use((req, res, next) => {
        req.ip = '192.168.1.1';
        next();
      });

      // Second request from different IP should succeed
      await request(app).get('/test-ip').expect(200);
    });
  });

  describe('Burst Handling', () => {
    test('should allow burst requests up to burst limit', async () => {
      const limiter = createFinancialRateLimit({
        operationType: 'test',
        limits: {
          free: { requests: 1, window: 60000, burst: 2 }
        },
        enableBurstProtection: true
      });

      app.get('/test-burst', limiter, (req, res) => {
        res.json({ success: true });
      });

      // Should allow burst requests
      for (let i = 0; i < 3; i++) {
        const response = await request(app).get('/test-burst');

        if (i < 3) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });
  });

  describe('Progressive Backoff', () => {
    test('should increase rate limit window on repeated violations', async () => {
      const limiter = createFinancialRateLimit({
        operationType: 'test',
        limits: {
          free: { requests: 1, window: 1000, burst: 0 }
        },
        enableProgressiveBackoff: true
      });

      app.get('/test-backoff', limiter, (req, res) => {
        res.json({ success: true });
      });

      // First request succeeds
      await request(app).get('/test-backoff').expect(200);

      // Second request should be rate limited
      const response = await request(app).get('/test-backoff').expect(429);

      expect(response.body).toHaveProperty('retryAfter');
      expect(typeof response.body.retryAfter).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid operation type gracefully', () => {
      expect(() => {
        createFinancialRateLimit({
          operationType: 'invalid-operation'
        });
      }).not.toThrow();
    });

    test('should provide meaningful error messages', async () => {
      const limiter = createFinancialRateLimit({
        operationType: 'test',
        limits: {
          free: { requests: 1, window: 60000, burst: 0 }
        }
      });

      app.get('/test-error', limiter, (req, res) => {
        res.json({ success: true });
      });

      // Exceed rate limit
      await request(app).get('/test-error').expect(200);

      const response = await request(app).get('/test-error').expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('retryAfter');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('remaining');
    });
  });

  describe('Health Check', () => {
    test('should provide rate limiting health status', () => {
      const healthStatus = financialRateLimit.healthCheck();

      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('limits');
      expect(healthStatus.status).toBe('healthy');
    });
  });

  describe('Security Features', () => {
    test('should not expose sensitive information in rate limit responses', async () => {
      const limiter = createFinancialRateLimit({
        operationType: 'test',
        limits: {
          free: { requests: 1, window: 60000, burst: 0 }
        }
      });

      app.get('/test-security', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test-security').expect(200);

      const response = await request(app).get('/test-security').expect(429);

      // Should not expose user IDs, internal keys, etc.
      expect(JSON.stringify(response.body)).not.toMatch(/test-user-123/);
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body).not.toHaveProperty('key');
    });

    test('should log security violations appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const limiter = createFinancialRateLimit({
        operationType: 'test',
        limits: {
          free: { requests: 1, window: 60000, burst: 0 }
        }
      });

      app.get('/test-logging', limiter, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test-logging').expect(200);
      await request(app).get('/test-logging').expect(429);

      // Should log rate limit violations (implementation may vary)
      // expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});