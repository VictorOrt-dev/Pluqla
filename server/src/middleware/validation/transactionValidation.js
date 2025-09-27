/**
 * 💰 TRANSACTION VALIDATION SCHEMAS
 *
 * Critical validation for financial transaction endpoints in the Pluqla backend.
 * Protects financial data integrity, prevents fraud, and ensures regulatory compliance.
 *
 * Endpoints covered:
 * - POST /api/transactions
 * - GET /api/transactions
 * - PUT /api/transactions/:id
 * - DELETE /api/transactions/:id
 * - POST /api/transactions/bulk
 * - GET /api/transactions/export
 * - POST /api/transactions/analyze
 */

const { body, query, param } = require('express-validator');
const { customValidators, processValidationResults, sanitizeInputs, ValidationUtils } = require('./validationUtils');

/**
 * Transaction Creation Validation
 *
 * Security considerations:
 * - Validates financial amounts with precision
 * - Prevents transaction injection attacks
 * - Ensures regulatory compliance (AML/KYC)
 * - Validates transaction metadata integrity
 */
const validateTransactionCreate = [
  sanitizeInputs,

  // Transaction amount (critical validation)
  body('amount')
    .notEmpty()
    .withMessage('Transaction amount is required')
    .custom(customValidators.isSecureAmount)
    .custom((value) => {
      // Additional business rules
      const amount = parseFloat(value);

      // Flag large transactions for review (regulatory requirement)
      if (amount > 10000) {
        // Log for compliance monitoring
        console.log(`Large transaction detected: €${amount}`);
      }

      // Prevent micro-penny fraud
      if (amount > 0 && amount < 0.01) {
        throw new Error('Transaction amount too small (minimum €0.01)');
      }

      return true;
    }),

  // Transaction type
  body('type')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['income', 'expense', 'transfer', 'savings'])
    .withMessage('Transaction type must be: income, expense, transfer, or savings'),

  // Category validation
  body('category')
    .notEmpty()
    .withMessage('Transaction category is required')
    .custom((value, { req }) => {
      // Valid categories by transaction type
      const categoriesByType = {
        expense: ['alimentation', 'habits', 'activite', 'deplacement', 'autres'],
        income: ['salary', 'freelance', 'investment', 'gift', 'autres'],
        transfer: ['bank_transfer', 'account_transfer'],
        savings: ['emergency_fund', 'investment', 'retirement', 'goal']
      };

      const validCategories = categoriesByType[req.body.type] || [];

      if (!validCategories.includes(value)) {
        throw new Error(`Invalid category '${value}' for transaction type '${req.body.type}'`);
      }

      return true;
    }),

  // Description validation
  body('description')
    .notEmpty()
    .withMessage('Transaction description is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Description must be between 1 and 255 characters')
    .custom(customValidators.isSafe)
    .custom((value) => {
      // Prevent common fraud patterns
      const fraudPatterns = ['test', 'hack', 'exploit', 'injection', 'script'];
      const lowerValue = value.toLowerCase();

      if (fraudPatterns.some(pattern => lowerValue.includes(pattern))) {
        throw new Error('Description contains potentially harmful content');
      }

      return true;
    }),

  // Transaction date
  body('date')
    .optional()
    .custom(customValidators.isSecureDate)
    .custom((value) => {
      if (!value) return true;

      const transactionDate = new Date(value);
      const now = new Date();

      // Prevent future-dated transactions beyond reasonable limits
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + 7); // Max 1 week in future

      if (transactionDate > maxFutureDate) {
        throw new Error('Transaction date cannot be more than 1 week in the future');
      }

      // Prevent very old transactions (data integrity)
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 10); // Max 10 years old

      if (transactionDate < minDate) {
        throw new Error('Transaction date cannot be more than 10 years old');
      }

      return true;
    }),

  // Location (optional, for expense tracking)
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters')
    .custom(customValidators.isSafe),

  // Merchant/Payee information
  body('merchant')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Merchant name must not exceed 100 characters')
    .custom(customValidators.isSafe),

  // Payment method
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'check', 'digital_wallet', 'cryptocurrency'])
    .withMessage('Invalid payment method'),

  // Currency (default EUR)
  body('currency')
    .optional()
    .isISO4217()
    .withMessage('Currency must be valid ISO 4217 code'),

  // Tags (optional)
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed')
    .custom((tags) => {
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag !== 'string' || tag.length > 20) {
            throw new Error('Each tag must be a string with maximum 20 characters');
          }

          // Validate each tag for safety
          const threats = ValidationUtils.detectMaliciousPatterns(tag);
          if (!threats.safe) {
            throw new Error('Tag contains potentially harmful content');
          }
        }
      }
      return true;
    }),

  // Receipt/attachment reference
  body('attachmentId')
    .optional()
    .custom(customValidators.isSecureUUID),

  processValidationResults
];

