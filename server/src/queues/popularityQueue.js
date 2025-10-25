/**
 * Popularity Calculation Queue
 *
 * Queue Bull pour le calcul périodique des scores de popularité
 * Job CRON toutes les 6h en production
 */

const Queue = require('bull');
const { bullRedisConfig } = require('../config/redis');
const logger = require('../utils/logger');

// Création de la queue
const popularityQueue = new Queue('popularity-calculation', {
  redis: bullRedisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 20,  // Keep last 20 runs
    removeOnFail: 10,      // Keep last 10 failures
    timeout: 300000        // 5min timeout (peut prendre du temps)
  },
  settings: {
    lockDuration: 300000,  // 5min lock
    maxStalledCount: 1,
    guardInterval: 10000
  }
});

// Event listeners
popularityQueue.on('active', (job) => {
  logger.info('Popularity calculation job started', {
    jobId: job.id,
    type: job.name
  });
});

popularityQueue.on('completed', (job, result) => {
  logger.info('Popularity calculation completed', {
    jobId: job.id,
    duration: Date.now() - job.processedOn,
    processed: result.processed,
    errors: result.errors
  });
});

popularityQueue.on('failed', (job, err) => {
  logger.error('Popularity calculation failed', {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
    stack: err.stack
  });
});

popularityQueue.on('progress', (job, progress) => {
  logger.debug('Popularity calculation progress', {
    jobId: job.id,
    progress: `${progress}%`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing popularity queue...');
  await popularityQueue.close();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing popularity queue...');
  await popularityQueue.close();
});

/**
 * Schedule popularity calculation CRON job
 * Production: Every 6 hours
 * Staging: Every hour
 */
function schedulePopularityCalculation() {
  const cronSchedule = process.env.NODE_ENV === 'production'
    ? '0 */6 * * *'  // Every 6 hours
    : '0 * * * *';   // Every hour

  popularityQueue.add(
    'calculate-all',
    {},
    {
      repeat: {
        cron: cronSchedule,
        tz: 'Europe/Paris'
      },
      jobId: 'popularity-calculation-cron'
    }
  );

  logger.info('Popularity calculation CRON scheduled', {
    schedule: cronSchedule,
    environment: process.env.NODE_ENV
  });
}

/**
 * Manually trigger popularity calculation
 * @returns {Promise<Job>} Bull job instance
 */
async function triggerCalculation() {
  try {
    const job = await popularityQueue.add(
      'calculate-all',
      {},
      {
        jobId: `manual-calc-${Date.now()}`,
        priority: 1 // High priority for manual triggers
      }
    );

    logger.info('Manual popularity calculation triggered', {
      jobId: job.id
    });

    return job;
  } catch (error) {
    logger.error('Failed to trigger calculation', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Calculate popularity for specific recipe
 * @param {string} recipeId - Recipe ID
 * @returns {Promise<Job>} Bull job instance
 */
async function calculateRecipeScore(recipeId) {
  try {
    const job = await popularityQueue.add(
      'calculate-one',
      { recipeId },
      {
        jobId: `calc-${recipeId}`,
        priority: 2
      }
    );

    logger.info('Recipe popularity calculation triggered', {
      jobId: job.id,
      recipeId
    });

    return job;
  } catch (error) {
    logger.error('Failed to calculate recipe score', {
      recipeId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get queue stats
 * @returns {Promise<Object>} Queue statistics
 */
async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    popularityQueue.getWaitingCount(),
    popularityQueue.getActiveCount(),
    popularityQueue.getCompletedCount(),
    popularityQueue.getFailedCount(),
    popularityQueue.getDelayedCount()
  ]);

  // Get next scheduled run
  const repeatableJobs = await popularityQueue.getRepeatableJobs();
  const nextRun = repeatableJobs.length > 0 ? repeatableJobs[0].next : null;

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
    nextScheduledRun: nextRun ? new Date(nextRun).toISOString() : null
  };
}

/**
 * Clean old jobs
 * @param {number} grace - Grace period in ms (default 7 days)
 * @returns {Promise<void>}
 */
async function cleanOldJobs(grace = 7 * 24 * 60 * 60 * 1000) {
  await popularityQueue.clean(grace, 'completed');
  await popularityQueue.clean(grace, 'failed');
  logger.info('Old popularity jobs cleaned', { gracePeriod: grace });
}

module.exports = {
  popularityQueue,
  schedulePopularityCalculation,
  triggerCalculation,
  calculateRecipeScore,
  getQueueStats,
  cleanOldJobs
};
