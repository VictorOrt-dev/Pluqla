/**
 * Food Spending Matcher Service
 *
 * Phase 5: Prévision vs Réalité
 * Automatically matches forecast food spending logs with actual bank transactions
 *
 * Matching criteria:
 * - Amount within ±10% of estimated price
 * - Date within ±3 days of planned date
 * - Category is "Alimentation", "Supermarché", "Restaurant", or "food"
 * - Not already matched
 */

const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

// ✨ Phase 7 - Use centralized constants
const { FOOD_SPENDING_MATCHER } = require('../config/alimentationConstants');

/**
 * Match configuration
 * ✨ Phase 7 - Now using centralized constants for maintainability
 */
const MATCH_CONFIG = {
  amountTolerancePercent: FOOD_SPENDING_MATCHER.AMOUNT_TOLERANCE_PERCENT,
  dateDaysRange: FOOD_SPENDING_MATCHER.DATE_RANGE_DAYS,
  foodCategories: FOOD_SPENDING_MATCHER.FOOD_CATEGORIES,
  archiveAfterDays: FOOD_SPENDING_MATCHER.ARCHIVE_AFTER_DAYS,
};

/**
 * Check if amount is within tolerance
 * @param {number} estimated - Estimated amount
 * @param {number} actual - Actual amount
 * @param {number} tolerancePercent - Tolerance percentage (default: 10)
 * @returns {boolean}
 */
const isAmountWithinTolerance = (estimated, actual, tolerancePercent = MATCH_CONFIG.amountTolerancePercent) => {
  const lowerBound = estimated * (1 - tolerancePercent / 100);
  const upperBound = estimated * (1 + tolerancePercent / 100);
  return actual >= lowerBound && actual <= upperBound;
};

/**
 * Check if date is within range
 * @param {Date} plannedDate - Planned date
 * @param {Date} actualDate - Actual transaction date
 * @param {number} daysRange - Days range (default: 3)
 * @returns {boolean}
 */
const isDateWithinRange = (plannedDate, actualDate, daysRange = MATCH_CONFIG.dateDaysRange) => {
  const diffMs = Math.abs(actualDate - plannedDate);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= daysRange;
};

/**
 * Check if category is food-related
 * @param {string} category - Transaction category
 * @returns {boolean}
 */
const isFoodCategory = (category) => {
  if (!category) return false;
  const normalized = category.toLowerCase().trim();
  return MATCH_CONFIG.foodCategories.some((foodCat) =>
    normalized.includes(foodCat.toLowerCase())
  );
};

/**
 * Find potential transaction matches for a forecast
 * @param {Object} forecast - FoodSpendingLog with status=forecast
 * @param {Array} transactions - Array of AccountTransaction
 * @returns {Array} - Potential matches sorted by match score (best first)
 */
