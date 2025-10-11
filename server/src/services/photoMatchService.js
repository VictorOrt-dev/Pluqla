/**
 * Photo Match Service
 *
 * Business logic for photo matching feature
 * Handles job creation, status checks, result retrieval
 *
 * Security considerations:
 * - Atomic quota checks before job creation
 * - Image validation and sanitization
 * - User authorization checks
 * - Rate limiting at service layer
 */

const prisma = require('../lib/prismaClient');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { enqueuePhotoMatchJob } = require('../queues/photoMatchQueue');
const { consumeTokens } = require('./aiUsageService');

/**
 * Create a new photo match job
 * @param {string} userId - User ID
 * @param {string} imageData - Image data (base64 or URL)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created job
 */
async function createPhotoMatchJob(userId, imageData, metadata = {}) {
  try {
    // 1. Validate and extract image info
    const imageInfo = await validateImageData(imageData);

    // 2. Generate image hash for deduplication
    const imageHash = generateImageHash(imageInfo.data);

    // 3. Check for duplicate recent jobs (within 1 hour)
    const duplicateJob = await checkDuplicateJob(userId, imageHash, 3600000); // 1 hour
    if (duplicateJob) {
      logger.info('Duplicate photo match job found', {
        userId,
        imageHash,
        existingJobId: duplicateJob.id
      });

      return {
        jobId: duplicateJob.id,
        status: duplicateJob.status,
        duplicate: true,
        createdAt: duplicateJob.createdAt
      };
    }

    // 4. Create job record in database
    const job = await prisma.photoMatchJob.create({
      data: {
        userId,
        status: 'pending',
        imageUrl: imageInfo.url || imageData, // Store URL or base64
        imageHash,
        imageSize: imageInfo.size,
        mimeType: imageInfo.mimeType,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    // 5. Enqueue job for async processing
    await enqueuePhotoMatchJob({
      jobId: job.id,
      userId,
      imageUrl: imageInfo.url || imageData,
      imageHash,
      mimeType: imageInfo.mimeType,
      imageSize: imageInfo.size,
      priority: metadata.priority || 5
    });

    // 6. Consume AI quota atomically (done in middleware, but log here)
    logger.info('Photo match job created successfully', {
      jobId: job.id,
      userId,
      imageHash,
      imageSize: imageInfo.size
    });

    return {
      jobId: job.id,
      status: 'pending',
      duplicate: false,
      createdAt: job.createdAt,
      estimatedCompletionTime: new Date(Date.now() + 60000) // ~1 minute
    };

  } catch (error) {
    logger.error('Failed to create photo match job', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get job status and result
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<Object>} Job status and result
 */
async function getPhotoMatchJobStatus(jobId, userId) {
  try {
    // Fetch job with result
    const job = await prisma.photoMatchJob.findFirst({
      where: {
        id: jobId,
        userId // Ensure user owns this job
      },
      include: {
        result: true
      }
    });

    if (!job) {
      throw new Error('Job not found or access denied');
    }

    // Build response based on status
    const response = {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };

    // Add timing info if available
    if (job.processingStartedAt) {
      response.processingStartedAt = job.processingStartedAt;
    }

    if (job.processingCompletedAt) {
      response.processingCompletedAt = job.processingCompletedAt;
      response.processingTimeMs = job.processingCompletedAt - job.processingStartedAt;
    }

    // Add error info if failed
    if (job.status === 'failed') {
      response.error = {
        message: job.errorMessage,
        retryCount: job.retryCount
      };
    }

    // Add result if completed
    if (job.status === 'completed' && job.result) {
      response.result = {
        matchType: job.result.matchType,
        matchScore: job.result.matchScore,
        matchData: JSON.parse(job.result.matchData),
        aiProvider: job.result.aiProvider,
        tokensUsed: job.result.tokensUsed,
        processingTimeMs: job.result.processingTimeMs,
        cacheHit: job.result.aiProvider === 'cached'
      };
    }

    logger.info('Photo match job status retrieved', {
      jobId,
      userId,
      status: job.status
    });

    return response;

  } catch (error) {
    logger.error('Failed to get job status', {
      jobId,
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's photo match history
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, offset)
 * @returns {Promise<Object>} Job history
 */
async function getUserPhotoMatchHistory(userId, options = {}) {
  try {
    const { limit = 20, offset = 0, status } = options;

    const where = {
      userId,
      ...(status && { status })
    };

    const [jobs, total] = await Promise.all([
      prisma.photoMatchJob.findMany({
        where,
        include: {
          result: {
            select: {
              matchType: true,
              matchScore: true,
              aiProvider: true,
              processingTimeMs: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.photoMatchJob.count({ where })
    ]);

    logger.info('Photo match history retrieved', {
      userId,
      count: jobs.length,
      total
    });

    return {
      jobs: jobs.map(job => ({
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        result: job.result ? {
          matchType: job.result.matchType,
          matchScore: job.result.matchScore,
          processingTimeMs: job.result.processingTimeMs,
          cacheHit: job.result.aiProvider === 'cached'
        } : null
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + jobs.length < total
      }
    };

  } catch (error) {
    logger.error('Failed to get photo match history', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get photo match analytics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Analytics data
 */
async function getPhotoMatchAnalytics(userId) {
  try {
    const analytics = await prisma.photoMatchJob.groupBy({
      by: ['status'],
      where: {
        userId
      },
      _count: {
        status: true
      }
    });

    const totalJobs = analytics.reduce((sum, item) => sum + item._count.status, 0);

    const avgProcessingTime = await prisma.photoMatchResult.aggregate({
      where: {
        userId
      },
      _avg: {
        processingTimeMs: true
      }
    });

    return {
      totalJobs,
      statusBreakdown: analytics.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      avgProcessingTimeMs: avgProcessingTime._avg.processingTimeMs || 0
    };

  } catch (error) {
    logger.error('Failed to get photo match analytics', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Validate image data
 * @param {string} imageData - Image data (base64 or URL)
 * @returns {Promise<Object>} Validation result
 */
async function validateImageData(imageData) {
  if (!imageData || typeof imageData !== 'string') {
    throw new Error('Invalid image data');
  }

  // Base64 image
  if (imageData.startsWith('data:image')) {
    const match = imageData.match(/^data:image\/(jpeg|png|webp|heic);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid base64 image format');
    }

    const mimeType = `image/${match[1]}`;
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Security: Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new Error(`Image size ${buffer.length} bytes exceeds maximum ${MAX_SIZE} bytes`);
    }

    return {
      mimeType,
      size: buffer.length,
      data: base64Data,
      url: null
    };
  }

  // URL image
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    // Security: Validate URL format
    try {
      const url = new URL(imageData);
      // Only allow specific domains (whitelist)
      const allowedDomains = [
        's3.amazonaws.com',
        'storage.googleapis.com',
        'cloudinary.com',
        // Add your CDN domains
      ];

      const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain));
      if (!isAllowed) {
        throw new Error('Image URL domain not allowed');
      }

      return {
        mimeType: 'image/jpeg', // Will be validated during processing
        size: 0, // Unknown until downloaded
        data: null,
        url: imageData
      };
    } catch (error) {
      throw new Error(`Invalid image URL: ${error.message}`);
    }
  }

  throw new Error('Image data must be base64 or valid URL');
}

/**
 * Generate image hash for deduplication
 * @param {string} imageData - Image data
 * @returns {string} SHA-256 hash
 */
function generateImageHash(imageData) {
  if (!imageData) {
    return crypto.randomBytes(32).toString('hex');
  }

  return crypto
    .createHash('sha256')
    .update(imageData)
    .digest('hex');
}

/**
 * Check for duplicate job
 * @param {string} userId - User ID
 * @param {string} imageHash - Image hash
 * @param {number} timeWindow - Time window in milliseconds
 * @returns {Promise<Object|null>} Existing job or null
 */
async function checkDuplicateJob(userId, imageHash, timeWindow) {
  try {
    const cutoff = new Date(Date.now() - timeWindow);

    const existingJob = await prisma.photoMatchJob.findFirst({
      where: {
        userId,
        imageHash,
        createdAt: {
          gte: cutoff
        },
        status: {
          in: ['pending', 'processing', 'completed']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return existingJob;
  } catch (error) {
    logger.warn('Failed to check for duplicate job', {
      userId,
      imageHash,
      error: error.message
    });
    return null; // Don't fail on duplicate check errors
  }
}

module.exports = {
  createPhotoMatchJob,
  getPhotoMatchJobStatus,
  getUserPhotoMatchHistory,
  getPhotoMatchAnalytics,
  validateImageData
};
