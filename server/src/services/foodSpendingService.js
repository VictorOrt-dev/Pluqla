/**
 * Food Spending Service
 *
 * Tracks food expenses from recipes for finance integration
 */

const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * Log a food expense
 * @param {Object} data - Spending data
 * @returns {Promise<Object>} - Created log entry
 */
const logFoodSpending = async (data) => {
  const {
    userId,
    externalId,
    provider,
    recipeName,
    costEur,
    servings = 1,
    metadata = {}
  } = data;

  try {
    const totalCostEur = costEur * servings;

    // Phase 5: Initialize as forecast with estimated price
    const log = await prisma.foodSpendingLog.create({
      data: {
        userId,
        externalId,
        provider,
        recipeName,
        costEur,
        servings,
        totalCostEur,
        metadata,
        // Phase 5 fields
        estimatedPriceEur: totalCostEur,
        status: 'forecast', // Default status
      }
    });

    logger.info('Food spending logged as forecast', {
      userId,
      recipeName,
      totalCostEur,
      servings,
      status: 'forecast'
    });

    return log;

  } catch (error) {
    logger.error('Failed to log food spending', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get food spending for a user in a date range
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Spending logs
 */
const getFoodSpending = async (userId, startDate, endDate) => {
  try {
    const logs = await prisma.foodSpendingLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return logs;

  } catch (error) {
    logger.error('Failed to get food spending', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get monthly food spending statistics
 * @param {string} userId - User ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} - Statistics
 */
const getMonthlyStats = async (userId, year, month) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const logs = await getFoodSpending(userId, startDate, endDate);

    // Calculate statistics
    const totalSpent = logs.reduce((sum, log) => sum + log.totalCostEur, 0);
    const totalMeals = logs.length;
    const avgCostPerMeal = totalMeals > 0 ? totalSpent / totalMeals : 0;

    // Group by category (provider, eco-score, etc.)
    const byProvider = logs.reduce((acc, log) => {
      acc[log.provider] = (acc[log.provider] || 0) + log.totalCostEur;
      return acc;
    }, {});

    // Get user's food budget if set
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { foodBudgetEur: true }
    });

    const budget = userProfile?.foodBudgetEur || null;
    const budgetRemaining = budget ? budget - totalSpent : null;
    const budgetUsedPercent = budget ? (totalSpent / budget) * 100 : null;

    return {
      period: {
        year,
        month,
        startDate,
        endDate
      },
      spending: {
        total: Math.round(totalSpent * 100) / 100,
        totalMeals,
        avgCostPerMeal: Math.round(avgCostPerMeal * 100) / 100,
        byProvider
      },
      budget: {
        monthlyBudget: budget,
        remaining: budgetRemaining ? Math.round(budgetRemaining * 100) / 100 : null,
        usedPercent: budgetUsedPercent ? Math.round(budgetUsedPercent * 100) / 100 : null,
        isOverBudget: budgetRemaining !== null ? budgetRemaining < 0 : false
      },
      logs
    };

  } catch (error) {
    logger.error('Failed to get monthly food stats', {
      userId,
      year,
      month,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get food spending trend (last N months)
 * @param {string} userId - User ID
 * @param {number} months - Number of months to look back
 * @returns {Promise<Array>} - Trend data
 */
const getSpendingTrend = async (userId, months = 6) => {
  try {
    const trend = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const stats = await getMonthlyStats(userId, year, month);

      trend.unshift({
        year,
        month,
        monthName: date.toLocaleString('fr-FR', { month: 'long' }),
        totalSpent: stats.spending.total,
        totalMeals: stats.spending.totalMeals,
        avgCostPerMeal: stats.spending.avgCostPerMeal
      });
    }

    return trend;

  } catch (error) {
    logger.error('Failed to get spending trend', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user's food budget
 * @param {string} userId - User ID
 * @param {number} budgetEur - Monthly budget in EUR
 * @returns {Promise<Object>} - Updated profile
 */
const updateFoodBudget = async (userId, budgetEur) => {
  try {
    // Find or create user profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        foodBudgetEur: budgetEur
      },
      create: {
        userId,
        foodBudgetEur: budgetEur
      }
    });

    logger.info('Food budget updated', {
      userId,
      budgetEur
    });

    return profile;

  } catch (error) {
    logger.error('Failed to update food budget', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete food spending log
 * @param {string} userId - User ID
 * @param {string} logId - Log ID
 * @returns {Promise<boolean>} - Success status
 */
const deleteFoodSpending = async (userId, logId) => {
  try {
    const result = await prisma.foodSpendingLog.deleteMany({
      where: {
        id: logId,
        userId // Ensure user owns this log
      }
    });

    if (result.count === 0) {
      throw new Error('Food spending log not found');
    }

    logger.info('Food spending log deleted', {
      userId,
      logId
    });

    return true;

  } catch (error) {
    logger.error('Failed to delete food spending log', {
      userId,
      logId,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  logFoodSpending,
  getFoodSpending,
  getMonthlyStats,
  getSpendingTrend,
  updateFoodBudget,
  deleteFoodSpending
};
