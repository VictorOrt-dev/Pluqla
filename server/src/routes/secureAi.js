/**
 * Secure AI Routes - Migration-Ready Endpoints
 *
 * These routes provide secure, provider-agnostic AI functionality
 * that will replace the legacy /api/ai/ endpoints.
 *
 * Migration Strategy:
 * 1. Deploy as /api/ai-secure/ endpoints alongside legacy
 * 2. Update frontend to use secure endpoints gradually
 * 3. Replace legacy /api/ai/ routes with these implementations
 * 4. Remove legacy endpoints after full migration
 */

const express = require('express');
const { body, query, param } = require('express-validator');

// Middleware
const { protect, requirePremium, requireAdmin } = require('../auth/betterAuth');
const rateLimit = require('../middleware/rateLimit');
const securityMiddleware = require('../middleware/securityMiddleware');
const { processValidationResults, sanitizeInputs, customValidators } = require('../middleware/validation/validationUtils');

// Controllers
const secureAiController = require('../controllers/secureAiController');

// Validation schemas for secure endpoints
const validateSecureSuggestions = [
  sanitizeInputs,
  query('category').optional().isIn(['financial', 'nutrition', 'lifestyle', 'general']).withMessage('Invalid category'),
  query('subCategory').optional().isLength({ max: 50 }).withMessage('Subcategory too long').custom(customValidators.isSafe),
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10'),
  query('lang').optional().isIn(['fr', 'en', 'es']).withMessage('Unsupported language'),
  processValidationResults
];

const validateSecureAnalysis = [
  sanitizeInputs,
  body('analysisType').optional().isIn(['spending', 'budget', 'savings', 'investment']).withMessage('Invalid analysis type'),
  body('timeframe').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid timeframe'),
  body('includeRecommendations').optional().isBoolean().withMessage('includeRecommendations must be boolean'),
  processValidationResults
];

const validateTransactionClassification = [
  sanitizeInputs,
  body('transactions').isArray({ min: 1, max: 10 }).withMessage('Must provide 1-10 transactions'),
  body('transactions.*.description').isLength({ min: 1, max: 500 }).withMessage('Description required (max 500 chars)').custom(customValidators.isSafe),
  body('transactions.*.amount').isNumeric().withMessage('Amount must be numeric'),
  body('transactions.*.merchant').optional().isLength({ max: 200 }).withMessage('Merchant name too long').custom(customValidators.isSafe),
  body('transactions.*.date').optional().isISO8601().withMessage('Invalid date format'),
  processValidationResults
];

const validateSecureChat = [
  sanitizeInputs,
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message required (max 1000 chars)').custom(customValidators.isSafe),
  body('conversationId').optional().custom(customValidators.isSecureUUID),
  body('contextType').optional().isIn(['financial', 'nutrition', 'lifestyle', 'general']).withMessage('Invalid context type'),
  processValidationResults
];

const router = express.Router();

/**
 * Public endpoints (no authentication required)
 */

// AI service status - public endpoint for health checks
router.get('/status', secureAiController.getServiceStatus);

/**
 * Authenticated endpoints
 * All endpoints below require Better Auth authentication and rate limiting
 */
router.use(protect);

/**
 * AI Suggestions Endpoints
 * Secure replacements for legacy suggestion endpoints
 */

// GET /api/ai-secure/suggestions - Universal suggestions endpoint
router.get('/suggestions',
  rateLimit.ai,
  validateSecureSuggestions,
  secureAiController.getSuggestions
);

// POST /api/ai-secure/suggestions - Same as GET but with POST for complex payloads
router.post('/suggestions',
  rateLimit.ai,
  validateSecureSuggestions,
  secureAiController.getSuggestions
);

// Category-specific suggestion endpoints for backward compatibility
router.post('/suggestions/financial',
  rateLimit.ai,
  validateSecureSuggestions,
  (req, res, next) => {
    req.query.category = 'financial';
    next();
  },
  secureAiController.getSuggestions
);

router.post('/suggestions/food',
  rateLimit.ai,
  validateSecureSuggestions,
  secureAiController.getFoodSuggestions
);

router.post('/suggestions/habits',
  rateLimit.ai,
  validateSecureSuggestions,
  secureAiController.getHabitSuggestions
);

router.post('/suggestions/activities',
  rateLimit.ai,
  validateSecureSuggestions,
  secureAiController.getActivitySuggestions
);

router.post('/suggestions/transport',
  rateLimit.ai,
  validateSecureSuggestions,
  secureAiController.getTransportSuggestions
);

/**
 * AI Analysis Endpoints
 * Secure replacements for legacy analysis endpoints
 */

// POST /api/ai-secure/analyze - Universal analysis endpoint
router.post('/analyze',
  rateLimit.ai,
  validateSecureAnalysis,
  secureAiController.analyzeUserData
);

// Specific analysis endpoints for backward compatibility
router.post('/analyze/spending',
  rateLimit.ai,
  validateSecureAnalysis,
  secureAiController.analyzeSpendingPattern
);

router.post('/analyze/savings',
  rateLimit.ai,
  validateSecureAnalysis,
  secureAiController.analyzeSavingsPotential
);

// Premium-only investment analysis
router.post('/analyze/investment',
  requirePremium,
  rateLimit.ai,
  validateSecureAnalysis,
  (req, res, next) => {
    req.body.analysisType = 'investment';
    next();
  },
  secureAiController.analyzeUserData
);

/**
 * AI Classification Endpoints
 */

// POST /api/ai-secure/classify/transactions - Transaction classification
router.post('/classify/transactions',
  rateLimit.ai,
  validateTransactionClassification,
  secureAiController.getSecureTransactionClassification
);

/**
 * AI Chat Endpoints
 */

// POST /api/ai-secure/chat - Secure AI chat with context
router.post('/chat',
  rateLimit.ai,
  validateSecureChat,
  secureAiController.processAIChat
);

/**
 * Migration Helper Endpoints
 * These endpoints help with gradual migration from legacy system
 */

// GET /api/ai-secure/migration/status - Check migration readiness
router.get('/migration/status',
  (req, res) => {
    const status = {
      secure_system_ready: true,
      legacy_endpoints: [
        '/api/ai/suggestions',
        '/api/ai/analyze',
        '/api/ai/chat'
      ],
      secure_endpoints: [
        '/api/ai-secure/suggestions',
        '/api/ai-secure/analyze',
        '/api/ai-secure/chat'
      ],
      migration_complete: false,
      recommendation: 'Ready to migrate legacy endpoints to secure system'
    };

    res.json({
      success: true,
      data: status,
      message: 'Migration status retrieved'
    });
  }
);

/**
 * Error Handling Middleware
 */
router.use((error, req, res, next) => {
  // Log error for debugging
  require('../utils/logger').error('Secure AI route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request data',
      code: 'VALIDATION_ERROR',
      details: error.details
    });
  }

  // Handle rate limiting errors
  if (error.message.includes('Rate limit exceeded')) {
    return res.status(429).json({
      success: false,
      error: 'Too many AI requests',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        message: error.message,
        retryAfter: 3600
      }
    });
  }

  // Handle AI service errors
  if (error.message.includes('AI service')) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable',
      code: 'AI_SERVICE_ERROR',
      details: {
        message: 'The AI service is currently experiencing issues. Please try again later.'
      }
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    error: 'AI service temporarily unavailable',
    code: 'SERVICE_ERROR',
    details: {
      message: 'An unexpected error occurred. Please try again later.'
    }
  });
});

module.exports = router;