const { validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma'); // CRITICAL FIX: Use singleton to prevent connection pool exhaustion in financial operations
const logger = require('../utils/logger');
const {
  sendSuccess, sendError, sendAnalytics, sendPaginated, asyncHandler
} = require('../utils/responseHelper');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const aiService = require('../services/aiService');
const financialAIService = require('../services/financialAIService');

// CRITICAL: Import financial utilities for precise decimal calculations
const {
  calculateAssetValue,
  calculateNetWorth,
  calculateSavingsRate,
  add,
  subtract,
  multiply,
  roundToCurrency,
  toNumber
} = require('../utils/financialUtils');

/**
 * Controller for financial dashboard management
 * Handles accounts, assets, liabilities, net worth, and financial insights
 */
const financialController = {
  /**
   * Get comprehensive financial dashboard data
   * @route GET /api/financial/dashboard
   * @access Private
   */
  getDashboard: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { lang = 'fr' } = req.query;

    // Check cache first
    const cacheKey = `financial_dashboard_${userId}_${lang}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, 'Dashboard data retrieved from cache');
    }

    // Get all financial data in parallel
    const [accounts, assets, liabilities, incomes, goals, latestSnapshot] = await Promise.all([
      prisma.account.findMany({
        where: { userId, isActive: true },
        include: {
          assets: true,
          liabilities: true,
          _count: {
            select: { accountTransactions: true }
          }
        }
      }),
      prisma.asset.findMany({
        where: { userId },
        orderBy: { totalValue: 'desc' }
      }),
      prisma.liability.findMany({
        where: { userId },
        orderBy: { balance: 'desc' }
      }),
      prisma.income.findMany({
        where: { userId, isActive: true }
      }),
      prisma.financialGoal.findMany({
        where: { userId, status: 'active' },
        orderBy: { priority: 'desc' }
      }),
      prisma.netWorthSnapshot.findFirst({
        where: { userId },
        orderBy: { date: 'desc' }
      })
    ]);

    // CRITICAL FIX: Calculate totals using precise decimal arithmetic
    const totalAssets = toNumber(roundToCurrency(
      assets.reduce((sum, asset) => add(sum, asset.totalValue, 'asset_total'), 0),
      'total_assets'
    ));

    const totalLiabilities = toNumber(roundToCurrency(
      liabilities.reduce((sum, liability) => add(sum, liability.balance, 'liability_total'), 0),
      'total_liabilities'
    ));

    const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

    const liquidAssets = toNumber(roundToCurrency(
      accounts
        .filter((acc) => ['checking', 'savings'].includes(acc.type))
        .reduce((sum, acc) => add(sum, acc.balance, 'liquid_assets'), 0),
      'liquid_assets_total'
    ));

    const monthlyIncome = toNumber(roundToCurrency(
      incomes.reduce((sum, income) => {
        const factor = income.frequency === 'weekly' ? 4.33
          : income.frequency === 'annual' ? (1 / 12)
            : income.frequency === 'quarterly' ? (1 / 3) : 1;
        const monthlyAmount = multiply(income.amount, factor, `income_${income.frequency}_conversion`);
        return add(sum, monthlyAmount, 'monthly_income_calculation');
      }, 0),
      'monthly_income_total'
    ));

    // CRITICAL FIX: Asset allocation using precise arithmetic
    const assetAllocation = assets.reduce((acc, asset) => {
      const currentValue = acc[asset.type] || 0;
      acc[asset.type] = toNumber(roundToCurrency(
        add(currentValue, asset.totalValue, `asset_allocation_${asset.type}`),
        `allocation_${asset.type}_total`
      ));
      return acc;
    }, {});

    // Recent net worth trend (last 6 months)
    const netWorthTrend = await prisma.netWorthSnapshot.findMany({
      where: {
        userId,
        date: {
          gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { date: 'asc' },
      select: {
        date: true, netWorth: true, totalAssets: true, totalLiabilities: true
      }
    });

    const dashboardData = {
      summary: {
        netWorth,
        totalAssets,
        totalLiabilities,
        liquidAssets,
        monthlyIncome,
        accountsCount: accounts.length,
        assetsCount: assets.length,
        goalsCount: goals.length
      },
      accounts: accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        provider: acc.provider,
        lastSyncAt: acc.lastSyncAt,
        transactionCount: acc._count.accountTransactions
      })),
      assetAllocation,
      topAssets: assets.slice(0, 5),
      topLiabilities: liabilities.slice(0, 3),
      activeGoals: goals.slice(0, 3),
      netWorthTrend,
      lastUpdate: latestSnapshot?.date || new Date(),
      insights: await generateFinancialInsights(userId, {
        netWorth,
        totalAssets,
        totalLiabilities,
        monthlyIncome,
        lang
      })
    };

    // Cache for 15 minutes
    await cacheService.set(cacheKey, dashboardData, 900);

    // Track event
    analyticsService.trackEvent('financial_dashboard_viewed', userId, { lang });

    return sendAnalytics(res, dashboardData, null, 'Financial dashboard retrieved successfully');
  }),

  /**
   * Get all user accounts
   * @route GET /api/financial/accounts
   * @access Private
   */
  getAccounts: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type, provider, includeInactive = false } = req.query;

    const where = { userId };
    if (type) where.type = type;
    if (provider) where.provider = provider;
    if (!includeInactive) where.isActive = true;

    const accounts = await prisma.account.findMany({
      where,
      include: {
        assets: {
          select: {
            id: true, name: true, type: true, totalValue: true
          }
        },
        liabilities: {
          select: {
            id: true, name: true, type: true, balance: true
          }
        },
        _count: {
          select: { accountTransactions: true }
        }
      },
      orderBy: { balance: 'desc' }
    });

    return sendSuccess(res, accounts, 'Accounts retrieved successfully');
  }),

  /**
   * Create a new account
   * @route POST /api/financial/accounts
   * @access Private
   */
  createAccount: asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid data', 400, 'validation_error', errors.array());
    }

    const userId = req.user.id;
    const {
      name, type, subtype, provider, balance, currency = 'EUR', accountNumber
    } = req.body;

    // Validate account type
    const validTypes = ['checking', 'savings', 'investment', 'crypto', 'loan'];
    if (!validTypes.includes(type)) {
      return sendError(res, 'Invalid account type', 400);
    }

    const account = await prisma.account.create({
      data: {
        userId,
        name,
        type,
        subtype,
        provider: provider || 'manual',
        balance: toNumber(roundToCurrency(balance || 0, 'account_balance')),
        currency,
        accountNumber: accountNumber ? `****${accountNumber.slice(-4)}` : null
      }
    });

    // Clear cache
    await cacheService.delete(`financial_dashboard_${userId}_*`);

    analyticsService.trackEvent('account_created', userId, { type, provider });
    logger.info(`Account created: ${account.id} for user ${userId}`);

    return sendSuccess(res, account, 'Account created successfully', 201);
  }),

  /**
   * Update account
   * @route PUT /api/financial/accounts/:id
   * @access Private
   */
  updateAccount: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, balance, isActive } = req.body;

    const existingAccount = await prisma.account.findFirst({
      where: { id, userId }
    });

    if (!existingAccount) {
      return sendError(res, 'Account not found', 404);
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (balance !== undefined) updateData.balance = toNumber(roundToCurrency(balance, 'account_update_balance'));
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: updateData
    });

    await cacheService.delete(`financial_dashboard_${userId}_*`);
    analyticsService.trackEvent('account_updated', userId, { accountId: id });

    return sendSuccess(res, updatedAccount, 'Account updated successfully');
  }),

  /**
   * Get all user assets
   * @route GET /api/financial/assets
   * @access Private
   */
  getAssets: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type, page = 1, limit = 20 } = req.query;

    const where = { userId };
    if (type) where.type = type;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          account: {
            select: { name: true, provider: true }
          }
        },
        orderBy: { totalValue: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.asset.count({ where })
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
      hasPrev: parseInt(page) > 1
    };

    return sendPaginated(res, assets, pagination, 'Assets retrieved successfully');
  }),

  /**
   * Create or update asset
   * @route POST /api/financial/assets
   * @access Private
   */
  createAsset: asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid data', 400, 'validation_error', errors.array());
    }

    const userId = req.user.id;
    const {
      accountId, name, type, symbol, quantity, unitValue,
      currency = 'EUR', acquisitionDate, acquisitionPrice
    } = req.body;

    const validTypes = ['stock', 'crypto', 'real_estate', 'bond', 'etf', 'commodity'];
    if (!validTypes.includes(type)) {
      return sendError(res, 'Invalid asset type', 400);
    }

    // CRITICAL FIX: Use precise decimal calculation for asset value
    const totalValue = calculateAssetValue(quantity, unitValue);

    const asset = await prisma.asset.create({
      data: {
        userId,
        accountId: accountId || null,
        name,
        type,
        symbol,
        quantity: toNumber(roundToCurrency(quantity, 'asset_quantity')),
        unitValue: toNumber(roundToCurrency(unitValue, 'asset_unit_value')),
        totalValue,
        currency,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        acquisitionPrice: acquisitionPrice ? toNumber(roundToCurrency(acquisitionPrice, 'asset_acquisition_price')) : null
      }
    });

    await cacheService.delete(`financial_dashboard_${userId}_*`);
    analyticsService.trackEvent('asset_created', userId, { type, value: totalValue });

    return sendSuccess(res, asset, 'Asset created successfully', 201);
  }),

  /**
   * Get net worth evolution
   * @route GET /api/financial/net-worth
   * @access Private
   */
  getNetWorthEvolution: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { period = '12m' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
    case '1m':
      dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      break;
    case '3m':
      dateFilter = { gte: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000) };
      break;
    case '6m':
      dateFilter = { gte: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000) };
      break;
    case '12m':
      dateFilter = { gte: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000) };
      break;
    case 'all':
      break;
    default:
      dateFilter = { gte: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000) };
    }

    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length && { date: dateFilter })
      },
      orderBy: { date: 'asc' }
    });

    // Calculate growth metrics
    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];
    const growth = latest && previous
      ? ((latest.netWorth - previous.netWorth) / Math.abs(previous.netWorth)) * 100 : 0;

    const data = {
      period,
      snapshots,
      summary: {
        current: latest?.netWorth || 0,
        growth: Math.round(growth * 100) / 100,
        highest: Math.max(...snapshots.map((s) => s.netWorth)),
        lowest: Math.min(...snapshots.map((s) => s.netWorth)),
        average: snapshots.reduce((sum, s) => sum + s.netWorth, 0) / snapshots.length
      }
    };

    return sendAnalytics(res, data, period, 'Net worth evolution retrieved successfully');
  }),

  /**
   * Create net worth snapshot
   * @route POST /api/financial/net-worth/snapshot
   * @access Private
   */
  createNetWorthSnapshot: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // CRITICAL FIX: Use atomic transaction for net worth calculation
    const snapshot = await prisma.$transaction(async (prisma) => {
      // Calculate current values within transaction for consistency
      const [assets, liabilities, accounts, incomes] = await Promise.all([
        prisma.asset.aggregate({
          where: { userId },
          _sum: { totalValue: true }
        }),
        prisma.liability.aggregate({
          where: { userId },
          _sum: { balance: true }
        }),
        prisma.account.aggregate({
          where: { userId, isActive: true },
          _sum: { balance: true }
        }),
        prisma.income.findMany({
          where: { userId, isActive: true }
        })
      ]);

      // CRITICAL FIX: Use precise decimal calculations
      const assetsValue = assets._sum.totalValue || 0;
      const accountsValue = accounts._sum.balance || 0;
      const totalAssets = toNumber(roundToCurrency(
        add(assetsValue, accountsValue, 'snapshot_total_assets'),
        'snapshot_assets_final'
      ));

      const totalLiabilities = toNumber(roundToCurrency(
        liabilities._sum.balance || 0,
        'snapshot_liabilities'
      ));

      const netWorth = calculateNetWorth(totalAssets, totalLiabilities);
      const liquidAssets = toNumber(roundToCurrency(accountsValue, 'snapshot_liquid_assets'));

      const monthlyIncome = toNumber(roundToCurrency(
        incomes.reduce((sum, income) => {
          const factor = income.frequency === 'weekly' ? 4.33
            : income.frequency === 'annual' ? (1 / 12)
              : income.frequency === 'quarterly' ? (1 / 3) : 1;
          const monthlyAmount = multiply(income.amount, factor, `snapshot_income_${income.frequency}`);
          return add(sum, monthlyAmount, 'snapshot_monthly_income');
        }, 0),
        'snapshot_income_final'
      ));

      // Get expenses from recent transactions within the same transaction
      const recentExpenses = await prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _sum: { amount: true }
      });

      const monthlyExpenses = toNumber(roundToCurrency(
        recentExpenses._sum.amount || 0,
        'snapshot_monthly_expenses'
      ));

      const savingsRate = calculateSavingsRate(monthlyIncome, monthlyExpenses);

      // Create snapshot within transaction for consistency
      return await prisma.netWorthSnapshot.create({
        data: {
          userId,
          totalAssets,
          totalLiabilities,
          netWorth,
          liquidAssets,
          monthlyIncome,
          monthlyExpenses,
          savingsRate
        }
      });
    }, {
      timeout: 15000 // 15 second timeout for financial operations
    });

    await cacheService.delete(`financial_dashboard_${userId}_*`);
    analyticsService.trackEvent('net_worth_snapshot_created', userId, { netWorth: snapshot.netWorth });

    return sendSuccess(res, snapshot, 'Net worth snapshot created successfully', 201);
  }),

  /**
   * Get financial goals
   * @route GET /api/financial/goals
   * @access Private
   */
  getFinancialGoals: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { status = 'active', type } = req.query;

    const where = { userId };
    if (status !== 'all') where.status = status;
    if (type) where.type = type;

    const goals = await prisma.financialGoal.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { targetDate: 'asc' }
      ]
    });

    // Calculate progress for each goal
    const goalsWithProgress = goals.map((goal) => {
      const progressPercentage = goal.targetAmount > 0
        ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

      const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

      let daysUntilTarget = null;
      if (goal.targetDate) {
        const diffTime = new Date(goal.targetDate) - new Date();
        daysUntilTarget = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...goal,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        remainingAmount,
        daysUntilTarget,
        isOnTrack: progressPercentage >= 75 || (goal.status === 'completed')
      };
    });

    return sendSuccess(res, goalsWithProgress, 'Financial goals retrieved successfully');
  }),

  /**
   * Create financial goal
   * @route POST /api/financial/goals
   * @access Private
   */
  createFinancialGoal: asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid data', 400, 'validation_error', errors.array());
    }

    const userId = req.user.id;
    const {
      name, type, targetAmount, targetDate, priority = 'medium', description
    } = req.body;

    const validTypes = ['savings', 'debt_payoff', 'investment', 'emergency_fund'];
    const validPriorities = ['low', 'medium', 'high'];

    if (!validTypes.includes(type)) {
      return sendError(res, 'Invalid goal type', 400);
    }

    if (!validPriorities.includes(priority)) {
      return sendError(res, 'Invalid priority level', 400);
    }

    const goal = await prisma.financialGoal.create({
      data: {
        userId,
        name,
        type,
        targetAmount: parseFloat(targetAmount),
        targetDate: targetDate ? new Date(targetDate) : null,
        priority,
        description
      }
    });

    await cacheService.delete(`financial_dashboard_${userId}_*`);
    analyticsService.trackEvent('financial_goal_created', userId, { type, targetAmount });

    return sendSuccess(res, goal, 'Financial goal created successfully', 201);
  }),

  /**
   * Get financial summary for dashboard
   * @route GET /api/financial/summary
   * @access Private
   */
  getFinancialSummary: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { lang = 'fr', period = 'month' } = req.query;

    logger.info(`[BACKEND] GET /api/financial/summary hit successfully - userId: ${userId}, lang: ${lang}, period: ${period}`);

    // Check cache first
    const cacheKey = `financial_summary_${userId}_${period}_${lang}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached, 'Financial summary retrieved from cache');
    }

    // Calculate date filters
    const now = new Date();
    let startDate; const
      endDate = now;

    switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get expenses and income data in parallel
    const [expenses, incomes, user, totalExpenses, categoryBreakdown] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId,
          date: period === 'all' ? undefined : {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'desc' },
        take: 10
      }),
      prisma.income.findMany({
        where: { userId, isActive: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { savedAmount: true, monthlyGoal: true }
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: period === 'all' ? undefined : {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true },
        _count: true
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: {
          userId,
          date: period === 'all' ? undefined : {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true },
        _count: true
      })
    ]);

    // Calculate monthly income
    const monthlyIncome = incomes.reduce((sum, income) => {
      const factor = income.frequency === 'weekly' ? 4.33
        : income.frequency === 'annual' ? 1 / 12
          : income.frequency === 'quarterly' ? 1 / 3 : 1;
      return sum + (income.amount * factor);
    }, 0);

    const totalExpenseAmount = totalExpenses._sum.amount || 0;
    const netSavings = monthlyIncome - totalExpenseAmount;
    const savingsRate = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0;

    // Format category breakdown for charts
    const categoryData = categoryBreakdown.map((cat) => ({
      category: cat.category,
      amount: cat._sum.amount,
      count: cat._count,
      percentage: totalExpenseAmount > 0 ? (cat._sum.amount / totalExpenseAmount) * 100 : 0
    }));

    const summary = {
      period,
      dateRange: { start: startDate, end: endDate },
      totals: {
        expenses: totalExpenseAmount,
        income: monthlyIncome,
        netSavings,
        savingsRate: Math.round(savingsRate * 100) / 100,
        currentSavings: user?.savedAmount || 0,
        monthlyGoal: user?.monthlyGoal || 0
      },
      expenses: {
        total: totalExpenseAmount,
        count: totalExpenses._count,
        byCategory: categoryData,
        recent: expenses.slice(0, 5)
      },
      income: {
        total: monthlyIncome,
        sources: incomes.map((inc) => ({
          id: inc.id,
          name: inc.name,
          type: inc.type,
          amount: inc.amount,
          frequency: inc.frequency
        }))
      }
    };

    // Cache for 10 minutes
    await cacheService.set(cacheKey, summary, 600);

    analyticsService.trackEvent('financial_summary_viewed', userId, { period, lang });

    return sendSuccess(res, summary, 'Financial summary retrieved successfully');
  }),

  /**
   * Get expenses with filtering
   * @route GET /api/financial/expenses
   * @access Private
   */
  getExpenses: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
      category, period = 'month', page = 1, limit = 20
    } = req.query;

    // Calculate date filters
    const now = new Date();
    let dateFilter = {};

    switch (period) {
    case 'week':
      dateFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case 'month':
      dateFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      break;
    case '3month':
      dateFilter = { gte: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000) };
      break;
    case '6month':
      dateFilter = { gte: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000) };
      break;
    case 'year':
      dateFilter = { gte: new Date(now.getFullYear(), 0, 1) };
      break;
    case 'all':
    default:
      break;
    }

    const where = { userId };
    if (category) where.category = category;
    if (Object.keys(dateFilter).length) where.date = dateFilter;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [expenses, total, categoryTotals] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.expense.count({ where }),
      prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: true
      })
    ]);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
      hasPrev: parseInt(page) > 1
    };

    const data = {
      expenses,
      pagination,
      categoryTotals,
      period,
      filters: { category, period }
    };

    return sendPaginated(res, expenses, pagination, 'Expenses retrieved successfully', data);
  }),

  /**
   * Create new expense
   * @route POST /api/financial/expenses
   * @access Private
   */
  createExpense: asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid data', 400, 'validation_error', errors.array());
    }

    const userId = req.user.id;
    const {
      category, subcategory, amount, description, merchant,
      date, isRecurring = false, frequency, paymentMethod,
      location, tags
    } = req.body;

    const expense = await prisma.expense.create({
      data: {
        userId,
        category,
        subcategory,
        amount: parseFloat(amount),
        description,
        merchant,
        date: date ? new Date(date) : new Date(),
        isRecurring,
        frequency: isRecurring ? frequency : null,
        paymentMethod,
        location,
        tags: tags ? JSON.stringify(tags) : null
      }
    });

    // Clear financial caches
    await cacheService.delete(`financial_summary_${userId}_*`);
    await cacheService.delete(`financial_dashboard_${userId}_*`);

    analyticsService.trackEvent('expense_created', userId, { category, amount: parseFloat(amount) });

    return sendSuccess(res, expense, 'Expense created successfully', 201);
  }),

  /**
   * Update expense
   * @route PUT /api/financial/expenses/:id
   * @access Private
   */
  updateExpense: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      category, subcategory, amount, description, merchant
    } = req.body;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId }
    });

    if (!existingExpense) {
      return sendError(res, 'Expense not found', 404);
    }

    const updateData = {};
    if (category !== undefined) updateData.category = category;
    if (subcategory !== undefined) updateData.subcategory = subcategory;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description;
    if (merchant !== undefined) updateData.merchant = merchant;

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData
    });

    await cacheService.delete(`financial_summary_${userId}_*`);
    analyticsService.trackEvent('expense_updated', userId, { expenseId: id });

    return sendSuccess(res, updatedExpense, 'Expense updated successfully');
  }),

  /**
   * Delete expense
   * @route DELETE /api/financial/expenses/:id
   * @access Private
   */
  deleteExpense: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId }
    });

    if (!existingExpense) {
      return sendError(res, 'Expense not found', 404);
    }

    await prisma.expense.delete({
      where: { id }
    });

    await cacheService.delete(`financial_summary_${userId}_*`);
    analyticsService.trackEvent('expense_deleted', userId, { expenseId: id });

    return sendSuccess(res, null, 'Expense deleted successfully');
  }),

  /**
   * Get detailed income information
   * @route GET /api/financial/income
   * @access Private
   */
  getIncomeDetails: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { includeInactive = false } = req.query;

    const where = { userId };
    if (!includeInactive) where.isActive = true;

    const incomes = await prisma.income.findMany({
      where,
      orderBy: { amount: 'desc' }
    });

    // Calculate monthly equivalent for each income
    const incomesWithMonthly = incomes.map((income) => {
      const factor = income.frequency === 'weekly' ? 4.33
        : income.frequency === 'annual' ? 1 / 12
          : income.frequency === 'quarterly' ? 1 / 3 : 1;
      const monthlyAmount = income.amount * factor;

      return {
        ...income,
        monthlyEquivalent: Math.round(monthlyAmount * 100) / 100
      };
    });

    const totalMonthly = incomesWithMonthly.reduce((sum, inc) => sum + inc.monthlyEquivalent, 0);

    const data = {
      incomes: incomesWithMonthly,
      summary: {
        totalMonthly: Math.round(totalMonthly * 100) / 100,
        sourcesCount: incomes.length,
        byType: incomes.reduce((acc, inc) => {
          acc[inc.type] = (acc[inc.type] || 0) + inc.monthlyEquivalent;
          return acc;
        }, {})
      }
    };

    return sendSuccess(res, data, 'Income details retrieved successfully');
  }),

  /**
   * Get financial suggestions
   * @route GET /api/financial/suggestions
   * @access Private
   */
  getFinancialSuggestions: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
      lang = 'fr', status = 'active', type, limit = 10
    } = req.query;

    const where = { userId };
    if (status !== 'all') where.status = status;
    if (type) where.type = type;

    // Check for existing suggestions first
    let suggestions = await prisma.financialSuggestion.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit)
    });

    // If no active suggestions, generate new ones
    if (suggestions.length === 0 && status === 'active') {
      suggestions = await generateNewFinancialSuggestions(userId, lang);
    }

    analyticsService.trackEvent('financial_suggestions_viewed', userId, { lang, count: suggestions.length });

    return sendSuccess(res, suggestions, 'Financial suggestions retrieved successfully');
  }),

  /**
   * Dismiss suggestion
   * @route POST /api/financial/suggestions/dismiss/:id
   * @access Private
   */
  dismissSuggestion: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const suggestion = await prisma.financialSuggestion.findFirst({
      where: { id, userId }
    });

    if (!suggestion) {
      return sendError(res, 'Suggestion not found', 404);
    }

    const updatedSuggestion = await prisma.financialSuggestion.update({
      where: { id },
      data: { status: 'dismissed' }
    });

    analyticsService.trackEvent('financial_suggestion_dismissed', userId, { suggestionId: id });

    return sendSuccess(res, updatedSuggestion, 'Suggestion dismissed successfully');
  }),

  /**
   * Get expense categories
   * @route GET /api/financial/categories
   * @access Private
   */
  getExpenseCategories: asyncHandler(async (req, res) => {
    const { lang = 'fr' } = req.query;

    // Default categories with localization
    const categories = [
      {
        name: 'alimentation',
        displayName: lang === 'en' ? 'Food & Dining' : lang === 'es' ? 'Alimentación' : 'Alimentation',
        icon: '🍽️',
        color: '#22c55e'
      },
      {
        name: 'transport',
        displayName: lang === 'en' ? 'Transportation' : lang === 'es' ? 'Transporte' : 'Transport',
        icon: '🚗',
        color: '#3b82f6'
      },
      {
        name: 'logement',
        displayName: lang === 'en' ? 'Housing' : lang === 'es' ? 'Vivienda' : 'Logement',
        icon: '🏠',
        color: '#f59e0b'
      },
      {
        name: 'loisirs',
        displayName: lang === 'en' ? 'Entertainment' : lang === 'es' ? 'Ocio' : 'Loisirs',
        icon: '🎭',
        color: '#8b5cf6'
      },
      {
        name: 'sante',
        displayName: lang === 'en' ? 'Healthcare' : lang === 'es' ? 'Salud' : 'Santé',
        icon: '🏥',
        color: '#ef4444'
      },
      {
        name: 'habits',
        displayName: lang === 'en' ? 'Clothing' : lang === 'es' ? 'Ropa' : 'Vêtements',
        icon: '👕',
        color: '#ec4899'
      },
      {
        name: 'autres',
        displayName: lang === 'en' ? 'Other' : lang === 'es' ? 'Otros' : 'Autres',
        icon: '📦',
        color: '#6b7280'
      }
    ];

    return sendSuccess(res, categories, 'Expense categories retrieved successfully');
  }),

  /**
   * Get budget plans with real spending data
   * @route GET /api/financial/budget
   * @access Private
   */
  getBudgetPlans: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type, includeInactive = false, period = 'month' } = req.query;

    const where = { userId };
    if (type) where.type = type;
    if (!includeInactive) where.isActive = true;

    const budgets = await prisma.budgetPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // ✨ Calculate real spending per category for the period
    const now = new Date();
    let startDate;

    switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get transport spending from trips
    const transportTrips = await prisma.transportTrip.aggregate({
      where: {
        userId,
        createdAt: { gte: startDate, lte: now }
      },
      _sum: { actualCostEur: true }
    });

    // Get other expenses
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        userId,
        date: { gte: startDate, lte: now }
      },
      _sum: { amount: true }
    });

    // Build spending map
    const spendingMap = {
      transport: transportTrips._sum.actualCostEur || 0
    };

    expensesByCategory.forEach(cat => {
      spendingMap[cat.category] = cat._sum.amount || 0;
    });

    // Attach spending to budgets
    const budgetsWithSpending = budgets.map(budget => {
      const categories = typeof budget.categories === 'string'
        ? JSON.parse(budget.categories)
        : budget.categories;

      // Format as array of budget items with spending
      const budgetItems = categories.map(cat => ({
        id: cat.category || cat.name,
        name: cat.name || cat.category,
        budget: cat.amount || cat.budget || 0,
        spent: spendingMap[cat.category || cat.name] || 0,
        icon: cat.icon || getCategoryIcon(cat.category || cat.name)
      }));

      return {
        ...budget,
        categories: budgetItems,
        spendingMap
      };
    });

    return sendSuccess(res, budgetsWithSpending, 'Budget plans retrieved successfully');
  }),

  /**
   * Create budget plan
   * @route POST /api/financial/budget
   * @access Private
   */
  createBudgetPlan: asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid data', 400, 'validation_error', errors.array());
    }

    const userId = req.user.id;
    const {
      name, type, totalBudget, startDate, endDate,
      categories, alertThreshold = 80, description
    } = req.body;

    const budget = await prisma.budgetPlan.create({
      data: {
        userId,
        name,
        type,
        totalBudget: parseFloat(totalBudget),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        categories: JSON.stringify(categories),
        alertThreshold: parseFloat(alertThreshold),
        description
      }
    });

    analyticsService.trackEvent('budget_plan_created', userId, { type, totalBudget });

    return sendSuccess(res, budget, 'Budget plan created successfully', 201);
  })
};

