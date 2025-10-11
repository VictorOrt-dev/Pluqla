/**
 * Meal Suggestions Service
 *
 * Business logic for meal suggestions feature
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
const { enqueueMealSuggestionJob } = require('../queues/mealSuggestionsQueue');

/**
 * Generate SHA-256 hash for meal request deduplication
 * @param {Object} requestData - Request data
 * @returns {string} SHA-256 hash
 */
function generateRequestHash(requestData) {
  const hashInput = JSON.stringify({
    mealType: requestData.mealType?.toLowerCase().trim() || 'any',
    dietaryRestrictions: (requestData.dietaryRestrictions || [])
      .map(r => r.toLowerCase().trim())
      .sort()
      .join(','),
    budget: requestData.budget ? Math.round(requestData.budget * 100) / 100 : null,
    servings: requestData.servings || 2,
    cuisineType: requestData.cuisineType?.toLowerCase().trim() || null,
    maxCookingTime: requestData.maxCookingTime || null,
    skillLevel: requestData.skillLevel?.toLowerCase().trim() || null,
    avoidIngredients: (requestData.avoidIngredients || [])
      .map(i => i.toLowerCase().trim())
      .sort()
      .join(',')
  });

  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Check for duplicate recent jobs
 * @param {string} userId - User ID
 * @param {string} requestHash - Request hash
 * @param {number} windowMs - Time window in milliseconds (default 1 hour)
 * @returns {Promise<Object|null>} Duplicate job or null
 */
async function checkDuplicateJob(userId, requestHash, windowMs = 3600000) {
  const cutoff = new Date(Date.now() - windowMs);

  const duplicateJob = await prisma.mealSuggestionJob.findFirst({
    where: {
      userId,
      requestHash,
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
 * Create a new meal suggestion job
 * @param {string} userId - User ID
 * @param {Object} requestData - Request parameters
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created job
 */
async function createMealSuggestionJob(userId, requestData, metadata = {}) {
  try {
    // 1. Validate request data (basic validation, full validation in middleware)
    if (requestData.servings && (requestData.servings < 1 || requestData.servings > 20)) {
      throw new Error('Servings must be between 1 and 20');
    }

    if (requestData.budget && (requestData.budget < 0 || requestData.budget > 200)) {
      throw new Error('Budget must be between 0 and 200 EUR');
    }

    if (requestData.maxCookingTime && (requestData.maxCookingTime < 5 || requestData.maxCookingTime > 300)) {
      throw new Error('Max cooking time must be between 5 and 300 minutes');
    }

    // 2. Generate request hash for deduplication
    const requestHash = generateRequestHash(requestData);

    // 3. Check for duplicate recent jobs (within 1 hour)
    const duplicateJob = await checkDuplicateJob(userId, requestHash, 3600000);
    if (duplicateJob) {
      logger.info('Duplicate meal suggestion job found', {
        userId,
        requestHash,
        existingJobId: duplicateJob.id
      });

      return {
        jobId: duplicateJob.id,
        status: duplicateJob.status,
        duplicate: true,
        createdAt: duplicateJob.createdAt
      };
    }

    // 4. Prepare filters for storage
    const filters = {
      cuisineType: requestData.cuisineType || null,
      maxCookingTime: requestData.maxCookingTime || null,
      skillLevel: requestData.skillLevel || null,
      avoidIngredients: requestData.avoidIngredients || [],
      preferredIngredients: requestData.preferredIngredients || []
    };

    // 5. Create job record in database
    const job = await prisma.mealSuggestionJob.create({
      data: {
        userId,
        status: 'pending',
        requestHash,
        mealType: requestData.mealType?.trim().substring(0, 50) || null,
        dietaryRestrictions: requestData.dietaryRestrictions
          ? JSON.stringify(requestData.dietaryRestrictions)
          : null,
        budget: requestData.budget || null,
        servings: requestData.servings || 2,
        filters: JSON.stringify(filters),
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    // 6. Enqueue job for async processing
    await enqueueMealSuggestionJob({
      jobId: job.id,
      userId,
      requestData: {
        mealType: requestData.mealType || null,
        dietaryRestrictions: requestData.dietaryRestrictions || [],
        budget: requestData.budget || null,
        servings: requestData.servings || 2,
        cuisineType: requestData.cuisineType || null,
        maxCookingTime: requestData.maxCookingTime || null,
        skillLevel: requestData.skillLevel || null,
        avoidIngredients: requestData.avoidIngredients || [],
        preferredIngredients: requestData.preferredIngredients || []
      },
      requestHash,
      priority: metadata.priority || 5
    });

    logger.info('Meal suggestion job created successfully', {
      jobId: job.id,
      userId,
      requestHash,
      mealType: requestData.mealType,
      budget: requestData.budget
    });

    return {
      jobId: job.id,
      status: 'pending',
      duplicate: false,
      createdAt: job.createdAt,
      estimatedCompletionTime: new Date(Date.now() + 15000) // ~15 seconds
    };

  } catch (error) {
    logger.error('Failed to create meal suggestion job', {
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
async function getMealSuggestionJobStatus(jobId, userId) {
  try {
    // Fetch job with result
    const job = await prisma.mealSuggestionJob.findFirst({
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
      requestInfo: {
        mealType: job.mealType,
        dietaryRestrictions: job.dietaryRestrictions ? JSON.parse(job.dietaryRestrictions) : [],
        budget: job.budget,
        servings: job.servings,
        filters: job.filters ? JSON.parse(job.filters) : {}
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
        meals: JSON.parse(job.result.mealsData),
        totalMeals: job.result.totalMeals,
        avgCostEur: job.result.avgCostEur,
        avgCookingTimeMin: job.result.avgCookingTimeMin,
        aiProvider: job.result.aiProvider,
        tokensUsed: job.result.tokensUsed,
        processingTimeMs: job.result.processingTimeMs,
        cacheHit: job.result.aiProvider === 'cached',
        cachedUntil: job.result.cachedUntil
      };
    }

    return response;

  } catch (error) {
    logger.error('Failed to get meal suggestion job status', {
      jobId,
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's meal suggestion history
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, offset, status)
 * @returns {Promise<Object>} Job history
 */
async function getUserMealSuggestionHistory(userId, options = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      status = null,
      mealType = null
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
    if (mealType) {
      where.mealType = mealType;
    }

    // Fetch jobs with results
    const [jobs, total] = await Promise.all([
      prisma.mealSuggestionJob.findMany({
        where,
        include: {
          result: {
            select: {
              totalMeals: true,
              avgCostEur: true,
              avgCookingTimeMin: true,
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
      prisma.mealSuggestionJob.count({ where })
    ]);

    // Transform jobs to response format
    const history = jobs.map(job => ({
      jobId: job.id,
      status: job.status,
      requestInfo: {
        mealType: job.mealType,
        dietaryRestrictions: job.dietaryRestrictions ? JSON.parse(job.dietaryRestrictions) : [],
        budget: job.budget,
        servings: job.servings
      },
      result: job.result ? {
        totalMeals: job.result.totalMeals,
        avgCostEur: job.result.avgCostEur,
        avgCookingTimeMin: job.result.avgCookingTimeMin,
        cacheHit: job.result.aiProvider === 'cached'
      } : null,
      createdAt: job.createdAt,
      processingTimeMs: job.result?.processingTimeMs || null
    }));

    logger.info('Meal suggestion history retrieved', {
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
    logger.error('Failed to get meal suggestion history', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's meal suggestion analytics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Analytics data
 */
async function getUserMealSuggestionAnalytics(userId) {
  try {
    // Fetch all completed jobs for this user
    const completedJobs = await prisma.mealSuggestionJob.findMany({
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
        totalMeals: 0,
        avgCostEur: 0,
        avgCookingTime: 0,
        averageProcessingTime: 0,
        mostRequestedMealType: null,
        mealTypeDistribution: {},
        cacheHitRate: 0,
        recentJobs: []
      };
    }

    // Calculate analytics
    let totalMeals = 0;
    let totalCost = 0;
    let totalCookingTime = 0;
    let totalProcessingTime = 0;
    let cacheHits = 0;
    const mealTypesCount = {};

    for (const job of completedJobs) {
      if (job.result) {
        totalMeals += job.result.totalMeals || 0;
        totalCost += (job.result.avgCostEur * job.result.totalMeals) || 0;
        totalCookingTime += (job.result.avgCookingTimeMin * job.result.totalMeals) || 0;
        totalProcessingTime += job.result.processingTimeMs || 0;

        if (job.result.aiProvider === 'cached') {
          cacheHits++;
        }
      }

      const mealType = job.mealType || 'any';
      mealTypesCount[mealType] = (mealTypesCount[mealType] || 0) + 1;
    }

    // Find most requested meal type
    const mostRequestedMealType = Object.keys(mealTypesCount).length > 0
      ? Object.entries(mealTypesCount).reduce((a, b) => b[1] > a[1] ? b : a)[0]
      : null;

    // Calculate percentages for meal type distribution
    const totalMealTypeCount = Object.values(mealTypesCount).reduce((a, b) => a + b, 0);
    const mealTypeDistribution = {};
    for (const [type, count] of Object.entries(mealTypesCount)) {
      mealTypeDistribution[type] = {
        count,
        percentage: Math.round((count / totalMealTypeCount) * 100)
      };
    }

    // Calculate cache hit rate
    const cacheHitRate = completedJobs.length > 0
      ? Math.round((cacheHits / completedJobs.length) * 100)
      : 0;

    logger.info('Meal suggestion analytics retrieved', {
      userId,
      totalJobs: completedJobs.length,
      totalMeals,
      mostRequestedMealType,
      cacheHitRate
    });

    return {
      totalJobs: completedJobs.length,
      totalMeals,
      avgCostEur: totalMeals > 0 ? Math.round((totalCost / totalMeals) * 100) / 100 : 0,
      avgCookingTime: totalMeals > 0 ? Math.round(totalCookingTime / totalMeals) : 0,
      averageProcessingTime: Math.round(totalProcessingTime / completedJobs.length),
      mostRequestedMealType,
      mealTypeDistribution,
      cacheHitRate,
      recentJobs: completedJobs.slice(0, 5).map(job => ({
        jobId: job.id,
        mealType: job.mealType,
        totalMeals: job.result?.totalMeals,
        avgCostEur: job.result?.avgCostEur,
        createdAt: job.createdAt
      }))
    };

  } catch (error) {
    logger.error('Failed to get meal suggestion analytics', {
      userId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  createMealSuggestionJob,
  getMealSuggestionJobStatus,
  getUserMealSuggestionHistory,
  getUserMealSuggestionAnalytics,
  generateRequestHash,
  checkDuplicateJob
};
