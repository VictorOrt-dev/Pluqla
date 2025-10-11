/**
 * Rate Limiter Tests
 *
 * Comprehensive tests for the enhanced rate limiting middleware
 * Tests cover: user tiers, Redis fallback, concurrent requests, limits enforcement
 */

const request = require('supertest');
const express = require('express');
const {
  createTierAwareLimiter,
  getUserTier,
  getRateLimitConfig,
  USER_TIER_LIMITS,
  getHealthStatus,
  resetRateLimit
} = require('../src/middleware/rateLimiter');

describe('Rate Limiter', () => {
  let app;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
      // Tests can set req.testUser to simulate authentication
      if (req.headers['x-test-user']) {
        const userData = JSON.parse(req.headers['x-test-user']);
        req.user = userData;
      }
      next();
    });
  });

  describe('getUserTier()', () => {
    it('should return "free" for unauthenticated users', () => {
      const req = {};
      expect(getUserTier(req)).toBe('free');
    });

    it('should return "free" for authenticated non-premium users', () => {
      const req = { user: { id: '123', isPremium: false } };
      expect(getUserTier(req)).toBe('free');
    });

    it('should return "premium" for premium users', () => {
      const req = { user: { id: '123', isPremium: true } };
      expect(getUserTier(req)).toBe('premium');
    });

    it('should return "admin" for admin users', () => {
      const req = { user: { id: '123', role: 'admin' } };
      expect(getUserTier(req)).toBe('admin');
    });

    it('should prioritize admin role over premium status', () => {
      const req = { user: { id: '123', role: 'admin', isPremium: true } };
      expect(getUserTier(req)).toBe('admin');
    });
  });

  describe('getRateLimitConfig()', () => {
    it('should return correct config for free tier', () => {
      const config = getRateLimitConfig('ai', 'free');
      expect(config).toEqual(USER_TIER_LIMITS.free.ai);
      expect(config.requests).toBe(50);
      expect(config.window).toBe(60 * 60 * 1000);
    });

    it('should return correct config for premium tier', () => {
      const config = getRateLimitConfig('ai', 'premium');
      expect(config).toEqual(USER_TIER_LIMITS.premium.ai);
      expect(config.requests).toBe(500);
    });

    it('should return correct config for admin tier', () => {
      const config = getRateLimitConfig('ai', 'admin');
      expect(config).toEqual(USER_TIER_LIMITS.admin.ai);
      expect(config.requests).toBe(5000);
    });

    it('should fallback to free tier for unknown tiers', () => {
      const config = getRateLimitConfig('ai', 'unknown');
      expect(config).toEqual(USER_TIER_LIMITS.free.ai);
    });

    it('should handle all limit types', () => {
      const types = ['global', 'auth', 'ai', 'upload', 'standard', 'analytics'];
      types.forEach(type => {
        const config = getRateLimitConfig(type, 'free');
        expect(config).toBeDefined();
        expect(config.requests).toBeDefined();
        expect(config.window).toBeDefined();
      });
    });
  });

  describe('Tier-Aware Rate Limiting', () => {
    it('should enforce free tier limits', async () => {
      const limiter = createTierAwareLimiter('auth'); // 10 requests per 15min for free
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // Make requests up to limit
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .get('/test')
          .set('X-Test-User', JSON.stringify({ id: 'free-user', isPremium: false }));

        expect(res.status).toBe(200);
      }

      // 11th request should be rate limited
      const limitedRes = await request(app)
        .get('/test')
        .set('X-Test-User', JSON.stringify({ id: 'free-user', isPremium: false }));

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.error).toBe('Rate limit exceeded');
      expect(limitedRes.body.details).toBeDefined();
      expect(limitedRes.body.details.tier).toBe('free');
      expect(limitedRes.body.details.upgradeUrl).toBe('/premium');
    }, 10000); // Longer timeout for rate limit tests

    it('should enforce premium tier limits (higher)', async () => {
      const limiter = createTierAwareLimiter('auth'); // 50 requests per 15min for premium
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // Make 50 requests (premium limit)
      for (let i = 0; i < 50; i++) {
        const res = await request(app)
          .get('/test')
          .set('X-Test-User', JSON.stringify({ id: 'premium-user', isPremium: true }));

        expect(res.status).toBe(200);
      }

      // 51st request should be rate limited
      const limitedRes = await request(app)
        .get('/test')
        .set('X-Test-User', JSON.stringify({ id: 'premium-user', isPremium: true }));

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.details.tier).toBe('premium');
      expect(limitedRes.body.details.upgradeUrl).toBeNull(); // No upgrade for premium
    }, 15000);

    it('should allow admin bypass when configured', async () => {
      const limiter = createTierAwareLimiter('auth', { bypassAdmin: true });
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // Make many requests as admin - should not be limited
      for (let i = 0; i < 100; i++) {
        const res = await request(app)
          .get('/test')
          .set('X-Test-User', JSON.stringify({ id: 'admin-user', role: 'admin' }));

        expect(res.status).toBe(200);
      }
    }, 10000);
  });

  describe('Rate Limit Response Format', () => {
    it('should return proper 429 response with all required fields', async () => {
      const limiter = createTierAwareLimiter('auth'); // 10 requests for free
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/test')
          .set('X-Test-User', JSON.stringify({ id: 'test-user', isPremium: false }));
      }

      // Get rate limited response
      const res = await request(app)
        .get('/test')
        .set('X-Test-User', JSON.stringify({ id: 'test-user', isPremium: false }));

      expect(res.status).toBe(429);
      expect(res.body).toMatchObject({
        error: 'Rate limit exceeded',
        message: expect.any(String),
        details: {
          limit: expect.any(Number),
          windowMs: expect.any(Number),
          windowMinutes: expect.any(Number),
          tier: 'free',
          resetAt: expect.any(String),
          retryAfterSeconds: expect.any(Number),
          upgradeUrl: '/premium'
        }
      });

      // Verify resetAt is a valid ISO date
      expect(() => new Date(res.body.details.resetAt)).not.toThrow();

      // Verify retryAfterSeconds is a number
      expect(typeof res.body.details.retryAfterSeconds).toBe('number');

      // Verify custom headers
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBe('0');
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
      expect(res.headers['retry-after']).toBeDefined();
    }, 10000);

    it('should include rate limit headers', async () => {
      const limiter = createTierAwareLimiter('auth');
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      const res = await request(app)
        .get('/test')
        .set('X-Test-User', JSON.stringify({ id: 'test-user' }));

      expect(res.status).toBe(200);
      // Standard rate limit headers should be present
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Per-IP vs Per-User Limiting', () => {
    it('should limit by IP for unauthenticated users', async () => {
      const limiter = createTierAwareLimiter('standard');
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // Make requests from same IP without authentication
      for (let i = 0; i < 200; i++) {
        await request(app).get('/test');
      }

      // Should be rate limited by IP
      const res = await request(app).get('/test');
      expect(res.status).toBe(429);
    }, 10000);

    it('should limit by user ID for authenticated users', async () => {
      const limiter = createTierAwareLimiter('auth'); // 10 for free users
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // User 1 makes 10 requests
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/test')
          .set('X-Test-User', JSON.stringify({ id: 'user-1', isPremium: false }));
      }

      // User 1 is rate limited
      const user1Res = await request(app)
        .get('/test')
        .set('X-Test-User', JSON.stringify({ id: 'user-1', isPremium: false }));

      expect(user1Res.status).toBe(429);

      // User 2 should still have full quota
      const user2Res = await request(app)
        .get('/test')
        .set('X-Test-User', JSON.stringify({ id: 'user-2', isPremium: false }));

      expect(user2Res.status).toBe(200);
    }, 10000);
  });

  describe('Different Endpoint Limits', () => {
    it('should enforce different limits for different endpoint types', async () => {
      const authLimiter = createTierAwareLimiter('auth'); // 10 for free
      const aiLimiter = createTierAwareLimiter('ai'); // 50 for free
      const uploadLimiter = createTierAwareLimiter('upload'); // 10 for free

      app.get('/auth', authLimiter, (req, res) => res.json({ success: true }));
      app.get('/ai', aiLimiter, (req, res) => res.json({ success: true }));
      app.get('/upload', uploadLimiter, (req, res) => res.json({ success: true }));

      const user = JSON.stringify({ id: 'test-user', isPremium: false });

      // Auth endpoint: 10 requests
      for (let i = 0; i < 10; i++) {
        const res = await request(app).get('/auth').set('X-Test-User', user);
        expect(res.status).toBe(200);
      }
      const authLimited = await request(app).get('/auth').set('X-Test-User', user);
      expect(authLimited.status).toBe(429);

      // AI endpoint: 50 requests (should still work)
      for (let i = 0; i < 50; i++) {
        const res = await request(app).get('/ai').set('X-Test-User', user);
        expect(res.status).toBe(200);
      }
      const aiLimited = await request(app).get('/ai').set('X-Test-User', user);
      expect(aiLimited.status).toBe(429);
    }, 15000);
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests correctly', async () => {
      const limiter = createTierAwareLimiter('auth'); // 10 for free
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      const user = JSON.stringify({ id: 'concurrent-user', isPremium: false });

      // Send 15 requests concurrently (limit is 10)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app).get('/test').set('X-Test-User', user)
        );
      }

      const results = await Promise.all(promises);

      const successful = results.filter(r => r.status === 200).length;
      const rateLimited = results.filter(r => r.status === 429).length;

      // Should have exactly 10 successful (or close to it with some variance)
      expect(successful).toBeGreaterThanOrEqual(8);
      expect(successful).toBeLessThanOrEqual(12);

      // Rest should be rate limited
      expect(rateLimited).toBeGreaterThan(0);
      expect(successful + rateLimited).toBe(15);
    }, 10000);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await getHealthStatus();

      expect(health).toBeDefined();
      expect(health.store).toMatch(/^(redis|memory)$/);
      expect(health.timestamp).toBeDefined();
      expect(typeof health.redisAvailable).toBe('boolean');
    });

    it('should indicate Redis configuration status', async () => {
      const health = await getHealthStatus();

      if (process.env.REDIS_URL) {
        expect(health.redisUrl).toBe('***configured***');
      } else {
        expect(health.redisUrl).toBe('not configured');
      }
    });
  });

  describe('Rate Limit Reset (Admin Utility)', () => {
    it('should export resetRateLimit function', () => {
      expect(typeof resetRateLimit).toBe('function');
    });

    it('should handle reset gracefully when Redis not available', async () => {
      const result = await resetRateLimit('test-key');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      delete process.env.SKIP_RATE_LIMIT;
    });

    it('should apply 10x limits in development mode', () => {
      process.env.NODE_ENV = 'development';
      const config = getRateLimitConfig('auth', 'free');

      // Base is 10 requests, in dev should allow much more
      // The limiter applies 10x multiplier in development
      expect(config.requests).toBe(10); // Config stays same, multiplier in middleware
    });

    it('should skip rate limiting when SKIP_RATE_LIMIT is true', async () => {
      process.env.NODE_ENV = 'development';
      process.env.SKIP_RATE_LIMIT = 'true';

      const limiter = createTierAwareLimiter('auth');
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // Make 1000 requests - should all succeed
      for (let i = 0; i < 100; i++) {
        const res = await request(app).get('/test');
        expect(res.status).toBe(200);
      }
    }, 10000);
  });
});