/**
 * Get category icon mapping
 */
function getCategoryIcon(categoryId) {
  const icons = {
    alimentation: '🍽️',
    transport: '🚗',
    loisirs: '🎬',
    logement: '🏠',
    sante: '💊',
    shopping: '🛍️',
    habits: '👕',
    autres: '📦'
  };
  return icons[categoryId] || '📦';
}

/**
 * Generate new financial suggestions using AI
 */
async function generateNewFinancialSuggestions(userId, lang = 'fr') {
  try {
    // Get user's financial data for AI analysis
    const [expenses, incomes, user] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId,
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.income.findMany({
        where: { userId, isActive: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { savedAmount: true, monthlyGoal: true }
      })
    ]);

    // Calculate financial metrics
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const monthlyIncome = incomes.reduce((sum, income) => {
      const factor = income.frequency === 'weekly' ? 4.33
        : income.frequency === 'annual' ? 1 / 12
          : income.frequency === 'quarterly' ? 1 / 3 : 1;
      return sum + (income.amount * factor);
    }, 0);

    const categoryBreakdown = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    // Generate AI suggestions
    const prompt = lang === 'en'
      ? `Analyze this user's financial data and provide 3 personalized suggestions:
         - Monthly income: €${monthlyIncome}
         - Last 30 days expenses: €${totalExpenses}
         - Expenses by category: ${JSON.stringify(categoryBreakdown)}
         - Current savings: €${user?.savedAmount || 0}
         - Monthly goal: €${user?.monthlyGoal || 0}

         Provide actionable financial advice in English. Return as JSON array with objects having:
         'type' (expense_reduction, budget_optimization, or savings_increase),
         'title', 'description', 'actionRequired', 'potentialSaving' (number), 'priority' (1-10), 'category'.`
      : `Analyse ces données financières et fournis 3 suggestions personnalisées:
         - Revenus mensuels: ${monthlyIncome}€
         - Dépenses des 30 derniers jours: ${totalExpenses}€
         - Dépenses par catégorie: ${JSON.stringify(categoryBreakdown)}
         - Économies actuelles: ${user?.savedAmount || 0}€
         - Objectif mensuel: ${user?.monthlyGoal || 0}€

         Fournis des conseils financiers actionnables en français. Retourne un array JSON avec des objets ayant:
         'type' (expense_reduction, budget_optimization, ou savings_increase),
         'title', 'description', 'actionRequired', 'potentialSaving' (nombre), 'priority' (1-10), 'category'.`;

    const aiSuggestions = await aiService.getAISuggestions('financial', prompt, lang);

    if (!Array.isArray(aiSuggestions)) {
      throw new Error('AI service returned invalid format');
    }

    // Store suggestions in database
    const suggestions = [];
    for (const suggestion of aiSuggestions.slice(0, 3)) {
      try {
        const created = await prisma.financialSuggestion.create({
          data: {
            userId,
            type: suggestion.type || 'budget_optimization',
            title: suggestion.title || '',
            description: suggestion.description || '',
            impact: suggestion.priority > 7 ? 'high' : suggestion.priority > 4 ? 'medium' : 'low',
            category: suggestion.category || null,
            potentialSaving: parseFloat(suggestion.potentialSaving) || 0,
            actionRequired: suggestion.actionRequired || '',
            priority: parseInt(suggestion.priority) || 5,
            generatedBy: 'ai'
          }
        });
        suggestions.push(created);
      } catch (error) {
        logger.error('Error creating suggestion:', error);
      }
    }

    return suggestions;
  } catch (error) {
    logger.error('Error generating financial suggestions:', error);
    return [];
  }
}

