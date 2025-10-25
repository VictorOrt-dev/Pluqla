/**
 * Food Spending Matcher Cron Job
 *
 * Phase 5: Prévision vs Réalité
 * Runs daily to automatically match forecast food spending logs with actual bank transactions
 *
 * Schedule: Daily at 2:00 AM (configurable)
 * Matches forecasts from last 30 days
 * Archives forecasts older than 7 days with no match
 */

const foodSpendingMatcher = require('../services/foodSpendingMatcher');
const logger = require('../utils/logger');

/**
 * Main job function
 * @returns {Promise<Object>} - Job results
 */
const runMatchingJob = async () => {
  const startTime = Date.now();

  logger.info('Starting food spending matching job...');

  try {
    // Match forecasts from last 30 days
    const results = await foodSpendingMatcher.matchAllForecasts({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    const duration = Date.now() - startTime;

    logger.info('Food spending matching job completed', {
      duration: `${duration}ms`,
      usersProcessed: results.usersProcessed,
      totalMatched: results.totalMatched,
      totalArchived: results.totalArchived,
      totalPending: results.totalPending,
      errors: results.errors.length,
    });

    // Log errors separately if any
    if (results.errors.length > 0) {
      logger.warn('Food spending matching job had errors', {
        errorCount: results.errors.length,
        errors: results.errors,
      });
    }

    return {
      success: true,
      duration,
      ...results,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Food spending matching job failed', {
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      duration,
      error: error.message,
    };
  }
};

/**
 * Setup cron schedule (if using node-cron)
 * @param {Object} cron - node-cron instance
 * @param {string} schedule - Cron expression (default: '0 2 * * *' = daily at 2AM)
 * @returns {Object} - Scheduled task
 */
const setupCronSchedule = (cron, schedule = '0 2 * * *') => {
  logger.info('Setting up food spending matcher cron job', { schedule });

  const task = cron.schedule(schedule, async () => {
    logger.info('Food spending matcher cron triggered');
    await runMatchingJob();
  });

  return task;
};

/**
 * Manual trigger endpoint helper
 * Can be called from API endpoint or admin panel
 * @returns {Promise<Object>}
 */
const triggerManually = async () => {
  logger.info('Food spending matcher triggered manually');
  return await runMatchingJob();
};

module.exports = {
  runMatchingJob,
  setupCronSchedule,
  triggerManually,
};
