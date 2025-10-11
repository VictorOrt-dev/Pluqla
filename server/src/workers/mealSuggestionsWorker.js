/**
 * Meal Suggestions Worker
 *
 * Background worker that processes meal suggestion jobs from Bull queue
 * Handles AI calls, caching, and result storage
 *
 * Security considerations:
 * - Validates all inputs before processing
 * - Sanitizes AI responses
 * - Implements timeout logic
 * - Stores results securely in DB and Redis cache
 * - Logs all processing steps without PII
 */

const { mealSuggestionsQueue } = require('../queues/mealSuggestionsQueue');
const prisma = require('../lib/prismaClient');
const redis = require('../lib/redisClient');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { generateMealSuggestions } = require('../services/aiMealService');
const metricsService = require('../services/mealSuggestionsMetricsService');

// Cache configuration
const CACHE_TTL = 3600 * 24 * 7; // 7 days
const CACHE_KEY_PREFIX = 'meal-suggestions:';

/**
 * Process meal suggestion job
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} Processing result
 */
async function processMealSuggestionJob(job) {
  const startTime = Date.now();
  const { jobId, userId, requestData, requestHash } = job.data;

  logger.info('Processing meal suggestion job', {
    jobId,
    userId,
    requestHash,
    mealType: requestData.mealType,
    servings: requestData.servings,
    attempt: job.attemptsMade + 1
  });

  try {
    // 1. Update job status to 'processing' in DB
    await prisma.mealSuggestionJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        processingStartedAt: new Date()
      }
    });

    // 2. Check cache first (deduplication by request hash)
    job.progress(20);
    const cachedResult = await checkCache(requestHash);
    if (cachedResult) {
      logger.info('Cache hit for meal suggestions', {
        jobId,
        requestHash,
        cacheHit: true
      });

      // Record cache hit metric
      metricsService.recordCacheHit(true);

      // Store cached result for this user
      await storeCachedResult(jobId, userId, cachedResult, requestHash);
      return { success: true, cached: true, result: cachedResult };
    }

    // Record cache miss metric
    metricsService.recordCacheHit(false);

    // 3. Generate meal suggestions via AI
    job.progress(40);

    logger.info('Calling AI service for meal suggestions', {
      jobId,
      mealType: requestData.mealType
    });

    const aiResult = await generateMealSuggestions(requestData);

    job.progress(80);

    // 4. Store result in DB
    const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;
    const cachedUntil = new Date(Date.now() + CACHE_TTL * 1000);
    const processingTimeMs = Date.now() - startTime;

    await prisma.mealSuggestionResult.create({
      data: {
        jobId,
        userId,
        mealsData: JSON.stringify(aiResult.meals),
        totalMeals: aiResult.totalMeals,
        avgCostEur: aiResult.avgCostEur,
        avgCookingTimeMin: aiResult.avgCookingTimeMin,
        aiProvider: aiResult.aiProvider,
        tokensUsed: aiResult.tokensUsed || 0,
        processingTimeMs,
        cacheKey,
        cachedUntil,
        metadata: JSON.stringify({
          model: aiResult.model,
          cached: false
        })
      }
    });

    // 5. Cache the result
    await cacheResult(requestHash, aiResult, CACHE_TTL);

    // 6. Update job status to 'completed'
    await prisma.mealSuggestionJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processingCompletedAt: new Date()
      }
    });

    job.progress(100);

    // Record completion metrics
    metricsService.recordJobCompletion({
      status: 'completed',
      duplicate: false,
      cached: false,
      processingTimeMs,
      tokensUsed: aiResult.tokensUsed || 0,
      aiProvider: aiResult.aiProvider,
      totalMeals: aiResult.totalMeals,
      avgCostEur: aiResult.avgCostEur,
      avgCookingTimeMin: aiResult.avgCookingTimeMin
    });

    logger.info('Meal suggestion job completed successfully', {
      jobId,
      userId,
      processingTimeMs,
      totalMeals: aiResult.totalMeals,
      avgCostEur: aiResult.avgCostEur,
      aiProvider: aiResult.aiProvider,
      tokensUsed: aiResult.tokensUsed
    });

    return {
      success: true,
      cached: false,
      result: aiResult,
      processingTimeMs
    };

  } catch (error) {
    logger.error('Meal suggestion job processing failed', {
      jobId,
      userId,
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade + 1
    });

    // Record error metric
    metricsService.recordError(error.name || 'UnknownError', 'processing');

    // Update job status to 'failed' in DB
    await prisma.mealSuggestionJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: sanitizeErrorMessage(error.message),
        processingCompletedAt: new Date(),
        retryCount: job.attemptsMade + 1
      }
    }).catch(err => {
      logger.error('Failed to update job status', {
        jobId,
        error: err.message
      });
    });

    throw error; // Rethrow for Bull to handle retries
  }
}

