/**
 * Security Integration Configuration
 *
 * Centralized security middleware integration for:
 * - Session management
 * - CSRF protection
 * - Security headers
 * - Rate limiting
 *
 * This module provides a clean integration point for all security features.
 *
 * @module config/securityIntegration
 */

const {
  sessionMiddleware,
  trackSessionActivity
} = require('../middleware/sessionMiddleware');

const {
  csrfTokenMiddleware,
  conditionalCsrfProtection,
  csrfErrorHandler,
  getCsrfToken
} = require('../middleware/csrfProtection');

const logger = require('../utils/logger');

/**
 * Apply Session and CSRF Middleware to Express App
 *
 * This function applies all session and CSRF middlewares in the correct order.
 * Should be called before route definitions.
 *
 * Order matters:
 * 1. Cookie parser (already applied)
 * 2. Session middleware
 * 3. CSRF token generation
 * 4. Session activity tracking
 * 5. Routes (with conditional CSRF protection)
 * 6. CSRF error handler
 *
 * @param {Express} app - Express application instance
 */
function applySecurityMiddlewares(app) {
  logger.info('🔒 Applying session and CSRF security middlewares...');

  // 1. Session Management
  // Handles session creation, storage, and cookie management
  app.use(sessionMiddleware);
  logger.info('✅ Session middleware enabled (TTL: 1 hour, Redis-backed)');

  // 2. CSRF Token Generation
  // Generates and refreshes CSRF tokens for all requests
  app.use(csrfTokenMiddleware);
  logger.info('✅ CSRF token middleware enabled (Double-Submit Cookie)');

  // 3. Session Activity Tracking
  // Updates session timestamp and checks for idle timeout
  app.use(trackSessionActivity);
  logger.info('✅ Session activity tracking enabled');

  // 4. CSRF Token Endpoint
  // Dedicated endpoint for fetching CSRF token
  app.get('/api/csrf-token', getCsrfToken);
  logger.info('✅ CSRF token endpoint available at GET /api/csrf-token');
}

/**
 * Apply CSRF Protection to Routes
 *
 * This should be applied AFTER route definitions to protect state-changing endpoints.
 * Safe methods (GET, HEAD, OPTIONS) are automatically exempt.
 *
 * @param {Express} app - Express application instance
 */
function applyCsrfProtection(app) {
  // Apply conditional CSRF protection globally
  // (checks for exemption flag set by csrfExempt middleware)
  app.use(conditionalCsrfProtection);
  logger.info('✅ CSRF protection enabled for POST/PUT/DELETE/PATCH');

  // CSRF Error Handler
  app.use(csrfErrorHandler);
  logger.info('✅ CSRF error handler enabled');
}

/**
 * Log Security Configuration
 *
 * Logs current security configuration for debugging and monitoring.
 */
function logSecurityConfig() {
  const config = {
    session: {
      store: process.env.REDIS_URL ? 'Redis' : 'In-Memory',
      ttl: process.env.SESSION_MAX_AGE || '3600000ms (1 hour)',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    },
    csrf: {
      method: 'Double-Submit Cookie',
      tokenLength: '64 chars (32 bytes)',
      cookieName: 'XSRF-TOKEN',
      headerName: 'X-CSRF-Token'
    },
    environment: process.env.NODE_ENV
  };

  logger.info('🛡️ Security Configuration:', JSON.stringify(config, null, 2));
}

module.exports = {
  applySecurityMiddlewares,
  applyCsrfProtection,
  logSecurityConfig
};