/**
 * Generate AI-powered financial insights
 */
async function generateFinancialInsights(userId, financialData, lang = 'fr') {
  try {
    // Try to get cached insights first
    const cachedInsights = await financialAIService.getCachedInsights(userId);
    if (cachedInsights) {
      return cachedInsights;
    }

    // Generate comprehensive insights using the enhanced AI service
    const insights = await financialAIService.generateFinancialInsights(userId, lang);

    // Cache the results
    await financialAIService.cacheInsights(userId, insights);

    return insights;
  } catch (error) {
    logger.error('Error generating financial insights:', error);

    // Fallback to simple AI suggestions
    try {
      const {
        netWorth, totalAssets, totalLiabilities, monthlyIncome
      } = financialData;

      const prompt = lang === 'en'
        ? `Generate 2 personalized financial insights for a user with:
           - Net worth: €${netWorth}
           - Assets: €${totalAssets}
           - Liabilities: €${totalLiabilities}
           - Monthly income: €${monthlyIncome}

           Provide actionable advice in English. Return as JSON array with objects having 'type', 'title', 'description', 'priority' fields.`
        : `Génère 2 conseils financiers personnalisés pour un utilisateur avec:
           - Patrimoine net: ${netWorth}€
           - Actifs: ${totalAssets}€
           - Passifs: ${totalLiabilities}€
           - Revenus mensuels: ${monthlyIncome}€

           Fournis des conseils actionnables en français. Retourne un array JSON avec des objets ayant les champs 'type', 'title', 'description', 'priority'.`;

      const fallbackInsights = await aiService.getAISuggestions('financial', prompt, lang);
      return Array.isArray(fallbackInsights) ? fallbackInsights.slice(0, 2) : [];
    } catch (fallbackError) {
      logger.error('Error generating fallback insights:', fallbackError);
      return [];
    }
  }
}

module.exports = financialController;