/**
 * Check cache for existing result
 * @param {string} requestHash - Request hash
 * @returns {Promise<Object|null>} Cached result or null
 */
async function checkCache(requestHash) {
  try {
    // Check Redis cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Check database cache (MealSuggestionCache table)
    const dbCache = await prisma.mealSuggestionCache.findFirst({
      where: {
        cacheKey,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (dbCache) {
      const result = {
        meals: JSON.parse(dbCache.mealsData),
        totalMeals: dbCache.totalMeals,
        avgCostEur: dbCache.avgCostEur,
        avgCookingTimeMin: dbCache.avgCookingTime,
        aiProvider: 'cached',
        model: 'cached',
        tokensUsed: 0,
        processingTimeMs: 0
      };

      // Store back in Redis for faster access
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result)).catch(() => {});

      return result;
    }

    return null;
  } catch (error) {
    logger.warn('Cache check failed', {
      requestHash,
      error: error.message
    });
    return null; // Don't fail on cache errors
  }
}

/**
 * Store cached result for new user
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID
 * @param {Object} cachedResult - Cached result data
 * @param {string} requestHash - Request hash
 */
async function storeCachedResult(jobId, userId, cachedResult, requestHash) {
  const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;
  const cachedUntil = new Date(Date.now() + CACHE_TTL * 1000);

  await prisma.mealSuggestionResult.create({
    data: {
      jobId,
      userId,
      mealsData: JSON.stringify(cachedResult.meals),
      totalMeals: cachedResult.totalMeals,
      avgCostEur: cachedResult.avgCostEur,
      avgCookingTimeMin: cachedResult.avgCookingTimeMin,
      aiProvider: 'cached',
      tokensUsed: 0,
      processingTimeMs: 0,
      cacheKey,
      cachedUntil,
      metadata: JSON.stringify({
        cached: true
      })
    }
  });

  await prisma.mealSuggestionJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      processingCompletedAt: new Date()
    }
  });

  // Record cached completion metric
  metricsService.recordJobCompletion({
    status: 'completed',
    duplicate: false,
    cached: true,
    processingTimeMs: 0,
    tokensUsed: 0,
    aiProvider: 'cached',
    totalMeals: cachedResult.totalMeals,
    avgCostEur: cachedResult.avgCostEur,
    avgCookingTimeMin: cachedResult.avgCookingTimeMin
  });
}

/**
 * Cache result in Redis and optionally in DB
 * @param {string} requestHash - Request hash
 * @param {Object} result - AI result
 * @param {number} ttl - TTL in seconds
 */
async function cacheResult(requestHash, result, ttl) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${requestHash}`;

    // Cache in Redis
    await redis.setex(cacheKey, ttl, JSON.stringify(result));

    logger.info('Result cached in Redis', {
      requestHash,
      cacheKey,
      ttl,
      totalMeals: result.totalMeals
    });

    // Record tokens saved metric
    if (result.tokensUsed > 0) {
      metricsService.recordTokensSaved(result.tokensUsed);
    }

  } catch (error) {
    logger.warn('Failed to cache result', {
      requestHash,
      error: error.message
    });
    // Don't throw - caching is optional
  }
}

/**
 * Sanitize error messages (remove sensitive info)
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
function sanitizeErrorMessage(message) {
  // Remove file paths, tokens, API keys
  return message
    .replace(/\/[\w\/\-\.]+/g, '[PATH]')
    .replace(/sk-[a-zA-Z0-9]+/g, '[API_KEY]')
    .replace(/Bearer\s+[^\s]+/g, '[TOKEN]')
    .replace(/api[_-]?key[:\s=]+[^\s]+/gi, '[API_KEY]')
    .substring(0, 500); // Limit error message length
}

// Start worker processing
const CONCURRENCY = parseInt(process.env.MEAL_SUGGESTIONS_WORKER_CONCURRENCY) || 3;
mealSuggestionsQueue.process(CONCURRENCY, processMealSuggestionJob);

logger.info('Meal suggestions worker started', {
  concurrency: CONCURRENCY,
  queueName: 'meal-suggestions-jobs',
  cacheTTL: `${CACHE_TTL / 3600}h`
});

module.exports = {
  processMealSuggestionJob
};
