/**
 * Legacy Authentication Compatibility Layer
 *
 * Provides seamless migration from JWT-based auth to Better Auth
 * while maintaining backward compatibility during transition period
 */

const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');
const { protect: betterAuthProtect } = require('./betterAuth');

/**
 * Hybrid authentication middleware that supports both JWT and Better Auth
 */
const hybridAuth = async (req, res, next) => {
  try {
    // First, try Better Auth
    const authHeader = req.headers.authorization;
    const sessionCookie = req.cookies?.['better-auth.session-token'];

    if (authHeader?.startsWith('Bearer ') || sessionCookie) {
      try {
        return await betterAuthProtect(req, res, next);
      } catch (betterAuthError) {
        // If Better Auth fails, fall back to JWT
        logger.debug('Better Auth failed, trying JWT fallback', {
          error: betterAuthError.message
        });
      }
    }

    // Fallback to legacy JWT authentication
    return await legacyJWTAuth(req, res, next);

  } catch (error) {
    logger.error('Hybrid authentication failed', {
      error: error.message,
      path: req.path,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTHENTICATION_FAILED',
      supportedMethods: ['better-auth', 'jwt']
    });
  }
};

/**
 * Legacy JWT authentication middleware
 */
const legacyJWTAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header required',
        code: 'MISSING_TOKEN',
        migrationNote: 'Consider upgrading to Better Auth for enhanced security'
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isPremium: true,
        emailVerified: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive or suspended',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach user to request (same format as Better Auth)
    req.user = user;
    req.authMethod = 'jwt';

    // Log legacy auth usage for migration tracking
    logger.info('Legacy JWT authentication used', {
      userId: user.id,
      endpoint: req.path,
      userAgent: req.get('User-Agent'),
      migrationRecommended: true
    });

    next();

  } catch (jwtError) {
    if (jwtError.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (jwtError.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    throw jwtError;
  }
};

/**
 * Migration helper to convert JWT sessions to Better Auth sessions
 */
const migrateUserToBetterAuth = async (userId) => {
  try {
    const { createSession } = require('./betterAuth');

    // Create Better Auth session for user
    const session = await createSession(userId);

    logger.info('User migrated to Better Auth', {
      userId,
      sessionToken: session.sessionToken.substring(0, 8) + '...'
    });

    return session;

  } catch (error) {
    logger.error('Failed to migrate user to Better Auth', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Middleware to track authentication method usage
 */
const authMethodTracker = (req, res, next) => {
  // Track which authentication method was used
  const originalJson = res.json;

  res.json = function(data) {
    if (req.user && data.success !== false) {
      // Add auth method to response metadata
      if (data.metadata) {
        data.metadata.authMethod = req.authMethod || 'better-auth';
      } else if (data.data) {
        data.data.authMethod = req.authMethod || 'better-auth';
      }

      // Add migration recommendation for JWT users
      if (req.authMethod === 'jwt') {
        data.migrationRecommendation = {
          message: 'Consider upgrading to Better Auth for enhanced security',
          benefits: [
            'Improved session management',
            'Better security features',
            'OAuth provider support',
            'Enhanced rate limiting'
          ],
          upgradeEndpoint: '/api/auth/migrate'
        };
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Compatibility check endpoint
 */
const getCompatibilityStatus = async (req, res) => {
  try {
    const stats = {
      betterAuth: {
        enabled: true,
        features: [
          'session-management',
          'oauth-providers',
          'role-based-access',
          'enhanced-security'
        ]
      },
      legacyJWT: {
        enabled: true,
        deprecationWarning: 'JWT authentication will be deprecated in future versions',
        migrationRecommended: true
      },
      migration: {
        available: true,
        endpoint: '/api/auth/migrate',
        automaticMigration: false
      }
    };

    // Get usage statistics
    const totalSessions = await prisma.betterAuthSession.count({
      where: { expires: { gt: new Date() } }
    });

    const totalUsers = await prisma.user.count({
      where: { status: 'active' }
    });

    stats.usage = {
      activeBetterAuthSessions: totalSessions,
      totalActiveUsers: totalUsers,
      migrationRate: totalUsers > 0 ? ((totalSessions / totalUsers) * 100).toFixed(1) + '%' : '0%'
    };

    res.json({
      success: true,
      data: stats,
      message: 'Authentication compatibility status'
    });

  } catch (error) {
    logger.error('Failed to get compatibility status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get compatibility status',
      code: 'COMPATIBILITY_CHECK_FAILED'
    });
  }
};

/**
 * User migration endpoint
 */
const migrateUserEndpoint = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (req.authMethod === 'better-auth') {
      return res.json({
        success: true,
        message: 'User is already using Better Auth',
        data: {
          migrationStatus: 'completed',
          authMethod: 'better-auth'
        }
      });
    }

    // Migrate JWT user to Better Auth
    const session = await migrateUserToBetterAuth(req.user.id);

    // Update user's last login
    await prisma.user.update({
      where: { id: req.user.id },
      data: { lastLoginAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Successfully migrated to Better Auth',
      data: {
        migrationStatus: 'completed',
        authMethod: 'better-auth',
        session: {
          token: session.sessionToken,
          expiresAt: session.expires
        }
      }
    });

  } catch (error) {
    logger.error('User migration failed', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Migration failed',
      code: 'MIGRATION_FAILED',
      details: error.message
    });
  }
};

/**
 * Legacy route wrapper to gradually migrate endpoints
 */
const createLegacyWrapper = (newHandler, deprecationDate) => {
  return async (req, res, next) => {
    // Add deprecation warning headers
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated');
    res.set('X-API-Deprecation-Date', deprecationDate);
    res.set('X-API-Migration-Guide', '/docs/auth-migration');

    // Log usage for migration tracking
    logger.warn('Legacy endpoint accessed', {
      endpoint: req.path,
      method: req.method,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      deprecationDate
    });

    // Call the new handler
    return newHandler(req, res, next);
  };
};

/**
 * Middleware to ensure gradual migration
 */
const enforceMigrationPolicy = (options = {}) => {
  return (req, res, next) => {
    const {
      enforceForNewUsers = true,
      enforceAfterDate = null,
      allowLegacyForPremium = false
    } = options;

    // Check if user should be forced to migrate
    if (req.authMethod === 'jwt') {
      const user = req.user;
      const now = new Date();

      let shouldEnforceMigration = false;

      // Enforce for new users
      if (enforceForNewUsers && user.createdAt > new Date('2024-01-01')) {
        shouldEnforceMigration = true;
      }

      // Enforce after specific date
      if (enforceAfterDate && now > new Date(enforceAfterDate)) {
        shouldEnforceMigration = true;
      }

      // Allow premium users to continue with legacy (temporarily)
      if (allowLegacyForPremium && user.isPremium) {
        shouldEnforceMigration = false;
      }

      if (shouldEnforceMigration) {
        return res.status(426).json({
          success: false,
          error: 'Authentication upgrade required',
          code: 'MIGRATION_REQUIRED',
          message: 'Please upgrade to Better Auth for continued access',
          migrationEndpoint: '/api/auth/migrate',
          upgradeRequired: true
        });
      }
    }

    next();
  };
};

module.exports = {
  hybridAuth,
  legacyJWTAuth,
  migrateUserToBetterAuth,
  authMethodTracker,
  getCompatibilityStatus,
  migrateUserEndpoint,
  createLegacyWrapper,
  enforceMigrationPolicy
};