/**
 * Performance Monitoring Service
 *
 * Provides comprehensive performance tracking for:
 * - API endpoint response times
 * - Database query performance
 * - Slow query detection
 * - Performance metrics aggregation
 */

const logger = require('../utils/logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      api: new Map(), // endpoint -> { totalTime, count, slowQueries }
      database: new Map(), // query -> { totalTime, count, slowQueries }
      slowQueriesThreshold: 1000, // 1 second
      slowApiThreshold: 2000, // 2 seconds
    };
  }

  /**
   * Track API endpoint performance
   */
  trackApiCall(endpoint, method, duration, statusCode) {
    const key = `${method} ${endpoint}`;

    if (!this.metrics.api.has(key)) {
      this.metrics.api.set(key, {
        totalTime: 0,
        count: 0,
        slowCalls: 0,
        averageTime: 0,
        lastCall: null,
        statusCodes: {}
      });
    }

    const metric = this.metrics.api.get(key);
    metric.totalTime += duration;
    metric.count += 1;
    metric.averageTime = metric.totalTime / metric.count;
    metric.lastCall = new Date().toISOString();
    metric.statusCodes[statusCode] = (metric.statusCodes[statusCode] || 0) + 1;

    // Track slow API calls
    if (duration > this.metrics.slowApiThreshold) {
      metric.slowCalls += 1;
      logger.warn(`🐌 Slow API call detected: ${key} took ${duration}ms`, {
        endpoint: key,
        duration,
        statusCode,
        threshold: this.metrics.slowApiThreshold
      });
    }

    // Log performance every 100 requests for high-traffic endpoints
    if (metric.count % 100 === 0) {
      logger.info(`📊 API Performance Summary: ${key}`, {
        averageTime: Math.round(metric.averageTime),
        totalCalls: metric.count,
        slowCalls: metric.slowCalls,
        slowCallPercentage: ((metric.slowCalls / metric.count) * 100).toFixed(1)
      });
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(query, duration, params = null) {
    // Normalize query (remove specific values for aggregation)
    const normalizedQuery = this.normalizeQuery(query);

    if (!this.metrics.database.has(normalizedQuery)) {
      this.metrics.database.set(normalizedQuery, {
        totalTime: 0,
        count: 0,
        slowQueries: 0,
        averageTime: 0,
        lastQuery: null,
        originalQuery: query
      });
    }

    const metric = this.metrics.database.get(normalizedQuery);
    metric.totalTime += duration;
    metric.count += 1;
    metric.averageTime = metric.totalTime / metric.count;
    metric.lastQuery = new Date().toISOString();

    // Track slow database queries
    if (duration > this.metrics.slowQueriesThreshold) {
      metric.slowQueries += 1;
      logger.warn(`🐌 Slow database query detected: ${duration}ms`, {
        query: normalizedQuery,
        duration,
        params: params ? JSON.stringify(params).substring(0, 200) : null,
        threshold: this.metrics.slowQueriesThreshold
      });
    }

    // Log database performance summary periodically
    if (metric.count % 50 === 0) {
      logger.info(`🗄️ Database Performance Summary: ${normalizedQuery.substring(0, 50)}...`, {
        averageTime: Math.round(metric.averageTime),
        totalQueries: metric.count,
        slowQueries: metric.slowQueries,
        slowQueryPercentage: ((metric.slowQueries / metric.count) * 100).toFixed(1)
      });
    }
  }

  /**
   * Normalize SQL queries for aggregation
   */
  normalizeQuery(query) {
    if (!query) return 'unknown';

    return query
      // Remove specific IDs and values
      .replace(/\$\d+/g, '$?')
      .replace(/\d+/g, '?')
      .replace(/['"][^'"]*['"]/g, '?')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Get performance metrics summary
   */
  getMetricsSummary() {
    const apiMetrics = Array.from(this.metrics.api.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        averageTime: Math.round(data.averageTime),
        totalCalls: data.count,
        slowCalls: data.slowCalls,
        slowCallPercentage: ((data.slowCalls / data.count) * 100).toFixed(1),
        statusCodes: data.statusCodes,
        lastCall: data.lastCall
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    const dbMetrics = Array.from(this.metrics.database.entries())
      .map(([query, data]) => ({
        query: query.substring(0, 80) + (query.length > 80 ? '...' : ''),
        averageTime: Math.round(data.averageTime),
        totalQueries: data.count,
        slowQueries: data.slowQueries,
        slowQueryPercentage: ((data.slowQueries / data.count) * 100).toFixed(1),
        lastQuery: data.lastQuery
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalApiCalls: Array.from(this.metrics.api.values()).reduce((sum, m) => sum + m.count, 0),
        totalDbQueries: Array.from(this.metrics.database.values()).reduce((sum, m) => sum + m.count, 0),
        slowApiCalls: Array.from(this.metrics.api.values()).reduce((sum, m) => sum + m.slowCalls, 0),
        slowDbQueries: Array.from(this.metrics.database.values()).reduce((sum, m) => sum + m.slowQueries, 0)
      },
      topSlowApiEndpoints: apiMetrics.slice(0, 10),
      topSlowDatabaseQueries: dbMetrics.slice(0, 10)
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.metrics.api.clear();
    this.metrics.database.clear();
  }

  /**
   * Update thresholds for slow query/API detection
   */
  updateThresholds(slowQueriesThreshold, slowApiThreshold) {
    this.metrics.slowQueriesThreshold = slowQueriesThreshold || this.metrics.slowQueriesThreshold;
    this.metrics.slowApiThreshold = slowApiThreshold || this.metrics.slowApiThreshold;

    logger.info('📊 Performance thresholds updated', {
      slowQueriesThreshold: this.metrics.slowQueriesThreshold,
      slowApiThreshold: this.metrics.slowApiThreshold
    });
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  performanceMonitor,
  PerformanceMonitor
};