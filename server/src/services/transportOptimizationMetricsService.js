/**
 * Transport Optimization Metrics Service
 *
 * Prometheus metrics for monitoring transport optimization operations
 * Tracks queue health, processing times, success rates, quota usage, and optimal mode distribution
 *
 * Observability best practices:
 * - Counter metrics for job counts
 * - Histogram metrics for processing times
 * - Gauge metrics for queue depth
 * - Labels for status, cache hits, optimal modes
 */

const client = require('prom-client');
const logger = require('../utils/logger');

// Transport Optimization Job Counter
const transportOptJobsTotal = new client.Counter({
  name: 'transport_opt_jobs_total',
  help: 'Total number of transport optimization jobs created',
  labelNames: ['status', 'duplicate', 'cached']
});

// Transport Optimization Processing Time Histogram
const transportOptProcessingDuration = new client.Histogram({
  name: 'transport_opt_processing_duration_seconds',
  help: 'Transport optimization job processing duration in seconds',
  labelNames: ['status', 'cache_hit'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30] // Fast computation, up to 30 seconds
});

// Transport Optimization Queue Depth Gauge
const transportOptQueueDepth = new client.Gauge({
  name: 'transport_opt_queue_depth',
  help: 'Number of jobs in transport optimization queue by status',
  labelNames: ['status']
});

// Transport Optimization Cache Hit Counter
const transportOptCacheHits = new client.Counter({
  name: 'transport_opt_cache_hits_total',
  help: 'Total number of transport optimization cache hits vs misses',
  labelNames: ['hit']
});

// Transport Optimization Quota Counter
const transportOptQuotaUsage = new client.Counter({
  name: 'transport_opt_quota_usage_total',
  help: 'Total quota tokens consumed for transport optimization',
  labelNames: ['user_tier']
});

// Transport Optimization Error Counter
const transportOptErrors = new client.Counter({
  name: 'transport_opt_errors_total',
  help: 'Total number of transport optimization errors',
  labelNames: ['error_type', 'stage']
});

// Transport Optimization Optimal Mode Counter
const transportOptOptimalMode = new client.Counter({
  name: 'transport_opt_optimal_mode_total',
  help: 'Distribution of optimal transport modes selected',
  labelNames: ['mode', 'optimization_type']
});

// Transport Optimization Savings Histogram
const transportOptSavings = new client.Histogram({
  name: 'transport_opt_savings_potential_euros',
  help: 'Savings potential identified (in EUR)',
  labelNames: ['distance_range'],
  buckets: [0, 1, 2, 5, 10, 20, 50, 100] // EUR
});

// Transport Optimization CO2 Impact Histogram
const transportOptCO2Impact = new client.Histogram({
  name: 'transport_opt_co2_impact_kg',
  help: 'CO2 impact of greenest option (in kg)',
  labelNames: ['distance_range'],
  buckets: [0, 0.1, 0.5, 1, 2, 5, 10, 20] // kg CO2
});

/**
 * Record job creation
 * @param {string} status - Job status
 * @param {boolean} duplicate - Whether job was a duplicate
 * @param {boolean} cached - Whether result was cached
 */
function recordJobCreation(status = 'pending', duplicate = false, cached = false) {
  try {
    transportOptJobsTotal.inc({
      status,
      duplicate: duplicate.toString(),
      cached: cached.toString()
    });

    logger.debug('Recorded transport opt job creation metric', { status, duplicate, cached });
  } catch (error) {
    logger.error('Failed to record job creation metric', { error: error.message });
  }
}

/**
 * Record processing duration
 * @param {number} durationMs - Processing duration in milliseconds
 * @param {string} status - Job status
 * @param {boolean} cacheHit - Whether result was cached
 */
