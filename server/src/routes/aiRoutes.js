/**
 * Provider-Agnostic AI Routes - Secure AI Integration Endpoints
 *
 * New AI system with provider abstraction, enhanced security, and rate limiting.
 * This replaces the legacy AI routes with a more secure and scalable architecture.
 *
 * All AI processing is done server-side with anonymized data.
 */

const express = require('express');
const router = express.Router();

// Middleware
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validateInput');
const securityMiddleware = require('../middleware/securityMiddleware');

// Joi validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    next();
  };
};

// AI Services
const aiService = require('../services/ai/aiService');
const { validateAIRequest, validateUserContext, AI_REQUEST_TYPES } = require('../services/ai/aiValidator');
const aiRateLimit = require('../services/ai/aiRateLimit');

// Utilities
const logger = require('../utils/logger');
const { createResponse, createErrorResponse } = require('../utils/responseHelper');

// Validation schemas
const Joi = require('joi');

const aiAnalysisSchema = Joi.object({
  data: Joi.object().required(),
  analysisType: Joi.string().valid(
    'spending_analysis',
    'budget_optimization',
    'risk_assessment',
    'investment_insights',
    'debt_analysis'
  ).required(),
  options: Joi.object({
    maxTokens: Joi.number().min(100).max(4000).optional(),
    temperature: Joi.number().min(0).max(1).optional()
  }).optional()
});

const transactionClassificationSchema = Joi.object({
  transaction: Joi.object({
    description: Joi.string().max(500).required(),
    amount: Joi.number().required(),
    merchant: Joi.string().max(200).optional(),
    date: Joi.date().optional(),
    currentCategory: Joi.string().max(100).optional()
  }).required(),
  options: Joi.object({
    maxTokens: Joi.number().min(100).max(1000).optional()
  }).optional()
});

const insightsSchema = Joi.object({
  financialSummary: Joi.object().required(),
  timeframe: Joi.string().valid('week', 'month', 'quarter', 'year').default('month'),
  includeRecommendations: Joi.boolean().default(true),
  options: Joi.object({
    maxTokens: Joi.number().min(100).max(4000).optional(),
    temperature: Joi.number().min(0).max(1).optional()
  }).optional()
});

const recommendationsSchema = Joi.object({
  spendingPattern: Joi.object().required(),
  goals: Joi.array().items(Joi.object()).optional(),
  constraints: Joi.object().optional(),
  options: Joi.object({
    maxTokens: Joi.number().min(100).max(4000).optional(),
    temperature: Joi.number().min(0).max(1).optional()
  }).optional()
});

/**
 * Middleware to check AI service availability
 */
const checkAIAvailability = (req, res, next) => {
  if (!aiService.isAIEnabled()) {
    const status = aiService.getStatus();
    return res.status(503).json(createResponse({
      status: 'disabled',
      message: 'AI features are currently disabled. Configure AI_PROVIDER to enable.',
      provider: status.provider,
      enabled: false
    }, 'AI service status'));
  }
  next();
};

/**
 * Enhanced rate limiting middleware for AI endpoints
 */
const aiRateLimitMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const requestType = req.route?.path || 'general';
    const estimatedTokens = req.body?.options?.maxTokens || 1000;

    await aiRateLimit.checkLimit(userId, requestType, estimatedTokens);
    next();
  } catch (error) {
    logger.warn('AI rate limit exceeded', {
      userId: req.user?.id,
      endpoint: req.path,
      error: error.message
    });

    return res.status(429).json(createErrorResponse(
      'Rate limit exceeded for AI requests',
      'RATE_LIMIT_EXCEEDED',
      {
        message: error.message,
        retryAfter: 3600 // 1 hour in seconds
      }
    ));
  }
};

/**
 * GET /api/ai-v2/status - Get AI service status
 * Public endpoint to check if AI is available
 */
router.get('/status', (req, res) => {
  try {
    const status = aiService.getStatus();

    res.json(createResponse({
      enabled: status.enabled,
      provider: status.provider,
      ready: status.ready,
      features: status.enabled ? [
        'financial_analysis',
        'transaction_classification',
        'financial_insights',
        'spending_recommendations'
      ] : [],
      timestamp: new Date().toISOString()
    }, 'AI service status retrieved'));

  } catch (error) {
    logger.error('Failed to get AI status', { error: error.message });
    res.status(500).json(createErrorResponse('Failed to get AI status'));
  }
});

