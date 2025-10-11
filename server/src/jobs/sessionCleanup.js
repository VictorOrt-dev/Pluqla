const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');
const cron = require('node-cron');
const {
  sessionDestroyed,
  activeSessions,
  updateActiveSessionsGauge
} = require('../infra/metrics/promClient');

/**
 * Session Cleanup Job
 *
 * Periodically removes expired sessions from the database
 * Runs every hour by default (configurable via CLEANUP_CRON_SCHEDULE)
 */

const CLEANUP_CRON_SCHEDULE = process.env.CLEANUP_CRON_SCHEDULE || '0 * * * *'; // Every hour
const CLEANUP_ENABLED = process.env.CLEANUP_ENABLED !== 'false'; // Enabled by default

/**
 * Clean up expired sessions
 *
 * @returns {Promise<Object>} Cleanup result with count of deleted sessions
 */
async function cleanupExpiredSessions() {
  const startTime = Date.now();

  try {
    logger.info('Starting session cleanup job');

    // Delete all expired sessions
    const result = await prisma.betterAuthSession.deleteMany({
      where: {
        expires: { lt: new Date() }
      }
    });

    const duration = Date.now() - startTime;

    // Update metrics
    if (result.count > 0) {
      sessionDestroyed.labels('expired').inc(result.count);
    }

    // Update active sessions gauge
    await updateActiveSessionsGauge(prisma);

    logger.info('Session cleanup completed', {
      deletedSessions: result.count,
      durationMs: duration
    });

    return {
      success: true,
      deletedSessions: result.count,
      durationMs: duration,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Session cleanup failed', {
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });

    return {
      success: false,
      error: error.message,
      durationMs: duration,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Clean up orphaned refresh tokens (tokens without active sessions)
 *
 * @returns {Promise<Object>} Cleanup result
 */
async function cleanupOrphanedRefreshTokens() {
  try {
    logger.info('Starting orphaned refresh token cleanup');

    // Find expired refresh tokens
    const expiredTokens = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true, revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Revoked > 30 days ago
        ]
      }
    });

    logger.info('Orphaned refresh token cleanup completed', {
      deletedTokens: expiredTokens.count
    });

    return {
      success: true,
      deletedTokens: expiredTokens.count
    };

  } catch (error) {
    logger.error('Orphaned refresh token cleanup failed', {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up old SCA challenges
 *
 * @returns {Promise<Object>} Cleanup result
 */
async function cleanupOldScaChallenges() {
  try {
    logger.info('Starting old SCA challenge cleanup');

    // Delete completed/expired challenges older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await prisma.scaChallenge.deleteMany({
      where: {
        AND: [
          { status: { in: ['completed', 'expired', 'locked'] } },
          { createdAt: { lt: ninetyDaysAgo } }
        ]
      }
    });

    logger.info('Old SCA challenge cleanup completed', {
      deletedChallenges: result.count
    });

    return {
      success: true,
      deletedChallenges: result.count
    };

  } catch (error) {
    logger.error('Old SCA challenge cleanup failed', {
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run all cleanup tasks
 *
 * @returns {Promise<Object>} Combined cleanup results
 */
async function runAllCleanupTasks() {
  logger.info('Running all cleanup tasks');

  const [sessions, tokens, scaChallenges] = await Promise.all([
    cleanupExpiredSessions(),
    cleanupOrphanedRefreshTokens(),
    cleanupOldScaChallenges()
  ]);

  return {
    sessions,
    tokens,
    scaChallenges,
    timestamp: new Date().toISOString()
  };
}

/**
 * Start the cron job
 *
 * @returns {Object} Cron task instance
 */
function startCleanupJob() {
  if (!CLEANUP_ENABLED) {
    logger.info('Session cleanup job disabled via CLEANUP_ENABLED=false');
    return null;
  }

  logger.info('Starting session cleanup cron job', {
    schedule: CLEANUP_CRON_SCHEDULE
  });

  const task = cron.schedule(CLEANUP_CRON_SCHEDULE, async () => {
    await runAllCleanupTasks();
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });

  // Run once on startup
  setTimeout(async () => {
    await runAllCleanupTasks();
  }, 5000); // Wait 5 seconds after startup

  return task;
}

/**
 * Stop the cleanup job (for graceful shutdown)
 *
 * @param {Object} task - Cron task instance
 */
function stopCleanupJob(task) {
  if (task) {
    task.stop();
    logger.info('Session cleanup job stopped');
  }
}

// Export functions
module.exports = {
  cleanupExpiredSessions,
  cleanupOrphanedRefreshTokens,
  cleanupOldScaChallenges,
  runAllCleanupTasks,
  startCleanupJob,
  stopCleanupJob,
  CLEANUP_CRON_SCHEDULE,
  CLEANUP_ENABLED
};