const findPotentialMatches = (forecast, transactions) => {
  const matches = [];

  for (const transaction of transactions) {
    // Skip if already linked to another forecast
    if (transaction.linkedForecastId) continue;

    // Check category
    if (!isFoodCategory(transaction.category)) continue;

    // Check date range
    if (!isDateWithinRange(forecast.date, transaction.date)) continue;

    // Check amount tolerance
    const estimated = forecast.estimatedPriceEur || forecast.totalCostEur;
    const actual = Math.abs(transaction.amount); // Use absolute value

    if (!isAmountWithinTolerance(estimated, actual)) continue;

    // Calculate match score (0-100)
    const amountDiffPercent = Math.abs((actual - estimated) / estimated) * 100;
    const dateDiffDays = Math.abs(transaction.date - forecast.date) / (1000 * 60 * 60 * 24);

    const amountScore = Math.max(0, 100 - amountDiffPercent * 5); // Weight: 5 points per % diff
    const dateScore = Math.max(0, 100 - dateDiffDays * 10); // Weight: 10 points per day diff
    const matchScore = (amountScore * 0.6 + dateScore * 0.4); // 60% amount, 40% date

    matches.push({
      transaction,
      matchScore,
      amountDiff: actual - estimated,
      amountDiffPercent,
      dateDiffDays,
    });
  }

  // Sort by match score descending (best match first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Match a single forecast with transactions
 * @param {string} forecastId - FoodSpendingLog ID
 * @param {Array} transactions - Available transactions
 * @returns {Promise<Object|null>} - Matched log or null
 */
const matchSingleForecast = async (forecastId, transactions) => {
  try {
    const forecast = await prisma.foodSpendingLog.findUnique({
      where: { id: forecastId },
    });

    if (!forecast || forecast.status !== 'forecast') {
      return null;
    }

    const potentialMatches = findPotentialMatches(forecast, transactions);

    if (potentialMatches.length === 0) {
      logger.debug('No matches found for forecast', { forecastId, recipeName: forecast.recipeName });
      return null;
    }

    // Take best match (highest score)
    const bestMatch = potentialMatches[0];

    // Update forecast to matched
    const updated = await prisma.foodSpendingLog.update({
      where: { id: forecastId },
      data: {
        status: 'matched',
        actualPriceEur: Math.abs(bestMatch.transaction.amount),
        linkedTransactionId: bestMatch.transaction.id,
        dateMatched: new Date(),
      },
    });

    logger.info('Forecast matched with transaction', {
      forecastId,
      transactionId: bestMatch.transaction.id,
      matchScore: bestMatch.matchScore.toFixed(2),
      estimated: forecast.estimatedPriceEur || forecast.totalCostEur,
      actual: Math.abs(bestMatch.transaction.amount),
      diff: bestMatch.amountDiff.toFixed(2),
    });

    return updated;
  } catch (error) {
    logger.error('Failed to match forecast', {
      forecastId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Match all pending forecasts for a user
 * @param {string} userId - User ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Match results
 */
const matchUserForecasts = async (userId, options = {}) => {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate = new Date(),
  } = options;

  try {
    // Get all forecast logs for user
    const forecasts = await prisma.foodSpendingLog.findMany({
      where: {
        userId,
        status: 'forecast',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (forecasts.length === 0) {
      return {
        matched: 0,
        archived: 0,
        pending: 0,
        forecasts: [],
      };
    }

    // Get unmatched transactions in same date range
    const transactions = await prisma.accountTransaction.findMany({
      where: {
        account: {
          userId,
        },
        date: {
          gte: new Date(startDate.getTime() - MATCH_CONFIG.dateDaysRange * 24 * 60 * 60 * 1000),
          lte: new Date(endDate.getTime() + MATCH_CONFIG.dateDaysRange * 24 * 60 * 60 * 1000),
        },
        type: 'debit', // Only expenses
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const results = {
      matched: 0,
      archived: 0,
      pending: 0,
      forecasts: [],
    };

    // Try to match each forecast
    for (const forecast of forecasts) {
      const matched = await matchSingleForecast(forecast.id, transactions);

      if (matched) {
        results.matched++;
        results.forecasts.push({ id: matched.id, status: 'matched' });
      } else {
        // Check if should be archived (too old)
        const daysSincePlanned = (Date.now() - forecast.date.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSincePlanned > MATCH_CONFIG.archiveAfterDays) {
          await prisma.foodSpendingLog.update({
            where: { id: forecast.id },
            data: { status: 'archived' },
          });
          results.archived++;
          results.forecasts.push({ id: forecast.id, status: 'archived' });
        } else {
          results.pending++;
          results.forecasts.push({ id: forecast.id, status: 'forecast' });
        }
      }
    }

    logger.info('User forecasts matching completed', {
      userId,
      matched: results.matched,
      archived: results.archived,
      pending: results.pending,
    });

    return results;
  } catch (error) {
    logger.error('Failed to match user forecasts', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Match all users' forecasts (for cron job)
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Overall results
 */
const matchAllForecasts = async (options = {}) => {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
  } = options;

  try {
    // Get all users with pending forecasts
    const usersWithForecasts = await prisma.foodSpendingLog.findMany({
      where: {
        status: 'forecast',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    const overallResults = {
      usersProcessed: 0,
      totalMatched: 0,
      totalArchived: 0,
      totalPending: 0,
      errors: [],
    };

    for (const { userId } of usersWithForecasts) {
      try {
        const result = await matchUserForecasts(userId, { startDate, endDate });
        overallResults.usersProcessed++;
        overallResults.totalMatched += result.matched;
        overallResults.totalArchived += result.archived;
        overallResults.totalPending += result.pending;
      } catch (error) {
        logger.error('Failed to match forecasts for user', {
          userId,
          error: error.message,
        });
        overallResults.errors.push({ userId, error: error.message });
      }
    }

    logger.info('All forecasts matching completed', overallResults);

    return overallResults;
  } catch (error) {
    logger.error('Failed to match all forecasts', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get forecast vs reality stats for a user
 * @param {string} userId - User ID
 * @param {Object} options - Options (startDate, endDate)
 * @returns {Promise<Object>} - Statistics
 */
const getForecastVsRealityStats = async (userId, options = {}) => {
  const now = new Date();
  const {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1), // First day of current month
    endDate = now,
  } = options;

  try {
    const logs = await prisma.foodSpendingLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const stats = {
      period: {
        startDate,
        endDate,
      },
      forecast: {
        total: 0,
        count: 0,
        logs: [],
      },
      matched: {
        total: 0,
        count: 0,
        logs: [],
      },
      archived: {
        count: 0,
        logs: [],
      },
      variance: {
        amount: 0,
        percent: 0,
      },
      accuracy: 0,
    };

    for (const log of logs) {
      const estimated = log.estimatedPriceEur || log.totalCostEur;

      if (log.status === 'forecast') {
        stats.forecast.total += estimated;
        stats.forecast.count++;
        stats.forecast.logs.push(log.id);
      } else if (log.status === 'matched') {
        stats.forecast.total += estimated;
        stats.matched.total += log.actualPriceEur || 0;
        stats.matched.count++;
        stats.matched.logs.push(log.id);
      } else if (log.status === 'archived') {
        stats.forecast.total += estimated;
        stats.archived.count++;
        stats.archived.logs.push(log.id);
      }
    }

    // Calculate variance
    if (stats.matched.count > 0) {
      const forecastForMatched = stats.matched.logs.reduce((sum, logId) => {
        const log = logs.find((l) => l.id === logId);
        return sum + (log.estimatedPriceEur || log.totalCostEur);
      }, 0);

      stats.variance.amount = stats.matched.total - forecastForMatched;
      stats.variance.percent = (stats.variance.amount / forecastForMatched) * 100;
      stats.accuracy = 100 - Math.abs(stats.variance.percent);
    }

    // Round values
    stats.forecast.total = Math.round(stats.forecast.total * 100) / 100;
    stats.matched.total = Math.round(stats.matched.total * 100) / 100;
    stats.variance.amount = Math.round(stats.variance.amount * 100) / 100;
    stats.variance.percent = Math.round(stats.variance.percent * 100) / 100;
    stats.accuracy = Math.round(stats.accuracy * 100) / 100;

    return stats;
  } catch (error) {
    logger.error('Failed to get forecast vs reality stats', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  matchSingleForecast,
  matchUserForecasts,
  matchAllForecasts,
  getForecastVsRealityStats,
  MATCH_CONFIG,
  // Exported for testing
  isAmountWithinTolerance,
  isDateWithinRange,
  isFoodCategory,
  findPotentialMatches,
};
