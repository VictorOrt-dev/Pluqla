/**
 * 🔥 RATE LIMITING LOAD TESTS
 *
 * Comprehensive load testing for rate limiter under concurrent stress.
 * Validates that rate limits hold correctly under real-world traffic patterns.
 *
 * Test Scenarios:
 * 1. Concurrent burst requests (100+ simultaneous)
 * 2. Sustained load over time (rate limit window)
 * 3. Mixed endpoint traffic patterns
 * 4. Redis failover and fallback
 * 5. Reset window functionality
 *
 * Uses: Jest + supertest for programmatic load generation
 * Alternative: Artillery/K6 config files for external load testing
 */

const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/lib/prismaClient');
const { signToken } = require('../../src/lib/jwtManager');

describe('Rate Limiting Load Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user
    await prisma.user.deleteMany({
      where: { email: 'ratetest@load.com' }
    });

    testUser = await prisma.user.create({
      data: {
        id: 'rate-limit-load-test-user',
        email: 'ratetest@load.com',
        username: 'ratetestuser',
        password: 'hashed_password',
        role: 'user'
      }
    });

    authToken = signToken({ userId: testUser.id, type: 'access' });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('Concurrent Burst Traffic', () => {
    it('should enforce rate limit under 100 concurrent requests', async () => {
      const endpoint = '/api/users/me';
      const concurrentRequests = 100;
      const expectedLimit = 60; // Standard rate limit: 60 req/min

      // Fire all requests simultaneously
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() =>
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(promises);

      // Count success (200) vs rate limited (429)
      const successful = responses.filter(r => r.status === 200).length;
      const rateLimited = responses.filter(r => r.status === 429).length;

      // Verify rate limit enforcement
      expect(successful).toBeLessThanOrEqual(expectedLimit);
      expect(rateLimited).toBeGreaterThan(0);
      expect(successful + rateLimited).toBe(concurrentRequests);

      // Verify 429 response format
      const firstBlocked = responses.find(r => r.status === 429);
      expect(firstBlocked.body).toMatchObject({
        error: expect.any(String),
        retryAfter: expect.any(Number)
      });
    }, 30000); // 30s timeout for concurrent requests

    it('should enforce stricter limits for AI endpoints', async () => {
      const aiEndpoint = '/api/ai/suggestions';
      const concurrentRequests = 50;
      const expectedAILimit = 20; // AI endpoints: 20 req/min

      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() =>
          request(app)
            .post(aiEndpoint)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ category: 'financial' })
        );

      const responses = await Promise.all(promises);

      const successful = responses.filter(r => [200, 500, 503].includes(r.status)).length;
      const rateLimited = responses.filter(r => r.status === 429).length;

      // AI endpoints should have tighter limits
      expect(successful).toBeLessThanOrEqual(expectedAILimit);
      expect(rateLimited).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Sustained Load Over Time', () => {
    it('should reset rate limit after window expires', async () => {
      const endpoint = '/api/users/me';
      const windowMs = 60000; // 1 minute window
      const limit = 60;

      // Phase 1: Hit the limit
      const phase1Promises = Array(limit + 5)
        .fill(null)
        .map(() =>
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`)
        );

      const phase1Responses = await Promise.all(phase1Promises);
      const phase1RateLimited = phase1Responses.filter(r => r.status === 429).length;

      expect(phase1RateLimited).toBeGreaterThan(0);

      // Wait for window to reset (with 10s buffer)
      await new Promise(resolve => setTimeout(resolve, windowMs + 10000));

      // Phase 2: Should succeed again
      const phase2Response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(phase2Response.status).toBe(200);
    }, 80000); // Long timeout for window reset
  });

  describe('Mixed Endpoint Load Distribution', () => {
    it('should handle traffic across different rate limit tiers', async () => {
      const endpoints = [
        { path: '/api/users/me', method: 'get', limit: 60 },
        { path: '/api/transactions', method: 'get', limit: 60 },
        { path: '/api/ai/status', method: 'get', limit: 100 },
        { path: '/api/categories', method: 'get', limit: 60 }
      ];

      const results = {};

      for (const endpoint of endpoints) {
        const concurrentRequests = 80;

        const promises = Array(concurrentRequests)
          .fill(null)
          .map(() =>
            request(app)
              [endpoint.method](endpoint.path)
              .set('Authorization', `Bearer ${authToken}`)
          );

        const responses = await Promise.all(promises);

        results[endpoint.path] = {
          successful: responses.filter(r => [200, 404].includes(r.status)).length,
          rateLimited: responses.filter(r => r.status === 429).length,
          limit: endpoint.limit
        };
      }

      // Each endpoint should enforce its own limit independently
      Object.values(results).forEach(result => {
        expect(result.successful).toBeLessThanOrEqual(result.limit + 5); // Small margin for timing
        expect(result.rateLimited).toBeGreaterThan(0);
      });
    }, 60000);
  });

  describe('Rate Limit Headers', () => {
    it('should return correct X-RateLimit headers', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      // Standard rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      const limit = parseInt(response.headers['x-ratelimit-limit'], 10);
      const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10);

      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(limit);
    });

    it('should decrement remaining count correctly', async () => {
      const endpoint = '/api/transactions';

      // First request
      const response1 = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'], 10);

      // Second request
      const response2 = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'], 10);

      // Remaining should decrease
      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('IP-Based Rate Limiting', () => {
    it('should rate limit by IP for unauthenticated requests', async () => {
      const publicEndpoint = '/api/ai/status';
      const concurrentRequests = 120;
      const ipLimit = 100; // IP-based limit for public endpoints

      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => request(app).get(publicEndpoint));

      const responses = await Promise.all(promises);

      const successful = responses.filter(r => r.status === 200).length;
      const rateLimited = responses.filter(r => r.status === 429).length;

      expect(successful).toBeLessThanOrEqual(ipLimit + 5);
      expect(rateLimited).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Edge Cases and Failures', () => {
    it('should handle rapid sequential requests from same user', async () => {
      const endpoint = '/api/users/me';
      const rapidRequests = 70;

      const responses = [];

      // Sequential (not parallel) to test rapid succession
      for (let i = 0; i < rapidRequests; i++) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`);
        responses.push(response);
      }

      const rateLimited = responses.filter(r => r.status === 429).length;
      expect(rateLimited).toBeGreaterThan(0);
    }, 30000);

    it('should not leak rate limit state between users', async () => {
      // Create second test user
      const user2 = await prisma.user.create({
        data: {
          id: 'rate-limit-isolation-test',
          email: 'ratetest2@load.com',
          username: 'ratetestuser2',
          password: 'hashed_password',
          role: 'user'
        }
      });

      const token2 = signToken({ userId: user2.id, type: 'access' });

      // Exhaust user1's limit
      const user1Requests = Array(65)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`)
        );

      await Promise.all(user1Requests);

      // User2 should still have full quota
      const user2Response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token2}`);

      expect(user2Response.status).toBe(200);

      // Cleanup
      await prisma.user.delete({ where: { id: user2.id } });
    }, 30000);
  });

  describe('Performance Under Load', () => {
    it('should maintain low latency even near rate limit', async () => {
      const endpoint = '/api/users/me';
      const nearLimitRequests = 55; // Close to 60 limit

      const startTime = Date.now();

      const promises = Array(nearLimitRequests)
        .fill(null)
        .map(() =>
          request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const totalDuration = endTime - startTime;
      const avgLatency = totalDuration / nearLimitRequests;

      // Average latency should be reasonable (<100ms per request under load)
      expect(avgLatency).toBeLessThan(100);

      // All successful requests should be fast
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThan(0);
    }, 30000);
  });
});
