/**
 * Meal Suggestions Metrics Service
 *
 * Prometheus metrics for monitoring meal suggestion operations
 * Tracks queue health, processing times, AI token usage, cache efficiency, costs
 *
 * Observability best practices:
 * - Counter metrics for job counts and tokens
 * - Histogram metrics for processing times and costs
 * - Gauge metrics for queue depth
 * - Labels for status, AI providers, cache hits
 */

const client = require('prom-client');
const logger = require('../utils/logger');

// Meal Suggestions Job Counter
const mealSuggestionsJobsTotal = new client.Counter({
  name: 'meal_suggestions_jobs_total',
  help: 'Total number of meal suggestion jobs created',
  labelNames: ['status', 'duplicate', 'cached']
});

// Meal Suggestions Processing Time Histogram
const mealSuggestionsProcessingDuration = new client.Histogram({
  name: 'meal_suggestions_processing_duration_seconds',
  help: 'Meal suggestion job processing duration in seconds',
  labelNames: ['status', 'cache_hit', 'ai_provider'],
  buckets: [0.5, 1, 2, 5, 10, 15, 30, 60] // AI calls can be slow
});

// Meal Suggestions Queue Depth Gauge
const mealSuggestionsQueueDepth = new client.Gauge({
  name: 'meal_suggestions_queue_depth',
  help: 'Number of jobs in meal suggestions queue by status',
  labelNames: ['status']
});

// Meal Suggestions Cache Hit Counter
const mealSuggestionsCacheHits = new client.Counter({
  name: 'meal_suggestions_cache_hits_total',
  help: 'Total number of meal suggestions cache hits vs misses',
  labelNames: ['hit']
});

// Meal Suggestions AI Tokens Counter
const mealSuggestionsTokensUsed = new client.Counter({
  name: 'meal_suggestions_ai_tokens_total',
  help: 'Total AI tokens consumed for meal suggestions',
  labelNames: ['ai_provider']
});

// Meal Suggestions Tokens Saved Counter (via caching)
const mealSuggestionsTokensSaved = new client.Counter({
  name: 'meal_suggestions_tokens_saved_total',
  help: 'Total AI tokens saved via caching'
});

// Meal Suggestions Quota Counter
const mealSuggestionsQuotaUsage = new client.Counter({
  name: 'meal_suggestions_quota_usage_total',
  help: 'Total quota tokens consumed for meal suggestions',
  labelNames: ['user_tier']
});

// Meal Suggestions Error Counter
const mealSuggestionsErrors = new client.Counter({
  name: 'meal_suggestions_errors_total',
  help: 'Total number of meal suggestion errors',
  labelNames: ['error_type', 'stage']
});

// Meal Suggestions Meals Generated Counter
const mealSuggestionsMealsGenerated = new client.Counter({
  name: 'meal_suggestions_meals_generated_total',
  help: 'Total number of meals generated',
  labelNames: ['meal_type', 'ai_provider']
});

// Meal Suggestions Average Cost Histogram
const mealSuggestionsAvgCost = new client.Histogram({
  name: 'meal_suggestions_avg_cost_euros',
  help: 'Average cost per meal suggestion (in EUR)',
  labelNames: ['meal_type'],
  buckets: [0, 2, 5, 10, 15, 20, 30, 50] // EUR
});

// Meal Suggestions Cooking Time Histogram
const mealSuggestionsCookingTime = new client.Histogram({
  name: 'meal_suggestions_cooking_time_minutes',
  help: 'Average cooking time per meal (in minutes)',
  labelNames: ['meal_type'],
  buckets: [0, 10, 15, 20, 30, 45, 60, 90, 120] // minutes
});

/**
 * Record job creation
 * @param {string} status - Job status
 * @param {boolean} duplicate - Whether job was a duplicate
 * @param {boolean} cached - Whether result was cached
 */
function recordJobCreation(status = 'pending', duplicate = false, cached = false) {
  try {
    mealSuggestionsJobsTotal.inc({
      status,
      duplicate: duplicate.toString(),
      cached: cached.toString()
    });

    logger.debug('Recorded meal suggestions job creation metric', { status, duplicate, cached });
  } catch (error) {
    logger.error('Failed to record job creation metric', { error: error.message });
  }
}

