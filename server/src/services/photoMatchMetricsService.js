/**
 * Photo Match Metrics Service
 *
 * Prometheus metrics for monitoring photo match operations
 * Tracks queue health, processing times, success rates, and quota usage
 *
 * Observability best practices:
 * - Counter metrics for job counts
 * - Histogram metrics for processing times
 * - Gauge metrics for queue depth
 * - Labels for status, provider, cache hits
 */

const client = require('prom-client');
const logger = require('../utils/logger');

// Photo Match Job Counter
const photoMatchJobsTotal = new client.Counter({
  name: 'photo_match_jobs_total',
  help: 'Total number of photo match jobs created',
  labelNames: ['status', 'duplicate']
});

// Photo Match Processing Time Histogram
const photoMatchProcessingDuration = new client.Histogram({
  name: 'photo_match_processing_duration_seconds',
  help: 'Photo match job processing duration in seconds',
  labelNames: ['status', 'ai_provider', 'cache_hit'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120] // Up to 2 minutes
});

// Photo Match Queue Depth Gauge
const photoMatchQueueDepth = new client.Gauge({
  name: 'photo_match_queue_depth',
  help: 'Number of jobs in photo match queue by status',
  labelNames: ['status']
});

// Photo Match AI Provider Counter
const photoMatchAIProvider = new client.Counter({
  name: 'photo_match_ai_provider_total',
  help: 'Total number of photo match requests by AI provider',
  labelNames: ['provider', 'success']
});

// Photo Match Cache Hit Counter
const photoMatchCacheHits = new client.Counter({
  name: 'photo_match_cache_hits_total',
  help: 'Total number of photo match cache hits vs misses',
  labelNames: ['hit']
});

// Photo Match Quota Counter
const photoMatchQuotaUsage = new client.Counter({
  name: 'photo_match_quota_usage_total',
  help: 'Total quota tokens consumed for photo match',
  labelNames: ['user_tier']
});

// Photo Match Error Counter
const photoMatchErrors = new client.Counter({
  name: 'photo_match_errors_total',
  help: 'Total number of photo match errors',
  labelNames: ['error_type', 'stage']
});

/**
 * Record job creation
 * @param {string} status - Job status
 * @param {boolean} duplicate - Whether job was a duplicate
 */
function recordJobCreation(status = 'pending', duplicate = false) {
  try {
    photoMatchJobsTotal.inc({
      status,
      duplicate: duplicate.toString()
    });

    logger.debug('Recorded job creation metric', { status, duplicate });
  } catch (error) {
    logger.error('Failed to record job creation metric', { error: error.message });
  }
}

/**
 * Record processing duration
 * @param {number} durationMs - Processing duration in milliseconds
 * @param {string} status - Job status
 * @param {string} aiProvider - AI provider used
 * @param {boolean} cacheHit - Whether result was cached
 */
function recordProcessingDuration(durationMs, status = 'completed', aiProvider = 'unknown', cacheHit = false) {
  try {
    const durationSeconds = durationMs / 1000;

    photoMatchProcessingDuration.observe(
      {
        status,
        ai_provider: aiProvider,
        cache_hit: cacheHit.toString()
      },
      durationSeconds
    );

    logger.debug('Recorded processing duration metric', {
      durationMs,
      status,
      aiProvider,
      cacheHit
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
    photoMatchQueueDepth.set({ status: 'waiting' }, queueMetrics.waiting || 0);
    photoMatchQueueDepth.set({ status: 'active' }, queueMetrics.active || 0);
    photoMatchQueueDepth.set({ status: 'completed' }, queueMetrics.completed || 0);
    photoMatchQueueDepth.set({ status: 'failed' }, queueMetrics.failed || 0);
    photoMatchQueueDepth.set({ status: 'delayed' }, queueMetrics.delayed || 0);

    logger.debug('Updated queue depth metrics', queueMetrics);
  } catch (error) {
    logger.error('Failed to update queue depth metrics', { error: error.message });
  }
}

/**
 * Record AI provider usage
 * @param {string} provider - AI provider name
 * @param {boolean} success - Whether request succeeded
 */
function recordAIProviderUsage(provider, success = true) {
  try {
    photoMatchAIProvider.inc({
      provider,
      success: success.toString()
    });

    logger.debug('Recorded AI provider usage metric', { provider, success });
  } catch (error) {
    logger.error('Failed to record AI provider usage metric', { error: error.message });
  }
}

/**
 * Record cache hit/miss
 * @param {boolean} hit - Whether cache hit occurred
 */
function recordCacheHit(hit = true) {
  try {
    photoMatchCacheHits.inc({
      hit: hit.toString()
    });

    logger.debug('Recorded cache hit metric', { hit });
  } catch (error) {
    logger.error('Failed to record cache hit metric', { error: error.message });
  }
}

/**
 * Record quota usage
 * @param {string} userTier - User tier (free/premium)
 * @param {number} tokens - Number of tokens consumed
 */
function recordQuotaUsage(userTier = 'free', tokens = 1) {
  try {
    photoMatchQuotaUsage.inc({ user_tier: userTier }, tokens);

    logger.debug('Recorded quota usage metric', { userTier, tokens });
  } catch (error) {
    logger.error('Failed to record quota usage metric', { error: error.message });
  }
}

/**
 * Record error
 * @param {string} errorType - Type of error
 * @param {string} stage - Processing stage where error occurred
 */
function recordError(errorType = 'unknown', stage = 'processing') {
  try {
    photoMatchErrors.inc({
      error_type: errorType,
      stage
    });

    logger.debug('Recorded error metric', { errorType, stage });
  } catch (error) {
    logger.error('Failed to record error metric', { error: error.message });
  }
}

/**
 * Get all metrics (for /metrics endpoint)
 * @returns {Promise<string>} Prometheus metrics
 */
async function getMetrics() {
  try {
    return await client.register.metrics();
  } catch (error) {
    logger.error('Failed to get metrics', { error: error.message });
    throw error;
  }
}

module.exports = {
  recordJobCreation,
  recordProcessingDuration,
  updateQueueDepth,
  recordAIProviderUsage,
  recordCacheHit,
  recordQuotaUsage,
  recordError,
  getMetrics
};
