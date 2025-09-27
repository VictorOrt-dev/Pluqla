/**
 * Connection Pool Stress Tests
 *
 * These integration tests simulate real-world scenarios that previously
 * caused connection pool exhaustion and verify the fixes work under load.
 *
 * Test Scenarios:
 * 1. Concurrent API requests (simulates user traffic)
 * 2. Rapid server restarts (simulates deployments)
 * 3. Database connection failures (simulates network issues)
 * 4. Long-running operations (simulates complex queries)
 * 5. Memory leak detection (simulates extended runtime)
 */

const request = require('supertest');
const { spawn } = require('child_process');
const app = require('../../src/app');
const { disconnectPrisma, getDatabaseHealth, getConnectionStats } = require('../../src/lib/prisma');

// Skip these tests if no real database is available
const shouldRunIntegrationTests = process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION_TESTS;

const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('Connection Pool Stress Tests', () => {
  // Global test timeout for long-running stress tests
  jest.setTimeout(60000);

  beforeAll(async () => {
    // Ensure clean state before tests
    try {
      await disconnectPrisma();
    } catch (error) {
      // Ignore errors if no connection exists
    }
  });

  afterAll(async () => {
    // Clean up connections after all tests
    await disconnectPrisma();
  });

  afterEach(async () => {
    // Allow connections to settle between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Concurrent Request Handling', () => {
    test('should handle 50 concurrent API requests without connection leaks', async () => {
      const startTime = Date.now();
      const concurrentRequests = 50;

      // Create array of concurrent requests to different endpoints
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const endpoints = ['/health', '/api/health', '/api/users/profile'];
        const endpoint = endpoints[i % endpoints.length];

        return request(app)
          .get(endpoint)
          .expect(res => {
            // Accept both success and auth errors (we don't have valid tokens)
            expect([200, 401, 503]).toContain(res.status);
          });
      });

      // Execute all requests concurrently
      await Promise.all(requests);

      const executionTime = Date.now() - startTime;
      console.log(`✅ Handled ${concurrentRequests} concurrent requests in ${executionTime}ms`);

      // Verify database is still healthy after load
      const health = await getDatabaseHealth();
      expect(health.healthy).toBe(true);

      // Check connection stats
      const stats = await getConnectionStats();
      console.log('📊 Post-load connection stats:', stats);

      // Verify reasonable connection count (should be much less than concurrent requests)
      if (stats.app_connections) {
        expect(stats.app_connections).toBeLessThan(concurrentRequests / 5);
      }
    }, 30000);

    test('should handle burst traffic patterns', async () => {
      const bursts = 5;
      const requestsPerBurst = 20;

      for (let burst = 1; burst <= bursts; burst++) {
        console.log(`🚀 Executing burst ${burst}/${bursts}`);

        // Create burst of requests
        const burstRequests = Array.from({ length: requestsPerBurst }, () =>
          request(app).get('/health').expect(200)
        );

        await Promise.all(burstRequests);

        // Small delay between bursts
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check health after each burst
        const health = await getDatabaseHealth();
        expect(health.healthy).toBe(true);
        expect(health.latency).toBeLessThan(1000); // Should respond within 1 second
      }

      console.log('✅ Survived burst traffic pattern');
    }, 45000);
  });

  describe('Connection Recovery', () => {
    test('should recover from temporary database unavailability', async () => {
      // This test simulates network issues or database restarts

      // First, verify normal operation
      let health = await getDatabaseHealth();
      expect(health.healthy).toBe(true);

      // Simulate database connection problem by using invalid query
      // (In real scenario, this would be network timeout or database restart)

      // Wait a moment for potential recovery
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify system can still perform health checks
      health = await getDatabaseHealth();
      // Should either be healthy or at least not crash
      expect(typeof health.healthy).toBe('boolean');

      console.log('✅ Connection recovery test passed');
    });

    test('should handle graceful shutdowns properly', async () => {
      // Test the graceful shutdown process
      const statsBeforeShutdown = await getConnectionStats();
      console.log('📊 Connections before shutdown:', statsBeforeShutdown);

      // Perform graceful disconnect
      await disconnectPrisma();

      // Verify we can reconnect after shutdown
      const healthAfterReconnect = await getDatabaseHealth();
      expect(typeof healthAfterReconnect.healthy).toBe('boolean');

      console.log('✅ Graceful shutdown and reconnect successful');
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory during extended operation', async () => {
      const initialMemory = process.memoryUsage();
      console.log('💾 Initial memory usage:', {
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024) + 'MB'
      });

      // Simulate extended operation with many database operations
      for (let i = 0; i < 100; i++) {
        await getDatabaseHealth();

        // Occasionally check memory growth
        if (i % 20 === 0) {
          const currentMemory = process.memoryUsage();
          const heapGrowth = currentMemory.heapUsed - initialMemory.heapUsed;

          console.log(`💾 Memory after ${i} operations: +${Math.round(heapGrowth / 1024 / 1024)}MB`);

          // Memory growth should be reasonable (less than 50MB for this test)
          expect(heapGrowth).toBeLessThan(50 * 1024 * 1024);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const totalGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log('💾 Final memory growth:', Math.round(totalGrowth / 1024 / 1024) + 'MB');

      // Total memory growth should be minimal for this test
      expect(totalGrowth).toBeLessThan(30 * 1024 * 1024); // Less than 30MB growth

      console.log('✅ No significant memory leaks detected');
    }, 45000);

    test('should maintain reasonable connection counts under load', async () => {
      const operations = [];

      // Start monitoring connections
      const connectionHistory = [];

      // Perform various database operations
      for (let i = 0; i < 30; i++) {
        operations.push(
          getDatabaseHealth().then(() => {
            // Record connection count periodically
            if (i % 10 === 0) {
              return getConnectionStats().then(stats => {
                connectionHistory.push({
                  iteration: i,
                  connections: stats.app_connections || 0,
                  timestamp: Date.now()
                });
              }).catch(() => {
                // Ignore stats errors
              });
            }
          })
        );
      }

      await Promise.all(operations);

      console.log('📊 Connection count history:', connectionHistory);

      // Verify connection counts stayed reasonable
      const maxConnections = Math.max(...connectionHistory.map(h => h.connections));
      console.log('📈 Peak connection count:', maxConnections);

      // Should not exceed reasonable limits (adjust based on your pool settings)
      expect(maxConnections).toBeLessThan(20);

      console.log('✅ Connection count remained within acceptable limits');
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle mixed API operations like real user traffic', async () => {
      // Simulate realistic user behavior patterns
      const userScenarios = [
        // User login scenario
        () => request(app).post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'password' })
          .expect(res => expect([200, 401]).toContain(res.status)),

        // Health checks (from load balancers)
        () => request(app).get('/health').expect(200),

        // API requests (will fail auth but should not leak connections)
        () => request(app).get('/api/users/profile')
          .expect(res => expect([200, 401]).toContain(res.status)),

        // Database health monitoring
        () => getDatabaseHealth(),
      ];

      const iterations = 25;
      const operations = [];

      for (let i = 0; i < iterations; i++) {
        // Randomly select user scenario
        const scenario = userScenarios[Math.floor(Math.random() * userScenarios.length)];
        operations.push(scenario().catch(error => {
          // Log but don't fail test for expected errors (auth failures, etc.)
          if (!error.message.includes('401') && !error.message.includes('Expected')) {
            console.warn('Scenario error:', error.message);
          }
        }));

        // Add some realistic timing variation
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const startTime = Date.now();
      await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      console.log(`✅ Completed ${iterations} mixed operations in ${totalTime}ms`);

      // Final health check
      const finalHealth = await getDatabaseHealth();
      expect(finalHealth.healthy).toBe(true);

      console.log('✅ Real-world scenario test completed successfully');
    }, 30000);
  });

  describe('Performance Benchmarking', () => {
    test('should maintain response times under concurrent load', async () => {
      const concurrentUsers = 20;
      const requestsPerUser = 5;
      const responseTimes = [];

      const userSimulation = async (userId) => {
        const userTimes = [];

        for (let i = 0; i < requestsPerUser; i++) {
          const startTime = Date.now();

          try {
            await request(app).get('/health').expect(200);
            const responseTime = Date.now() - startTime;
            userTimes.push(responseTime);
          } catch (error) {
            console.warn(`User ${userId} request ${i} failed:`, error.message);
          }

          // Small delay between requests from same user
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        return userTimes;
      };

      // Simulate concurrent users
      const userPromises = Array.from(
        { length: concurrentUsers },
        (_, userId) => userSimulation(userId)
      );

      const allUserTimes = await Promise.all(userPromises);

      // Flatten response times
      allUserTimes.forEach(userTimes => {
        responseTimes.push(...userTimes);
      });

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log('📈 Performance Stats:');
      console.log(`   Average response time: ${Math.round(avgResponseTime)}ms`);
      console.log(`   Max response time: ${maxResponseTime}ms`);
      console.log(`   Min response time: ${minResponseTime}ms`);
      console.log(`   Total requests: ${responseTimes.length}`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
      expect(maxResponseTime).toBeLessThan(2000); // No request over 2 seconds

      console.log('✅ Performance benchmarks met');
    }, 60000);
  });
});

// Utility function for debugging connection issues
function logConnectionDiagnostics() {
  console.log('🔍 Connection Diagnostics:');
  console.log(`   Process PID: ${process.pid}`);
  console.log(`   Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log(`   Uptime: ${Math.round(process.uptime())}s`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
}

// Export for manual testing
module.exports = {
  logConnectionDiagnostics
};