/**
 * Record job completion with full metrics
 * @param {Object} data - Job completion data
 */
function recordJobCompletion(data) {
  try {
    const {
      status = 'completed',
      duplicate = false,
      cached = false,
      processingTimeMs = 0,
      tokensUsed = 0,
      aiProvider = 'unknown',
      totalMeals = 0,
      avgCostEur = 0,
      avgCookingTimeMin = 0,
      mealType = 'any'
    } = data;

    // Record job total
    mealSuggestionsJobsTotal.inc({
      status,
      duplicate: duplicate.toString(),
      cached: cached.toString()
    });

    // Record processing duration
    if (processingTimeMs > 0) {
      mealSuggestionsProcessingDuration.observe(
        {
          status,
          cache_hit: cached.toString(),
          ai_provider: aiProvider
        },
        processingTimeMs / 1000
      );
    }

    // Record AI tokens used
    if (tokensUsed > 0 && !cached) {
      mealSuggestionsTokensUsed.inc(
        { ai_provider: aiProvider },
        tokensUsed
      );
    }

    // Record meals generated
    if (totalMeals > 0) {
      mealSuggestionsMealsGenerated.inc(
        {
          meal_type: mealType || 'any',
          ai_provider: aiProvider
        },
        totalMeals
      );

      // Record cost and cooking time
      if (avgCostEur > 0) {
        mealSuggestionsAvgCost.observe(
          { meal_type: mealType || 'any' },
          avgCostEur
        );
      }

      if (avgCookingTimeMin > 0) {
        mealSuggestionsCookingTime.observe(
          { meal_type: mealType || 'any' },
          avgCookingTimeMin
        );
      }
    }

    logger.debug('Recorded meal suggestions job completion metrics', {
      status,
      cached,
      processingTimeMs,
      tokensUsed,
      totalMeals
    });
  } catch (error) {
    logger.error('Failed to record job completion metrics', { error: error.message });
  }
}

/**
 * Record processing duration
 * @param {number} durationMs - Processing duration in milliseconds
 * @param {string} status - Job status
 * @param {boolean} cacheHit - Whether result was cached
 * @param {string} aiProvider - AI provider used
 */
function recordProcessingDuration(durationMs, status = 'completed', cacheHit = false, aiProvider = 'unknown') {
  try {
    const durationSeconds = durationMs / 1000;

    mealSuggestionsProcessingDuration.observe(
      {
        status,
        cache_hit: cacheHit.toString(),
        ai_provider: aiProvider
      },
      durationSeconds
    );

    logger.debug('Recorded processing duration metric', {
      durationMs,
      status,
      cacheHit,
      aiProvider
    });
  } catch (error) {
    logger.error('Failed to record processing duration metric', { error: error.message });
  }
}

/**
 * Update queue depth metrics
 * @param {Object} queueMetrics - Queue metrics object
 */
function updateQueueDepth(queueMetrics) {
  try {
    mealSuggestionsQueueDepth.set({ status: 'waiting' }, queueMetrics.waiting || 0);
    mealSuggestionsQueueDepth.set({ status: 'active' }, queueMetrics.active || 0);
    mealSuggestionsQueueDepth.set({ status: 'completed' }, queueMetrics.completed || 0);
    mealSuggestionsQueueDepth.set({ status: 'failed' }, queueMetrics.failed || 0);
    mealSuggestionsQueueDepth.set({ status: 'delayed' }, queueMetrics.delayed || 0);

    logger.debug('Updated queue depth metrics', queueMetrics);
  } catch (error) {
    logger.error('Failed to update queue depth metrics', { error: error.message });
  }
}

/**
 * Record cache hit or miss
 * @param {boolean} hit - Whether it was a cache hit
 */
function recordCacheHit(hit = true) {
  try {
    mealSuggestionsCacheHits.inc({ hit: hit.toString() });

    logger.debug('Recorded cache hit metric', { hit });
  } catch (error) {
    logger.error('Failed to record cache hit metric', { error: error.message });
  }
}

/**
 * Record AI tokens used
 * @param {number} tokens - Number of tokens consumed
 * @param {string} aiProvider - AI provider
 */
