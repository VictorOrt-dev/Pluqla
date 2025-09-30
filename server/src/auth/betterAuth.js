/**
 * Better Auth Configuration for Pluqla Backend
 *
 * This file configures Better Auth with:
 * - Email/Password authentication
 * - PostgreSQL database via Prisma
 * - Session management
 * - User role management
 */

const { betterAuth } = require('better-auth');
const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * Better Auth Configuration
 */
const auth = betterAuth({
  // Basic configuration
  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET,
  baseURL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3004}`,

  // Database configuration using our existing Prisma setup
  database: prisma,

  // User table mapping to our existing schema
  user: {
    table: 'users',
    fields: {
      id: 'id',
      email: 'email',
      name: 'name',
      emailVerified: 'emailVerified',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  },

  // Session configuration with cookie settings
  session: {
    table: 'better_auth_sessions',
    fields: {
      id: 'id',
      sessionToken: 'sessionToken',
      userId: 'userId',
      expires: 'expires'
    },
    // Session expiration: 7 days (can be configured via env)
    expiresIn: parseInt(process.env.SESSION_EXPIRES_IN || '604800', 10), // 7 days in seconds
    // Update session activity on each request
    updateAge: parseInt(process.env.SESSION_UPDATE_AGE || '3600', 10), // 1 hour in seconds
    // Cookie configuration for session persistence
    cookie: {
      name: 'pluqla.session-token',
      // SECURITY: httpOnly prevents JavaScript access (XSS protection)
      httpOnly: true,
      // SECURITY: secure=true in production (HTTPS only)
      secure: process.env.NODE_ENV === 'production',
      // SECURITY: sameSite=strict prevents CSRF attacks
      sameSite: 'strict',
      // Path where cookie is valid
      path: '/',
      // Domain (only in production with actual domain)
      domain: process.env.COOKIE_DOMAIN || undefined,
      // Max age: 7 days (matches session expiration)
      maxAge: parseInt(process.env.SESSION_EXPIRES_IN || '604800', 10) * 1000 // Convert to milliseconds
    }
  },

  // Account table for OAuth
  account: {
    table: 'better_auth_accounts',
    fields: {
      id: 'id',
      userId: 'userId',
      type: 'type',
      provider: 'provider',
      providerAccountId: 'providerAccountId'
    }
  }
});

/**
 * Middleware to protect routes with Better Auth
 */
const protect = async (req, res, next) => {
  try {
    // Extract session token from cookie or Authorization header
    // Cookie name matches the configuration: 'pluqla.session-token'
    const sessionToken = req.cookies?.['pluqla.session-token'] ||
                        req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Verify session with Better Auth
    const session = await prisma.betterAuthSession.findUnique({
      where: { sessionToken },
      include: { user: true }
    });

    if (!session || session.expires < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
        code: 'SESSION_EXPIRED'
      });
    }

    // Check user status
    if (session.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive or suspended',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach user to request
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      status: session.user.status,
      isPremium: session.user.isPremium,
      emailVerified: session.user.emailVerified
    };

    req.session = session;

    next();
  } catch (error) {
    logger.error('Better Auth protection middleware error', {
      error: error.message,
      path: req.path
    });

    res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Middleware to require premium access
 */
const requirePremium = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  if (!req.user.isPremium) {
    return res.status(403).json({
      success: false,
      error: 'Premium access required',
      code: 'PREMIUM_REQUIRED',
      upgradeUrl: '/api/billing/upgrade'
    });
  }

  next();
};

/**
 * Middleware to require admin access
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Helper function to create a session
 */
async function createSession(userId, expiresIn = 7 * 24 * 60 * 60 * 1000) { // 7 days default
  try {
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + expiresIn);

    const session = await prisma.betterAuthSession.create({
      data: {
        sessionToken,
        userId,
        expires
      },
      include: { user: true }
    });

    return session;
  } catch (error) {
    logger.error('Failed to create session', { userId, error: error.message });
    throw error;
  }
}

/**
 * Helper function to destroy a session
 */
async function destroySession(sessionToken) {
  try {
    await prisma.betterAuthSession.delete({
      where: { sessionToken }
    });
  } catch (error) {
    logger.error('Failed to destroy session', { sessionToken, error: error.message });
    throw error;
  }
}

/**
 * Helper function to set session cookie on response
 * Applies secure cookie settings based on environment
 */
function setSessionCookie(res, sessionToken, maxAge = 7 * 24 * 60 * 60 * 1000) {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('pluqla.session-token', sessionToken, {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge // 7 days default
  });

  return res;
}

/**
 * Helper function to clear session cookie
 */
function clearSessionCookie(res) {
  res.clearCookie('pluqla.session-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
  });

  return res;
}

/**
 * Helper function to clean up expired sessions
 */
async function cleanupExpiredSessions() {
  try {
    const result = await prisma.betterAuthSession.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    });

    logger.info('Cleaned up expired sessions', { count: result.count });
    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', { error: error.message });
    throw error;
  }
}

module.exports = {
  auth,
  protect,
  requirePremium,
  requireAdmin,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  cleanupExpiredSessions
};