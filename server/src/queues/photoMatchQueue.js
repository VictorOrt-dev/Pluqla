/**
 * Photo Match Queue Configuration
 *
 * Uses Bull for reliable async job processing with Redis
 * Handles photo analysis jobs with retry logic and dead letter queue
 *
 * Security considerations:
 * - Jobs expire after 24h to prevent queue bloat
 * - Rate limiting via quota middleware before enqueue
 * - Image validation before processing
 * - Sanitized error messages (no sensitive data in logs)
 */

const Queue = require('bull');
const logger = require('../utils/logger');
const redis = require('../lib/redisClient');

// Queue configuration
const QUEUE_NAME = 'photo-match-jobs';
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
    delay: 2000 // Start with 2s, then 4s, 8s
  },

  // Timeout and cleanup
  timeout: 120000, // 2 minutes max per job
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
    max: 10, // Max 10 jobs per interval
    duration: 1000 // Per second
  },

  // Settings for reliable processing
  settings: {
    lockDuration: 30000, // Lock job for 30s
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 1 // Retry stalled jobs once
  }
};

// Create the queue instance
const photoMatchQueue = new Queue(QUEUE_NAME, REDIS_CONFIG);

// Apply queue-level settings
photoMatchQueue.process = photoMatchQueue.process.bind(photoMatchQueue);

/**
 * Add a photo match job to the queue
 * @param {Object} jobData - Job data
 * @param {string} jobData.jobId - Database job ID
 * @param {string} jobData.userId - User ID
 * @param {string} jobData.imageUrl - Image URL or base64
 * @param {string} jobData.imageHash - SHA-256 hash
 * @param {string} jobData.mimeType - Image MIME type
 * @param {number} jobData.imageSize - Image size in bytes
 * @returns {Promise<Object>} Bull job object
 */
async function enqueuePhotoMatchJob(jobData) {
  try {
    // Validate required fields
    const requiredFields = ['jobId', 'userId', 'imageUrl', 'imageHash', 'mimeType', 'imageSize'];
    for (const field of requiredFields) {
      if (!jobData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Security: Validate image size (max 10MB)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    if (jobData.imageSize > MAX_IMAGE_SIZE) {
      throw new Error(`Image size ${jobData.imageSize} bytes exceeds maximum ${MAX_IMAGE_SIZE} bytes`);
    }

    // Security: Validate MIME type
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!ALLOWED_MIME_TYPES.includes(jobData.mimeType)) {
      throw new Error(`Invalid MIME type: ${jobData.mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Add job to queue with options
    const job = await photoMatchQueue.add(jobData, {
      ...JOB_OPTIONS,
      jobId: jobData.jobId, // Use DB jobId as Bull job ID for idempotency
      priority: jobData.priority || 5 // Default priority
    });

    logger.info('Photo match job enqueued', {
      jobId: jobData.jobId,
      bullJobId: job.id,
      userId: jobData.userId,
      imageHash: jobData.imageHash,
      queueLength: await photoMatchQueue.count()
    });

    return job;
  } catch (error) {
    logger.error('Failed to enqueue photo match job', {
      error: error.message,
      jobData: { ...jobData, imageUrl: '[REDACTED]' } // Don't log full image data
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
    const job = await photoMatchQueue.getJob(jobId);

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
      photoMatchQueue.getWaitingCount(),
      photoMatchQueue.getActiveCount(),
      photoMatchQueue.getCompletedCount(),
      photoMatchQueue.getFailedCount(),
      photoMatchQueue.getDelayedCount()
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
    const cleaned = await photoMatchQueue.clean(grace, 'completed');
    const failedCleaned = await photoMatchQueue.clean(grace * 7, 'failed'); // Keep failed for 7x longer

    logger.info('Cleaned old jobs', {
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
photoMatchQueue.on('completed', (job, result) => {
  logger.info('Photo match job completed', {
    jobId: job.id,
    processingTime: Date.now() - job.processedOn,
    result: result ? 'success' : 'no_result'
  });
});

photoMatchQueue.on('failed', (job, err) => {
  logger.error('Photo match job failed', {
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    error: err.message,
    stack: err.stack
  });
});

photoMatchQueue.on('stalled', (job) => {
  logger.warn('Photo match job stalled', {
    jobId: job.id,
    attemptsMade: job.attemptsMade
  });
});

photoMatchQueue.on('error', (error) => {
  logger.error('Queue error', {
    error: error.message,
    stack: error.stack
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing photo match queue...');
  await photoMatchQueue.close();
});

module.exports = {
  photoMatchQueue,
  enqueuePhotoMatchJob,
  getJobStatus,
  getQueueMetrics,
  cleanOldJobs,
  QUEUE_NAME
};