function recordTokensUsed(tokens, aiProvider = 'unknown') {
  try {
    mealSuggestionsTokensUsed.inc({ ai_provider: aiProvider }, tokens);

    logger.debug('Recorded tokens used metric', { tokens, aiProvider });
  } catch (error) {
    logger.error('Failed to record tokens used metric', { error: error.message });
  }
}

/**
 * Record tokens saved via caching
 * @param {number} tokens - Number of tokens saved
 */
function recordTokensSaved(tokens) {
  try {
    mealSuggestionsTokensSaved.inc(tokens);

    logger.debug('Recorded tokens saved metric', { tokens });
  } catch (error) {
    logger.error('Failed to record tokens saved metric', { error: error.message });
  }
}

/**
 * Record quota usage
 * @param {string} userTier - User tier (free or premium)
 * @param {number} tokens - Tokens consumed
 */
function recordQuotaUsage(userTier = 'free', tokens = 1) {
  try {
    mealSuggestionsQuotaUsage.inc({ user_tier: userTier }, tokens);

    logger.debug('Recorded quota usage metric', { userTier, tokens });
  } catch (error) {
    logger.error('Failed to record quota usage metric', { error: error.message });
  }
}

/**
 * Record error
 * @param {string} errorType - Type of error
 * @param {string} stage - Stage where error occurred
 */
function recordError(errorType = 'unknown', stage = 'unknown') {
  try {
    mealSuggestionsErrors.inc({
      error_type: errorType,
      stage
    });

    logger.debug('Recorded error metric', { errorType, stage });
  } catch (error) {
    logger.error('Failed to record error metric', { error: error.message });
  }
}

/**
 * Record meals generated
 * @param {number} count - Number of meals generated
 * @param {string} mealType - Type of meal
 * @param {string} aiProvider - AI provider used
 */
function recordMealsGenerated(count, mealType = 'any', aiProvider = 'unknown') {
  try {
    mealSuggestionsMealsGenerated.inc(
      {
        meal_type: mealType,
        ai_provider: aiProvider
      },
      count
    );

    logger.debug('Recorded meals generated metric', { count, mealType, aiProvider });
  } catch (error) {
    logger.error('Failed to record meals generated metric', { error: error.message });
  }
}

/**
 * Record average meal cost
 * @param {number} cost - Average cost in EUR
 * @param {string} mealType - Type of meal
 */
function recordMealCost(cost, mealType = 'any') {
  try {
    mealSuggestionsAvgCost.observe({ meal_type: mealType }, cost);

    logger.debug('Recorded meal cost metric', { cost, mealType });
  } catch (error) {
    logger.error('Failed to record meal cost metric', { error: error.message });
  }
}

/**
 * Record average cooking time
 * @param {number} time - Cooking time in minutes
 * @param {string} mealType - Type of meal
 */
function recordCookingTime(time, mealType = 'any') {
  try {
    mealSuggestionsCookingTime.observe({ meal_type: mealType }, time);

    logger.debug('Recorded cooking time metric', { time, mealType });
  } catch (error) {
    logger.error('Failed to record cooking time metric', { error: error.message });
  }
}

/**
 * Get current metrics summary
 * @returns {Object} Metrics summary
 */
async function getMetricsSummary() {
  try {
    const metrics = {
      jobsTotal: await client.register.getSingleMetricAsString('meal_suggestions_jobs_total'),
      cacheHitsTotal: await client.register.getSingleMetricAsString('meal_suggestions_cache_hits_total'),
      tokensUsedTotal: await client.register.getSingleMetricAsString('meal_suggestions_ai_tokens_total'),
      tokensSavedTotal: await client.register.getSingleMetricAsString('meal_suggestions_tokens_saved_total'),
      errorsTotal: await client.register.getSingleMetricAsString('meal_suggestions_errors_total')
    };

    return metrics;
  } catch (error) {
    logger.error('Failed to get metrics summary', { error: error.message });
    return {};
  }
}

module.exports = {
  recordJobCreation,
  recordJobCompletion,
  recordProcessingDuration,
  updateQueueDepth,
  recordCacheHit,
  recordTokensUsed,
  recordTokensSaved,
  recordQuotaUsage,
  recordError,
  recordMealsGenerated,
  recordMealCost,
  recordCookingTime,
  getMetricsSummary
};
