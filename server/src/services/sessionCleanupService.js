/**
 * Session Cleanup Service
 *
 * Automatically cleans up expired sessions from the database to prevent bloat.
 * Uses node-cron to schedule periodic cleanup jobs.
 *
 * Features:
 * - Runs every 24 hours (configurable via SESSION_CLEANUP_CRON)
 * - Deletes only expired sessions (where expires < NOW())
 * - Logs cleanup metrics (count, duration, errors)
 * - Can be triggered manually for testing
 * - Safe: never deletes active sessions
 */

const cron = require('node-cron');
const { cleanupExpiredSessions } = require('../auth/betterAuth');
const logger = require('../utils/logger');
const { recordSessionCleanup, updateSessionCleanupHealth } = require('./monitoringService');

// Track cleanup statistics
const cleanupStats = {
  totalRuns: 0,
  totalSessionsCleaned: 0,
  lastRunAt: null,
  lastRunDuration: null,
  lastRunSessionsCleaned: 0,
  failures: 0,
  lastError: null
};

/**
 * Perform session cleanup and track metrics
 */
async function performCleanup() {
  const startTime = Date.now();
  const runId = `cleanup-${Date.now()}`;

  try {
    logger.info('🧹 Starting session cleanup job', {
      runId,
      scheduledRuns: cleanupStats.totalRuns,
      totalCleaned: cleanupStats.totalSessionsCleaned
    });

    // Call the cleanup function from betterAuth
    const sessionsDeleted = await cleanupExpiredSessions();

    const duration = Date.now() - startTime;

    // Update statistics
    cleanupStats.totalRuns += 1;
    cleanupStats.totalSessionsCleaned += sessionsDeleted;
    cleanupStats.lastRunAt = new Date();
    cleanupStats.lastRunDuration = duration;
    cleanupStats.lastRunSessionsCleaned = sessionsDeleted;

    logger.info('✅ Session cleanup completed successfully', {
      runId,
      sessionsDeleted,
      duration: `${duration}ms`,
      totalRuns: cleanupStats.totalRuns,
      totalCleaned: cleanupStats.totalSessionsCleaned
    });

    // Record metrics
    recordSessionCleanup(true, duration / 1000, sessionsDeleted);
    updateSessionCleanupHealth(new Date(), null);

    // Log warning if too many sessions accumulated
    if (sessionsDeleted > 10000) {
      logger.warn('⚠️ Large number of expired sessions cleaned up', {
        sessionsDeleted,
        recommendation: 'Consider increasing cleanup frequency'
      });
    }

    return {
      success: true,
      sessionsDeleted,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    cleanupStats.failures += 1;
    cleanupStats.lastError = {
      message: error.message,
      timestamp: new Date()
    };

    logger.error('❌ Session cleanup failed', {
      runId,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      failures: cleanupStats.failures
    });

    // Record failed cleanup metrics
    recordSessionCleanup(false, duration / 1000, 0);
    updateSessionCleanupHealth(new Date(), error.message);

    // Don't throw - we want the cron job to continue
    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

/**
 * Initialize and start the session cleanup scheduler
 */
function startCleanupScheduler() {
  // Get cron schedule from environment (default: every day at 3 AM)
  // Format: "minute hour day month weekday"
  // Default: "0 3 * * *" = 3:00 AM every day
  const cronSchedule = process.env.SESSION_CLEANUP_CRON || '0 3 * * *';

  // Validate cron expression
  if (!cron.validate(cronSchedule)) {
    logger.error('❌ Invalid SESSION_CLEANUP_CRON expression', {
      cronSchedule,
      fallback: 'Using default: 0 3 * * *'
    });
    return null;
  }

  logger.info('🚀 Starting session cleanup scheduler', {
    schedule: cronSchedule,
    timezone: process.env.TZ || 'UTC',
    nextRun: 'Will run at scheduled time'
  });

  // Schedule the cleanup job
  const scheduledTask = cron.schedule(cronSchedule, async () => {
    await performCleanup();
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });

  logger.info('✅ Session cleanup scheduler started successfully', {
    schedule: cronSchedule,
    enabled: true
  });

  return scheduledTask;
}

/**
 * Stop the session cleanup scheduler (for graceful shutdown)
 */
function stopCleanupScheduler(scheduledTask) {
  if (scheduledTask) {
    scheduledTask.stop();
    logger.info('🛑 Session cleanup scheduler stopped');
  }
}

/**
 * Get current cleanup statistics
 */
function getCleanupStats() {
  return {
    ...cleanupStats,
    uptime: cleanupStats.lastRunAt
      ? Date.now() - new Date(cleanupStats.lastRunAt).getTime()
      : null,
    averageSessionsPerRun: cleanupStats.totalRuns > 0
      ? Math.round(cleanupStats.totalSessionsCleaned / cleanupStats.totalRuns)
      : 0,
    successRate: cleanupStats.totalRuns > 0
      ? ((cleanupStats.totalRuns - cleanupStats.failures) / cleanupStats.totalRuns * 100).toFixed(2) + '%'
      : 'N/A'
  };
}

/**
 * Manually trigger cleanup (for testing or admin endpoints)
 */
async function triggerManualCleanup() {
  logger.info('🔧 Manual session cleanup triggered');
  return await performCleanup();
}

/**
 * Initialize the session cleanup service on server startup
 * - Performs initial cleanup (optional)
 * - Starts the scheduler
 */
async function initializeCleanupService(options = {}) {
  const {
    runOnStartup = process.env.SESSION_CLEANUP_ON_STARTUP === 'true',
    enabled = process.env.SESSION_CLEANUP_ENABLED !== 'false' // Enabled by default
  } = options;

  if (!enabled) {
    logger.info('⏸️ Session cleanup service disabled', {
      reason: 'SESSION_CLEANUP_ENABLED=false'
    });
    return null;
  }

  logger.info('🔧 Initializing session cleanup service', {
    runOnStartup,
    enabled
  });

  // Run initial cleanup if configured
  if (runOnStartup) {
    logger.info('🧹 Running initial session cleanup on startup');
    await performCleanup();
  }

  // Start the scheduler
  const scheduledTask = startCleanupScheduler();

  return scheduledTask;
}

module.exports = {
  initializeCleanupService,
  startCleanupScheduler,
  stopCleanupScheduler,
  performCleanup,
  triggerManualCleanup,
  getCleanupStats
};