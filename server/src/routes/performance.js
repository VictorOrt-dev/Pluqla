/**
 * Performance Monitoring Routes
 *
 * Provides endpoints for:
 * - Getting performance metrics
 * - Resetting metrics (for testing)
 * - Updating performance thresholds
 */

const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  performanceMetricsHandler,
  resetMetricsHandler,
  updateThresholdsHandler
} = require('../middleware/performanceMiddleware');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/performance/metrics
 * Get comprehensive performance metrics
 * Requires authentication
 */
router.get('/metrics', authenticateToken, performanceMetricsHandler);

/**
 * POST /api/performance/reset
 * Reset all performance metrics (useful for testing)
 * Requires admin authentication in production
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/reset', resetMetricsHandler);
} else {
  router.post('/reset', requireAdmin, resetMetricsHandler);
}

/**
 * PUT /api/performance/thresholds
 * Update performance monitoring thresholds
 * Requires admin authentication
 */
router.put('/thresholds', requireAdmin, updateThresholdsHandler);

/**
 * GET /api/performance/health
 * Get system health metrics including database performance
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const { getDatabaseHealth, getConnectionStats } = require('../lib/prisma');
    const { performanceMonitor } = require('../services/performanceService');

    // Get database health
    const dbHealth = await getDatabaseHealth();

    // Get connection stats
    let connectionStats = null;
    if (dbHealth.healthy) {
      try {
        connectionStats = await getConnectionStats();
      } catch (error) {
        // Connection stats are optional
        console.warn('Failed to get connection stats:', error.message);
      }
    }

    // Get performance summary
    const performanceSummary = performanceMonitor.getMetricsSummary();

    res.json({
      success: true,
      message: 'System health retrieved successfully',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        database: {
          healthy: dbHealth.healthy,
          latency: dbHealth.latency,
          error: dbHealth.error || null,
          connections: connectionStats
        },
        performance: {
          totalApiCalls: performanceSummary.summary.totalApiCalls,
          totalDbQueries: performanceSummary.summary.totalDbQueries,
          slowApiCalls: performanceSummary.summary.slowApiCalls,
          slowDbQueries: performanceSummary.summary.slowDbQueries,
          thresholds: {
            slowApiThreshold: performanceMonitor.metrics.slowApiThreshold,
            slowQueriesThreshold: performanceMonitor.metrics.slowQueriesThreshold
          }
        },
        memory: {
          usage: process.memoryUsage(),
          freeMemory: require('os').freemem(),
          totalMemory: require('os').totalmem()
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
      error: error.message
    });
  }
});

module.exports = router;