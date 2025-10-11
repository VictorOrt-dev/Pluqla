/**
 * Meal Suggestions Queue Configuration
 *
 * Uses Bull (UltraSync pattern) for reliable async job processing with Redis
 * Handles meal suggestion jobs with retry logic and monitoring
 *
 * Security considerations:
 * - Jobs expire after 24h to prevent queue bloat
 * - Rate limiting via quota middleware before enqueue
 * - Input validation before processing
 * - Sanitized error messages (no PII in logs)
 */

const Queue = require('bull');
const logger = require('../utils/logger');

// Queue configuration
const QUEUE_NAME = 'meal-suggestions-jobs';
const REDIS_CONFIG = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10), // Separate DB for queues
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  }
};

// Job options
const JOB_OPTIONS = {
  // Retry configuration
  attempts: 3, // Max retries
  backoff: {
    type: 'exponential',
    delay: 2000 // Start with 2s, then 4s, 8s (AI calls may take time)
  },

  // Timeout and cleanup
  timeout: 60000, // 60 seconds max per job (AI calls can be slow)
  removeOnComplete: {
    age: 86400, // Keep completed jobs for 24h
    count: 1000 // Keep max 1000 completed jobs
  },
  removeOnFail: {
    age: 604800 // Keep failed jobs for 7 days for debugging
  }
};

// Queue settings
const QUEUE_SETTINGS = {
  // Concurrency control
  limiter: {
    max: 10, // Max 10 jobs per interval (AI rate limits)
    duration: 1000 // Per second
  },

  // Settings for reliable processing
  settings: {
    lockDuration: 30000, // Lock job for 30s (AI calls may take time)
    stalledInterval: 45000, // Check for stalled jobs every 45s
    maxStalledCount: 1 // Retry stalled jobs once
  }
};

// Create the queue instance
const mealSuggestionsQueue = new Queue(QUEUE_NAME, REDIS_CONFIG);

/**
 * Add a meal suggestion job to the queue
 * @param {Object} jobData - Job data
 * @param {string} jobData.jobId - Database job ID
 * @param {string} jobData.userId - User ID
 * @param {Object} jobData.requestData - Request details
 * @param {string} jobData.requestHash - SHA-256 hash
 * @returns {Promise<Object>} Bull job object
 */
async function enqueueMealSuggestionJob(jobData) {
  try {
    // Validate required fields
    const requiredFields = ['jobId', 'userId', 'requestData', 'requestHash'];
    for (const field of requiredFields) {
      if (!jobData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Security: Validate request data structure
    const { requestData } = jobData;

    // Validate servings
    if (requestData.servings && (requestData.servings < 1 || requestData.servings > 20)) {
      throw new Error(`Invalid servings: ${requestData.servings}. Must be between 1 and 20.`);
    }

    // Validate budget
    if (requestData.budget !== null && requestData.budget !== undefined) {
      if (requestData.budget < 0 || requestData.budget > 200) {
        throw new Error(`Invalid budget: ${requestData.budget}. Must be between 0 and 200 EUR.`);
      }
    }

    // Validate cooking time
    if (requestData.maxCookingTime && (requestData.maxCookingTime < 5 || requestData.maxCookingTime > 300)) {
      throw new Error(`Invalid cooking time: ${requestData.maxCookingTime}. Must be between 5 and 300 minutes.`);
    }

    // Add job to queue with options
    const job = await mealSuggestionsQueue.add(jobData, {
      ...JOB_OPTIONS,
      jobId: jobData.jobId, // Use DB jobId as Bull job ID for idempotency
      priority: jobData.priority || 5 // Default priority
    });

    logger.info('Meal suggestion job enqueued', {
      jobId: jobData.jobId,
      bullJobId: job.id,
      userId: jobData.userId,
      mealType: requestData.mealType,
      servings: requestData.servings,
      queueLength: await mealSuggestionsQueue.count()
    });

    return job;
  } catch (error) {
    logger.error('Failed to enqueue meal suggestion job', {
      error: error.message,
      jobData: {
        jobId: jobData.jobId,
        userId: jobData.userId,
        mealType: jobData.requestData?.mealType
      }
    });
    throw error;
  }
}

/**
 * Get job status
 * @param {string} jobId - Database job ID
 * @returns {Promise<Object>} Job status
 */
async function getJobStatus(jobId) {
  try {
    const job = await mealSuggestionsQueue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      status: state,
      progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason
    };
  } catch (error) {
    logger.error('Failed to get job status', {
      error: error.message,
      jobId
    });
    throw error;
  }
}

/**
 * Get queue metrics
 * @returns {Promise<Object>} Queue statistics
 */
async function getQueueMetrics() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      mealSuggestionsQueue.getWaitingCount(),
      mealSuggestionsQueue.getActiveCount(),
      mealSuggestionsQueue.getCompletedCount(),
      mealSuggestionsQueue.getFailedCount(),
      mealSuggestionsQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    logger.error('Failed to get queue metrics', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Clean old jobs (maintenance)
 * @param {number} grace - Grace period in milliseconds
 */
async function cleanOldJobs(grace = 86400000) { // 24h default
  try {
    const cleaned = await mealSuggestionsQueue.clean(grace, 'completed');
    const failedCleaned = await mealSuggestionsQueue.clean(grace * 7, 'failed'); // Keep failed for 7x longer

    logger.info('Cleaned old meal suggestion jobs', {
      completedCleaned: cleaned.length,
      failedCleaned: failedCleaned.length
    });

    return { completed: cleaned.length, failed: failedCleaned.length };
  } catch (error) {
    logger.error('Failed to clean old jobs', {
      error: error.message
    });
    throw error;
  }
}

// Queue event handlers for monitoring
mealSuggestionsQueue.on('completed', (job, result) => {
  logger.info('Meal suggestion job completed', {
    jobId: job.id,
    processingTime: Date.now() - job.processedOn,
    result: result ? 'success' : 'no_result'
  });
});

mealSuggestionsQueue.on('failed', (job, err) => {
  logger.error('Meal suggestion job failed', {
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    error: err.message,
    stack: err.stack
  });
});

mealSuggestionsQueue.on('stalled', (job) => {
  logger.warn('Meal suggestion job stalled', {
    jobId: job.id,
    attemptsMade: job.attemptsMade
  });
});

mealSuggestionsQueue.on('error', (error) => {
  logger.error('Meal suggestions queue error', {
    error: error.message,
    stack: error.stack
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing meal suggestions queue...');
  await mealSuggestionsQueue.close();
});

module.exports = {
  mealSuggestionsQueue,
  enqueueMealSuggestionJob,
  getJobStatus,
  getQueueMetrics,
  cleanOldJobs,
  QUEUE_NAME
};
