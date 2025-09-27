/**
 * Performance Monitoring Tests
 *
 * Tests for Phase 3 performance monitoring features:
 * - PerformanceService functionality
 * - Prisma middleware performance tracking
 * - API endpoint performance tracking
 * - Slow query detection
 * - Performance metrics aggregation
 */

const { performanceMonitor, PerformanceMonitor } = require('../../src/services/performanceService');

describe('Performance Monitoring', () => {
  let testMonitor;

  beforeEach(() => {
    testMonitor = new PerformanceMonitor();
    testMonitor.reset();
  });

  describe('API Performance Tracking', () => {
    test('should track API call performance', () => {
      const endpoint = 'GET /users/me';
      const duration = 150;
      const statusCode = 200;

      testMonitor.trackApiCall(endpoint, 'GET', duration, statusCode);

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(1);
      expect(metrics.summary.slowApiCalls).toBe(0);
      expect(metrics.topSlowApiEndpoints).toHaveLength(1);
      expect(metrics.topSlowApiEndpoints[0].endpoint).toBe(endpoint);
      expect(metrics.topSlowApiEndpoints[0].averageTime).toBe(duration);
    });

    test('should detect slow API calls', () => {
      const endpoint = 'GET /financial/dashboard';
      const slowDuration = 3000; // 3 seconds - above threshold

      testMonitor.trackApiCall(endpoint, 'GET', slowDuration, 200);

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.slowApiCalls).toBe(1);
    });

    test('should calculate average performance across multiple calls', () => {
      const endpoint = 'GET /transactions';
      const durations = [100, 200, 300, 400, 500];

      durations.forEach(duration => {
        testMonitor.trackApiCall(endpoint, 'GET', duration, 200);
      });

      const metrics = testMonitor.getMetricsSummary();
      const endpointMetric = metrics.topSlowApiEndpoints.find(m => m.endpoint === endpoint);

      expect(endpointMetric.totalCalls).toBe(5);
      expect(endpointMetric.averageTime).toBe(300); // Average of durations
    });

    test('should track status codes distribution', () => {
      const endpoint = 'GET /users/profile';

      testMonitor.trackApiCall(endpoint, 'GET', 100, 200);
      testMonitor.trackApiCall(endpoint, 'GET', 150, 200);
      testMonitor.trackApiCall(endpoint, 'GET', 120, 404);
      testMonitor.trackApiCall(endpoint, 'GET', 180, 500);

      const apiMetrics = testMonitor.metrics.api.get(endpoint);
      expect(apiMetrics.statusCodes['200']).toBe(2);
      expect(apiMetrics.statusCodes['404']).toBe(1);
      expect(apiMetrics.statusCodes['500']).toBe(1);
    });
  });

  describe('Database Performance Tracking', () => {
    test('should track database query performance', () => {
      const query = 'User.findMany';
      const duration = 50;

      testMonitor.trackDatabaseQuery(query, duration);

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.totalDbQueries).toBe(1);
      expect(metrics.summary.slowDbQueries).toBe(0);
      expect(metrics.topSlowDatabaseQueries).toHaveLength(1);
      expect(metrics.topSlowDatabaseQueries[0].query).toBe(query);
    });

    test('should detect slow database queries', () => {
      const query = 'Transaction.aggregateRaw';
      const slowDuration = 1500; // 1.5 seconds - above threshold

      testMonitor.trackDatabaseQuery(query, slowDuration);

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.slowDbQueries).toBe(1);
    });

    test('should normalize similar queries', () => {
      testMonitor.trackDatabaseQuery('User.findUnique({ where: { id: "123" } })', 100);
      testMonitor.trackDatabaseQuery('User.findUnique({ where: { id: "456" } })', 120);
      testMonitor.trackDatabaseQuery('User.findUnique({ where: { id: "789" } })', 80);

      const normalizedQuery = testMonitor.normalizeQuery('User.findUnique({ where: { id: "123" } })');
      const metrics = testMonitor.metrics.database.get(normalizedQuery);

      expect(metrics.count).toBe(3);
      expect(Math.round(metrics.averageTime)).toBe(100); // (100+120+80)/3
    });

    test('should handle malformed queries gracefully', () => {
      expect(() => {
        testMonitor.trackDatabaseQuery(null, 100);
      }).not.toThrow();

      expect(() => {
        testMonitor.trackDatabaseQuery(undefined, 100);
      }).not.toThrow();

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.totalDbQueries).toBe(2);
    });
  });

  describe('Performance Metrics Aggregation', () => {
    test('should provide comprehensive metrics summary', () => {
      // Add some test data
      testMonitor.trackApiCall('GET /users', 'GET', 100, 200);
      testMonitor.trackApiCall('POST /transactions', 'POST', 2500, 201); // Slow
      testMonitor.trackDatabaseQuery('User.findMany', 50);
      testMonitor.trackDatabaseQuery('Transaction.create', 1200); // Slow

      const metrics = testMonitor.getMetricsSummary();

      expect(metrics.summary).toMatchObject({
        totalApiCalls: 2,
        totalDbQueries: 2,
        slowApiCalls: 1,
        slowDbQueries: 1
      });

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.topSlowApiEndpoints).toHaveLength(2);
      expect(metrics.topSlowDatabaseQueries).toHaveLength(2);
    });

    test('should sort endpoints by average time', () => {
      testMonitor.trackApiCall('GET /fast', 'GET', 50, 200);
      testMonitor.trackApiCall('GET /medium', 'GET', 150, 200);
      testMonitor.trackApiCall('GET /slow', 'GET', 300, 200);

      const metrics = testMonitor.getMetricsSummary();
      const endpoints = metrics.topSlowApiEndpoints;

      expect(endpoints[0].endpoint).toBe('GET /slow');
      expect(endpoints[1].endpoint).toBe('GET /medium');
      expect(endpoints[2].endpoint).toBe('GET /fast');
    });

    test('should calculate performance percentages correctly', () => {
      // Add 10 API calls, 3 of which are slow
      for (let i = 0; i < 7; i++) {
        testMonitor.trackApiCall('GET /fast', 'GET', 100, 200);
      }
      for (let i = 0; i < 3; i++) {
        testMonitor.trackApiCall('GET /slow', 'GET', 3000, 200);
      }

      const metrics = testMonitor.getMetricsSummary();
      const slowEndpoint = metrics.topSlowApiEndpoints.find(e => e.endpoint === 'GET /slow');

      expect(slowEndpoint.slowCallPercentage).toBe('100.0'); // All slow calls are slow
      expect(slowEndpoint.totalCalls).toBe(3);
      expect(slowEndpoint.slowCalls).toBe(3);
    });
  });

  describe('Performance Thresholds', () => {
    test('should use default thresholds', () => {
      expect(testMonitor.metrics.slowQueriesThreshold).toBe(1000);
      expect(testMonitor.metrics.slowApiThreshold).toBe(2000);
    });

    test('should update thresholds', () => {
      const newQueryThreshold = 500;
      const newApiThreshold = 1500;

      testMonitor.updateThresholds(newQueryThreshold, newApiThreshold);

      expect(testMonitor.metrics.slowQueriesThreshold).toBe(newQueryThreshold);
      expect(testMonitor.metrics.slowApiThreshold).toBe(newApiThreshold);
    });

    test('should apply new thresholds to detection', () => {
      testMonitor.updateThresholds(100, 150); // Very low thresholds

      testMonitor.trackApiCall('GET /test', 'GET', 200, 200); // Should be slow
      testMonitor.trackDatabaseQuery('Test.query', 150); // Should be slow

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.slowApiCalls).toBe(1);
      expect(metrics.summary.slowDbQueries).toBe(1);
    });
  });

  describe('Reset and Cleanup', () => {
    test('should reset all metrics', () => {
      testMonitor.trackApiCall('GET /test', 'GET', 100, 200);
      testMonitor.trackDatabaseQuery('Test.query', 50);

      expect(testMonitor.metrics.api.size).toBeGreaterThan(0);
      expect(testMonitor.metrics.database.size).toBeGreaterThan(0);

      testMonitor.reset();

      expect(testMonitor.metrics.api.size).toBe(0);
      expect(testMonitor.metrics.database.size).toBe(0);

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(0);
      expect(metrics.summary.totalDbQueries).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero duration gracefully', () => {
      expect(() => {
        testMonitor.trackApiCall('GET /instant', 'GET', 0, 200);
        testMonitor.trackDatabaseQuery('Instant.query', 0);
      }).not.toThrow();

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.totalApiCalls).toBe(1);
      expect(metrics.summary.totalDbQueries).toBe(1);
    });

    test('should handle negative duration gracefully', () => {
      expect(() => {
        testMonitor.trackApiCall('GET /negative', 'GET', -100, 200);
        testMonitor.trackDatabaseQuery('Negative.query', -50);
      }).not.toThrow();
    });

    test('should handle very large durations', () => {
      const largeDuration = 999999;

      testMonitor.trackApiCall('GET /huge', 'GET', largeDuration, 200);
      testMonitor.trackDatabaseQuery('Huge.query', largeDuration);

      const metrics = testMonitor.getMetricsSummary();
      expect(metrics.summary.slowApiCalls).toBe(1);
      expect(metrics.summary.slowDbQueries).toBe(1);
    });

    test('should handle empty endpoint names', () => {
      expect(() => {
        testMonitor.trackApiCall('', 'GET', 100, 200);
        testMonitor.trackApiCall(null, 'POST', 150, 201);
      }).not.toThrow();
    });
  });

  describe('Periodic Logging', () => {
    test('should trigger summary logging at specified intervals', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      // Track 100 API calls to trigger logging
      for (let i = 0; i < 100; i++) {
        testMonitor.trackApiCall('GET /batch', 'GET', 100, 200);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Performance Summary'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    test('should trigger database logging at specified intervals', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      // Track 50 database queries to trigger logging
      for (let i = 0; i < 50; i++) {
        testMonitor.trackDatabaseQuery('Batch.query', 50);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database Performance Summary'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('Global Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.reset();
  });

  test('should be a singleton instance', () => {
    const { performanceMonitor: monitor1 } = require('../../src/services/performanceService');
    const { performanceMonitor: monitor2 } = require('../../src/services/performanceService');

    expect(monitor1).toBe(monitor2);
    expect(monitor1).toBe(performanceMonitor);
  });

  test('should maintain state across requires', () => {
    performanceMonitor.trackApiCall('GET /persistent', 'GET', 100, 200);

    const { performanceMonitor: newRef } = require('../../src/services/performanceService');
    const metrics = newRef.getMetricsSummary();

    expect(metrics.summary.totalApiCalls).toBe(1);
  });
});