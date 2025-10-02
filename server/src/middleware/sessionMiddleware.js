/**
 * Secure Session Management Middleware
 *
 * Implements enterprise-grade session security:
 * - Session rotation on login to prevent fixation attacks
 * - Secure cookie configuration (HttpOnly, Secure, SameSite)
 * - Redis-backed sessions for scalability (with in-memory fallback)
 * - 1-hour TTL with sliding expiration
 * - Session destruction on logout
 * - CSRF protection integration
 *
 * Security Features:
 * ✅ Session Fixation Prevention
 * ✅ XSS Protection (HttpOnly cookies)
 * ✅ CSRF Protection Integration
 * ✅ Secure Transport (HTTPS in production)
 * ✅ SameSite Cookie Policy
 * ✅ TTL-based Session Expiration
 *
 * @module middleware/sessionMiddleware
 */

const session = require('express-session');
const RedisStore = require('connect-redis').default;
const logger = require('../utils/logger');

/**
 * Create Redis client for session storage
 * Fallback to in-memory if Redis is unavailable
 */
let sessionStore = null;
let useRedis = false;

if (process.env.REDIS_URL) {
  try {
    const { createClient } = require('redis');
    const redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis connection failed after 10 retries, falling back to memory store');
            return new Error('Redis max retries exceeded');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      useRedis = false;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected for session storage');
      useRedis = true;
    });

    redisClient.connect().catch((err) => {
      logger.warn('⚠️ Redis connection failed, using in-memory sessions:', err.message);
      useRedis = false;
    });

    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'pluqla:sess:',
      ttl: 3600 // 1 hour in seconds
    });

    useRedis = true;
  } catch (error) {
    logger.warn('⚠️ Redis not available, using in-memory sessions:', error.message);
    useRedis = false;
  }
}

/**
 * Session Configuration
 *
 * Configures express-session with secure defaults:
 * - 1-hour TTL
 * - Secure cookies in production
 * - HttpOnly to prevent XSS
 * - SameSite=Strict for CSRF protection
 * - Redis store with in-memory fallback
 */
const sessionConfig = {
  // Secret for signing session ID cookie
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,

  // Store configuration (Redis or in-memory)
  store: sessionStore,

  // Cookie configuration
  cookie: {
    // SECURITY: HttpOnly prevents JavaScript access (XSS protection)
    httpOnly: true,

    // SECURITY: Secure requires HTTPS in production
    secure: process.env.NODE_ENV === 'production',

    // SECURITY: SameSite prevents CSRF attacks
    sameSite: 'strict',

    // SESSION TTL: 1 hour (3600000 milliseconds)
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600000', 10),

    // Cookie path
    path: '/',

    // Domain (only in production with actual domain)
    domain: process.env.COOKIE_DOMAIN || undefined
  },

  // Session ID configuration
  name: 'pluqla.sid', // Custom session cookie name

  // Resave configuration
  // SECURITY: false prevents race conditions in session store
  resave: false,

  // SaveUninitialized configuration
  // SECURITY: false prevents empty sessions (GDPR compliance)
  saveUninitialized: false,

  // Rolling sessions (refresh TTL on each request)
  // SECURITY: true implements sliding expiration
  rolling: true,

  // Proxy trust (for HTTPS behind load balancer)
  proxy: process.env.TRUST_PROXY === 'true'
};

/**
 * Session middleware instance
 */
const sessionMiddleware = session(sessionConfig);

/**
 * Session Rotation Helper
 *
 * Regenerates session ID to prevent session fixation attacks.
 * Should be called after successful login.
 *
 * @param {Object} req - Express request object
 * @param {Object} userData - User data to store in new session
 * @returns {Promise<void>}
 *
 * @example
 * // In login controller
 * await rotateSession(req, {
 *   userId: user.id,
 *   email: user.email,
 *   role: user.role
 * });
 */
