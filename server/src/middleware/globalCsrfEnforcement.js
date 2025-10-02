/**
 * Global CSRF Enforcement Middleware
 *
 * Automatically applies CSRF protection to all state-changing HTTP methods
 * (POST, PUT, DELETE, PATCH) across the entire application.
 *
 * Usage in server.js or app.js:
 *   const { globalCsrfEnforcement, csrfTokenRoute } = require('./middleware/globalCsrfEnforcement');
 *
 *   // 1. Apply token generation globally
 *   app.use(csrfTokenMiddleware);
 *
 *   // 2. Add CSRF token endpoint
 *   app.get('/csrf-token', csrfTokenRoute);
 *
 *   // 3. Apply global CSRF protection
 *   app.use(globalCsrfEnforcement);
 *
 *   // 4. Opt-out for specific routes
 *   app.post('/webhook', csrfExempt, webhookController);
 *
 * Exemptions:
 * - Public webhooks with signature verification
 * - Health check endpoints
 * - Metrics endpoints
 * - Explicitly exempted routes using csrfExempt middleware
 */

const {
  csrfTokenMiddleware,
  conditionalCsrfProtection,
  csrfExempt,
  getCsrfToken
} = require('./csrfProtection');

const logger = require('../utils/logger');

// HTTP methods that require CSRF protection
const MUTATING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

// Paths that are automatically exempted from CSRF protection
const EXEMPT_PATHS = [
  '/health',
  '/ready',
  '/metrics',
  '/webhook', // Generic webhook path
  '/api/webhooks', // API webhooks
];

/**
 * Check if a path should be exempted from CSRF protection
 * @param {string} path - Request path
 * @returns {boolean} True if path is exempt
 */
function isExemptPath(path) {
  return EXEMPT_PATHS.some(exemptPath => path.startsWith(exemptPath));
}

/**
 * Global CSRF Enforcement Middleware
 *
 * Applies CSRF protection to all mutating HTTP methods (POST, PUT, DELETE, PATCH)
 * unless the route is explicitly exempted.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function globalCsrfEnforcement(req, res, next) {
  // Check if method requires CSRF protection
  if (!MUTATING_METHODS.includes(req.method)) {
    return next(); // Safe methods (GET, HEAD, OPTIONS) pass through
  }

  // Check if path is exempt
  if (isExemptPath(req.path)) {
    logger.debug('CSRF exemption (automatic)', {
      method: req.method,
      path: req.path,
      reason: 'exempt_path'
    });
    return next();
  }

  // Check if route is explicitly exempted
  if (req.csrfExempt === true) {
    logger.debug('CSRF exemption (explicit)', {
      method: req.method,
      path: req.path,
      reason: 'csrf_exempt_middleware'
    });
    return next();
  }

  // Apply CSRF protection
  logger.debug('CSRF protection applied', {
    method: req.method,
    path: req.path
  });

  return conditionalCsrfProtection(req, res, next);
}

/**
 * CSRF Token Route
 *
 * GET /csrf-token - Returns CSRF token for client use
 *
 * Frontend should call this endpoint to get the token, then include it
 * in all mutating requests via X-CSRF-Token header or _csrf field.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function csrfTokenRoute(req, res) {
  return getCsrfToken(req, res);
}

/**
 * Create exempt middleware for specific routes
 *
 * Usage:
 *   router.post('/webhook/stripe', createCsrfExempt('stripe_webhook'), handler);
 *
 * @param {string} reason - Reason for exemption (for logging)
 * @returns {Function} Express middleware
 */
function createCsrfExempt(reason = 'custom') {
  return (req, res, next) => {
    req.csrfExempt = true;
    req.csrfExemptReason = reason;

    logger.info('CSRF exemption granted', {
      method: req.method,
      path: req.path,
      reason
    });

    next();
  };
}

module.exports = {
  // Main middleware
  globalCsrfEnforcement,

  // Token generation (must be applied before global enforcement)
  csrfTokenMiddleware,

  // CSRF token endpoint
  csrfTokenRoute,

  // Exemption helpers
  csrfExempt,
  createCsrfExempt,

  // For testing
  isExemptPath,
  MUTATING_METHODS,
  EXEMPT_PATHS
};
