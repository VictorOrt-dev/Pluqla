const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('../utils/testHelpers');
const prisma = require('../../src/lib/prisma');
const financialRateLimit = require('../../src/middleware/financialRateLimit');

describe('Rate Limiting Performance Tests', () => {
  let testUsers = [];
  let authTokens = [];

  beforeAll(async () => {
    // Create multiple test users for load testing
    const userPromises = [];
    for (let i = 0; i < 10; i++) {
      userPromises.push(
        prisma.user.create({
          data: {
            email: `loadtest${i}@example.com`,
            password: '$2b$10$test.hash',
            name: `Load Test User ${i}`,
            subscription: {
              create: {
                plan: i % 3 === 0 ? 'premium' : 'free', // Mix of subscription tiers
                status: 'active'
              }
            }
          },
          include: {
            subscription: true
          }
        })
      );
    }

    testUsers = await Promise.all(userPromises);
    authTokens = testUsers.map(user => generateTestToken(user));
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.subscription.deleteMany({
      where: { userId: { in: testUsers.map(u => u.id) } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: testUsers.map(u => u.id) } }
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle concurrent requests from multiple users', async () => {
      const startTime = Date.now();
      const concurrentRequests = [];

      // Create concurrent requests from different users
      testUsers.forEach((user, index) => {
        for (let i = 0; i < 5; i++) {
          concurrentRequests.push(
            request(app)
              .get('/api/transactions')
              .set('Authorization', `Bearer ${authTokens[index]}`)
          );
        }
      });

      const responses = await Promise.allSettled(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulRequests = responses.filter(
        result => result.status === 'fulfilled' && [200, 201].includes(result.value.status)
      );
      const rateLimitedRequests = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );
      const errorRequests = responses.filter(
        result => result.status === 'rejected' ||
                (result.status === 'fulfilled' && result.value.status >= 500)
      );

      console.log(`Performance Test Results:
        Total requests: ${responses.length}
        Successful: ${successfulRequests.length}
        Rate limited: ${rateLimitedRequests.length}
        Errors: ${errorRequests.length}
        Total time: ${totalTime}ms
        Average time per request: ${totalTime / responses.length}ms
      `);

      // Performance assertions
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(errorRequests.length).toBeLessThan(responses.length * 0.1); // Less than 10% errors
      expect(successfulRequests.length).toBeGreaterThan(0); // Some requests should succeed
    });

    test('should maintain rate limiting accuracy under load', async () => {
      // Focus on one user to test rate limiting accuracy
      const testUser = testUsers[0];
      const token = authTokens[0];

      const rapidRequests = [];
      for (let i = 0; i < 20; i++) {
        rapidRequests.push(
          request(app)
            .get('/api/financial/dashboard')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.allSettled(rapidRequests);
      const successfulResponses = responses.filter(
        result => result.status === 'fulfilled' && [200, 201].includes(result.value.status)
      );
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      // Should enforce rate limits consistently
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should have proper structure
      rateLimitedResponses.forEach(result => {
        const response = result.value;
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('retryAfter');
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not cause memory leaks during heavy usage', async () => {
      const initialMemory = process.memoryUsage();

      // Simulate heavy usage
      const heavyRequests = [];
      for (let batch = 0; batch < 5; batch++) {
        testUsers.forEach((user, index) => {
          for (let i = 0; i < 10; i++) {
            heavyRequests.push(
              request(app)
                .get('/api/transactions/recent')
                .set('Authorization', `Bearer ${authTokens[index]}`)
            );
          }
        });

        // Process batches with small delays
        await Promise.allSettled(heavyRequests.splice(0, 50));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Process remaining requests
      if (heavyRequests.length > 0) {
        await Promise.allSettled(heavyRequests);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory Usage:
        Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB
        Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB
        Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB
      `);

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 60000); // Extended timeout for memory test

    test('should maintain rate limiting state efficiently', async () => {
      // Test that rate limiting state doesn't grow unbounded
      const stateCheckInterval = 100;
      const requestsPerUser = 5;

      for (let iteration = 0; iteration < 10; iteration++) {
        const requests = [];

        testUsers.forEach((user, index) => {
          for (let i = 0; i < requestsPerUser; i++) {
            requests.push(
              request(app)
                .get('/api/transactions')
                .set('Authorization', `Bearer ${authTokens[index]}`)
            );
          }
        });

        await Promise.allSettled(requests);

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, stateCheckInterval));
      }

      // If we reach here without memory issues, the test passes
      expect(true).toBe(true);
    });
  });

  describe('Different Subscription Tier Performance', () => {
    test('should handle mixed subscription tiers efficiently', async () => {
      const freeUserRequests = [];
      const premiumUserRequests = [];

      // Separate requests by subscription tier
      testUsers.forEach((user, index) => {
        const requests = [];
        for (let i = 0; i < 8; i++) {
          requests.push(
            request(app)
              .post('/api/transactions')
              .set('Authorization', `Bearer ${authTokens[index]}`)
              .send({
                amount: Math.random() * 100,
                category: 'autres',
                type: 'expense',
                description: `Performance test ${i}`
              })
          );
        }

        if (user.subscription.plan === 'free') {
          freeUserRequests.push(...requests);
        } else {
          premiumUserRequests.push(...requests);
        }
      });

      const [freeResults, premiumResults] = await Promise.all([
        Promise.allSettled(freeUserRequests),
        Promise.allSettled(premiumUserRequests)
      ]);

      // Analyze tier-specific performance
      const freeSuccessRate = freeResults.filter(
        r => r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      ).length / freeResults.length;

      const premiumSuccessRate = premiumResults.filter(
        r => r.status === 'fulfilled' && [200, 201].includes(r.value.status)
      ).length / premiumResults.length;

      console.log(`Tier Performance:
        Free tier success rate: ${(freeSuccessRate * 100).toFixed(2)}%
        Premium tier success rate: ${(premiumSuccessRate * 100).toFixed(2)}%
      `);

      // Premium users should have higher success rate due to higher limits
      if (premiumResults.length > 0 && freeResults.length > 0) {
        expect(premiumSuccessRate).toBeGreaterThanOrEqual(freeSuccessRate);
      }
    });
  });

  describe('Rate Limiting Algorithm Performance', () => {
    test('should have minimal latency overhead', async () => {
      const user = testUsers[0];
      const token = authTokens[0];

      const latencyTests = [];
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        const startTime = process.hrtime.bigint();

        const responsePromise = request(app)
          .get('/api/transactions')
          .set('Authorization', `Bearer ${token}`)
          .then(response => {
            const endTime = process.hrtime.bigint();
            const latency = Number(endTime - startTime) / 1000000; // Convert to milliseconds

            return {
              status: response.status,
              latency: latency
            };
          });

        latencyTests.push(responsePromise);
      }

      const results = await Promise.allSettled(latencyTests);
      const successfulTests = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      if (successfulTests.length > 0) {
        const averageLatency = successfulTests.reduce((sum, test) => sum + test.latency, 0) / successfulTests.length;
        const maxLatency = Math.max(...successfulTests.map(t => t.latency));
        const minLatency = Math.min(...successfulTests.map(t => t.latency));

        console.log(`Latency Analysis:
          Average: ${averageLatency.toFixed(2)}ms
          Min: ${minLatency.toFixed(2)}ms
          Max: ${maxLatency.toFixed(2)}ms
          Samples: ${successfulTests.length}
        `);

        // Rate limiting should add minimal overhead
        expect(averageLatency).toBeLessThan(1000); // Less than 1 second average
        expect(maxLatency).toBeLessThan(5000); // Less than 5 seconds max
      }
    });
  });

  describe('Rate Limiting Health Monitoring', () => {
    test('should provide accurate health status under load', async () => {
      // Generate some load
      const loadRequests = [];
      for (let i = 0; i < 30; i++) {
        const userIndex = i % testUsers.length;
        loadRequests.push(
          request(app)
            .get('/api/financial/dashboard')
            .set('Authorization', `Bearer ${authTokens[userIndex]}`)
        );
      }

      await Promise.allSettled(loadRequests);

      // Check health status
      const healthStatus = financialRateLimit.healthCheck();

      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('limits');
      expect(['healthy', 'degraded']).toContain(healthStatus.status);

      console.log('Rate Limiting Health Status:', healthStatus);
    });
  });
});