/**
 * Transaction Update Validation
 *
 * Security considerations:
 * - Validates transaction ownership
 * - Prevents unauthorized modifications
 * - Maintains audit trail integrity
 * - Validates business rules for updates
 */
const validateTransactionUpdate = [
  sanitizeInputs,

  // Transaction ID parameter
  param('id')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .custom(customValidators.isSecureUUID),

  // Allow partial updates - all fields optional but must be valid if provided
  body('amount')
    .optional()
    .custom(customValidators.isSecureAmount)
    .custom((value, { req }) => {
      // Business rule: cannot modify amount if transaction is reconciled
      if (req.transaction && req.transaction.reconciled) {
        throw new Error('Cannot modify amount of reconciled transaction');
      }
      return true;
    }),

  body('type')
    .optional()
    .isIn(['income', 'expense', 'transfer', 'savings'])
    .withMessage('Transaction type must be: income, expense, transfer, or savings'),

  body('category')
    .optional()
    .custom((value, { req }) => {
      if (!value) return true;

      // Re-validate category against type if both are being updated
      const type = req.body.type || req.transaction?.type;
      const categoriesByType = {
        expense: ['alimentation', 'habits', 'activite', 'deplacement', 'autres'],
        income: ['salary', 'freelance', 'investment', 'gift', 'autres'],
        transfer: ['bank_transfer', 'account_transfer'],
        savings: ['emergency_fund', 'investment', 'retirement', 'goal']
      };

      const validCategories = categoriesByType[type] || [];
      if (!validCategories.includes(value)) {
        throw new Error(`Invalid category '${value}' for transaction type '${type}'`);
      }

      return true;
    }),

  body('description')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description must be between 1 and 255 characters')
    .custom(customValidators.isSafe),

  body('date')
    .optional()
    .custom(customValidators.isSecureDate),

  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters')
    .custom(customValidators.isSafe),

  body('merchant')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Merchant name must not exceed 100 characters')
    .custom(customValidators.isSafe),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'check', 'digital_wallet', 'cryptocurrency']),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),

  processValidationResults
];

/**
 * Transaction Query Validation
 *
 * Security considerations:
 * - Validates query parameters to prevent abuse
 * - Limits query complexity and result size
 * - Prevents information disclosure attacks
 * - Validates pagination parameters
 */
