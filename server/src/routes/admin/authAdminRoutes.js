/**
 * Admin Authentication Routes
 *
 * Secure admin-only endpoints for:
 * - Session management (list, revoke)
 * - Key rotation
 * - Auth metrics
 *
 * All endpoints require admin role
 */

const express = require('express');
const { prisma } = require('../../lib/prisma');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const rateLimit = require('../../middleware/rateLimit');
const jwtManager = require('../../lib/jwtManager');
const logger = require('../../utils/logger');
const {
  activeSessions,
  updateActiveSessionsGauge
} = require('../../infra/metrics/promClient');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Rate limiting for admin endpoints
const adminRateLimit = rateLimit.createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => `admin_${req.user?.id || req.ip}`
});

router.use(adminRateLimit);

/**
 * GET /admin/auth/sessions
 * List all active sessions, optionally filtered by userId
 */
router.get('/sessions', async (req, res) => {
  try {
    const { userId, page = 1, limit = 50, status = 'active' } = req.query;

    const where = {};

    if (userId) {
      where.userId = userId;
    }

    if (status === 'active') {
      where.expires = { gt: new Date() };
    } else if (status === 'expired') {
      where.expires = { lte: new Date() };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      prisma.betterAuthSession.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionToken: true,
          userId: true,
          expires: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              email: true,
              name: true,
              role: true,
              status: true
            }
          }
        }
      }),
      prisma.betterAuthSession.count({ where })
    ]);

    // Calculate session statistics
    const now = new Date();
    const stats = {
      total,
      active: sessions.filter(s => s.expires > now).length,
      expired: sessions.filter(s => s.expires <= now).length
    };

    logger.info('Admin: Sessions listed', {
      adminId: req.user.id,
      filters: { userId, status },
      count: sessions.length
    });

    res.json({
      success: true,
      data: {
        sessions: sessions.map(s => ({
          ...s,
          sessionToken: `${s.sessionToken.slice(0, 8)}...${s.sessionToken.slice(-8)}`, // Mask token
          isActive: s.expires > now
        })),
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Admin: Failed to list sessions', {
      error: error.message,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve sessions'
    });
  }
});

/**
 * POST /admin/auth/revoke-session
 * Revoke a session by sessionToken or userId (revoke all user sessions)
 */
router.post('/revoke-session', async (req, res) => {
  try {
    const { sessionToken, userId, reason = 'admin_revocation' } = req.body;

    if (!sessionToken && !userId) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Either sessionToken or userId is required'
      });
    }

    let result;

    if (sessionToken) {
      // Revoke specific session
      result = await prisma.betterAuthSession.deleteMany({
        where: { sessionToken }
      });

      logger.info('Admin: Session revoked', {
        adminId: req.user.id,
        sessionToken: `${sessionToken.slice(0, 8)}...`,
        reason
      });
    } else if (userId) {
      // Revoke all user sessions
      result = await prisma.betterAuthSession.deleteMany({
        where: { userId }
      });

      logger.warn('Admin: All user sessions revoked', {
        adminId: req.user.id,
        targetUserId: userId,
        revokedCount: result.count,
        reason
      });
    }

    // Update metrics
    await updateActiveSessionsGauge(prisma);

    res.json({
      success: true,
      message: 'Session(s) revoked successfully',
      data: {
        revokedCount: result.count,
        reason
      }
    });

  } catch (error) {
    logger.error('Admin: Failed to revoke session', {
      error: error.message,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to revoke session'
    });
  }
});

/**
 * POST /admin/auth/rotate-keys
 * Rotate JWT signing keys
 */
