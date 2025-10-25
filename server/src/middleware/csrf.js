/**
 * CSRF Protection Middleware
 *
 * Phase 7 - Security Enhancement
 * Protects against Cross-Site Request Forgery attacks
 *
 * Uses csurf library with double-submit cookie pattern
 * Applied to all state-changing routes (POST, PUT, PATCH, DELETE)
 */

const csrf = require('csurf');
const logger = require('../utils/logger');

/**
 * CSRF protection middleware
 * Uses cookie-based tokens for stateless operation
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Safe methods
  value: (req) => {
    // Support both header and body token
    return req.body._csrf || req.headers['x-csrf-token'] || req.headers['csrf-token'];
  }
});

/**
 * CSRF error handler
 * Returns user-friendly error message
 */
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  // CSRF token validation failed
  logger.warn('CSRF token validation failed', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    path: req.path,
    method: req.method
  });

  res.status(403).json({
    success: false,
    error: 'Invalid CSRF token',
    message: 'Cette requête a été rejetée pour des raisons de sécurité. Veuillez rafraîchir la page et réessayer.',
    code: 'CSRF_VALIDATION_FAILED'
  });
};

/**
 * Middleware to attach CSRF token to response
 * Frontend can read this token and include it in subsequent requests
 */
const attachCsrfToken = (req, res, next) => {
  // Set CSRF token in response cookie and header
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false, // Allow JavaScript to read this cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });

  // Also set in custom header for easier access
  res.set('X-CSRF-Token', req.csrfToken());

  next();
};

/**
 * Conditional CSRF protection
 * Skip CSRF for certain routes (e.g., webhooks, API keys)
 */
const conditionalCsrfProtection = (req, res, next) => {
  // Skip CSRF for API key authenticated requests
  if (req.headers['x-api-key']) {
    return next();
  }

  // Skip CSRF for webhook endpoints
  if (req.path.startsWith('/api/webhooks/')) {
    return next();
  }

  // Apply CSRF protection
  csrfProtection(req, res, next);
};

module.exports = {
  csrfProtection,
  csrfErrorHandler,
  attachCsrfToken,
  conditionalCsrfProtection
};
