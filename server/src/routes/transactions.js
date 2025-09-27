const express = require('express');
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const {
  validateTransactionCreate,
  validateTransactionUpdate,
  validateTransactionQuery,
  validateBulkTransactionCreate,
  validateTransactionAnalysis,
  validateTransactionDelete,
  validateSavingsGoalCreate,
  validateSavingsGoalUpdate,
  validateSavingsGoalDelete
} = require('../middleware/validation/transactionValidation');
const { validateDataExport } = require('../middleware/validation/userValidation');
const { param } = require('express-validator');
const { processValidationResults, sanitizeInputs, customValidators } = require('../middleware/validation/validationUtils');

// Simple validation for individual transaction ID
const validateTransactionId = [
  sanitizeInputs,
  param('id').custom(customValidators.isSecureUUID),
  processValidationResults
];

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Transaction CRUD routes with financial-grade rate limiting
router.get('/',
  rateLimit.financial.apiCalls, // General API rate limiting
  validateTransactionQuery,
  transactionController.getTransactions
);

router.get('/recent',
  rateLimit.financial.apiCalls, // General API rate limiting
  validateTransactionQuery, // Reuse query validation with optional limit
  transactionController.getRecentTransactions
);

router.get('/:id',
  rateLimit.financial.apiCalls, // General API rate limiting
  validateTransactionId,
  transactionController.getTransactionById
);

router.post('/',
  rateLimit.financial.transactionsBurst, // Burst handling for transaction creation
  validateTransactionCreate,
  transactionController.createTransaction
);

router.put('/:id',
  rateLimit.financial.transactions, // Standard transaction rate limiting
  validateTransactionUpdate,
  transactionController.updateTransaction
);

router.delete('/:id',
  rateLimit.financial.transactions, // Standard transaction rate limiting
  validateTransactionDelete,
  transactionController.deleteTransaction
);

// Transaction analytics routes with report-specific rate limiting
router.get('/stats/summary',
  rateLimit.financial.reports, // Report-specific rate limiting
  validateTransactionAnalysis,
  transactionController.getTransactionSummary
);

router.get('/stats/monthly',
  rateLimit.financial.reports, // Report-specific rate limiting
  validateTransactionAnalysis,
  transactionController.getMonthlyStats
);

router.get('/stats/category',
  rateLimit.financial.reports, // Report-specific rate limiting
  validateTransactionAnalysis,
  transactionController.getCategoryStats
);

// Data export route with multi-dimensional rate limiting
router.get('/reports/export',
  rateLimit.financial.reportsMulti, // Multi-dimensional limiting for exports
  validateDataExport,
  transactionController.exportTransactions
);

// Bulk transaction operations with multi-dimensional protection
router.post('/bulk',
  rateLimit.financial.transactionsMulti, // Multi-dimensional protection for bulk ops
  validateBulkTransactionCreate,
  transactionController.createBulkTransactions
);

// Savings goals routes with financial rate limiting
router.post('/goals',
  rateLimit.financial.transactions, // Use transaction limits for goal creation
  validateSavingsGoalCreate,
  transactionController.createSavingsGoal
);

router.get('/goals',
  rateLimit.financial.apiCalls, // General API rate limiting
  transactionController.getSavingsGoals
);

router.put('/goals/:id',
  rateLimit.financial.transactions, // Use transaction limits for goal updates
  validateSavingsGoalUpdate,
  transactionController.updateSavingsGoal
);

router.delete('/goals/:id',
  rateLimit.financial.transactions, // Use transaction limits for goal deletion
  validateSavingsGoalDelete,
  transactionController.deleteSavingsGoal
);

module.exports = router;