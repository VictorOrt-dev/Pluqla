const request = require('supertest');
const express = require('express');
const financialRateLimit = require('../../src/middleware/financialRateLimit');
const { createTestUser, generateTestToken, createMockRequest, createMockResponse } = require('../utils/testHelpers');

describe('Rate Limiting Security Tests', () => {
  let app;
  let testUsers;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Create test users with different tiers
    testUsers = {
      free: createTestUser({ subscription: { plan: 'free', tier: 'free' } }),
      premium: createTestUser({ subscription: { plan: 'premium', tier: 'premium' } }),
      enterprise: createTestUser({ subscription: { plan: 'enterprise', tier: 'enterprise' } })
    };
  });

  describe('Attack Simulation', () => {
    test('should prevent brute force attacks', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_security',
        limits: {
          free: { requests: 3, window: 5000, burst: 0 }
        }
      });

      app.post('/test-brute-force', limiter, (req, res) => {
        res.json({ success: true, timestamp: Date.now() });
      });

      const attackUser = testUsers.free;
      const token = generateTestToken(attackUser);

      // Simulate brute force attack
      const attackRequests = [];
      for (let i = 0; i < 10; i++) {
        attackRequests.push(
          request(app)
            .post('/test-brute-force')
            .set('Authorization', `Bearer ${token}`)
            .send({ attempt: i })
        );
      }

      const responses = await Promise.allSettled(attackRequests);
      const rateLimitedCount = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      ).length;

      // Should rate limit after exceeding limit
      expect(rateLimitedCount).toBeGreaterThan(0);

      // Rate limited responses should not leak sensitive information
      responses.forEach(result => {
        if (result.status === 'fulfilled' && result.value.status === 429) {
          const response = result.value;
          expect(JSON.stringify(response.body)).not.toMatch(new RegExp(attackUser.id, 'i'));
          expect(response.body).not.toHaveProperty('userId');
          expect(response.body).not.toHaveProperty('internalKey');
        }
      });
    });

    test('should prevent distributed attacks from multiple IPs', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_distributed',
        keyGenerator: (req) => req.ip, // Rate limit by IP only for this test
        limits: {
          free: { requests: 2, window: 5000, burst: 0 }
        }
      });

      app.get('/test-distributed', limiter, (req, res) => {
        res.json({ success: true, ip: req.ip });
      });

      // Simulate requests from different IPs
      const ips = ['192.168.1.1', '192.168.1.2', '10.0.0.1', '172.16.0.1'];
      const distributedRequests = [];

      ips.forEach(ip => {
        for (let i = 0; i < 4; i++) {
          distributedRequests.push(
            request(app)
              .get('/test-distributed')
              .set('X-Forwarded-For', ip)
          );
        }
      });

      const responses = await Promise.allSettled(distributedRequests);
      const rateLimitedByIp = {};

      responses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const ip = ips[Math.floor(index / 4)];
          if (!rateLimitedByIp[ip]) {
            rateLimitedByIp[ip] = { success: 0, rateLimited: 0 };
          }

          if (result.value.status === 200) {
            rateLimitedByIp[ip].success++;
          } else if (result.value.status === 429) {
            rateLimitedByIp[ip].rateLimited++;
          }
        }
      });

      // Each IP should have some rate limited requests
      Object.values(rateLimitedByIp).forEach(ipStats => {
        expect(ipStats.rateLimited).toBeGreaterThan(0);
      });
    });

    test('should handle header injection attacks', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_headers',
        limits: {
          free: { requests: 5, window: 5000, burst: 0 }
        }
      });

      app.post('/test-headers', limiter, (req, res) => {
        res.json({ success: true });
      });

      const user = testUsers.free;
      const token = generateTestToken(user);

      // Attempt header injection
      const maliciousHeaders = {
        'X-Forwarded-For': '127.0.0.1, <script>alert("xss")</script>',
        'User-Agent': 'Malicious/1.0 <script>',
        'X-Real-IP': '"; DROP TABLE users; --',
        'X-Rate-Limit-Key': 'admin:bypass'
      };

      const response = await request(app)
        .post('/test-headers')
        .set('Authorization', `Bearer ${token}`)
        .set(maliciousHeaders)
        .send({ data: 'test' });

      // Should not process malicious headers or bypass rate limiting
      expect([200, 429]).toContain(response.status);

      // Rate limiter should not have been compromised
      if (response.status === 200) {
        // Make additional requests to verify rate limiting still works
        const followUpRequests = [];
        for (let i = 0; i < 6; i++) {
          followUpRequests.push(
            request(app)
              .post('/test-headers')
              .set('Authorization', `Bearer ${token}`)
              .send({ data: 'followup' })
          );
        }

        const followUpResponses = await Promise.allSettled(followUpRequests);
        const rateLimited = followUpResponses.some(
          r => r.status === 'fulfilled' && r.value.status === 429
        );

        expect(rateLimited).toBe(true);
      }
    });
  });

  describe('Bypass Attempt Prevention', () => {
    test('should prevent subscription tier bypass attempts', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_bypass',
        limits: {
          free: { requests: 2, window: 5000, burst: 0 },
          premium: { requests: 10, window: 5000, burst: 2 }
        }
      });

      app.get('/test-bypass', limiter, (req, res) => {
        res.json({
          success: true,
          tier: req.user?.subscription?.tier || 'none'
        });
      });

      const freeUser = testUsers.free;
      const freeToken = generateTestToken(freeUser);

      // Attempt to bypass by modifying request
      const bypassAttempts = [
        // Try to modify subscription in token payload (should fail due to signature)
        request(app)
          .get('/test-bypass')
          .set('Authorization', `Bearer ${freeToken}`)
          .set('X-Subscription-Override', 'premium'),

        // Try to use premium user ID (should fail due to token validation)
        request(app)
          .get('/test-bypass')
          .set('Authorization', `Bearer ${freeToken}`)
          .set('X-User-Id', testUsers.premium.id),

        // Try to inject tier in query params
        request(app)
          .get('/test-bypass?tier=premium')
          .set('Authorization', `Bearer ${freeToken}`)
      ];

      const responses = await Promise.allSettled(bypassAttempts);

      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          const response = result.value;
          // Should still be treated as free user
          if (response.status === 200) {
            expect(response.body.tier).toBe('free');
          }
        }
      });

      // Verify still subject to free tier limits
      const additionalRequests = [];
      for (let i = 0; i < 4; i++) {
        additionalRequests.push(
          request(app)
            .get('/test-bypass')
            .set('Authorization', `Bearer ${freeToken}`)
        );
      }

      const additionalResponses = await Promise.allSettled(additionalRequests);
      const rateLimited = additionalResponses.some(
        r => r.status === 'fulfilled' && r.value.status === 429
      );

      expect(rateLimited).toBe(true);
    });

    test('should prevent time-based bypass attempts', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_time_bypass',
        limits: {
          free: { requests: 2, window: 3000, burst: 0 }
        }
      });

      app.post('/test-time-bypass', limiter, (req, res) => {
        res.json({ success: true, timestamp: Date.now() });
      });

      const user = testUsers.free;
      const token = generateTestToken(user);

      // Exhaust rate limit
      await request(app)
        .post('/test-time-bypass')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      await request(app)
        .post('/test-time-bypass')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      // Should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/test-time-bypass')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(rateLimitedResponse.status).toBe(429);

      // Attempt to bypass by manipulating time headers
      const timeBypassAttempts = [
        request(app)
          .post('/test-time-bypass')
          .set('Authorization', `Bearer ${token}`)
          .set('Date', new Date(Date.now() + 10000).toISOString()) // Future date
          .send({}),

        request(app)
          .post('/test-time-bypass')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Timestamp', (Date.now() + 10000).toString())
          .send({})
      ];

      const bypassResponses = await Promise.allSettled(timeBypassAttempts);

      bypassResponses.forEach(result => {
        if (result.status === 'fulfilled') {
          // Should still be rate limited
          expect(result.value.status).toBe(429);
        }
      });
    });
  });

  describe('Information Disclosure Prevention', () => {
    test('should not leak internal rate limiting state', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_info_leak',
        limits: {
          free: { requests: 1, window: 5000, burst: 0 }
        }
      });

      app.get('/test-info-leak', limiter, (req, res) => {
        res.json({ success: true });
      });

      const user = testUsers.free;
      const token = generateTestToken(user);

      // Trigger rate limiting
      await request(app)
        .get('/test-info-leak')
        .set('Authorization', `Bearer ${token}`);

      const rateLimitedResponse = await request(app)
        .get('/test-info-leak')
        .set('Authorization', `Bearer ${token}`);

      expect(rateLimitedResponse.status).toBe(429);

      // Check that response doesn't leak sensitive information
      const responseBody = JSON.stringify(rateLimitedResponse.body);

      // Should not contain:
      expect(responseBody).not.toMatch(new RegExp(user.id, 'i')); // User ID
      expect(responseBody).not.toMatch(/redis/i); // Redis keys
      expect(responseBody).not.toMatch(/internal/i); // Internal keys
      expect(responseBody).not.toMatch(/key:/); // Rate limit keys
      expect(responseBody).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/); // IP addresses

      // Should not have dangerous headers
      expect(rateLimitedResponse.headers).not.toHaveProperty('x-rate-limit-key');
      expect(rateLimitedResponse.headers).not.toHaveProperty('x-user-id');
      expect(rateLimitedResponse.headers).not.toHaveProperty('x-internal-debug');
    });

    test('should sanitize error messages in rate limit responses', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_error_sanitization',
        limits: {
          free: { requests: 1, window: 5000, burst: 0 }
        }
      });

      // Simulate error condition in rate limiter
      app.get('/test-error-sanitization', (req, res, next) => {
        // Mock an internal error
        req.user = null; // Force error condition
        limiter(req, res, next);
      }, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test-error-sanitization');

      // Even in error conditions, should not expose internals
      if (response.body.error) {
        expect(response.body.error).not.toMatch(/stack trace/i);
        expect(response.body.error).not.toMatch(/internal error/i);
        expect(response.body.error).not.toMatch(/database/i);
        expect(response.body.error).not.toMatch(/redis/i);
      }
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    test('should prevent memory exhaustion attacks', async () => {
      const initialMemory = process.memoryUsage();

      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_memory_attack',
        limits: {
          free: { requests: 1, window: 5000, burst: 0 }
        }
      });

      app.post('/test-memory-attack', limiter, (req, res) => {
        res.json({ success: true });
      });

      // Attempt memory exhaustion with large payloads and many unique keys
      const memoryAttackRequests = [];

      for (let i = 0; i < 100; i++) {
        const uniqueUser = createTestUser({ id: `memory-attack-${i}` });
        const token = generateTestToken(uniqueUser);

        memoryAttackRequests.push(
          request(app)
            .post('/test-memory-attack')
            .set('Authorization', `Bearer ${token}`)
            .send({
              largePayload: 'x'.repeat(1000), // 1KB payload
              uniqueId: i
            })
        );
      }

      await Promise.allSettled(memoryAttackRequests);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    test('should handle malformed requests gracefully', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_malformed',
        limits: {
          free: { requests: 5, window: 5000, burst: 0 }
        }
      });

      app.post('/test-malformed', limiter, (req, res) => {
        res.json({ success: true });
      });

      const user = testUsers.free;
      const token = generateTestToken(user);

      // Send malformed requests
      const malformedRequests = [
        // Extremely large headers
        request(app)
          .post('/test-malformed')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Large-Header', 'x'.repeat(10000))
          .send({}),

        // Invalid JSON
        request(app)
          .post('/test-malformed')
          .set('Authorization', `Bearer ${token}`)
          .set('Content-Type', 'application/json')
          .send('{"invalid": json}'),

        // Null bytes
        request(app)
          .post('/test-malformed')
          .set('Authorization', `Bearer ${token}`)
          .send({ data: 'test\0null' }),

        // Unicode attacks
        request(app)
          .post('/test-malformed')
          .set('Authorization', `Bearer ${token}`)
          .send({ data: '𝒯𝑒𝓈𝓉' })
      ];

      const responses = await Promise.allSettled(malformedRequests);

      // Should handle all requests without crashing
      responses.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.value) {
          // Should return valid HTTP status
          expect(result.value.status).toBeGreaterThanOrEqual(200);
          expect(result.value.status).toBeLessThan(600);
        }
      });
    });
  });

  describe('Race Condition Prevention', () => {
    test('should handle concurrent requests consistently', async () => {
      const limiter = financialRateLimit.createFinancialRateLimit({
        operationType: 'test_race_condition',
        limits: {
          free: { requests: 3, window: 5000, burst: 0 }
        }
      });

      app.get('/test-race-condition', limiter, (req, res) => {
        res.json({ success: true, timestamp: Date.now() });
      });

      const user = testUsers.free;
      const token = generateTestToken(user);

      // Send exactly the same number of concurrent requests as the limit
      const concurrentRequests = [];
      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(
          request(app)
            .get('/test-race-condition')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.all(concurrentRequests);

      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      // Should enforce limits consistently even with race conditions
      expect(successfulRequests.length).toBeLessThanOrEqual(3);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });
});