router.post('/rotate-keys', async (req, res) => {
  try {
    const { generate = true, newSecret } = req.body;

    let secret;

    if (generate) {
      // Generate new secure secret
      secret = jwtManager.generateSecret();
    } else if (newSecret) {
      // Use provided secret
      secret = newSecret;
    } else {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Either generate=true or provide newSecret'
      });
    }

    // Rotate the secret
    const rotationResult = jwtManager.rotateSecret(secret);

    logger.warn('Admin: JWT keys rotated', {
      adminId: req.user.id,
      activeSecrets: rotationResult.activeSecrets,
      generated: generate
    });

    // TODO: Persist key rotation to database for distributed systems
    // await prisma.authKey.create({
    //   data: {
    //     kid: crypto.randomBytes(8).toString('hex'),
    //     secret: crypto.createHash('sha256').update(secret).digest('hex'),
    //     algorithm: 'HS256',
    //     status: 'active',
    //     activatedAt: new Date()
    //   }
    // });

    res.json({
      success: true,
      message: 'JWT keys rotated successfully',
      data: {
        activeSecrets: rotationResult.activeSecrets,
        gracePeriodHours: rotationResult.gracePeriodHours,
        timestamp: rotationResult.timestamp,
        // Only return secret if generated (for backup)
        ...(generate && {
          newSecret: secret,
          warning: 'Store this secret securely. It will not be shown again.'
        })
      }
    });

  } catch (error) {
    logger.error('Admin: Failed to rotate keys', {
      error: error.message,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to rotate keys'
    });
  }
});

/**
 * GET /admin/auth/metrics
 * Get authentication metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get session metrics
    const [
      activeSessions,
      expiredSessions24h,
      totalUsers,
      activeUsers24h,
      refreshTokens,
      revokedTokens
    ] = await Promise.all([
      prisma.betterAuthSession.count({
        where: { expires: { gt: now } }
      }),
      prisma.betterAuthSession.count({
        where: {
          expires: { lte: now, gte: oneDayAgo }
        }
      }),
      prisma.user.count({
        where: { status: 'active' }
      }),
      prisma.user.count({
        where: {
          status: 'active',
          lastLoginAt: { gte: oneDayAgo }
        }
      }),
      prisma.refreshToken.count({
        where: {
          revoked: false,
          expiresAt: { gt: now }
        }
      }),
      prisma.refreshToken.count({
        where: { revoked: true }
      })
    ]);

    // Get JWT manager stats
    const jwtStats = jwtManager.getStats();

    logger.info('Admin: Auth metrics retrieved', {
      adminId: req.user.id
    });

    res.json({
      success: true,
      data: {
        sessions: {
          active: activeSessions,
          expired24h: expiredSessions24h
        },
        users: {
          total: totalUsers,
          active24h: activeUsers24h,
          activePercentage: totalUsers > 0 ? (activeUsers24h / totalUsers * 100).toFixed(2) : 0
        },
        tokens: {
          refreshTokens,
          revokedTokens
        },
        jwt: jwtStats,
        timestamp: now.toISOString()
      }
    });

  } catch (error) {
    logger.error('Admin: Failed to retrieve metrics', {
      error: error.message,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve metrics'
    });
  }
});

/**
 * POST /admin/auth/revoke-token
 * Revoke a JWT by JTI
 */
router.post('/revoke-token', async (req, res) => {
  try {
    const { jti, reason = 'admin_revocation' } = req.body;

    if (!jti) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'JTI is required'
      });
    }

    // TODO: Get token expiration from DB or decode (without verification)
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // Default 24h

    jwtManager.revokeToken(jti, expiresAt);

    logger.warn('Admin: Token revoked', {
      adminId: req.user.id,
      jti,
      reason
    });

    res.json({
      success: true,
      message: 'Token revoked successfully',
      data: { jti, reason }
    });

  } catch (error) {
    logger.error('Admin: Failed to revoke token', {
      error: error.message,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to revoke token'
    });
  }
});

/**
 * GET /admin/auth/health
 * Health check for auth system
 */
router.get('/health', async (req, res) => {
  try {
    const checks = {
      database: false,
      jwtManager: false,
      sessions: false
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      logger.error('Admin health check: Database failed', { error: error.message });
    }

    // Check JWT manager
    try {
      const stats = jwtManager.getStats();
      checks.jwtManager = stats.activeSecrets > 0;
    } catch (error) {
      logger.error('Admin health check: JWT manager failed', { error: error.message });
    }

    // Check sessions
    try {
      const count = await prisma.betterAuthSession.count();
      checks.sessions = count >= 0;
    } catch (error) {
      logger.error('Admin health check: Sessions failed', { error: error.message });
    }

    const healthy = Object.values(checks).every(check => check === true);

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      checks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Admin: Health check failed', {
      error: error.message
    });

    res.status(503).json({
      success: false,
      error: 'HEALTH_CHECK_FAILED',
      message: error.message
    });
  }
});

module.exports = router;
