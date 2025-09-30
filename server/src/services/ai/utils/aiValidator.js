/**
 * AI Request Validator
 *
 * Validates all inputs before sending to AI providers.
 * Enforces business rules, format validation, and security checks.
 *
 * Validation Rules:
 * - Required fields present
 * - Valid data types and formats
 * - Business logic constraints (amounts, dates, categories)
 * - Request size limits
 * - Rate limiting metadata
 *
 * @module aiValidator
 */

const logger = require('../../../utils/logger');

/**
 * Valid expense/transaction categories
 */
const VALID_CATEGORIES = [
  'alimentation',
  'habits',
  'activite',
  'deplacement',
  'logement',
  'transport',
  'loisirs',
  'sante',
  'education',
  'autres',
  'general',
];

/**
 * Valid AI request types
 */
const VALID_REQUEST_TYPES = [
  'suggestions',
  'analyze_spending',
  'analyze_savings',
  'classify_transaction',
  'chat',
  'insights',
  'recommendations',
];

/**
 * Validation error codes
 */
const ERROR_CODES = {
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_RANGE: 'INVALID_RANGE',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_REQUEST_TYPE: 'INVALID_REQUEST_TYPE',
  REQUEST_TOO_LARGE: 'REQUEST_TOO_LARGE',
  PII_DETECTED: 'PII_DETECTED',
  MALICIOUS_INPUT: 'MALICIOUS_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

/**
 * Request size limits (bytes)
 */
const SIZE_LIMITS = {
  MAX_REQUEST_SIZE: 1048576, // 1MB
  MAX_TRANSACTIONS: 1000,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_DESCRIPTION_LENGTH: 500,
};

class AIValidator {
  constructor() {
    this.logger = logger;
  }

  /**
   * Main validation method
   *
   * @param {Object} request - AI request to validate
   * @param {Object} userContext - User context for authorization
   * @returns {Object} Validation result { isValid, errors, warnings }
   */
  validate(request, userContext = {}) {
    const errors = [];
    const warnings = [];

    try {
      // 1. Basic structure validation
      if (!request || typeof request !== 'object') {
        errors.push({
          code: ERROR_CODES.INVALID_TYPE,
          message: 'Request must be an object',
          field: 'request'
        });
        return { isValid: false, errors, warnings };
      }

      // 2. Request type validation
      if (!request.type || !VALID_REQUEST_TYPES.includes(request.type)) {
        errors.push({
          code: ERROR_CODES.INVALID_REQUEST_TYPE,
          message: `Invalid request type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`,
          field: 'type',
          value: request.type
        });
      }

      // 3. Request size validation
      const requestSize = JSON.stringify(request).length;
      if (requestSize > SIZE_LIMITS.MAX_REQUEST_SIZE) {
        errors.push({
          code: ERROR_CODES.REQUEST_TOO_LARGE,
          message: `Request size ${requestSize} bytes exceeds limit of ${SIZE_LIMITS.MAX_REQUEST_SIZE} bytes`,
          field: 'request'
        });
      }

      // 4. Type-specific validation
      switch (request.type) {
        case 'suggestions':
          this._validateSuggestionsRequest(request, errors, warnings);
          break;
        case 'analyze_spending':
        case 'analyze_savings':
          this._validateAnalysisRequest(request, errors, warnings);
          break;
        case 'classify_transaction':
          this._validateClassificationRequest(request, errors, warnings);
          break;
        case 'chat':
          this._validateChatRequest(request, errors, warnings);
          break;
        case 'insights':
        case 'recommendations':
          this._validateInsightsRequest(request, errors, warnings);
          break;
      }

      // 5. User authorization validation
      this._validateUserAuthorization(request, userContext, errors, warnings);

      // 6. Malicious input detection
      this._detectMaliciousInput(request, errors, warnings);

      // 7. Log validation result
      if (errors.length > 0) {
        this.logger.warn('AI request validation failed', {
          requestType: request.type,
          errorCount: errors.length,
          warningCount: warnings.length,
          userId: userContext.userId
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('Validation error', {
        error: error.message,
        requestType: request.type
      });

      return {
        isValid: false,
        errors: [{
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed due to internal error',
          details: error.message
        }],
        warnings
      };
    }
  }

  /**
   * Validate suggestions request
   */
  _validateSuggestionsRequest(request, errors, warnings) {
    // Category validation
    if (request.category && !VALID_CATEGORIES.includes(request.category)) {
      errors.push({
        code: ERROR_CODES.INVALID_CATEGORY,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        field: 'category',
        value: request.category
      });
    }

    // Limit validation
    if (request.limit !== undefined) {
      if (typeof request.limit !== 'number' || request.limit < 1 || request.limit > 50) {
        errors.push({
          code: ERROR_CODES.INVALID_RANGE,
          message: 'Limit must be a number between 1 and 50',
          field: 'limit',
          value: request.limit
        });
      }
    }

    // User context validation
    if (request.userContext) {
      this._validateUserContextData(request.userContext, errors, warnings);
    }
  }

  /**
   * Validate analysis request (spending/savings)
   */
  _validateAnalysisRequest(request, errors, warnings) {
    // Transactions validation
    if (!request.transactions) {
      errors.push({
        code: ERROR_CODES.MISSING_FIELD,
        message: 'Transactions array is required for analysis',
        field: 'transactions'
      });
      return;
    }

    if (!Array.isArray(request.transactions)) {
      errors.push({
        code: ERROR_CODES.INVALID_TYPE,
        message: 'Transactions must be an array',
        field: 'transactions'
      });
      return;
    }

    if (request.transactions.length === 0) {
      warnings.push({
        code: 'EMPTY_TRANSACTIONS',
        message: 'Transactions array is empty - analysis may be limited',
        field: 'transactions'
      });
    }

    if (request.transactions.length > SIZE_LIMITS.MAX_TRANSACTIONS) {
      errors.push({
        code: ERROR_CODES.REQUEST_TOO_LARGE,
        message: `Too many transactions. Maximum ${SIZE_LIMITS.MAX_TRANSACTIONS} allowed`,
        field: 'transactions',
        value: request.transactions.length
      });
    }

    // Validate each transaction
    request.transactions.forEach((transaction, index) => {
      this._validateTransaction(transaction, errors, warnings, index);
    });

    // Date range validation
    if (request.startDate || request.endDate) {
      this._validateDateRange(request.startDate, request.endDate, errors, warnings);
    }
  }

  /**
   * Validate classification request
   */
  _validateClassificationRequest(request, errors, warnings) {
    if (!request.transaction) {
      errors.push({
        code: ERROR_CODES.MISSING_FIELD,
        message: 'Transaction object is required',
        field: 'transaction'
      });
      return;
    }

    this._validateTransaction(request.transaction, errors, warnings);
  }

  /**
   * Validate chat request
   */
  _validateChatRequest(request, errors, warnings) {
    // Message validation
    if (!request.message || typeof request.message !== 'string') {
      errors.push({
        code: ERROR_CODES.MISSING_FIELD,
        message: 'Message is required and must be a string',
        field: 'message'
      });
      return;
    }

    if (request.message.trim().length === 0) {
      errors.push({
        code: ERROR_CODES.INVALID_FORMAT,
        message: 'Message cannot be empty',
        field: 'message'
      });
    }

    if (request.message.length > SIZE_LIMITS.MAX_MESSAGE_LENGTH) {
      errors.push({
        code: ERROR_CODES.REQUEST_TOO_LARGE,
        message: `Message too long. Maximum ${SIZE_LIMITS.MAX_MESSAGE_LENGTH} characters`,
        field: 'message',
        value: request.message.length
      });
    }

    // Conversation ID validation
    if (request.conversationId && typeof request.conversationId !== 'string') {
      errors.push({
        code: ERROR_CODES.INVALID_TYPE,
        message: 'Conversation ID must be a string',
        field: 'conversationId'
      });
    }
  }

  /**
   * Validate insights/recommendations request
   */
  _validateInsightsRequest(request, errors, warnings) {
    // Financial summary validation
    if (request.financialSummary) {
      if (typeof request.financialSummary !== 'object') {
        errors.push({
          code: ERROR_CODES.INVALID_TYPE,
          message: 'Financial summary must be an object',
          field: 'financialSummary'
        });
      }
    }

    // Goals validation
    if (request.goals && !Array.isArray(request.goals)) {
      errors.push({
        code: ERROR_CODES.INVALID_TYPE,
        message: 'Goals must be an array',
        field: 'goals'
      });
    }
  }

  /**
   * Validate a single transaction object
   */
  _validateTransaction(transaction, errors, warnings, index = 0) {
    const prefix = index !== undefined ? `transactions[${index}]` : 'transaction';

    // Amount validation
    if (transaction.amount === undefined || transaction.amount === null) {
      errors.push({
        code: ERROR_CODES.MISSING_FIELD,
        message: 'Transaction amount is required',
        field: `${prefix}.amount`
      });
    } else if (typeof transaction.amount !== 'number') {
      errors.push({
        code: ERROR_CODES.INVALID_TYPE,
        message: 'Transaction amount must be a number',
        field: `${prefix}.amount`,
        value: transaction.amount
      });
    } else if (transaction.amount < 0 || transaction.amount > 1000000000) {
      errors.push({
        code: ERROR_CODES.INVALID_RANGE,
        message: 'Transaction amount must be between 0 and 1,000,000,000',
        field: `${prefix}.amount`,
        value: transaction.amount
      });
    }

    // Category validation
    if (transaction.category && !VALID_CATEGORIES.includes(transaction.category)) {
      warnings.push({
        code: 'INVALID_CATEGORY',
        message: `Unknown category: ${transaction.category}`,
        field: `${prefix}.category`,
        value: transaction.category
      });
    }

    // Date validation
    if (transaction.date) {
      if (!this._isValidDate(transaction.date)) {
        errors.push({
          code: ERROR_CODES.INVALID_FORMAT,
          message: 'Invalid date format. Use ISO 8601 (YYYY-MM-DD)',
          field: `${prefix}.date`,
          value: transaction.date
        });
      }
    }

    // Description validation
    if (transaction.description && transaction.description.length > SIZE_LIMITS.MAX_DESCRIPTION_LENGTH) {
      warnings.push({
        code: 'DESCRIPTION_TOO_LONG',
        message: `Description exceeds ${SIZE_LIMITS.MAX_DESCRIPTION_LENGTH} characters`,
        field: `${prefix}.description`
      });
    }
  }

  /**
   * Validate user context data
   */
  _validateUserContextData(userContext, errors, warnings) {
    // Monthly goal validation
    if (userContext.monthlyGoal !== undefined) {
      if (typeof userContext.monthlyGoal !== 'number' || userContext.monthlyGoal < 0) {
        errors.push({
          code: ERROR_CODES.INVALID_RANGE,
          message: 'Monthly goal must be a positive number',
          field: 'userContext.monthlyGoal',
          value: userContext.monthlyGoal
        });
      }
    }

    // Saved amount validation
    if (userContext.savedAmount !== undefined) {
      if (typeof userContext.savedAmount !== 'number' || userContext.savedAmount < 0) {
        errors.push({
          code: ERROR_CODES.INVALID_RANGE,
          message: 'Saved amount must be a positive number',
          field: 'userContext.savedAmount',
          value: userContext.savedAmount
        });
      }
    }
  }

  /**
   * Validate date range
   */
  _validateDateRange(startDate, endDate, errors, warnings) {
    if (startDate && !this._isValidDate(startDate)) {
      errors.push({
        code: ERROR_CODES.INVALID_FORMAT,
        message: 'Invalid start date format',
        field: 'startDate',
        value: startDate
      });
    }

    if (endDate && !this._isValidDate(endDate)) {
      errors.push({
        code: ERROR_CODES.INVALID_FORMAT,
        message: 'Invalid end date format',
        field: 'endDate',
        value: endDate
      });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        errors.push({
          code: ERROR_CODES.INVALID_RANGE,
          message: 'Start date must be before end date',
          field: 'dateRange'
        });
      }

      // Warn if range is too large (>2 years)
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
      if (daysDiff > 730) {
        warnings.push({
          code: 'LARGE_DATE_RANGE',
          message: 'Date range exceeds 2 years - analysis may be slow',
          field: 'dateRange'
        });
      }
    }
  }

  /**
   * Validate user authorization for request type
   */
  _validateUserAuthorization(request, userContext, errors, warnings) {
    // Premium-only features
    const premiumFeatures = ['analyze_savings', 'recommendations'];

    if (premiumFeatures.includes(request.type) && !userContext.isPremium) {
      errors.push({
        code: 'PREMIUM_REQUIRED',
        message: `Feature '${request.type}' requires premium subscription`,
        field: 'type'
      });
    }

    // Rate limit validation (if metadata provided)
    if (userContext.requestCount !== undefined && userContext.requestLimit !== undefined) {
      if (userContext.requestCount >= userContext.requestLimit) {
        errors.push({
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: `Rate limit exceeded: ${userContext.requestCount}/${userContext.requestLimit}`,
          field: 'rateLimit'
        });
      }
    }
  }

  /**
   * Detect malicious input patterns
   */
  _detectMaliciousInput(request, errors, warnings) {
    const requestStr = JSON.stringify(request).toLowerCase();

    // SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+.*\s+set/i,
      /--\s*$/,
      /\/\*.*\*\//,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(requestStr)) {
        errors.push({
          code: ERROR_CODES.MALICIOUS_INPUT,
          message: 'Potential SQL injection detected',
          field: 'request'
        });
        break;
      }
    }

    // Script injection patterns
    const scriptPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onclick\s*=/i,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(requestStr)) {
        errors.push({
          code: ERROR_CODES.MALICIOUS_INPUT,
          message: 'Potential script injection detected',
          field: 'request'
        });
        break;
      }
    }

    // Command injection patterns
    const commandPatterns = [
      /\$\(.*\)/,
      /`.*`/,
      /;\s*rm\s+-rf/i,
      /&&\s*cat/i,
    ];

    for (const pattern of commandPatterns) {
      if (pattern.test(requestStr)) {
        errors.push({
          code: ERROR_CODES.MALICIOUS_INPUT,
          message: 'Potential command injection detected',
          field: 'request'
        });
        break;
      }
    }
  }

  /**
   * Validate date format (ISO 8601)
   */
  _isValidDate(dateString) {
    if (typeof dateString !== 'string') return false;

    // Check ISO 8601 format
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (!isoDatePattern.test(dateString)) return false;

    // Check if date is valid
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Quick validation (for performance-critical paths)
   */
  quickValidate(request) {
    if (!request || !request.type) {
      return { isValid: false, error: 'Invalid request structure' };
    }

    if (!VALID_REQUEST_TYPES.includes(request.type)) {
      return { isValid: false, error: 'Invalid request type' };
    }

    return { isValid: true };
  }
}

// Export singleton instance
const validator = new AIValidator();

module.exports = {
  AIValidator,
  validator,
  ERROR_CODES,
  VALID_CATEGORIES,
  VALID_REQUEST_TYPES,
  SIZE_LIMITS,
};