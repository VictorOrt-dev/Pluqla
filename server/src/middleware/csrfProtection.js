/**
 * CSRF Protection Middleware
 *
 * Implements Double-Submit Cookie technique for CSRF protection.
 * This is a modern, stateless alternative to csurf package (which is deprecated).
 *
 * How it works:
 * 1. Server generates a random token and sends it in a cookie
 * 2. Frontend reads the cookie and includes token in request header
 * 3. Server validates that cookie value matches header value
 * 4. Attack fails because malicious sites can't read the cookie
 *
 * Security Features:
 * ✅ CSRF Protection for state-changing operations (POST/PUT/DELETE/PATCH)
 * ✅ Double-Submit Cookie Technique (stateless, no server storage)
 * ✅ Safe methods (GET/HEAD/OPTIONS) are exempt
 * ✅ Cryptographically secure token generation
 * ✅ Token rotation on session change
 *
 * @module middleware/csrfProtection
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Safe HTTP methods that don't require CSRF protection
 * These methods should be idempotent and not change state
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate cryptographically secure CSRF token
 *
 * @returns {string} Random 32-byte hex token
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token in cookie and make it available to client
 *
 * @param {Object} res - Express response object
 * @param {string} token - CSRF token
 */
function setCsrfCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Set the CSRF token in a cookie that JavaScript CAN read
  // (not httpOnly, so frontend can access it)
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // JavaScript needs to read this!
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 3600000 // 1 hour
  });

  // Also make it available in response header for convenience
  res.setHeader('X-CSRF-Token', token);
}

/**
 * CSRF Token Generation Middleware
 *
 * Generates CSRF token and makes it available to client.
 * Should be applied globally to all routes.
 *
 * Token is:
 * - Sent in cookie: XSRF-TOKEN (readable by JavaScript)
 * - Sent in header: X-CSRF-Token
 * - Stored in session (optional, for validation)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function csrfTokenMiddleware(req, res, next) {
  // Generate or reuse existing token
  let token = req.cookies['XSRF-TOKEN'];

  if (!token || token.length !== 64) {
    // Generate new token if missing or invalid
    token = generateCsrfToken();
    logger.debug('🛡️ Generated new CSRF token');
  }

  // Store token in session for server-side validation (optional)
  if (req.session) {
    req.session.csrfToken = token;
  }

  // Make token available to client
  setCsrfCookie(res, token);

  // Attach token to request for convenience
  req.csrfToken = () => token;

  next();
}

/**
 * CSRF Protection Middleware
 *
 * Validates CSRF token for state-changing requests.
 * Applies to: POST, PUT, DELETE, PATCH
 * Exempt: GET, HEAD, OPTIONS
 *
 * Client must send token in one of:
 * - Header: X-CSRF-Token
 * - Header: X-XSRF-Token
 * - Body: _csrf
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function csrfProtection(req, res, next) {
  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Get token from cookie (what we sent to client)
  const cookieToken = req.cookies['XSRF-TOKEN'];

  // Get token from request (what client sent back)
  const headerToken = req.get('X-CSRF-Token') ||
                      req.get('X-XSRF-Token') ||
                      req.body?._csrf ||
                      req.query?._csrf;

  // Validate token presence
  if (!cookieToken) {
    logger.warn('🚫 CSRF: Missing cookie token', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing from cookie',
      code: 'CSRF_COOKIE_MISSING',
      message: 'Security token not found. Please refresh and try again.'
    });
  }

  if (!headerToken) {
    logger.warn('🚫 CSRF: Missing header token', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing from request',
      code: 'CSRF_TOKEN_MISSING',
      message: 'Security token required. Please include X-CSRF-Token header.'
    });
  }

  // Validate token match (constant-time comparison to prevent timing attacks)
  const tokensMatch = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );

  if (!tokensMatch) {
    logger.warn('🚫 CSRF: Token mismatch', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token validation failed',
      code: 'CSRF_TOKEN_INVALID',
      message: 'Security token mismatch. Please refresh and try again.'
    });
  }

  // Optional: Validate against session token (double check)
  if (req.session?.csrfToken && req.session.csrfToken !== cookieToken) {
    logger.warn('🚫 CSRF: Session token mismatch', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF session validation failed',
      code: 'CSRF_SESSION_INVALID',
      message: 'Security session mismatch. Please log in again.'
    });
  }

  logger.debug('✅ CSRF token validated', {
    method: req.method,
    path: req.path
  });

  next();
}

/**
 * CSRF Exemption Middleware
 *
 * Exempts specific routes from CSRF protection.
 * Use sparingly and only for:
 * - Public APIs without authentication
 * - Webhook endpoints with signature verification
 * - Third-party integrations with API keys
 *
 * @example
 * router.post('/webhook', csrfExempt, webhookController);
 */
function csrfExempt(req, res, next) {
  req.csrfExempt = true;
  next();
}

/**
 * Conditional CSRF Protection
 *
 * Only applies CSRF protection if route is not exempt.
 * This is a wrapper that checks for exemption flag.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function conditionalCsrfProtection(req, res, next) {
  if (req.csrfExempt === true) {
    logger.debug('⚠️ CSRF exemption applied', {
      method: req.method,
      path: req.path
    });
    return next();
  }

  csrfProtection(req, res, next);
}

/**
 * Refresh CSRF token
 *
 * Generates a new CSRF token and updates cookie.
 * Should be called after login/logout to prevent token reuse.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function refreshCsrfToken(req, res) {
  const newToken = generateCsrfToken();

  // Update session token
  if (req.session) {
    req.session.csrfToken = newToken;
  }

  // Update cookie
  setCsrfCookie(res, newToken);

  logger.debug('🔄 CSRF token refreshed');

  return newToken;
}

/**
 * Get CSRF Token Endpoint
 *
 * Dedicated endpoint for fetching CSRF token.
 * Frontend can call this to get initial token.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getCsrfToken(req, res) {
  const token = req.csrfToken();

  res.json({
    success: true,
    csrfToken: token,
    message: 'Include this token in X-CSRF-Token header for state-changing requests'
  });
}

/**
 * CSRF Error Handler
 *
 * Custom error handler for CSRF errors.
 * Provides user-friendly messages.
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN' || err.code?.startsWith('CSRF_')) {
    logger.warn('🚫 CSRF Error:', {
      code: err.code,
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF protection triggered',
      code: err.code,
      message: 'Invalid security token. Please refresh the page and try again.'
    });
  }

  next(err);
}

module.exports = {
  // Main middlewares
  csrfTokenMiddleware,
  csrfProtection,
  conditionalCsrfProtection,

  // Helpers
  csrfExempt,
  refreshCsrfToken,
  getCsrfToken,
  generateCsrfToken,

  // Error handling
  csrfErrorHandler,

  // For testing
  __setCsrfCookie: setCsrfCookie
};