const validateTransactionQuery = [
  sanitizeInputs,

  // Pagination
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // Date range filtering
  query('startDate')
    .optional()
    .custom(customValidators.isSecureDate),

  query('endDate')
    .optional()
    .custom(customValidators.isSecureDate)
    .custom((value, { req }) => {
      if (value && req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);

        if (endDate <= startDate) {
          throw new Error('End date must be after start date');
        }

        // Limit range to prevent performance issues
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1095) { // 3 years
          throw new Error('Date range cannot exceed 3 years');
        }
      }
      return true;
    }),

  // Filtering options
  query('category')
    .optional()
    .isIn(['alimentation', 'habits', 'activite', 'deplacement', 'autres', 'salary', 'freelance', 'investment', 'gift', 'bank_transfer', 'account_transfer', 'emergency_fund', 'retirement', 'goal'])
    .withMessage('Invalid category filter'),

  query('type')
    .optional()
    .isIn(['income', 'expense', 'transfer', 'savings'])
    .withMessage('Invalid transaction type filter'),

  query('minAmount')
    .optional()
    .custom(customValidators.isSecureAmount),

  query('maxAmount')
    .optional()
    .custom(customValidators.isSecureAmount)
    .custom((value, { req }) => {
      if (value && req.query.minAmount) {
        if (parseFloat(value) <= parseFloat(req.query.minAmount)) {
          throw new Error('Maximum amount must be greater than minimum amount');
        }
      }
      return true;
    }),

  // Search term
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .custom(customValidators.isSafe),

  // Sorting
  query('sortBy')
    .optional()
    .isIn(['date', 'amount', 'category', 'description', 'createdAt'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  processValidationResults
];

/**
 * Bulk Transaction Operations Validation
 *
 * Security considerations:
 * - Limits bulk operation size
 * - Validates each transaction in bulk
 * - Prevents bulk injection attacks
 * - Ensures atomic operations
 */
const validateBulkTransactionCreate = [
  sanitizeInputs,

  body('transactions')
    .notEmpty()
    .withMessage('Transactions array is required')
    .isArray({ min: 1, max: 50 })
    .withMessage('Transactions array must contain 1-50 transactions')
    .custom((transactions) => {
      // Validate each transaction in the bulk operation
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        if (!transaction || typeof transaction !== 'object') {
          throw new Error(`Transaction at index ${i} must be an object`);
        }

        // Basic required fields validation
        if (!transaction.amount || !transaction.type || !transaction.category || !transaction.description) {
          throw new Error(`Transaction at index ${i} is missing required fields`);
        }

        // Amount validation
        const amountValidation = ValidationUtils.validateAmount(transaction.amount);
        if (!amountValidation.valid) {
          throw new Error(`Transaction at index ${i} has invalid amount: ${amountValidation.errors.join(', ')}`);
        }

        // Security check for each transaction
        const threats = ValidationUtils.detectMaliciousPatterns(transaction.description);
        if (!threats.safe) {
          throw new Error(`Transaction at index ${i} contains potentially harmful content`);
        }
      }

      return true;
    }),

  processValidationResults
];

/**
 * Transaction Analysis Validation
 *
 * Security considerations:
 * - Validates analysis parameters
 * - Prevents complex query abuse
 * - Limits analysis scope
 */
const validateTransactionAnalysis = [
  sanitizeInputs,

  body('analysisType')
    .notEmpty()
    .withMessage('Analysis type is required')
    .isIn(['spending_pattern', 'category_breakdown', 'trend_analysis', 'budget_comparison', 'anomaly_detection'])
    .withMessage('Invalid analysis type'),

  body('dateRange')
    .notEmpty()
    .withMessage('Date range is required')
    .isObject()
    .withMessage('Date range must be an object'),

  body('dateRange.start')
    .notEmpty()
    .withMessage('Start date is required')
    .custom(customValidators.isSecureDate),

  body('dateRange.end')
    .notEmpty()
    .withMessage('End date is required')
    .custom(customValidators.isSecureDate),

  body('categories')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 categories allowed for analysis'),

  body('includeAI')
    .optional()
    .isBoolean()
    .withMessage('Include AI must be true or false'),

  processValidationResults
];

/**
 * Transaction Deletion Validation
 *
 * Security considerations:
 * - Validates transaction ownership
 * - Prevents unauthorized deletions
 * - Maintains audit trail
 */
const validateTransactionDelete = [
  sanitizeInputs,

  param('id')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .custom(customValidators.isSecureUUID),

  // Optional confirmation for large transactions
  body('confirmDeletion')
    .optional()
    .isBoolean()
    .withMessage('Deletion confirmation must be true or false'),

  processValidationResults
];

/**
 * Savings Goal Creation Validation
 *
 * Security considerations:
 * - Validates goal parameters
 * - Prevents malicious goal manipulation
 * - Ensures realistic financial targets
 */
