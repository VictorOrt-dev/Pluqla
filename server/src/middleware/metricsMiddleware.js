const {
  httpRequestDuration,
  httpRequestsTotal,
  http5xxErrors
} = require('../infra/metrics/promClient');

/**
 * Metrics middleware to track HTTP request duration and counts
 * Captures method, route, and status code for observability
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  // Capture original end function
  const originalEnd = res.end;

  // Override end function to record metrics
  res.end = function(...args) {
    // Calculate duration in seconds
    const duration = (Date.now() - start) / 1000;

    // Get route pattern (e.g., /api/users/:id instead of /api/users/123)
    const route = req.route?.path || req.path || 'unknown';
    const baseUrl = req.baseUrl || '';
    const fullRoute = `${baseUrl}${route}`.replace(/\/+/g, '/');

    const method = req.method;
    const status = res.statusCode;

    // Record metrics
    try {
      // Record request duration
      httpRequestDuration.labels(method, fullRoute, status).observe(duration);

      // Increment request counter
      httpRequestsTotal.labels(method, fullRoute, status).inc();

      // Track 5xx errors specifically
      if (status >= 500) {
        http5xxErrors.labels(method, fullRoute, status).inc();
      }
    } catch (error) {
      // Fail silently to not impact application
      console.error('Metrics recording error:', error.message);
    }

    // Call original end function
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = metricsMiddleware;