/**
 * POST /api/ai-v2/analyze - Analyze financial data with AI
 * Requires authentication, validates input, applies rate limiting
 */
router.post('/analyze',
  authenticateToken,
  validateInput(aiAnalysisSchema),
  checkAIAvailability,
  aiRateLimitMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { data, analysisType, options = {} } = req.body;
      const userContext = {
        userId: req.user.id,
        email: req.user.email,
        isPremium: req.user.isPremium || false
      };

      // Validate request context
      const contextValidation = validateUserContext(userContext, { type: AI_REQUEST_TYPES.FINANCIAL_ANALYSIS });
      if (!contextValidation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid request context',
          'VALIDATION_ERROR',
          { errors: contextValidation.errors }
        ));
      }

      // Generate AI response
      const result = await aiService.analyzeFinancialData(data, analysisType, userContext);

      // Log successful request
      logger.info('AI financial analysis completed', {
        userId: req.user.id,
        analysisType,
        duration: Date.now() - startTime,
        success: result.success
      });

      if (result.success) {
        res.json(createResponse(result.data, 'Financial analysis completed', {
          provider: result.metadata?.provider,
          duration: Date.now() - startTime,
          usage: result.metadata?.usage
        }));
      } else {
        res.status(503).json(createErrorResponse(
          result.error || 'AI analysis failed',
          'AI_REQUEST_FAILED',
          { provider: result.metadata?.provider }
        ));
      }

    } catch (error) {
      logger.error('AI analysis request failed', {
        userId: req.user?.id,
        error: error.message,
        duration: Date.now() - startTime
      });

      res.status(500).json(createErrorResponse(
        'AI analysis temporarily unavailable',
        'AI_SERVICE_ERROR'
      ));
    }
  }
);

/**
 * POST /api/ai-v2/classify - Classify a transaction using AI
 * Requires authentication, validates input, applies rate limiting
 */
router.post('/classify',
  authenticateToken,
  validateInput(transactionClassificationSchema),
  checkAIAvailability,
  aiRateLimitMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { transaction, options = {} } = req.body;
      const userContext = {
        userId: req.user.id,
        email: req.user.email,
        isPremium: req.user.isPremium || false
      };

      // Validate request context
      const contextValidation = validateUserContext(userContext, { type: AI_REQUEST_TYPES.TRANSACTION_CLASSIFICATION });
      if (!contextValidation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid request context',
          'VALIDATION_ERROR',
          { errors: contextValidation.errors }
        ));
      }

      // Generate AI response
      const result = await aiService.classifyTransaction(transaction, userContext);

      // Log successful request
      logger.info('AI transaction classification completed', {
        userId: req.user.id,
        transactionAmount: transaction.amount,
        duration: Date.now() - startTime,
        success: result.success
      });

      if (result.success) {
        res.json(createResponse(result.data, 'Transaction classified', {
          provider: result.metadata?.provider,
          duration: Date.now() - startTime,
          usage: result.metadata?.usage
        }));
      } else {
        res.status(503).json(createErrorResponse(
          result.error || 'AI classification failed',
          'AI_REQUEST_FAILED',
          { provider: result.metadata?.provider }
        ));
      }

    } catch (error) {
      logger.error('AI classification request failed', {
        userId: req.user?.id,
        error: error.message,
        duration: Date.now() - startTime
      });

      res.status(500).json(createErrorResponse(
        'AI classification temporarily unavailable',
        'AI_SERVICE_ERROR'
      ));
    }
  }
);

/**
 * POST /api/ai-v2/insights - Generate financial insights using AI
 * Requires authentication, validates input, applies rate limiting
 */
