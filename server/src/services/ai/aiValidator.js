/**
 * AI Request Validator
 *
 * Validates and sanitizes all AI requests to ensure they meet security
 * and compliance requirements before being processed.
 */

const Joi = require('joi');
const logger = require('../../utils/logger');

// Request type definitions
const AI_REQUEST_TYPES = {
  FINANCIAL_ANALYSIS: 'financial_analysis',
  TRANSACTION_CLASSIFICATION: 'transaction_classification',
  FINANCIAL_INSIGHTS: 'financial_insights',
  SPENDING_RECOMMENDATIONS: 'spending_recommendations',
  BUDGET_OPTIMIZATION: 'budget_optimization',
  RISK_ASSESSMENT: 'risk_assessment',
  INVESTMENT_INSIGHTS: 'investment_insights',
  DEBT_ANALYSIS: 'debt_analysis'
};

// Validation schemas for different request types
const schemas = {
  base: Joi.object({
    type: Joi.string().valid(...Object.values(AI_REQUEST_TYPES)).required(),
    subtype: Joi.string().optional(),
    instructions: Joi.string().max(2000).optional(),
    data: Joi.object().required(),
    options: Joi.object({
      maxTokens: Joi.number().min(100).max(4000).optional(),
      temperature: Joi.number().min(0).max(1).optional(),
      stream: Joi.boolean().optional()
    }).optional()
  }),

  financial_analysis: Joi.object({
    type: Joi.string().valid(AI_REQUEST_TYPES.FINANCIAL_ANALYSIS).required(),
    subtype: Joi.string().valid(
      'spending_analysis',
      'budget_optimization',
      'risk_assessment',
      'investment_insights',
      'debt_analysis'
    ).optional(),
    data: Joi.object({
      transactions: Joi.array().items(Joi.object({
        amount: Joi.number().required(),
        description: Joi.string().max(500).optional(),
        category: Joi.string().max(100).optional(),
        date: Joi.date().optional(),
        merchant: Joi.string().max(200).optional()
      })).max(1000).optional(),
      accounts: Joi.array().items(Joi.object({
        type: Joi.string().max(50),
        balance: Joi.number(),
        currency: Joi.string().length(3).optional()
      })).max(50).optional(),
      summary: Joi.object({
        totalIncome: Joi.number().optional(),
        totalExpenses: Joi.number().optional(),
        netWorth: Joi.number().optional(),
        savingsRate: Joi.number().min(0).max(1).optional()
      }).optional()
    }).required(),
    instructions: Joi.string().max(2000).optional()
  }),

  transaction_classification: Joi.object({
    type: Joi.string().valid(AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION).required(),
    data: Joi.object({
      description: Joi.string().max(500).required(),
      amount: Joi.number().required(),
      merchant: Joi.string().max(200).optional(),
      date: Joi.date().optional(),
      currentCategory: Joi.string().max(100).optional()
    }).required(),
    instructions: Joi.string().max(1000).optional()
  }),

  financial_insights: Joi.object({
    type: Joi.string().valid(AI_REQUEST_TYPES.FINANCIAL_INSIGHTS).required(),
    data: Joi.object({
      spendingByCategory: Joi.object().pattern(
        Joi.string().max(100),
        Joi.number().min(0)
      ).optional(),
      monthlyTrends: Joi.array().items(Joi.object({
        month: Joi.string().max(20),
        income: Joi.number().optional(),
        expenses: Joi.number().optional(),
        savings: Joi.number().optional()
      })).max(24).optional(),
      goals: Joi.array().items(Joi.object({
        type: Joi.string().max(100),
        target: Joi.number().optional(),
        current: Joi.number().optional(),
        deadline: Joi.date().optional()
      })).max(10).optional()
    }).required(),
    instructions: Joi.string().max(2000).optional()
  }),

  spending_recommendations: Joi.object({
    type: Joi.string().valid(AI_REQUEST_TYPES.SPENDING_RECOMMENDATIONS).required(),
    data: Joi.object({
      spendingPattern: Joi.object({
        categories: Joi.object().pattern(
          Joi.string().max(100),
          Joi.number().min(0)
        ).required(),
        trends: Joi.array().items(Joi.object({
          category: Joi.string().max(100),
          trend: Joi.string().valid('increasing', 'decreasing', 'stable'),
          percentage: Joi.number().min(-100).max(100)
        })).max(20).optional()
      }).required(),
      goals: Joi.array().items(Joi.object({
        type: Joi.string().max(100),
        target: Joi.number().min(0),
        priority: Joi.string().valid('high', 'medium', 'low').optional()
      })).max(10).optional(),
      constraints: Joi.object({
        budget: Joi.number().min(0).optional(),
        fixedExpenses: Joi.number().min(0).optional(),
        riskTolerance: Joi.string().valid('low', 'medium', 'high').optional()
      }).optional()
    }).required(),
    instructions: Joi.string().max(2000).optional()
  })
};

