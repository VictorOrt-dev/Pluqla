/**
 * Metrics Middleware
 *
 * Automatically tracks HTTP request metrics for all routes
 */

const { metrics } = require('../monitoring/metrics');
const logger = require('../utils/logger');

/**
 * Middleware to track HTTP request metrics
 */
function metricsMiddleware(req, res, next) {
  const startTime = process.hrtime();

  // Capture the original res.end to track when response is sent
  const originalEnd = res.end;

  res.end = function (...args) {
    // Calculate request duration
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;

    // Normalize route for metrics (remove IDs)
    const route = normalizeRoute(req.route?.path || req.path);

    // Record metrics
    try {
      metrics.recordHttpRequest(
        req.method,
        route,
        res.statusCode.toString(),
        duration
      );

      // Record errors if status code indicates error
      if (res.statusCode >= 400) {
        const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
        metrics.recordApiError(route, errorType, res.statusCode.toString());
      }
    } catch (error) {
      logger.error('Failed to record metrics in middleware', { error: error.message });
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Normalize route path for metrics
 * Replaces dynamic segments with placeholders
 *
 * Example: /users/123/posts/456 -> /users/:id/posts/:id
 */
function normalizeRoute(path) {
  if (!path) return 'unknown';

  return path
    .replace(/\/\d+/g, '/:id') // Replace numeric IDs
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid') // Replace UUIDs
    .replace(/\/[a-f0-9]{24}/gi, '/:objectid') // Replace MongoDB ObjectIds
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token'); // Replace long tokens
}

module.exports = metricsMiddleware;
