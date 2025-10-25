/**
 * Food Spending Controller
 *
 * Handles food expense tracking for finance integration
 */

const foodSpendingService = require('../services/foodSpendingService');
const foodSpendingMatcher = require('../services/foodSpendingMatcher');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Log a food expense
 * @route POST /api/food-spending
 */
const logFoodSpending = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { externalId, provider, recipeName, costEur, servings, metadata } = req.body;

    if (!externalId || !provider || !recipeName || costEur === undefined) {
      return sendError(res, 'Missing required fields', 400, [
        { field: 'externalId', type: 'REQUIRED' },
        { field: 'provider', type: 'REQUIRED' },
        { field: 'recipeName', type: 'REQUIRED' },
        { field: 'costEur', type: 'REQUIRED' }
      ]);
    }

    const log = await foodSpendingService.logFoodSpending({
      userId,
      externalId,
      provider,
      recipeName,
      costEur,
      servings,
      metadata
    });

    logger.info('Food spending logged', {
      userId,
      logId: log.id,
      recipeName,
      totalCost: log.totalCostEur
    });

    return sendSuccess(res, { log }, 'Food spending logged successfully', 201);

  } catch (error) {
    logger.error('Failed to log food spending', {
      userId: req.user.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get food spending logs
 * @route GET /api/food-spending
 * @query {string} startDate - Start date (ISO format)
 * @query {string} endDate - End date (ISO format)
 */
const getFoodSpending = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date(); // Today

    const logs = await foodSpendingService.getFoodSpending(userId, start, end);

    logger.info('Food spending retrieved', {
      userId,
      count: logs.length,
      period: { start, end }
    });

    return sendSuccess(res, {
      logs,
      period: { startDate: start, endDate: end }
    });

  } catch (error) {
    logger.error('Failed to get food spending', {
      userId: req.user.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get monthly food spending statistics
 * @route GET /api/food-spending/stats/monthly
 * @query {number} year - Year (optional, defaults to current)
 * @query {number} month - Month 1-12 (optional, defaults to current)
 */
const getMonthlyStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;

    // Validate month
    if (month < 1 || month > 12) {
      return sendError(res, 'Invalid month. Must be between 1 and 12', 400, [{
        field: 'month',
        type: 'INVALID_VALUE'
      }]);
    }

    const stats = await foodSpendingService.getMonthlyStats(userId, year, month);

    logger.info('Monthly food stats retrieved', {
      userId,
      year,
      month,
      totalSpent: stats.spending.total
    });

    return sendSuccess(res, stats);

  } catch (error) {
    logger.error('Failed to get monthly food stats', {
      userId: req.user.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get food spending trend
 * @route GET /api/food-spending/stats/trend
 * @query {number} months - Number of months to look back (default: 6)
 */
const getSpendingTrend = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const months = req.query.months ? parseInt(req.query.months) : 6;

    // Validate months
    if (months < 1 || months > 24) {
      return sendError(res, 'Invalid months range. Must be between 1 and 24', 400, [{
        field: 'months',
        type: 'INVALID_VALUE'
      }]);
    }

    const trend = await foodSpendingService.getSpendingTrend(userId, months);

    logger.info('Food spending trend retrieved', {
      userId,
      months,
      dataPoints: trend.length
    });

    return sendSuccess(res, { trend });

  } catch (error) {
    logger.error('Failed to get spending trend', {
      userId: req.user.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update user's monthly food budget
 * @route PUT /api/food-spending/budget
 * @body {number} budgetEur - Monthly budget in EUR
 */
const updateFoodBudget = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { budgetEur } = req.body;

    if (budgetEur === undefined || budgetEur < 0) {
      return sendError(res, 'Valid budget amount is required', 400, [{
        field: 'budgetEur',
        type: 'INVALID_VALUE'
      }]);
    }

    const profile = await foodSpendingService.updateFoodBudget(userId, budgetEur);

    logger.info('Food budget updated', {
      userId,
      budgetEur
    });

    return sendSuccess(res, {
      foodBudgetEur: profile.foodBudgetEur
    }, 'Food budget updated successfully');

  } catch (error) {
    logger.error('Failed to update food budget', {
      userId: req.user.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete food spending log
 * @route DELETE /api/food-spending/:id
 */
const deleteFoodSpending = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await foodSpendingService.deleteFoodSpending(userId, id);

    logger.info('Food spending log deleted', {
      userId,
      logId: id
    });

    return sendSuccess(res, null, 'Food spending log deleted successfully');

  } catch (error) {
    if (error.message.includes('not found')) {
      return sendError(res, 'Food spending log not found', 404);
    }

    logger.error('Failed to delete food spending log', {
      userId: req.user.userId,
      logId: req.params.id,
      error: error.message
    });
    next(error);
  }
};

/**
 * Trigger manual matching of user's forecasts with transactions
 * @route POST /api/food-spending/match
 * @query {string} startDate - Start date (optional)
 * @query {string} endDate - End date (optional)
 */
const matchForecasts = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const results = await foodSpendingMatcher.matchUserForecasts(userId, options);

    logger.info('Manual forecast matching triggered', {
      userId,
      results,
    });

    return sendSuccess(
      res,
      results,
      `Matching terminé : ${results.matched} correspondances trouvées, ${results.archived} archivées, ${results.pending} en attente`
    );
  } catch (error) {
    logger.error('Failed to match forecasts', {
      userId: req.user.userId,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Get forecast vs reality statistics
 * @route GET /api/food-spending/forecast-vs-reality
 * @query {string} startDate - Start date (optional)
 * @query {string} endDate - End date (optional)
 */
const getForecastVsRealityStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const stats = await foodSpendingMatcher.getForecastVsRealityStats(userId, options);

    logger.info('Forecast vs reality stats retrieved', {
      userId,
      forecastTotal: stats.forecast.total,
      matchedTotal: stats.matched.total,
      variance: stats.variance.amount,
      accuracy: stats.accuracy,
    });

    return sendSuccess(res, stats);
  } catch (error) {
    logger.error('Failed to get forecast vs reality stats', {
      userId: req.user.userId,
      error: error.message,
    });
    next(error);
  }
};

/**
 * Check for potential duplicate (anti-doublon check before adding forecast)
 * @route POST /api/food-spending/check-duplicate
 * @body {number} amount - Amount to check
 * @body {string} date - Date to check
 */
const checkDuplicate = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { amount, date } = req.body;

    if (!amount || !date) {
      return sendError(res, 'Missing required fields', 400, [
        { field: 'amount', type: 'REQUIRED' },
        { field: 'date', type: 'REQUIRED' },
      ]);
    }

    const checkDate = new Date(date);
    const startDate = new Date(checkDate.getTime() - 3 * 24 * 60 * 60 * 1000); // -3 days
    const endDate = new Date(checkDate.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days

    // Check existing transactions
    const { prisma } = require('../lib/prisma');
    const existingTransactions = await prisma.accountTransaction.findMany({
      where: {
        account: {
          userId,
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
        type: 'debit',
        amount: {
          gte: -Math.abs(amount) * 1.1, // ±10% tolerance
          lte: -Math.abs(amount) * 0.9,
        },
      },
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
    });

    // Filter food-related transactions
    const foodTransactions = existingTransactions.filter((t) =>
      foodSpendingMatcher.isFoodCategory(t.category)
    );

    const hasDuplicate = foodTransactions.length > 0;

    logger.info('Duplicate check performed', {
      userId,
      amount,
      date: checkDate,
      hasDuplicate,
      potentialDuplicates: foodTransactions.length,
    });

    return sendSuccess(res, {
      hasDuplicate,
      potentialDuplicates: hasDuplicate ? foodTransactions.map((t) => ({
        id: t.id,
        amount: Math.abs(t.amount),
        date: t.date,
        description: t.description,
        category: t.category,
        accountName: t.account.name,
      })) : [],
    });
  } catch (error) {
    logger.error('Failed to check duplicate', {
      userId: req.user.userId,
      error: error.message,
    });
    next(error);
  }
};

module.exports = {
  logFoodSpending,
  getFoodSpending,
  getMonthlyStats,
  getSpendingTrend,
  updateFoodBudget,
  deleteFoodSpending,
  // Phase 5 endpoints
  matchForecasts,
  getForecastVsRealityStats,
  checkDuplicate,
};
