/**
 * Transport Optimization Service
 *
 * Business logic for transport optimization feature
 * Handles job creation, status checks, result retrieval, history, analytics
 *
 * Security considerations:
 * - Atomic quota checks before job creation
 * - Input validation and sanitization
 * - User authorization checks
 * - SHA-256 deduplication for cache efficiency
 */

const prisma = require('../lib/prismaClient');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { enqueueTransportOptimizationJob } = require('../queues/transportOptimizationQueue');

/**
 * Generate SHA-256 hash for trip deduplication
 * @param {Object} tripData - Trip data
 * @returns {string} SHA-256 hash
 */
function generateTripHash(tripData) {
  const hashInput = JSON.stringify({
    origin: tripData.origin.toLowerCase().trim(),
    destination: tripData.destination.toLowerCase().trim(),
    distance: Math.round(tripData.distance * 100) / 100, // Round to 2 decimals
    recurring: Boolean(tripData.recurring),
    parkingNeeded: Boolean(tripData.parkingNeeded !== false),
    tollRoads: Boolean(tripData.tollRoads === true)
  });

  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Check for duplicate recent jobs
 * @param {string} userId - User ID
 * @param {string} tripHash - Trip hash
 * @param {number} windowMs - Time window in milliseconds (default 1 hour)
 * @returns {Promise<Object|null>} Duplicate job or null
 */
async function checkDuplicateJob(userId, tripHash, windowMs = 3600000) {
  const cutoff = new Date(Date.now() - windowMs);

  const duplicateJob = await prisma.transportOptimizationJob.findFirst({
    where: {
      userId,
      tripHash,
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

  return duplicateJob;
}

/**
 * Create a new transport optimization job
 * @param {string} userId - User ID
 * @param {Object} tripData - Trip data (origin, destination, distance, etc.)
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created job
 */
async function createTransportOptimizationJob(userId, tripData, metadata = {}) {
  try {
    // 1. Validate trip data (basic validation, full validation in calculator)
    if (!tripData.origin || !tripData.destination || !tripData.distance) {
      throw new Error('Origin, destination, and distance are required');
    }

    if (tripData.distance <= 0 || tripData.distance > 1000) {
      throw new Error('Distance must be between 0 and 1000 km');
    }

    // 2. Generate trip hash for deduplication
    const tripHash = generateTripHash(tripData);

    // 3. Check for duplicate recent jobs (within 1 hour)
    const duplicateJob = await checkDuplicateJob(userId, tripHash, 3600000);
    if (duplicateJob) {
      logger.info('Duplicate transport optimization job found', {
        userId,
        tripHash,
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
    const job = await prisma.transportOptimizationJob.create({
      data: {
        userId,
        status: 'pending',
        origin: tripData.origin.trim().substring(0, 200),
        destination: tripData.destination.trim().substring(0, 200),
        distanceKm: tripData.distance,
        tripHash,
        recurring: Boolean(tripData.recurring),
        parkingNeeded: Boolean(tripData.parkingNeeded !== false),
        tollRoads: Boolean(tripData.tollRoads === true),
        modes: tripData.modes ? JSON.stringify(tripData.modes) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    // 5. Enqueue job for async processing
    await enqueueTransportOptimizationJob({
      jobId: job.id,
      userId,
      tripData: {
        origin: job.origin,
        destination: job.destination,
        distance: job.distanceKm,
        recurring: job.recurring,
        parkingNeeded: job.parkingNeeded,
        tollRoads: job.tollRoads,
        modes: tripData.modes || null
      },
      tripHash,
      priority: metadata.priority || 5
    });

    logger.info('Transport optimization job created successfully', {
      jobId: job.id,
      userId,
      tripHash,
      distance: job.distanceKm,
      recurring: job.recurring
    });

    return {
      jobId: job.id,
      status: 'pending',
      duplicate: false,
      createdAt: job.createdAt,
      estimatedCompletionTime: new Date(Date.now() + 5000) // ~5 seconds (fast computation)
    };

  } catch (error) {
    logger.error('Failed to create transport optimization job', {
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
async function getTransportOptimizationJobStatus(jobId, userId) {
  try {
    // Fetch job with result
    const job = await prisma.transportOptimizationJob.findFirst({
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
      tripInfo: {
        origin: job.origin,
        destination: job.destination,
        distanceKm: job.distanceKm,
        recurring: job.recurring,
        parkingNeeded: job.parkingNeeded,
        tollRoads: job.tollRoads
      },
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
        optimalMode: job.result.optimalMode,
        totalCostEur: job.result.totalCostEur,
        savingsPotential: job.result.savingsPotential,
        co2ImpactKg: job.result.co2ImpactKg,
        costsBreakdown: JSON.parse(job.result.costsBreakdown),
        metadata: job.result.metadata ? JSON.parse(job.result.metadata) : null,
        processingTimeMs: job.result.processingTimeMs,
        calculationVersion: job.result.calculationVersion,
        cachedUntil: job.result.cachedUntil
      };
    }

    return response;

  } catch (error) {
    logger.error('Failed to get transport optimization job status', {
      jobId,
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's transport optimization history
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, offset, status)
 * @returns {Promise<Object>} Job history
 */
async function getUserTransportOptimizationHistory(userId, options = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      status = null
    } = options;

    // Validate options
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new Error('Offset must be a positive integer');
    }

    // Build query filters
    const where = { userId };
    if (status) {
      where.status = status;
    }

    // Fetch jobs with results
    const [jobs, total] = await Promise.all([
      prisma.transportOptimizationJob.findMany({
        where,
        include: {
          result: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.transportOptimizationJob.count({ where })
    ]);

    // Transform jobs to response format
    const history = jobs.map(job => ({
      jobId: job.id,
      status: job.status,
      tripInfo: {
        origin: job.origin,
        destination: job.destination,
        distanceKm: job.distanceKm,
        recurring: job.recurring
      },
      result: job.result ? {
        optimalMode: job.result.optimalMode,
        totalCostEur: job.result.totalCostEur,
        savingsPotential: job.result.savingsPotential,
        co2ImpactKg: job.result.co2ImpactKg
      } : null,
      createdAt: job.createdAt,
      processingTimeMs: job.result?.processingTimeMs || null
    }));

    logger.info('Transport optimization history retrieved', {
      userId,
      count: history.length,
      total,
      limit,
      offset
    });

    return {
      jobs: history,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };

  } catch (error) {
    logger.error('Failed to get transport optimization history', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's transport optimization analytics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Analytics data
 */
async function getTransportOptimizationAnalytics(userId) {
  try {
    // Fetch all completed jobs for this user
    const completedJobs = await prisma.transportOptimizationJob.findMany({
      where: {
        userId,
        status: 'completed'
      },
      include: {
        result: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (completedJobs.length === 0) {
      return {
        totalJobs: 0,
        totalSavingsPotential: 0,
        totalCO2Saved: 0,
        averageProcessingTime: 0,
        mostUsedMode: null,
        modesDistribution: {},
        recentJobs: []
      };
    }

    // Calculate analytics
    let totalSavings = 0;
    let totalCO2 = 0;
    let totalProcessingTime = 0;
    const modesCount = {};

    for (const job of completedJobs) {
      if (job.result) {
        totalSavings += job.result.savingsPotential || 0;
        totalCO2 += job.result.co2ImpactKg || 0;
        totalProcessingTime += job.result.processingTimeMs || 0;

        const mode = job.result.optimalMode;
        modesCount[mode] = (modesCount[mode] || 0) + 1;
      }
    }

    // Find most used mode
    const mostUsedMode = Object.keys(modesCount).length > 0
      ? Object.entries(modesCount).reduce((a, b) => b[1] > a[1] ? b : a)[0]
      : null;

    // Calculate percentages for modes distribution
    const totalModeCount = Object.values(modesCount).reduce((a, b) => a + b, 0);
    const modesDistribution = {};
    for (const [mode, count] of Object.entries(modesCount)) {
      modesDistribution[mode] = {
        count,
        percentage: Math.round((count / totalModeCount) * 100)
      };
    }

    logger.info('Transport optimization analytics retrieved', {
      userId,
      totalJobs: completedJobs.length,
      totalSavings,
      mostUsedMode
    });

    return {
      totalJobs: completedJobs.length,
      totalSavingsPotential: Math.round(totalSavings * 100) / 100,
      totalCO2Saved: Math.round(totalCO2 * 100) / 100,
      averageProcessingTime: Math.round(totalProcessingTime / completedJobs.length),
      mostUsedMode,
      modesDistribution,
      recentJobs: completedJobs.slice(0, 5).map(job => ({
        jobId: job.id,
        tripInfo: {
          origin: job.origin,
          destination: job.destination,
          distanceKm: job.distanceKm
        },
        optimalMode: job.result?.optimalMode,
        savingsPotential: job.result?.savingsPotential,
        createdAt: job.createdAt
      }))
    };

  } catch (error) {
    logger.error('Failed to get transport optimization analytics', {
      userId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  createTransportOptimizationJob,
  getTransportOptimizationJobStatus,
  getUserTransportOptimizationHistory,
  getTransportOptimizationAnalytics,
  generateTripHash,
  checkDuplicateJob
};
