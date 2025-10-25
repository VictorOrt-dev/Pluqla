/**
 * Modern CSRF Protection Middleware
 *
 * Phase 7 - Security Enhancement
 * Replaces deprecated csurf library with modern double-submit cookie pattern
 *
 * Uses crypto-native token generation without vulnerable dependencies
 * Implements double-submit cookie pattern for stateless CSRF protection
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Configuration
 */
const CSRF_CONFIG = {
  cookieName: 'XSRF-TOKEN',
  headerName: 'x-csrf-token',
  tokenLength: 32,
  cookieOptions: {
    httpOnly: false, // Must be readable by JavaScript for frontend
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
    path: '/'
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  ignoredPaths: [
    '/api/webhooks/',
    '/health',
    '/metrics'
  ]
};

/**
 * Generate cryptographically secure CSRF token
 * @returns {string} - Base64 encoded token
 */
function generateCsrfToken() {
  return crypto.randomBytes(CSRF_CONFIG.tokenLength).toString('base64url');
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean}
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Check if path should be ignored for CSRF protection
 * @param {string} path - Request path
 * @returns {boolean}
 */
function isIgnoredPath(path) {
  return CSRF_CONFIG.ignoredPaths.some(ignoredPath =>
    path.startsWith(ignoredPath)
  );
}

/**
 * Middleware to generate and attach CSRF token to response
 * Should be applied to all routes
 */
const attachCsrfToken = (req, res, next) => {
  // Generate new token for each request
  const token = generateCsrfToken();

  // Store token in cookie (accessible to JavaScript)
  res.cookie(CSRF_CONFIG.cookieName, token, CSRF_CONFIG.cookieOptions);

  // Also attach to response object for internal use
  req.csrfToken = () => token;

  // Set custom header for easier access
  res.set('X-CSRF-Token', token);

  next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Implements double-submit cookie pattern
 */
const csrfProtection = (req, res, next) => {
  // Skip for safe HTTP methods
  if (CSRF_CONFIG.ignoredMethods.includes(req.method)) {
    return next();
  }

  // Skip for ignored paths
  if (isIgnoredPath(req.path)) {
    return next();
  }

  // Skip for API key authenticated requests
  if (req.headers['x-api-key']) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies[CSRF_CONFIG.cookieName];

  // Get token from header or body
  const requestToken =
    req.headers[CSRF_CONFIG.headerName] ||
    req.headers['csrf-token'] ||
    req.body?._csrf ||
    req.query?._csrf;

  // Validate tokens exist
  if (!cookieToken || !requestToken) {
    logger.warn('CSRF token missing', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      hasCookie: !!cookieToken,
      hasRequestToken: !!requestToken
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'Cette requête a été rejetée pour des raisons de sécurité. Veuillez rafraîchir la page et réessayer.',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  // Validate tokens match using constant-time comparison
  if (!constantTimeCompare(cookieToken, requestToken)) {
    logger.warn('CSRF token mismatch', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
      path: req.path,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      message: 'Cette requête a été rejetée pour des raisons de sécurité. Veuillez rafraîchir la page et réessayer.',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }

  // Token valid, proceed
  next();
};

/**
 * Conditional CSRF protection
 * Skip CSRF for certain routes (e.g., webhooks, API keys)
 */
const conditionalCsrfProtection = (req, res, next) => {
  // Skip CSRF for safe methods
  if (CSRF_CONFIG.ignoredMethods.includes(req.method)) {
    return next();
  }

  // Skip for ignored paths
  if (isIgnoredPath(req.path)) {
    return next();
  }

  // Skip for API key authenticated requests
  if (req.headers['x-api-key']) {
    return next();
  }

  // Apply CSRF protection
  csrfProtection(req, res, next);
};

/**
 * CSRF error handler
 * Catches and formats CSRF errors
 */
const csrfErrorHandler = (err, req, res, next) => {
  // Only handle CSRF-related errors
  if (!err.code || !err.code.startsWith('CSRF_')) {
    return next(err);
  }

  logger.warn('CSRF error handled', {
    code: err.code,
    ip: req.ip,
    path: req.path,
    method: req.method
  });

  res.status(403).json({
    success: false,
    error: err.error || 'CSRF protection error',
    message: err.message || 'Requête non autorisée',
    code: err.code
  });
};

module.exports = {
  csrfProtection,
  csrfErrorHandler,
  attachCsrfToken,
  conditionalCsrfProtection,
  generateCsrfToken,
  CSRF_CONFIG
};
