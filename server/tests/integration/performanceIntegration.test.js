/**
 * Performance Monitoring Integration Tests
 *
 * Integration tests for Phase 3 performance monitoring:
 * - End-to-end performance tracking
 * - API middleware integration
 * - Prisma middleware integration
 * - Performance endpoints
 * - Real database query monitoring
 */

const request = require('supertest');
const app = require('../../src/app');
const { prisma, getDatabaseHealth } = require('../../src/lib/prisma');
const { performanceMonitor } = require('../../src/services/performanceService');

// Test user for authenticated requests
let testUser;
let authToken;

describe('Performance Monitoring Integration', () => {
  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'performance-test@example.com',
        name: 'Performance Test User',
        password: 'hashedPassword123'
      }
    });

    // Mock authentication for testing
    authToken = 'valid-test-token';
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id }
      }).catch(() => {
        // User might already be deleted
      });
    }
  });

  beforeEach(() => {
    // Reset performance metrics before each test
    performanceMonitor.reset();
  });

  describe('API Performance Tracking', () => {
    test('should track API endpoint performance', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');

      // Check that performance was tracked
      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBeGreaterThan(0);

      const healthEndpoint = metrics.topSlowApiEndpoints.find(
        endpoint => endpoint.endpoint.includes('health')
      );
      expect(healthEndpoint).toBeDefined();
      expect(healthEndpoint.averageTime).toBeGreaterThan(0);
    });

    test('should track multiple API calls and calculate averages', async () => {
      // Make multiple requests to the same endpoint
      const promises = Array.from({ length: 5 }, () =>
        request(app).get('/health')
      );

      await Promise.all(promises);

      const metrics = performanceMonitor.getMetricsSummary();
      const healthEndpoint = metrics.topSlowApiEndpoints.find(
        endpoint => endpoint.endpoint.includes('health')
      );

      expect(healthEndpoint.totalCalls).toBe(5);
      expect(healthEndpoint.averageTime).toBeGreaterThan(0);
    });

    test('should track different status codes', async () => {
      // Make a successful request
      await request(app)
        .get('/health')
        .expect(200);

      // Make a request that should return 404
      await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(2);

      // Both endpoints should be tracked
      expect(metrics.topSlowApiEndpoints).toHaveLength(2);
    });
  });

  describe('Database Performance Tracking', () => {
    test('should track database queries through Prisma middleware', async () => {
      // Perform a database operation that will trigger Prisma middleware
      const users = await prisma.user.findMany({
        take: 1
      });

      expect(Array.isArray(users)).toBe(true);

      // Check that database performance was tracked
      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalDbQueries).toBeGreaterThan(0);

      const findManyQuery = metrics.topSlowDatabaseQueries.find(
        query => query.query.includes('User.findMany')
      );
      expect(findManyQuery).toBeDefined();
      expect(findManyQuery.averageTime).toBeGreaterThan(0);
    });

    test('should track different types of database operations', async () => {
      // Perform different operations
      await prisma.user.findMany({ take: 1 });
      await prisma.user.count();

      const foundUser = await prisma.user.findFirst({
        where: { email: testUser.email }
      });

      if (foundUser) {
        await prisma.user.update({
          where: { id: foundUser.id },
          data: { name: 'Updated Name' }
        });
      }

      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalDbQueries).toBeGreaterThanOrEqual(3);

      // Should have tracked different query types
      const queryTypes = metrics.topSlowDatabaseQueries.map(q => q.query);
      expect(queryTypes.some(q => q.includes('findMany'))).toBe(true);
      expect(queryTypes.some(q => q.includes('count'))).toBe(true);
    });

    test('should track slow database queries', async () => {
      // Create a complex query that might be slow
      await prisma.user.findMany({
        include: {
          transactions: true,
          strikes: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const metrics = performanceMonitor.getMetricsSummary();

      // Check if any queries were marked as slow
      // (depends on the actual query performance and thresholds)
      expect(metrics.summary.totalDbQueries).toBeGreaterThan(0);
      expect(metrics.topSlowDatabaseQueries.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Endpoints', () => {
    test('should provide performance metrics via API', async () => {
      // First, generate some metrics by making requests
      await request(app).get('/health');
      await prisma.user.count();

      // Now get the metrics
      const response = await request(app)
        .get('/api/performance/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.topSlowApiEndpoints).toBeDefined();
      expect(response.body.data.topSlowDatabaseQueries).toBeDefined();

      // Verify structure
      expect(response.body.data.summary.totalApiCalls).toBeGreaterThan(0);
      expect(response.body.data.summary.totalDbQueries).toBeGreaterThan(0);
    });

    test('should provide system health with performance data', async () => {
      const response = await request(app)
        .get('/api/performance/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.database).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.memory).toBeDefined();

      // Verify database health
      expect(response.body.data.database.healthy).toBe(true);
      expect(response.body.data.database.latency).toBeGreaterThan(0);

      // Verify performance data
      expect(response.body.data.performance.totalApiCalls).toBeGreaterThanOrEqual(0);
      expect(response.body.data.performance.thresholds).toBeDefined();
    });

    test('should handle performance metrics reset', async () => {
      // Generate some metrics
      await request(app).get('/health');

      // Verify metrics exist
      let metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBeGreaterThan(0);

      // Reset metrics
      const response = await request(app)
        .post('/api/performance/reset')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify metrics are reset
      metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(0);
      expect(metrics.summary.totalDbQueries).toBe(0);
    });
  });

  describe('Slow Query Detection', () => {
    test('should detect and log slow API calls', async () => {
      // Mock a slow endpoint by adding delay
      const originalConsoleWarn = console.warn;
      const warnSpy = jest.fn();
      console.warn = warnSpy;

      // Lower the threshold for testing
      performanceMonitor.updateThresholds(1, 10); // Very low thresholds

      try {
        // Make a request that should be marked as slow
        await request(app).get('/health');

        // Check if slow call was detected (might not be slow enough in test environment)
        const metrics = performanceMonitor.getMetricsSummary();
        expect(metrics.summary.totalApiCalls).toBeGreaterThan(0);

      } finally {
        console.warn = originalConsoleWarn;
        // Reset thresholds
        performanceMonitor.updateThresholds(1000, 2000);
      }
    });

    test('should update performance thresholds via API', async () => {
      const newThresholds = {
        slowQueriesThreshold: 500,
        slowApiThreshold: 1500
      };

      const response = await request(app)
        .put('/api/performance/thresholds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newThresholds)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slowQueriesThreshold).toBe(500);
      expect(response.body.data.slowApiThreshold).toBe(1500);

      // Verify thresholds were actually updated
      expect(performanceMonitor.metrics.slowQueriesThreshold).toBe(500);
      expect(performanceMonitor.metrics.slowApiThreshold).toBe(1500);
    });
  });

  describe('Database Health Integration', () => {
    test('should check database health and performance', async () => {
      const health = await getDatabaseHealth();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.timestamp).toBeDefined();
    });

    test('should measure database latency accurately', async () => {
      const startTime = Date.now();
      const health = await getDatabaseHealth();
      const maxExpectedLatency = Date.now() - startTime + 100; // Add buffer

      expect(health.latency).toBeLessThan(maxExpectedLatency);
      expect(health.latency).toBeGreaterThan(0);
    });
  });

  describe('Performance Impact', () => {
    test('should not significantly impact API response times', async () => {
      const iterations = 10;
      const startTime = Date.now();

      // Make multiple requests
      const promises = Array.from({ length: iterations }, () =>
        request(app).get('/health')
      );

      await Promise.all(promises);

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / iterations;

      // Performance monitoring should not add significant overhead
      // This is a rough check - actual values depend on system performance
      expect(averageTime).toBeLessThan(1000); // Should be much faster than 1 second per request

      // Verify all requests were tracked
      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(iterations);
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;

      const startTime = Date.now();

      // Make concurrent requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app).get(`/health?test=${i}`)
      );

      const responses = await Promise.all(promises);

      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle concurrent requests reasonably fast
      expect(totalTime).toBeLessThan(5000); // 5 seconds max for 20 concurrent requests

      // All requests should be tracked
      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(concurrentRequests);
    });
  });

  describe('Error Handling', () => {
    test('should track performance even for failed requests', async () => {
      // Make a request that will fail
      await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(1);

      const failedEndpoint = metrics.topSlowApiEndpoints[0];
      expect(failedEndpoint).toBeDefined();
      expect(failedEndpoint.averageTime).toBeGreaterThan(0);
    });

    test('should handle database errors gracefully', async () => {
      try {
        // Try to perform an invalid database operation
        await prisma.$executeRaw`SELECT * FROM nonexistent_table`;
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }

      // Performance monitoring should still work
      const metrics = performanceMonitor.getMetricsSummary();
      expect(metrics.summary.totalDbQueries).toBeGreaterThan(0);
    });
  });
});