function recordProcessingDuration(durationMs, status = 'completed', cacheHit = false) {
  try {
    const durationSeconds = durationMs / 1000;

    transportOptProcessingDuration.observe(
      {
        status,
        cache_hit: cacheHit.toString()
      },
      durationSeconds
    );

    logger.debug('Recorded processing duration metric', {
      durationMs,
      status,
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
    transportOptQueueDepth.set({ status: 'waiting' }, queueMetrics.waiting || 0);
    transportOptQueueDepth.set({ status: 'active' }, queueMetrics.active || 0);
    transportOptQueueDepth.set({ status: 'completed' }, queueMetrics.completed || 0);
    transportOptQueueDepth.set({ status: 'failed' }, queueMetrics.failed || 0);
    transportOptQueueDepth.set({ status: 'delayed' }, queueMetrics.delayed || 0);

    logger.debug('Updated queue depth metrics', queueMetrics);
  } catch (error) {
    logger.error('Failed to update queue depth metrics', { error: error.message });
  }
}

/**
 * Record cache hit or miss
 * @param {boolean} hit - Whether cache was hit
 */
function recordCacheHit(hit = true) {
  try {
    transportOptCacheHits.inc({
      hit: hit.toString()
    });

    logger.debug('Recorded cache hit metric', { hit });
  } catch (error) {
    logger.error('Failed to record cache hit metric', { error: error.message });
  }
}

/**
 * Record quota usage
 * @param {string} userTier - User tier (free or premium)
 * @param {number} tokens - Number of tokens consumed
 */
function recordQuotaUsage(userTier = 'free', tokens = 2) {
  try {
    transportOptQuotaUsage.inc({
      user_tier: userTier
    }, tokens);

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
function recordError(errorType, stage = 'unknown') {
  try {
    transportOptErrors.inc({
      error_type: errorType,
      stage
    });

    logger.debug('Recorded error metric', { errorType, stage });
  } catch (error) {
    logger.error('Failed to record error metric', { error: error.message });
  }
}

/**
 * Record optimal mode selection
 * @param {string} mode - Transport mode selected
 * @param {string} optimizationType - Type of optimization (cheapest, fastest, greenest)
 */
function recordOptimalMode(mode, optimizationType = 'cheapest') {
  try {
    transportOptOptimalMode.inc({
      mode,
      optimization_type: optimizationType
    });

    logger.debug('Recorded optimal mode metric', { mode, optimizationType });
  } catch (error) {
    logger.error('Failed to record optimal mode metric', { error: error.message });
  }
}

/**
 * Record savings potential
 * @param {number} savingsEur - Savings in EUR
 * @param {number} distanceKm - Distance in km
 */
function recordSavingsPotential(savingsEur, distanceKm) {
  try {
    const distanceRange = getDistanceRange(distanceKm);

    transportOptSavings.observe(
      { distance_range: distanceRange },
      savingsEur
    );

    logger.debug('Recorded savings potential metric', { savingsEur, distanceKm, distanceRange });
  } catch (error) {
    logger.error('Failed to record savings potential metric', { error: error.message });
  }
}

/**
 * Record CO2 impact
 * @param {number} co2Kg - CO2 impact in kg
 * @param {number} distanceKm - Distance in km
 */
function recordCO2Impact(co2Kg, distanceKm) {
  try {
    const distanceRange = getDistanceRange(distanceKm);

    transportOptCO2Impact.observe(
      { distance_range: distanceRange },
      co2Kg
    );

    logger.debug('Recorded CO2 impact metric', { co2Kg, distanceKm, distanceRange });
  } catch (error) {
    logger.error('Failed to record CO2 impact metric', { error: error.message });
  }
}

/**
 * Get distance range label for metrics
 * @param {number} distanceKm - Distance in km
 * @returns {string} Distance range label
 */
function getDistanceRange(distanceKm) {
  if (distanceKm <= 5) return '0-5km';
  if (distanceKm <= 10) return '5-10km';
  if (distanceKm <= 25) return '10-25km';
  if (distanceKm <= 50) return '25-50km';
  if (distanceKm <= 100) return '50-100km';
  if (distanceKm <= 250) return '100-250km';
  if (distanceKm <= 500) return '250-500km';
  return '500km+';
}

/**
 * Record complete job result (convenience method)
 * @param {Object} jobData - Job data with result
 */
function recordJobCompletion(jobData) {
  try {
    const {
      status,
      duplicate,
      cached,
      processingTimeMs,
      distanceKm,
      optimalMode,
      savingsPotential,
      co2ImpactKg,
      optimal
    } = jobData;

    // Record job creation
    recordJobCreation(status, duplicate, cached);

    // Record processing duration
    if (processingTimeMs && status === 'completed') {
      recordProcessingDuration(processingTimeMs, status, cached);
    }

    // Record cache hit/miss
    if (cached !== undefined) {
      recordCacheHit(cached);
    }

    // Record optimal modes
    if (optimal) {
      if (optimal.cheapest) {
        recordOptimalMode(optimal.cheapest.mode, 'cheapest');
      }
      if (optimal.fastest) {
        recordOptimalMode(optimal.fastest.mode, 'fastest');
      }
      if (optimal.greenest) {
        recordOptimalMode(optimal.greenest.mode, 'greenest');
      }
    }

    // Record savings and CO2
    if (savingsPotential && distanceKm) {
      recordSavingsPotential(savingsPotential, distanceKm);
    }

    if (co2ImpactKg && distanceKm) {
      recordCO2Impact(co2ImpactKg, distanceKm);
    }

    logger.debug('Recorded complete job metrics', {
      status,
      duplicate,
      cached,
      optimalMode
    });
  } catch (error) {
    logger.error('Failed to record job completion metrics', { error: error.message });
  }
}

module.exports = {
  recordJobCreation,
  recordProcessingDuration,
  updateQueueDepth,
  recordCacheHit,
  recordQuotaUsage,
  recordError,
  recordOptimalMode,
  recordSavingsPotential,
  recordCO2Impact,
  recordJobCompletion
};