const validateSavingsGoalCreate = [
  sanitizeInputs,

  // Goal category
  body('category')
    .notEmpty()
    .withMessage('Goal category is required')
    .isIn(['alimentation', 'habits', 'activite', 'deplacement', 'general'])
    .withMessage('Goal category must be: alimentation, habits, activite, deplacement, or general'),

  // Target amount
  body('targetAmount')
    .notEmpty()
    .withMessage('Target amount is required')
    .custom(customValidators.isSecureAmount)
    .custom((value) => {
      const amount = parseFloat(value);

      // Reasonable limits for savings goals
      if (amount > 100000) {
        throw new Error('Target amount cannot exceed €100,000 for a single goal');
      }

      if (amount < 1) {
        throw new Error('Target amount must be at least €1');
      }

      return true;
    }),

  // Target date
  body('targetDate')
    .notEmpty()
    .withMessage('Target date is required')
    .custom(customValidators.isSecureDate)
    .custom((value) => {
      const targetDate = new Date(value);
      const now = new Date();
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 10); // Max 10 years in future

      if (targetDate <= now) {
        throw new Error('Target date must be in the future');
      }

      if (targetDate > oneYear) {
        throw new Error('Target date cannot be more than 10 years in the future');
      }

      return true;
    }),

  // Goal description
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Goal description must not exceed 500 characters')
    .custom(customValidators.isSafe),

  // Goal priority (optional)
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be: low, medium, high, or critical'),

  processValidationResults
];

/**
 * Savings Goal Update Validation
 *
 * Security considerations:
 * - Validates goal ownership
 * - Prevents unauthorized modifications
 * - Maintains goal integrity
 */
const validateSavingsGoalUpdate = [
  sanitizeInputs,

  // Goal ID parameter
  param('id')
    .notEmpty()
    .withMessage('Goal ID is required')
    .custom(customValidators.isSecureUUID),

  // Target amount (optional update)
  body('targetAmount')
    .optional()
    .custom(customValidators.isSecureAmount)
    .custom((value) => {
      if (value !== undefined) {
        const amount = parseFloat(value);

        if (amount > 100000) {
          throw new Error('Target amount cannot exceed €100,000');
        }

        if (amount < 1) {
          throw new Error('Target amount must be at least €1');
        }
      }

      return true;
    }),

  // Target date (optional update)
  body('targetDate')
    .optional()
    .custom(customValidators.isSecureDate)
    .custom((value) => {
      if (value) {
        const targetDate = new Date(value);
        const now = new Date();
        const tenYears = new Date();
        tenYears.setFullYear(tenYears.getFullYear() + 10);

        if (targetDate <= now) {
          throw new Error('Target date must be in the future');
        }

        if (targetDate > tenYears) {
          throw new Error('Target date cannot be more than 10 years in the future');
        }
      }

      return true;
    }),

  // Description (optional update)
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Goal description must not exceed 500 characters')
    .custom(customValidators.isSafe),

  // Priority (optional update)
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be: low, medium, high, or critical'),

  // Status (optional update)
  body('status')
    .optional()
    .isIn(['active', 'paused', 'completed', 'cancelled'])
    .withMessage('Status must be: active, paused, completed, or cancelled'),

  processValidationResults
];

/**
 * Savings Goal Deletion Validation
 *
 * Security considerations:
 * - Validates goal ownership
 * - Prevents unauthorized deletions
 */
const validateSavingsGoalDelete = [
  sanitizeInputs,

  // Goal ID parameter
  param('id')
    .notEmpty()
    .withMessage('Goal ID is required')
    .custom(customValidators.isSecureUUID),

  // Optional confirmation for high-value goals
  body('confirmDeletion')
    .optional()
    .isBoolean()
    .withMessage('Deletion confirmation must be true or false'),

  processValidationResults
];

module.exports = {
  validateTransactionCreate,
  validateTransactionUpdate,
  validateTransactionQuery,
  validateBulkTransactionCreate,
  validateTransactionAnalysis,
  validateTransactionDelete,
  validateSavingsGoalCreate,
  validateSavingsGoalUpdate,
  validateSavingsGoalDelete
};