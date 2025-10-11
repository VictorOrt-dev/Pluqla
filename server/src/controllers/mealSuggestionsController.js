/**
 * Meal Suggestions Controller
 *
 * HTTP request handlers for meal suggestions endpoints
 *
 * Security considerations:
 * - All requests require authentication
 * - Quota enforcement via middleware
 * - Input validation and sanitization
 * - Rate limiting applied
 */

const mealSuggestionsService = require('../services/mealSuggestionsService');
const logger = require('../utils/logger');
const { getQueueMetrics } = require('../queues/mealSuggestionsQueue');
const prisma = require('../lib/prismaClient');

/**
 * Create a new meal suggestion job
 * POST /api/meal-suggestions
 */
async function createMealSuggestion(req, res) {
  try {
    const userId = req.user.id;
    const {
      mealType,
      dietaryRestrictions,
      budget,
      servings,
      cuisineType,
      maxCookingTime,
      skillLevel,
      avoidIngredients,
      preferredIngredients,
      metadata
    } = req.body;

    // Request data is validated by middleware, proceed with job creation
    const requestData = {
      mealType,
      dietaryRestrictions,
      budget,
      servings,
      cuisineType,
      maxCookingTime,
      skillLevel,
      avoidIngredients,
      preferredIngredients
    };

    const result = await mealSuggestionsService.createMealSuggestionJob(
      userId,
      requestData,
      metadata
    );

    // Build response
    const response = {
      success: true,
      data: {
        jobId: result.jobId,
        status: result.status,
        duplicate: result.duplicate,
        estimatedCompletionTime: result.estimatedCompletionTime,
        createdAt: result.createdAt
      }
    };

    // Add quota info if available from middleware
    if (req.aiQuota) {
      response.quota = {
        remaining: req.aiQuota.remaining - req.aiQuota.tokenCost,
        limit: req.aiQuota.quota,
        resetAt: req.aiQuota.resetAt
      };
    }

    logger.info('Meal suggestion created via API', {
      userId,
      jobId: result.jobId,
      duplicate: result.duplicate,
      mealType,
      servings,
      ipAddress: req.ip
    });

    res.status(result.duplicate ? 200 : 202).json(response);

  } catch (error) {
    logger.error('Meal suggestion creation failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(error.message.includes('quota') ? 429 : 400).json({
      success: false,
      error: {
        message: error.message,
        code: error.message.includes('quota') ? 'QUOTA_EXCEEDED' : 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get meal suggestion job status
 * GET /api/meal-suggestions/:jobId
 */
async function getMealSuggestionStatus(req, res) {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const result = await mealSuggestionsService.getMealSuggestionJobStatus(
      jobId,
      userId
    );

    logger.info('Meal suggestion status retrieved via API', {
      userId,
      jobId,
      status: result.status,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Meal suggestion status retrieval failed', {
      userId: req.user?.id,
      jobId: req.params.jobId,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: {
        message: error.message,
        code: error.message.includes('not found') ? 'JOB_NOT_FOUND' : 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get meal suggestion history
 * GET /api/meal-suggestions/history
 */
async function getMealSuggestionHistory(req, res) {
  try {
    const userId = req.user.id;
    const { limit, offset, status, mealType } = req.query;

    const options = {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      status: status || null,
      mealType: mealType || null
    };

    const result = await mealSuggestionsService.getUserMealSuggestionHistory(
      userId,
      options
    );

    logger.info('Meal suggestion history retrieved via API', {
      userId,
      count: result.jobs.length,
      total: result.total,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Meal suggestion history retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get meal suggestion analytics
 * GET /api/meal-suggestions/analytics
 */
async function getMealSuggestionAnalytics(req, res) {
  try {
    const userId = req.user.id;

    const result = await mealSuggestionsService.getUserMealSuggestionAnalytics(userId);

    logger.info('Meal suggestion analytics retrieved via API', {
      userId,
      totalJobs: result.totalJobs,
      totalMeals: result.totalMeals,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Meal suggestion analytics retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'INVALID_REQUEST'
      }
    });
  }
}

/**
 * Get meal suggestion metrics (system-wide)
 * GET /api/meal-suggestions/metrics
 */
async function getMealSuggestionMetrics(req, res) {
  try {
    const userId = req.user.id;

    // Only allow admins to view system-wide metrics
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: Admin access required',
          code: 'FORBIDDEN'
        }
      });
    }

    // Get queue metrics
    const queueMetrics = await getQueueMetrics();

    // Get database metrics
    const [totalJobs, completedJobs, failedJobs, totalMeals] = await Promise.all([
      prisma.mealSuggestionJob.count(),
      prisma.mealSuggestionJob.count({ where: { status: 'completed' } }),
      prisma.mealSuggestionJob.count({ where: { status: 'failed' } }),
      prisma.mealSuggestionResult.aggregate({
        _sum: {
          totalMeals: true,
          tokensUsed: true
        },
        _avg: {
          avgCostEur: true,
          avgCookingTimeMin: true,
          processingTimeMs: true
        }
      })
    ]);

    const metrics = {
      queue: queueMetrics,
      database: {
        totalJobs,
        completedJobs,
        failedJobs,
        totalMeals: totalMeals._sum?.totalMeals || 0,
        totalTokensUsed: totalMeals._sum?.tokensUsed || 0,
        avgCostEur: Math.round((totalMeals._avg?.avgCostEur || 0) * 100) / 100,
        avgCookingTimeMin: Math.round(totalMeals._avg?.avgCookingTimeMin || 0),
        avgProcessingTimeMs: Math.round(totalMeals._avg?.processingTimeMs || 0)
      },
      rates: {
        completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
        failureRate: totalJobs > 0 ? Math.round((failedJobs / totalJobs) * 100) : 0
      }
    };

    logger.info('Meal suggestion metrics retrieved via API', {
      userId,
      role: user.role,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Meal suggestion metrics retrieval failed', {
      userId: req.user?.id,
      error: error.message,
      ipAddress: req.ip
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve metrics',
        code: 'INTERNAL_ERROR'
      }
    });
  }
}

module.exports = {
  createMealSuggestion,
  getMealSuggestionStatus,
  getMealSuggestionHistory,
  getMealSuggestionAnalytics,
  getMealSuggestionMetrics
};
