const express = require('express');
const { body, query, param } = require('express-validator');
const financialController = require('../controllers/financialController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// CRITICAL: Import SCA middleware for PSD2 compliance
const { createSCAMiddleware } = require('../middleware/scaAuthentication');
const { validateSCATransaction } = require('../middleware/validation/scaValidation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Financial Dashboard Routes
 */

// GET /api/financial/dashboard - Get comprehensive dashboard data
router.get(
  '/dashboard',
  query('lang').optional().isIn(['fr', 'en', 'es']),
  rateLimit.financial.reports, // Use financial report rate limiting
  financialController.getDashboard
);

/**
 * Account Management Routes
 */

// GET /api/financial/accounts - Get all user accounts
router.get(
  '/accounts',
  query('type').optional().isIn(['checking', 'savings', 'investment', 'crypto', 'loan']),
  query('provider').optional().isLength({ min: 1, max: 50 }),
  query('includeInactive').optional().isBoolean(),
  rateLimit.financial.apiCalls, // Use API call rate limiting
  financialController.getAccounts
);

// POST /api/financial/accounts - Create new account
router.post(
  '/accounts',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('type').isIn(['checking', 'savings', 'investment', 'crypto', 'loan']).withMessage('Invalid account type'),
    body('subtype').optional().isLength({ max: 50 }),
    body('provider').optional().isLength({ max: 50 }),
    body('balance').optional().isNumeric().withMessage('Balance must be a number'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('accountNumber').optional().isLength({ min: 4, max: 20 })
  ],
  rateLimit.financial.transactionsMulti, // Multi-dimensional protection for account creation
  financialController.createAccount
);

// PUT /api/financial/accounts/:id - Update account
router.put(
  '/accounts/:id',
  [
    param('id').isLength({ min: 1 }).withMessage('Account ID is required'),
    body('name').optional().isLength({ min: 1, max: 100 }),
    body('balance').optional().isNumeric(),
    body('isActive').optional().isBoolean()
  ],
  rateLimit.financial.transactions, // Use transaction rate limiting for account updates
  financialController.updateAccount
);

/**
 * Asset Management Routes
 */

// GET /api/financial/assets - Get user assets with pagination
router.get(
  '/assets',
  [
    query('type').optional().isIn(['stock', 'crypto', 'real_estate', 'bond', 'etf', 'commodity']),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  rateLimit.financial.apiCalls, // Use API call rate limiting
  financialController.getAssets
);

// POST /api/financial/assets - Create new asset (SCA PROTECTED)
router.post(
  '/assets',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('type').isIn(['stock', 'crypto', 'real_estate', 'bond', 'etf', 'commodity']).withMessage('Invalid asset type'),
    body('symbol').optional().isLength({ max: 20 }),
    body('quantity').isNumeric().withMessage('Quantity must be a number'),
    body('unitValue').isNumeric().withMessage('Unit value must be a number'),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('acquisitionDate').optional().isISO8601(),
    body('acquisitionPrice').optional().isNumeric()
  ],
  rateLimit.financial.transactions,
  // CRITICAL: SCA required for asset creation (calculate total value for threshold)
  createSCAMiddleware({
    forceForAmountAbove: 100, // €100 threshold for asset purchases
    customRiskThreshold: 0.5,
    allowedMethods: ['sms', 'totp', 'biometric']
  }),
  financialController.createAsset
);

/**
 * Net Worth Tracking Routes
 */

// GET /api/financial/net-worth - Get net worth evolution
router.get(
  '/net-worth',
  query('period').optional().isIn(['1m', '3m', '6m', '12m', 'all']),
  rateLimit.financial.reports, // Use report rate limiting for net worth data
  financialController.getNetWorthEvolution
);

// POST /api/financial/net-worth/snapshot - Create new net worth snapshot
router.post(
  '/net-worth/snapshot',
  rateLimit.financial.transactions, // Use transaction rate limiting for snapshot creation
  financialController.createNetWorthSnapshot
);

/**
 * Financial Goals Routes
 */

// GET /api/financial/goals - Get financial goals
router.get(
  '/goals',
  [
    query('status').optional().isIn(['active', 'completed', 'paused', 'all']),
    query('type').optional().isIn(['savings', 'debt_payoff', 'investment', 'emergency_fund'])
  ],
  rateLimit.financial.apiCalls, // Use API call rate limiting
  financialController.getFinancialGoals
);

// POST /api/financial/goals - Create financial goal
router.post(
  '/goals',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('type').isIn(['savings', 'debt_payoff', 'investment', 'emergency_fund']).withMessage('Invalid goal type'),
    body('targetAmount').isNumeric().withMessage('Target amount must be a number'),
    body('targetDate').optional().isISO8601(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('description').optional().isLength({ max: 500 })
  ],
  rateLimit.financial.transactions, // Use transaction rate limiting for goal creation
  financialController.createFinancialGoal
);

/**
 * Personal Finance Tracking Routes
 */

// GET /api/financial/summary - Get financial summary for dashboard
router.get(
  '/summary',
  query('lang').optional().isIn(['fr', 'en', 'es']),
  query('period').optional().isIn(['week', 'month', 'year', 'all']),
  rateLimit.standard, // Use standard rate limit
  financialController.getFinancialSummary
);

// GET /api/financial/expenses - Get expenses with filtering
router.get(
  '/expenses',
  [
    query('category').optional().isIn(['alimentation', 'transport', 'logement', 'loisirs', 'sante', 'habits', 'autres']),
    query('period').optional().isIn(['week', 'month', '3month', '6month', 'year', 'all']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  financialController.getExpenses
);

// POST /api/financial/expenses - Create new expense (SCA for high amounts)
router.post(
  '/expenses',
  [
    body('category').isIn(['alimentation', 'transport', 'logement', 'loisirs', 'sante', 'habits', 'autres']).withMessage('Invalid category'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('description').isLength({ min: 1, max: 200 }).withMessage('Description must be 1-200 characters'),
    body('subcategory').optional().isLength({ max: 50 }),
    body('merchant').optional().isLength({ max: 100 }),
    body('date').optional().isISO8601(),
    body('isRecurring').optional().isBoolean(),
    body('frequency').optional().isIn(['weekly', 'monthly', 'yearly']),
    body('paymentMethod').optional().isIn(['card', 'cash', 'transfer']),
    body('location').optional().isLength({ max: 200 }),
    body('tags').optional().isArray()
  ],
  rateLimit.standard,
  // CRITICAL: SCA for expenses above €30 (PSD2 threshold)
  createSCAMiddleware({
    forceForAmountAbove: 30, // €30 PSD2 threshold
    customRiskThreshold: 0.6,
    allowedMethods: ['sms', 'totp']
  }),
  financialController.createExpense
);

// PUT /api/financial/expenses/:id - Update expense
router.put(
  '/expenses/:id',
  [
    param('id').isLength({ min: 1 }).withMessage('Expense ID is required'),
    body('category').optional().isIn(['alimentation', 'transport', 'logement', 'loisirs', 'sante', 'habits', 'autres']),
    body('amount').optional().isNumeric(),
    body('description').optional().isLength({ min: 1, max: 200 }),
    body('subcategory').optional().isLength({ max: 50 }),
    body('merchant').optional().isLength({ max: 100 })
  ],
  financialController.updateExpense
);

// DELETE /api/financial/expenses/:id - Delete expense
router.delete(
  '/expenses/:id',
  param('id').isLength({ min: 1 }).withMessage('Expense ID is required'),
  financialController.deleteExpense
);

// GET /api/financial/income - Get income sources
router.get(
  '/income',
  query('includeInactive').optional().isBoolean(),
  financialController.getIncomeDetails
);

// GET /api/financial/suggestions - Get AI suggestions
router.get(
  '/suggestions',
  [
    query('lang').optional().isIn(['fr', 'en', 'es']),
    query('status').optional().isIn(['active', 'dismissed', 'completed', 'all']),
    query('type').optional().isIn(['expense_reduction', 'budget_optimization', 'savings_increase']),
    query('limit').optional().isInt({ min: 1, max: 20 })
  ],
  financialController.getFinancialSuggestions
);

// POST /api/financial/suggestions/dismiss/:id - Dismiss suggestion
router.post(
  '/suggestions/dismiss/:id',
  param('id').isLength({ min: 1 }).withMessage('Suggestion ID is required'),
  financialController.dismissSuggestion
);

// GET /api/financial/categories - Get expense categories
router.get(
  '/categories',
  query('lang').optional().isIn(['fr', 'en', 'es']),
  financialController.getExpenseCategories
);

// GET /api/financial/budget - Get budget plans
router.get(
  '/budget',
  [
    query('type').optional().isIn(['monthly', 'weekly', 'yearly', 'custom']),
    query('includeInactive').optional().isBoolean()
  ],
  financialController.getBudgetPlans
);

// POST /api/financial/budget - Create budget plan
router.post(
  '/budget',
  [
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('type').isIn(['monthly', 'weekly', 'yearly', 'custom']).withMessage('Invalid budget type'),
    body('totalBudget').isNumeric().withMessage('Total budget must be a number'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('endDate').isISO8601().withMessage('Invalid end date'),
    body('categories').isArray().withMessage('Categories must be an array'),
    body('alertThreshold').optional().isNumeric()
  ],
  rateLimit.strict, // Use strict rate limit
  financialController.createBudgetPlan
);

module.exports = router;
