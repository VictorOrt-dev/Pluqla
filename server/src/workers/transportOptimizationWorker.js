/**
 * Transport Optimization Worker
 *
 * Background worker that processes transport optimization jobs from Bull queue
 * Uses pure cost calculation engine - no external APIs
 *
 * Security considerations:
 * - Validates all inputs before processing
 * - Sanitizes results
 * - Implements timeout logic
 * - Stores results securely in DB and Redis cache
 * - Logs all processing steps without PII
 */

const { transportOptimizationQueue } = require('../queues/transportOptimizationQueue');
const prisma = require('../lib/prismaClient');
const redis = require('../lib/redisClient');
const logger = require('../utils/logger');
const crypto = require('crypto');
const {
  calculateAllModeCosts,
  validateTripInput,
  TRANSPORT_MODES
} = require('../services/transportCostCalculator');
const metricsService = require('../services/transportOptimizationMetricsService');

// Cache configuration
const CACHE_TTL = 3600 * 24 * 7; // 7 days
const CACHE_KEY_PREFIX = 'transport-opt:';

/**
 * Process transport optimization job
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} Processing result
 */
async function processTransportOptimizationJob(job) {
  const startTime = Date.now();
  const { jobId, userId, tripData, tripHash } = job.data;

  logger.info('Processing transport optimization job', {
    jobId,
    userId,
    tripHash,
    distance: tripData.distance,
    attempt: job.attemptsMade + 1
  });

  try {
    // 1. Update job status to 'processing' in DB
    await prisma.transportOptimizationJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        processingStartedAt: new Date()
      }
    });

    // 2. Check cache first (deduplication by trip hash)
    job.progress(20);
    const cachedResult = await checkCache(tripHash);
    if (cachedResult) {
      logger.info('Cache hit for transport optimization', {
        jobId,
        tripHash,
        cacheHit: true
      });

      // Record cache hit metric
      metricsService.recordCacheHit(true);

      // Store cached result for this user
      await storeCachedResult(jobId, userId, cachedResult, tripData.distance);
      return { success: true, cached: true, result: cachedResult };
    }

    // Record cache miss metric
    metricsService.recordCacheHit(false);

    // 3. Validate trip input
    job.progress(40);
    const validatedTrip = validateTripInput(tripData);

    // 4. Calculate costs for all modes
    job.progress(60);
    const calculationResult = calculateAllModeCosts(
      validatedTrip.distance,
      {
        recurring: validatedTrip.recurring,
        parkingNeeded: tripData.parkingNeeded !== false, // default true
        tollRoads: tripData.tollRoads === true // default false
      }
    );

    // 5. Post-process and structure results
    job.progress(80);
    const structuredResult = structureOptimizationResult(calculationResult, validatedTrip);

    // 6. Store result in DB
    const cacheKey = `${CACHE_KEY_PREFIX}${tripHash}`;
    const cachedUntil = new Date(Date.now() + CACHE_TTL * 1000);
    const processingTimeMs = Date.now() - startTime;

    await prisma.transportOptimizationResult.create({
      data: {
        jobId,
        userId,
        distanceKm: validatedTrip.distance,
        optimalMode: structuredResult.optimal.cheapest.mode,
        totalCostEur: structuredResult.optimal.cheapest.total,
        costsBreakdown: JSON.stringify(structuredResult.modes),
        savingsPotential: structuredResult.savings,
        co2ImpactKg: structuredResult.optimal.greenest.co2Grams / 1000,
        calculationVersion: '1.0',
        processingTimeMs,
        cacheKey,
        cachedUntil,
        metadata: JSON.stringify({
          optimal: structuredResult.optimal,
          tripInfo: {
            recurring: validatedTrip.recurring,
            parkingNeeded: tripData.parkingNeeded !== false,
            tollRoads: tripData.tollRoads === true
          }
        })
      }
    });

    // 7. Cache the result
    await cacheResult(tripHash, structuredResult, CACHE_TTL);

    // 8. Update job status to 'completed'
    await prisma.transportOptimizationJob.update({
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
      distanceKm: validatedTrip.distance,
      optimalMode: structuredResult.optimal.cheapest.mode,
      savingsPotential: structuredResult.savings,
      co2ImpactKg: structuredResult.optimal.greenest.co2Grams / 1000,
      optimal: structuredResult.optimal
    });

    logger.info('Transport optimization job completed successfully', {
      jobId,
      userId,
      processingTimeMs,
      distanceKm: validatedTrip.distance,
      optimalMode: structuredResult.optimal.cheapest.mode,
      totalCost: structuredResult.optimal.cheapest.total,
      savings: structuredResult.savings
    });

    return {
      success: true,
      cached: false,
      result: structuredResult,
      processingTimeMs
    };

  } catch (error) {
    logger.error('Transport optimization job processing failed', {
      jobId,
      userId,
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade + 1
    });

    // Record error metric
    metricsService.recordError(error.name || 'UnknownError', 'processing');

    // Update job status to 'failed' in DB
    await prisma.transportOptimizationJob.update({
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
 * @param {string} tripHash - Trip hash
 * @returns {Promise<Object|null>} Cached result or null
 */
async function checkCache(tripHash) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${tripHash}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    return null;
  } catch (error) {
    logger.warn('Cache check failed', {
      tripHash,
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
 * @param {number} distanceKm - Distance in km
 */
async function storeCachedResult(jobId, userId, cachedResult, distanceKm) {
  const cacheKey = `${CACHE_KEY_PREFIX}${crypto.randomBytes(16).toString('hex')}`;
  const cachedUntil = new Date(Date.now() + CACHE_TTL * 1000);

  await prisma.transportOptimizationResult.create({
    data: {
      jobId,
      userId,
      distanceKm,
      optimalMode: cachedResult.optimal.cheapest.mode,
      totalCostEur: cachedResult.optimal.cheapest.total,
      costsBreakdown: JSON.stringify(cachedResult.modes),
      savingsPotential: cachedResult.savings,
      co2ImpactKg: cachedResult.optimal.greenest.co2Grams / 1000,
      calculationVersion: '1.0',
      processingTimeMs: 0,
      cacheKey,
      cachedUntil,
      metadata: JSON.stringify({
        optimal: cachedResult.optimal,
        cached: true
      })
    }
  });

  await prisma.transportOptimizationJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      processingCompletedAt: new Date()
    }
  });
}

/**
 * Structure optimization result for storage and API response
 * @param {Object} calculationResult - Raw calculation result
 * @param {Object} tripData - Validated trip data
 * @returns {Object} Structured result
 */
function structureOptimizationResult(calculationResult, tripData) {
  return {
    distanceKm: calculationResult.distanceKm,
    modes: calculationResult.modes,
    optimal: {
      cheapest: {
        mode: calculationResult.optimal.cheapest.mode,
        modeName: calculationResult.optimal.cheapest.modeName,
        total: calculationResult.optimal.cheapest.total,
        durationMinutes: calculationResult.optimal.cheapest.durationMinutes,
        co2Grams: calculationResult.optimal.cheapest.co2Grams,
        breakdown: {
          fuel: calculationResult.optimal.cheapest.fuel,
          maintenance: calculationResult.optimal.cheapest.maintenance,
          parking: calculationResult.optimal.cheapest.parking,
          tolls: calculationResult.optimal.cheapest.tolls,
          insurance: calculationResult.optimal.cheapest.insurance,
          tickets: calculationResult.optimal.cheapest.tickets
        }
      },
      fastest: {
        mode: calculationResult.optimal.fastest.mode,
        modeName: calculationResult.optimal.fastest.modeName,
        total: calculationResult.optimal.fastest.total,
        durationMinutes: calculationResult.optimal.fastest.durationMinutes,
        co2Grams: calculationResult.optimal.fastest.co2Grams
      },
      greenest: {
        mode: calculationResult.optimal.greenest.mode,
        modeName: calculationResult.optimal.greenest.modeName,
        total: calculationResult.optimal.greenest.total,
        durationMinutes: calculationResult.optimal.greenest.durationMinutes,
        co2Grams: calculationResult.optimal.greenest.co2Grams
      }
    },
    savings: calculationResult.savings,
    tripInfo: {
      origin: tripData.origin,
      destination: tripData.destination,
      distance: tripData.distance,
      recurring: tripData.recurring
    },
    calculatedAt: calculationResult.calculatedAt
  };
}

/**
 * Cache result in Redis
 * @param {string} tripHash - Trip hash
 * @param {Object} result - Optimization result
 * @param {number} ttl - TTL in seconds
 */
async function cacheResult(tripHash, result, ttl) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${tripHash}`;
    await redis.setex(cacheKey, ttl, JSON.stringify(result));

    logger.info('Result cached', {
      tripHash,
      cacheKey,
      ttl
    });
  } catch (error) {
    logger.warn('Failed to cache result', {
      tripHash,
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
    .replace(/Bearer\s+[^\s]+/g, '[TOKEN]');
}

// Start worker processing
transportOptimizationQueue.process(5, processTransportOptimizationJob); // Process 5 jobs concurrently (fast computation)

logger.info('Transport optimization worker started', {
  concurrency: 5,
  queueName: 'transport-optimization-jobs'
});

module.exports = {
  processTransportOptimizationJob
};