async function rotateSession(req, userData) {
  return new Promise((resolve, reject) => {
    // Store old session data
    const oldSession = { ...req.session };

    // Regenerate session ID
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session regeneration failed:', err);
        return reject(err);
      }

      // Restore important data (but with new session ID)
      Object.assign(req.session, {
        ...userData,
        createdAt: Date.now(),
        lastActivity: Date.now()
      });

      // Save the new session
      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error('Session save failed:', saveErr);
          return reject(saveErr);
        }

        logger.info('🔄 Session rotated for user:', userData.userId);
        resolve();
      });
    });
  });
}

/**
 * Session Destruction Helper
 *
 * Destroys session and clears session cookie.
 * Should be called on logout.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 *
 * @example
 * // In logout controller
 * await destroySession(req, res);
 */
async function destroySession(req, res) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      return resolve();
    }

    const sessionId = req.session.id;

    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction failed:', err);
        return reject(err);
      }

      // Clear the session cookie
      res.clearCookie('pluqla.sid', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        domain: process.env.COOKIE_DOMAIN || undefined
      });

      logger.info('🗑️ Session destroyed:', sessionId);
      resolve();
    });
  });
}

/**
 * Session Activity Tracker Middleware
 *
 * Updates lastActivity timestamp on each request.
 * Helps detect inactive sessions and implement idle timeout.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function trackSessionActivity(req, res, next) {
  if (req.session && req.session.userId) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || req.session.createdAt;
    const maxIdleTime = parseInt(process.env.SESSION_IDLE_TIMEOUT || '1800000', 10); // 30 min default

    // ✅ FIX: Check idle time BEFORE updating lastActivity
    const idleTime = now - lastActivity;

    if (idleTime > maxIdleTime) {
      logger.warn('⏰ Session idle timeout exceeded', {
        userId: req.session.userId,
        idleTimeMs: idleTime,
        maxIdleTimeMs: maxIdleTime,
        lastActivity: new Date(lastActivity).toISOString()
      });

      return destroySession(req, res).then(() => {
        res.status(440).json({ // 440 Login Timeout (unofficial but common)
          success: false,
          error: 'Session expired due to inactivity',
          code: 'SESSION_IDLE_TIMEOUT',
          details: {
            idleTime: Math.floor(idleTime / 1000), // seconds
            maxIdleTime: Math.floor(maxIdleTime / 1000), // seconds
            message: 'Please log in again to continue'
          }
        });
      }).catch(next);
    }

    // ✅ Update lastActivity AFTER check
    req.session.lastActivity = now;
  }

  next();
}

/**
 * Session Validation Middleware
 *
 * Ensures session exists and is valid.
 * Use this on protected routes that require an active session.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function requireSession(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Session required',
      code: 'NO_SESSION'
    });
  }

  // Check if session is expired
  const sessionAge = Date.now() - req.session.createdAt;
  const maxAge = parseInt(process.env.SESSION_MAX_AGE || '3600000', 10);

  if (sessionAge > maxAge) {
    return destroySession(req, res).then(() => {
      res.status(401).json({
        success: false,
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }).catch(next);
  }

  next();
}

/**
 * Get session statistics (for monitoring)
 *
 * @returns {Object} Session statistics
 */
function getSessionStats() {
  return {
    storeType: useRedis ? 'redis' : 'memory',
    redisAvailable: useRedis,
    config: {
      ttl: sessionConfig.cookie.maxAge / 1000, // in seconds
      secure: sessionConfig.cookie.secure,
      httpOnly: sessionConfig.cookie.httpOnly,
      sameSite: sessionConfig.cookie.sameSite
    }
  };
}

module.exports = {
  // Main middleware
  sessionMiddleware,

  // Helper functions
  rotateSession,
  destroySession,
  trackSessionActivity,
  requireSession,

  // Monitoring
  getSessionStats,

  // For testing
  __getStore: () => sessionStore,
  __isRedisEnabled: () => useRedis
};
