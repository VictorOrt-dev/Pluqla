/**
 * Performance Monitoring Middleware
 *
 * Tracks API endpoint performance including:
 * - Response times
 * - Status codes
 * - Slow endpoint detection
 * - Request/response metrics
 */

const { performanceMonitor } = require('../services/performanceService');
const logger = require('../utils/logger');

/**
 * Express middleware to track API performance
 */
function performanceMiddleware(req, res, next) {
  const startTime = Date.now();

  // Store original res.end to capture when response is sent
  const originalEnd = res.end;

  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;

    // Normalize endpoint path for better aggregation
    const endpoint = normalizeEndpoint(req.path);
    const { method } = req;
    const { statusCode } = res;

    // Track the API call performance
    performanceMonitor.trackApiCall(endpoint, method, duration, statusCode);

    // Log slow requests immediately
    if (duration > 2000) { // 2 seconds threshold
      logger.warn('🐌 Slow API request detected', {
        method,
        endpoint: req.path,
        duration,
        statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }

    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
      const logLevel = statusCode >= 400 ? 'warn' : 'info';
      logger[logLevel](`${method} ${req.path} - ${statusCode} - ${duration}ms`);
    }

    // Call original res.end
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Normalize endpoint paths for better metric aggregation
 * Converts /users/123 to /users/:id, etc.
 */
function normalizeEndpoint(path) {
  return path
    // Replace UUIDs
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Replace other common patterns
    .replace(/\/[a-zA-Z0-9_-]{10,}/g, '/:token')
    // Clean up multiple slashes
    .replace(/\/+/g, '/');
}

/**
 * Middleware to provide performance metrics endpoint
 */
function performanceMetricsHandler(req, res) {
  try {
    const metrics = performanceMonitor.getMetricsSummary();

    res.json({
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to retrieve performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance metrics',
      error: error.message
    });
  }
}

/**
 * Middleware to reset performance metrics (for testing)
 */
function resetMetricsHandler(req, res) {
  try {
    performanceMonitor.reset();

    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    logger.error('Failed to reset performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset performance metrics',
      error: error.message
    });
  }
}

/**
 * Middleware to update performance thresholds
 */
function updateThresholdsHandler(req, res) {
  try {
    const { slowQueriesThreshold, slowApiThreshold } = req.body;

    performanceMonitor.updateThresholds(slowQueriesThreshold, slowApiThreshold);

    res.json({
      success: true,
      message: 'Performance thresholds updated successfully',
      data: {
        slowQueriesThreshold: performanceMonitor.metrics.slowQueriesThreshold,
        slowApiThreshold: performanceMonitor.metrics.slowApiThreshold
      }
    });
  } catch (error) {
    logger.error('Failed to update performance thresholds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update performance thresholds',
      error: error.message
    });
  }
}

module.exports = {
  performanceMiddleware,
  performanceMetricsHandler,
  resetMetricsHandler,
  updateThresholdsHandler,
  normalizeEndpoint
};