router.post('/insights',
  authenticateToken,
  validateInput(insightsSchema),
  checkAIAvailability,
  aiRateLimitMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { financialSummary, timeframe, includeRecommendations, options = {} } = req.body;
      const userContext = {
        userId: req.user.id,
        email: req.user.email,
        isPremium: req.user.isPremium || false,
        timeframe,
        includeRecommendations
      };

      // Validate request context
      const contextValidation = validateUserContext(userContext, { type: AI_REQUEST_TYPES.FINANCIAL_INSIGHTS });
      if (!contextValidation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid request context',
          'VALIDATION_ERROR',
          { errors: contextValidation.errors }
        ));
      }

      // Generate AI response
      const result = await aiService.generateInsights(financialSummary, userContext);

      // Log successful request
      logger.info('AI financial insights completed', {
        userId: req.user.id,
        timeframe,
        duration: Date.now() - startTime,
        success: result.success
      });

      if (result.success) {
        res.json(createResponse(result.data, 'Financial insights generated', {
          provider: result.metadata?.provider,
          duration: Date.now() - startTime,
          usage: result.metadata?.usage
        }));
      } else {
        res.status(503).json(createErrorResponse(
          result.error || 'AI insights generation failed',
          'AI_REQUEST_FAILED',
          { provider: result.metadata?.provider }
        ));
      }

    } catch (error) {
      logger.error('AI insights request failed', {
        userId: req.user?.id,
        error: error.message,
        duration: Date.now() - startTime
      });

      res.status(500).json(createErrorResponse(
        'AI insights temporarily unavailable',
        'AI_SERVICE_ERROR'
      ));
    }
  }
);

/**
 * POST /api/ai-v2/recommendations - Generate spending recommendations using AI
 * Requires authentication, validates input, applies rate limiting
 */
router.post('/recommendations',
  authenticateToken,
  validateInput(recommendationsSchema),
  checkAIAvailability,
  aiRateLimitMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { spendingPattern, goals, constraints, options = {} } = req.body;
      const userContext = {
        userId: req.user.id,
        email: req.user.email,
        isPremium: req.user.isPremium || false,
        goals,
        constraints
      };

      // Validate request context
      const contextValidation = validateUserContext(userContext, { type: AI_REQUEST_TYPES.SPENDING_RECOMMENDATIONS });
      if (!contextValidation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Invalid request context',
          'VALIDATION_ERROR',
          { errors: contextValidation.errors }
        ));
      }

      // Generate AI response
      const result = await aiService.generateRecommendations(spendingPattern, goals, userContext);

      // Log successful request
      logger.info('AI spending recommendations completed', {
        userId: req.user.id,
        goalsCount: goals?.length || 0,
        duration: Date.now() - startTime,
        success: result.success
      });

      if (result.success) {
        res.json(createResponse(result.data, 'Spending recommendations generated', {
          provider: result.metadata?.provider,
          duration: Date.now() - startTime,
          usage: result.metadata?.usage
        }));
      } else {
        res.status(503).json(createErrorResponse(
          result.error || 'AI recommendations generation failed',
          'AI_REQUEST_FAILED',
          { provider: result.metadata?.provider }
        ));
      }

    } catch (error) {
      logger.error('AI recommendations request failed', {
        userId: req.user?.id,
        error: error.message,
        duration: Date.now() - startTime
      });

      res.status(500).json(createErrorResponse(
        'AI recommendations temporarily unavailable',
        'AI_SERVICE_ERROR'
      ));
    }
  }
);

/**
 * GET /api/ai-v2/health - Detailed AI service health check
 * Requires authentication to prevent information disclosure
 */
router.get('/health',
  authenticateToken,
  async (req, res) => {
    try {
      const health = await aiService.healthCheck();

      res.json(createResponse(health, 'AI service health check completed'));

    } catch (error) {
      logger.error('AI health check failed', { error: error.message });
      res.status(500).json(createErrorResponse('AI health check failed'));
    }
  }
);

/**
 * GET /api/ai-v2/limits - Get current rate limit status for user
 * Requires authentication
 */
router.get('/limits',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userTier = req.user.isPremium ? 'premium' : 'free';

      const limits = await aiRateLimit.getRemainingLimits(userId, userTier);

      res.json(createResponse(limits, 'Rate limit status retrieved'));

    } catch (error) {
      logger.error('Failed to get AI rate limits', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json(createErrorResponse('Failed to get rate limit status'));
    }
  }
);

/**
 * Error handling middleware for AI routes
 */
router.use((error, req, res, next) => {
  logger.error('AI route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  if (error.name === 'ValidationError') {
    return res.status(400).json(createErrorResponse(
      'Invalid request data',
      'VALIDATION_ERROR',
      { details: error.details }
    ));
  }

  if (error.message.includes('Rate limit exceeded')) {
    return res.status(429).json(createErrorResponse(
      'Too many AI requests',
      'RATE_LIMIT_EXCEEDED'
    ));
  }

  res.status(500).json(createErrorResponse(
    'AI service temporarily unavailable',
    'AI_SERVICE_ERROR'
  ));
});

module.exports = router;