/**
 * Recipe Enrichment Queue
 *
 * Queue Bull pour l'enrichissement des recettes avec metadata
 * Workers process les jobs asynchronement pour éviter de bloquer l'API
 */

const Queue = require('bull');
const { bullRedisConfig } = require('../config/redis');
const logger = require('../utils/logger');

// Création de la queue
const enrichmentQueue = new Queue('recipe-enrichment', {
  redis: bullRedisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    timeout: 30000         // 30s timeout per job
  },
  settings: {
    lockDuration: 30000,   // 30s lock
    maxStalledCount: 2,    // Max retries if worker crashes
    guardInterval: 5000,   // Check for stalled jobs every 5s
    retryProcessDelay: 5000 // Delay before retry after failure
  }
});

// Event listeners pour monitoring
enrichmentQueue.on('active', (job) => {
  logger.debug('Enrichment job started', {
    jobId: job.id,
    recipeId: job.data.recipeId
  });
});

enrichmentQueue.on('completed', (job, result) => {
  logger.info('Enrichment job completed', {
    jobId: job.id,
    recipeId: job.data.recipeId,
    duration: Date.now() - job.processedOn,
    result
  });
});

enrichmentQueue.on('failed', (job, err) => {
  logger.error('Enrichment job failed', {
    jobId: job.id,
    recipeId: job.data.recipeId,
    error: err.message,
    attempts: job.attemptsMade,
    stack: err.stack
  });
});

enrichmentQueue.on('stalled', (job) => {
  logger.warn('Enrichment job stalled', {
    jobId: job.id,
    recipeId: job.data.recipeId
  });
});

enrichmentQueue.on('progress', (job, progress) => {
  logger.debug('Enrichment job progress', {
    jobId: job.id,
    recipeId: job.data.recipeId,
    progress: `${progress}%`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing enrichment queue...');
  await enrichmentQueue.close();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing enrichment queue...');
  await enrichmentQueue.close();
});

/**
 * Add recipe to enrichment queue
 * @param {string} recipeId - Recipe ID to enrich
 * @param {Object} options - Job options (priority, delay, etc.)
 * @returns {Promise<Job>} Bull job instance
 */
async function addEnrichmentJob(recipeId, options = {}) {
  try {
    const job = await enrichmentQueue.add(
      'enrich-recipe',
      { recipeId },
      {
        jobId: `enrich-${recipeId}`, // Prevent duplicates
        ...options
      }
    );

    logger.info('Enrichment job added to queue', {
      jobId: job.id,
      recipeId
    });

    return job;
  } catch (error) {
    logger.error('Failed to add enrichment job', {
      recipeId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Bulk enrich multiple recipes (for backfill)
 * @param {string[]} recipeIds - Array of recipe IDs
 * @param {number} delay - Delay between jobs in ms (rate limiting)
 * @returns {Promise<Job[]>} Array of Bull jobs
 */
async function bulkEnrichRecipes(recipeIds, delay = 500) {
  const jobs = [];

  for (let i = 0; i < recipeIds.length; i++) {
    const job = await addEnrichmentJob(recipeIds[i], {
      delay: i * delay, // Stagger jobs
      priority: 5 // Lower priority for bulk
    });
    jobs.push(job);
  }

  logger.info('Bulk enrichment jobs added', {
    count: recipeIds.length,
    totalDelay: recipeIds.length * delay
  });

  return jobs;
}

/**
 * Get queue stats
 * @returns {Promise<Object>} Queue statistics
 */
async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    enrichmentQueue.getWaitingCount(),
    enrichmentQueue.getActiveCount(),
    enrichmentQueue.getCompletedCount(),
    enrichmentQueue.getFailedCount(),
    enrichmentQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
}

/**
 * Clean old jobs
 * @param {number} grace - Grace period in ms (default 24h)
 * @returns {Promise<void>}
 */
async function cleanOldJobs(grace = 24 * 60 * 60 * 1000) {
  await enrichmentQueue.clean(grace, 'completed');
  await enrichmentQueue.clean(grace, 'failed');
  logger.info('Old enrichment jobs cleaned', { gracePeriod: grace });
}

module.exports = {
  enrichmentQueue,
  addEnrichmentJob,
  bulkEnrichRecipes,
  getQueueStats,
  cleanOldJobs
};