class AIValidator {
  constructor() {
    this.maxRequestSize = parseInt(process.env.AI_MAX_REQUEST_SIZE) || 1048576; // 1MB
    this.blockedPatterns = [
      // Patterns that should never be sent to AI
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
      /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/, // SSN
      /\b[A-Z]{2}\d{2}[-\s]?[A-Z0-9]{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{2}\b/i, // IBAN
      /\b\d{9,18}\b/, // Account numbers
      /\b(password|secret|key|token|api[_-]?key)\s*[:=]\s*[^\s]+/gi, // Credentials
    ];
  }

  /**
   * Main validation method for AI requests
   */
  validateAIRequest(request) {
    try {
      // Check request size
      const requestSize = JSON.stringify(request).length;
      if (requestSize > this.maxRequestSize) {
        return {
          isValid: false,
          errors: [`Request size (${requestSize} bytes) exceeds maximum allowed (${this.maxRequestSize} bytes)`]
        };
      }

      // Validate basic structure
      const baseValidation = schemas.base.validate(request, { abortEarly: false });
      if (baseValidation.error) {
        return {
          isValid: false,
          errors: baseValidation.error.details.map(detail => detail.message)
        };
      }

      // Validate specific request type
      const typeSpecificValidation = this.validateRequestType(request);
      if (!typeSpecificValidation.isValid) {
        return typeSpecificValidation;
      }

      // Check for blocked patterns
      const securityValidation = this.validateSecurity(request);
      if (!securityValidation.isValid) {
        return securityValidation;
      }

      // Check data size limits
      const dataSizeValidation = this.validateDataSize(request);
      if (!dataSizeValidation.isValid) {
        return dataSizeValidation;
      }

      logger.debug('AI request validation passed', {
        type: request.type,
        subtype: request.subtype,
        dataKeys: Object.keys(request.data || {}),
        requestSize
      });

      return {
        isValid: true,
        sanitized: this.sanitizeRequest(request)
      };

    } catch (error) {
      logger.error('AI request validation failed', {
        error: error.message,
        request: this.safeStringify(request)
      });

      return {
        isValid: false,
        errors: ['Invalid request format']
      };
    }
  }

  /**
   * Validate specific request type
   */
  validateRequestType(request) {
    const schema = schemas[request.type];
    if (!schema) {
      return {
        isValid: true // Use base validation for unknown types
      };
    }

    const validation = schema.validate(request, { abortEarly: false });
    if (validation.error) {
      return {
        isValid: false,
        errors: validation.error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }

  /**
   * Security validation - check for sensitive patterns
   */
  validateSecurity(request) {
    const requestString = JSON.stringify(request);
    const violations = [];

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(requestString)) {
        violations.push(`Potentially sensitive data detected: ${pattern.source}`);
      }
    }

    // Check for suspicious keywords
    const suspiciousKeywords = [
      'password', 'secret', 'private_key', 'api_key', 'token',
      'ssn', 'social_security', 'credit_card', 'debit_card',
      'account_number', 'routing_number', 'iban', 'swift'
    ];

    const lowerRequestString = requestString.toLowerCase();
    for (const keyword of suspiciousKeywords) {
      if (lowerRequestString.includes(keyword)) {
        violations.push(`Suspicious keyword detected: ${keyword}`);
      }
    }

    if (violations.length > 0) {
      logger.warn('AI request failed security validation', {
        violations,
        requestType: request.type
      });

      return {
        isValid: false,
        errors: ['Request contains potentially sensitive data that cannot be processed']
      };
    }

    return { isValid: true };
  }

  /**
   * Validate data size limits for different components
   */
  validateDataSize(request) {
    const errors = [];

    // Check transaction count limits
    if (request.data.transactions && Array.isArray(request.data.transactions)) {
      if (request.data.transactions.length > 1000) {
        errors.push('Too many transactions (max 1000 per request)');
      }
    }

    // Check account count limits
    if (request.data.accounts && Array.isArray(request.data.accounts)) {
      if (request.data.accounts.length > 50) {
        errors.push('Too many accounts (max 50 per request)');
      }
    }

    // Check string field lengths
    if (request.instructions && request.instructions.length > 2000) {
      errors.push('Instructions too long (max 2000 characters)');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }

    return { isValid: true };
  }

  /**
   * Sanitize request by removing/limiting certain fields
   */
  sanitizeRequest(request) {
    const sanitized = JSON.parse(JSON.stringify(request));

    // Limit instruction length
    if (sanitized.instructions && sanitized.instructions.length > 2000) {
      sanitized.instructions = sanitized.instructions.substring(0, 2000) + '...';
    }

    // Limit transaction descriptions
    if (sanitized.data.transactions && Array.isArray(sanitized.data.transactions)) {
      sanitized.data.transactions = sanitized.data.transactions.map(transaction => {
        if (transaction.description && transaction.description.length > 500) {
          transaction.description = transaction.description.substring(0, 500) + '...';
        }
        return transaction;
      });
    }

    // Add validation metadata
    sanitized._validation = {
      validated: true,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    return sanitized;
  }

  /**
   * Safe stringify for logging
   */
  safeStringify(obj) {
    try {
      return JSON.stringify(obj, null, 2).substring(0, 1000);
    } catch (error) {
      return '[Unstringifiable object]';
    }
  }

  /**
   * Validate user context for rate limiting and authorization
   */
  validateUserContext(userContext, request) {
    const errors = [];

    // Check if user is authenticated for sensitive requests
    const sensitiveTypes = [
      AI_REQUEST_TYPES.FINANCIAL_ANALYSIS,
      AI_REQUEST_TYPES.FINANCIAL_INSIGHTS,
      AI_REQUEST_TYPES.SPENDING_RECOMMENDATIONS
    ];

    if (sensitiveTypes.includes(request.type) && !userContext.userId) {
      errors.push('Authentication required for this request type');
    }

    // Check user permissions
    if (userContext.role && userContext.role === 'restricted') {
      errors.push('Insufficient permissions for AI features');
    }

    // Check user subscription level for premium features
    const premiumTypes = [
      AI_REQUEST_TYPES.INVESTMENT_INSIGHTS,
      AI_REQUEST_TYPES.DEBT_ANALYSIS
    ];

    if (premiumTypes.includes(request.type) && !userContext.isPremium) {
      errors.push('Premium subscription required for this feature');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton and utilities
const validator = new AIValidator();

module.exports = {
  validateAIRequest: (request) => validator.validateAIRequest(request),
  validateUserContext: (userContext, request) => validator.validateUserContext(userContext, request),
  AI_REQUEST_TYPES,
  AIValidator
};