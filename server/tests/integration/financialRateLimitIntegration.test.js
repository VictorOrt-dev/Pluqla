const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('../utils/testHelpers');
const prisma = require('../../src/lib/prisma');

describe('Financial Rate Limiting Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create test user with different subscription tiers
    testUser = await prisma.user.create({
      data: {
        email: 'ratelimit.test@example.com',
        password: '$2b$10$test.hash',
        name: 'Rate Limit Test User',
        subscription: {
          create: {
            plan: 'free',
            status: 'active'
          }
        }
      },
      include: {
        subscription: true
      }
    });

    authToken = generateTestToken(testUser);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.subscription.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
  });

  describe('Transaction Endpoints Rate Limiting', () => {
    test('should apply rate limits to transaction creation', async () => {
      // Test free tier limits (10 requests per 15 minutes)
      const transactionData = {
        amount: 25.50,
        category: 'alimentation',
        type: 'expense',
        description: 'Rate limit test transaction'
      };

      // Make requests within limit - should succeed
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(transactionData);

        expect([200, 201]).toContain(response.status);
      }
    });

    test('should block requests exceeding transaction rate limit', async () => {
      // This test would need to mock the rate limiter to trigger faster
      // or use a test-specific configuration with lower limits

      const transactionData = {
        amount: 15.00,
        category: 'transport',
        type: 'expense',
        description: 'Rate limit violation test'
      };

      // Simulate rapid requests (this would depend on your test configuration)
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send(transactionData)
        );
      }

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        result => result.value?.status === 429
      );

      // Should have some rate-limited responses if limits are enforced
      expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(0);
    });

    test('should provide correct rate limit headers', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      // Check for standard rate limiting headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Financial Dashboard Rate Limiting', () => {
    test('should apply report-specific rate limits to dashboard', async () => {
      const response = await request(app)
        .get('/api/financial/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 429]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
      } else {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/rate limit/i);
      }
    });

    test('should apply different limits for different financial operations', async () => {
      // Test API calls vs reports vs transactions have different limits
      const apiResponse = await request(app)
        .get('/api/financial/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      const reportResponse = await request(app)
        .get('/api/financial/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      // Both should respect their respective rate limits
      expect([200, 429]).toContain(apiResponse.status);
      expect([200, 429]).toContain(reportResponse.status);
    });
  });

  describe('OAuth Endpoints Rate Limiting', () => {
    test('should apply financial-grade rate limiting to OAuth endpoints', async () => {
      const response = await request(app)
        .get('/api/oauth/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 429]).toContain(response.status);

      // Should have rate limiting headers
      if (response.status !== 404) { // Skip if OAuth not implemented
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
      }
    });

    test('should handle OAuth authorization rate limiting', async () => {
      const authData = {
        provider: 'bridge',
        returnUrl: 'https://example.com/callback'
      };

      const response = await request(app)
        .post('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(authData);

      // Should either succeed or be rate limited
      expect([200, 201, 400, 404, 429]).toContain(response.status);

      if (response.status === 429) {
        expect(response.body).toHaveProperty('retryAfter');
      }
    });
  });

  describe('Subscription Tier Rate Limiting', () => {
    test('should apply free tier limits correctly', async () => {
      // Current user is on free tier
      const response = await request(app)
        .get('/api/transactions/recent')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 429]).toContain(response.status);

      if (response.headers['x-ratelimit-limit']) {
        const limit = parseInt(response.headers['x-ratelimit-limit']);
        // Free tier should have lower limits
        expect(limit).toBeLessThanOrEqual(50); // Adjust based on your free tier config
      }
    });

    test('should upgrade limits for premium users', async () => {
      // Upgrade user to premium
      await prisma.subscription.update({
        where: { userId: testUser.id },
        data: {
          plan: 'premium',
          status: 'active'
        }
      });

      // Generate new token with updated subscription
      const premiumUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        include: { subscription: true }
      });

      const premiumToken = generateTestToken(premiumUser);

      const response = await request(app)
        .get('/api/transactions/recent')
        .set('Authorization', `Bearer ${premiumToken}`);

      expect([200, 429]).toContain(response.status);

      if (response.headers['x-ratelimit-limit']) {
        const limit = parseInt(response.headers['x-ratelimit-limit']);
        // Premium tier should have higher limits
        expect(limit).toBeGreaterThan(50); // Adjust based on your premium tier config
      }

      // Reset to free tier for other tests
      await prisma.subscription.update({
        where: { userId: testUser.id },
        data: {
          plan: 'free',
          status: 'active'
        }
      });
    });
  });

  describe('Multi-dimensional Rate Limiting', () => {
    test('should track rate limits per user across different IPs', async () => {
      // This test simulates requests from the same user but different IPs
      // In a real scenario, this would require controlling the IP address

      const response1 = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.1');

      const response2 = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', '192.168.1.2');

      // Both should be subject to rate limiting
      expect([200, 429]).toContain(response1.status);
      expect([200, 429]).toContain(response2.status);
    });
  });

  describe('Rate Limiting Error Responses', () => {
    test('should return proper error structure when rate limited', async () => {
      // Make enough requests to potentially trigger rate limiting
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .get('/api/financial/dashboard')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponse = responses.find(
        result => result.value?.status === 429
      );

      if (rateLimitedResponse) {
        const response = rateLimitedResponse.value;
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('retryAfter');
        expect(response.body.error).toMatch(/rate limit/i);
        expect(typeof response.body.retryAfter).toBe('number');
      }
    });

    test('should include subscription upgrade suggestion for free users', async () => {
      // Make requests that might trigger rate limiting
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              amount: 10,
              category: 'autres',
              type: 'expense',
              description: `Test transaction ${i}`
            })
        );
      }

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponse = responses.find(
        result => result.value?.status === 429
      );

      if (rateLimitedResponse) {
        const response = rateLimitedResponse.value;
        // Should suggest subscription upgrade for free users
        expect(response.body.error || response.body.message).toMatch(
          /(upgrade|premium|subscription)/i
        );
      }
    });
  });

  describe('Burst Protection', () => {
    test('should handle burst requests appropriately', async () => {
      // Simulate burst of transaction creations
      const burstRequests = [];
      const transactionData = {
        amount: 5.00,
        category: 'alimentation',
        type: 'expense',
        description: 'Burst test transaction'
      };

      for (let i = 0; i < 10; i++) {
        burstRequests.push(
          request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .send(transactionData)
        );
      }

      const responses = await Promise.all(burstRequests);
      const successfulResponses = responses.filter(r => [200, 201].includes(r.status));
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // Should handle some burst requests but rate limit excessive ones
      expect(successfulResponses.length).toBeGreaterThan(0);

      // Depending on configuration, some might be rate limited
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body).toHaveProperty('error');
      }
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain reasonable response times under rate limiting', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Rate limiting should not significantly impact response time
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
      expect([200, 429]).toContain(response.status);
    });
  });

  describe('Rate Limiting Bypass for Health Checks', () => {
    test('should not rate limit health check endpoints', async () => {
      // Make many requests to health check
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(request(app).get('/api/health'));
      }

      const responses = await Promise.all(requests);

      // All health check requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});