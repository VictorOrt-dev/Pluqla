/**
 * Transport Optimization Queue Configuration
 *
 * Uses Bull (UltraSync pattern) for reliable async job processing with Redis
 * Handles transport cost optimization jobs with retry logic and monitoring
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
const QUEUE_NAME = 'transport-optimization-jobs';
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
    delay: 1000 // Start with 1s, then 2s, 4s
  },

  // Timeout and cleanup
  timeout: 30000, // 30 seconds max per job (computation is fast)
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
    max: 20, // Max 20 jobs per interval (computation is fast)
    duration: 1000 // Per second
  },

  // Settings for reliable processing
  settings: {
    lockDuration: 10000, // Lock job for 10s (computation is fast)
    stalledInterval: 15000, // Check for stalled jobs every 15s
    maxStalledCount: 1 // Retry stalled jobs once
  }
};

// Create the queue instance
const transportOptimizationQueue = new Queue(QUEUE_NAME, REDIS_CONFIG);

/**
 * Add a transport optimization job to the queue
 * @param {Object} jobData - Job data
 * @param {string} jobData.jobId - Database job ID
 * @param {string} jobData.userId - User ID
 * @param {Object} jobData.tripData - Trip details
 * @param {string} jobData.tripHash - SHA-256 hash
 * @returns {Promise<Object>} Bull job object
 */
async function enqueueTransportOptimizationJob(jobData) {
  try {
    // Validate required fields
    const requiredFields = ['jobId', 'userId', 'tripData', 'tripHash'];
    for (const field of requiredFields) {
      if (!jobData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Security: Validate trip data structure
    const { tripData } = jobData;
    if (!tripData.distance || typeof tripData.distance !== 'number') {
      throw new Error('Trip data must include valid distance');
    }

    // Security: Validate distance range (0-1000km)
    if (tripData.distance <= 0 || tripData.distance > 1000) {
      throw new Error(`Invalid distance: ${tripData.distance}km. Must be between 0 and 1000km.`);
    }

    // Add job to queue with options
    const job = await transportOptimizationQueue.add(jobData, {
      ...JOB_OPTIONS,
      jobId: jobData.jobId, // Use DB jobId as Bull job ID for idempotency
      priority: jobData.priority || 5 // Default priority
    });

    logger.info('Transport optimization job enqueued', {
      jobId: jobData.jobId,
      bullJobId: job.id,
      userId: jobData.userId,
      distance: tripData.distance,
      queueLength: await transportOptimizationQueue.count()
    });

    return job;
  } catch (error) {
    logger.error('Failed to enqueue transport optimization job', {
      error: error.message,
      jobData: {
        jobId: jobData.jobId,
        userId: jobData.userId,
        distance: jobData.tripData?.distance
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
    const job = await transportOptimizationQueue.getJob(jobId);

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
      transportOptimizationQueue.getWaitingCount(),
      transportOptimizationQueue.getActiveCount(),
      transportOptimizationQueue.getCompletedCount(),
      transportOptimizationQueue.getFailedCount(),
      transportOptimizationQueue.getDelayedCount()
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
    const cleaned = await transportOptimizationQueue.clean(grace, 'completed');
    const failedCleaned = await transportOptimizationQueue.clean(grace * 7, 'failed'); // Keep failed for 7x longer

    logger.info('Cleaned old transport optimization jobs', {
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
transportOptimizationQueue.on('completed', (job, result) => {
  logger.info('Transport optimization job completed', {
    jobId: job.id,
    processingTime: Date.now() - job.processedOn,
    result: result ? 'success' : 'no_result'
  });
});

transportOptimizationQueue.on('failed', (job, err) => {
  logger.error('Transport optimization job failed', {
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    error: err.message,
    stack: err.stack
  });
});

transportOptimizationQueue.on('stalled', (job) => {
  logger.warn('Transport optimization job stalled', {
    jobId: job.id,
    attemptsMade: job.attemptsMade
  });
});

transportOptimizationQueue.on('error', (error) => {
  logger.error('Transport optimization queue error', {
    error: error.message,
    stack: error.stack
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing transport optimization queue...');
  await transportOptimizationQueue.close();
});

module.exports = {
  transportOptimizationQueue,
  enqueueTransportOptimizationJob,
  getJobStatus,
  getQueueMetrics,
  cleanOldJobs,
  QUEUE_NAME
};
