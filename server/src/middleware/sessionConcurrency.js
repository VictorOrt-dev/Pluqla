const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  sessionConcurrencyRejected,
  sessionDestroyed
} = require('../infra/metrics/promClient');

// Configuration from environment variables
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5', 10);
const SESSION_POLICY = process.env.SESSION_POLICY || 'reject'; // 'reject' or 'drop-oldest'

/**
 * Session Concurrency Middleware
 *
 * Enforces a maximum number of concurrent sessions per user
 * Two policies:
 * - 'reject': Reject new session creation when limit is reached
 * - 'drop-oldest': Remove oldest session when limit is reached
 *
 * @returns {Function} Express middleware
 */
function sessionConcurrencyMiddleware() {
  return async (req, res, next) => {
    try {
      // Only enforce on authenticated requests
      if (!req.user || !req.user.id) {
        return next();
      }

      const userId = req.user.id;

      // Count active sessions for this user
      const activeSessions = await prisma.betterAuthSession.count({
        where: {
          userId,
          expires: { gt: new Date() }
        }
      });

      // If under limit, allow request
      if (activeSessions < MAX_CONCURRENT_SESSIONS) {
        return next();
      }

      logger.warn('Session concurrency limit reached', {
        userId,
        activeSessions,
        maxAllowed: MAX_CONCURRENT_SESSIONS,
        policy: SESSION_POLICY
      });

      // Handle based on policy
      if (SESSION_POLICY === 'reject') {
        // Reject new session creation
        sessionConcurrencyRejected.inc();

        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_SESSIONS',
          message: `Maximum concurrent sessions (${MAX_CONCURRENT_SESSIONS}) reached. Please log out from another device.`,
          maxSessions: MAX_CONCURRENT_SESSIONS,
          activeSessions
        });
      }

      // drop-oldest policy: Remove oldest sessions to make room
      if (SESSION_POLICY === 'drop-oldest') {
        const sessionsToRemove = activeSessions - MAX_CONCURRENT_SESSIONS + 1;

        // Find oldest sessions
        const oldestSessions = await prisma.betterAuthSession.findMany({
          where: {
            userId,
            expires: { gt: new Date() }
          },
          orderBy: { createdAt: 'asc' },
          take: sessionsToRemove,
          select: { sessionToken: true }
        });

        if (oldestSessions.length > 0) {
          // Delete oldest sessions
          const deleted = await prisma.betterAuthSession.deleteMany({
            where: {
              sessionToken: {
                in: oldestSessions.map(s => s.sessionToken)
              }
            }
          });

          // Update metrics
          sessionDestroyed.labels('concurrency_limit').inc(deleted.count);

          logger.info('Removed oldest sessions due to concurrency limit', {
            userId,
            removedSessions: deleted.count,
            policy: SESSION_POLICY
          });
        }

        return next();
      }

      // Unknown policy - fail safe by rejecting
      logger.error('Unknown session policy', { policy: SESSION_POLICY });
      sessionConcurrencyRejected.inc();

      return res.status(500).json({
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'Session policy misconfigured'
      });

    } catch (error) {
      logger.error('Session concurrency middleware error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      // Fail open - allow request on error to avoid blocking users
      return next();
    }
  };
}

// Export middleware and configuration for testing
module.exports = sessionConcurrencyMiddleware;
module.exports.MAX_CONCURRENT_SESSIONS = MAX_CONCURRENT_SESSIONS;
module.exports.SESSION_POLICY = SESSION_POLICY;
