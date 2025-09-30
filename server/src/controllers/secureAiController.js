/**
 * Secure AI Controller - Provider-Agnostic AI Integration
 *
 * This controller replaces the legacy aiController.js with secure,
 * provider-agnostic AI functionality. All data is sanitized and
 * anonymized before sending to external AI providers.
 */

const { validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');

// New secure AI services
const aiService = require('../services/ai/aiService');
const { ContextBuilderFactory } = require('../services/ai/contextBuilder');
const { validateAIRequest, validateUserContext } = require('../services/ai/aiValidator');
const aiRateLimit = require('../services/ai/aiRateLimit');

// Response helpers
const { createResponse, createErrorResponse } = require('../utils/responseHelper');

/**
 * Secure AI Controller with full PII protection and provider abstraction
 */
class SecureAiController {
  constructor() {
    this.supportedFeatures = {
      SUGGESTIONS: 'suggestions',
      ANALYSIS: 'analysis',
      CLASSIFICATION: 'classification',
      INSIGHTS: 'insights',
      RECOMMENDATIONS: 'recommendations',
      CHAT: 'chat'
    };

    this.featureCategories = {
      FINANCIAL: 'financial',
      NUTRITION: 'nutrition',
      LIFESTYLE: 'lifestyle',
      GENERAL: 'general'
    };
  }

  /**
   * Get personalized suggestions with secure context
   * Replaces: aiController.getSuggestions, getFoodSuggestions, etc.
   */
  async getSecureSuggestions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createErrorResponse(
          'Invalid request parameters',
          'VALIDATION_ERROR',
          { errors: errors.array() }
        ));
      }

      const userId = req.user.id;
      const { category = 'general', subCategory, limit = 5, lang = 'fr' } = req.query;

      // Validate category
      const validCategories = ['financial', 'nutrition', 'lifestyle', 'general'];
      if (!validCategories.includes(category)) {
        return res.status(400).json(createErrorResponse(
          'Invalid category',
          'INVALID_CATEGORY',
          { validCategories }
        ));
      }

      // Check AI availability
      if (!aiService.isAIEnabled()) {
        return this.handleDisabledAI(res, 'Suggestions temporarily unavailable');
      }

      // Rate limiting check
      await this.checkRateLimit(userId, 'suggestions');

      // Build secure context
      const contextOptions = {
        includeTransactions: category === 'financial',
        includeMeals: category === 'nutrition',
        includeActivities: category === 'lifestyle'
      };

      const context = await ContextBuilderFactory.buildContextForFeature(
        userId,
        category,
        contextOptions
      );

      // Create AI request
      const aiRequest = {
        type: 'suggestions',
        subtype: subCategory || 'general',
        data: {
          category,
          context,
          limit: Math.min(parseInt(limit), 10),
          language: lang
        },
        instructions: this.buildSuggestionPrompt(category, subCategory, lang)
      };

      // Validate request before processing
      const validation = validateAIRequest(aiRequest);
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Request validation failed',
          'VALIDATION_ERROR',
          { errors: validation.errors }
        ));
      }

      // Process with secure AI service
      const result = await aiService.generateResponse(validation.sanitized, {
        userId,
        isPremium: req.user.isPremium || false
      });

      if (!result.success) {
        return res.status(503).json(createErrorResponse(
          result.message || 'AI service unavailable',
          'AI_SERVICE_ERROR'
        ));
      }

      // Track analytics
      analyticsService.trackEvent('secure_ai_suggestions', userId, {
        category,
        subCategory,
        language: lang,
        resultCount: result.data?.suggestions?.length || 0,
        provider: result.metadata?.provider
      });

      res.json(createResponse({
        suggestions: result.data?.suggestions || [],
        category,
        language: lang,
        hasMore: false,
        metadata: {
          provider: result.metadata?.provider,
          contextVersion: context.version,
          sanitized: true
        }
      }, 'Suggestions generated successfully'));

    } catch (error) {
      logger.error('Secure suggestions request failed', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json(createErrorResponse(
        'Suggestions temporarily unavailable',
        'SERVICE_ERROR'
      ));
    }
  }

  /**
   * Analyze financial data with secure context
   * Replaces: aiController.analyzeUserData, analyzeSpendingPattern, etc.
   */
  async getSecureAnalysis(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createErrorResponse(
          'Invalid request parameters',
          'VALIDATION_ERROR',
          { errors: errors.array() }
        ));
      }

      const userId = req.user.id;
      const { analysisType = 'spending', timeframe = 'month', includeRecommendations = true } = req.body;

      // Check AI availability
      if (!aiService.isAIEnabled()) {
        return this.handleDisabledAI(res, 'Analysis temporarily unavailable');
      }

      // Rate limiting check
      await this.checkRateLimit(userId, 'analysis');

      // Build financial context
      const context = await ContextBuilderFactory.buildContextForFeature(
        userId,
        'financial',
        {
          includeTransactions: true,
          includeGoals: true,
          includeStats: true
        }
      );

      // Create AI request
      const aiRequest = {
        type: 'financial_analysis',
        subtype: analysisType,
        data: {
          timeframe,
          context,
          includeRecommendations: Boolean(includeRecommendations)
        },
        instructions: this.buildAnalysisPrompt(analysisType, timeframe)
      };

      // Validate and process
      const validation = validateAIRequest(aiRequest);
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Request validation failed',
          'VALIDATION_ERROR',
          { errors: validation.errors }
        ));
      }

      const result = await aiService.analyzeFinancialData(
        validation.sanitized.data,
        analysisType,
        { userId, isPremium: req.user.isPremium || false }
      );

      if (!result.success) {
        return res.status(503).json(createErrorResponse(
          result.message || 'Analysis service unavailable',
          'AI_SERVICE_ERROR'
        ));
      }

      // Track analytics
      analyticsService.trackEvent('secure_ai_analysis', userId, {
        analysisType,
        timeframe,
        provider: result.metadata?.provider,
        success: true
      });

      res.json(createResponse({
        analysis: result.data,
        analysisType,
        timeframe,
        metadata: {
          provider: result.metadata?.provider,
          contextVersion: context.version,
          sanitized: true
        }
      }, 'Analysis completed successfully'));

    } catch (error) {
      logger.error('Secure analysis request failed', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json(createErrorResponse(
        'Analysis temporarily unavailable',
        'SERVICE_ERROR'
      ));
    }
  }

  /**
   * Classify transactions with secure context
   * Replaces: Legacy transaction classification
   */
  async getSecureTransactionClassification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createErrorResponse(
          'Invalid request parameters',
          'VALIDATION_ERROR',
          { errors: errors.array() }
        ));
      }

      const userId = req.user.id;
      const { transactions } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json(createErrorResponse(
          'Transactions array is required',
          'INVALID_INPUT'
        ));
      }

      // Check AI availability
      if (!aiService.isAIEnabled()) {
        return this.handleDisabledAI(res, 'Classification temporarily unavailable');
      }

      // Rate limiting check
      await this.checkRateLimit(userId, 'classification');

      // Process each transaction
      const results = [];
      for (const transaction of transactions.slice(0, 10)) { // Limit to 10 transactions
        try {
          const result = await aiService.classifyTransaction(transaction, {
            userId,
            isPremium: req.user.isPremium || false
          });

          results.push({
            originalTransaction: {
              description: transaction.description?.substring(0, 50),
              amount: Math.round(Math.abs(transaction.amount || 0))
            },
            classification: result.success ? result.data : null,
            error: result.success ? null : result.message
          });
        } catch (error) {
          logger.warn('Transaction classification failed', {
            userId,
            error: error.message
          });

          results.push({
            originalTransaction: {
              description: transaction.description?.substring(0, 50),
              amount: Math.round(Math.abs(transaction.amount || 0))
            },
            classification: null,
            error: 'Classification failed'
          });
        }
      }

      // Track analytics
      analyticsService.trackEvent('secure_ai_classification', userId, {
        transactionCount: transactions.length,
        successfulClassifications: results.filter(r => r.classification).length,
        provider: aiService.getStatus().provider
      });

      res.json(createResponse({
        classifications: results,
        processedCount: results.length,
        successfulCount: results.filter(r => r.classification).length,
        metadata: {
          provider: aiService.getStatus().provider,
          sanitized: true
        }
      }, 'Transaction classification completed'));

    } catch (error) {
      logger.error('Secure classification request failed', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json(createErrorResponse(
        'Classification temporarily unavailable',
        'SERVICE_ERROR'
      ));
    }
  }

  /**
   * Process secure AI chat with context
   * Replaces: aiController.processAIChat
   */
  async processSecureAIChat(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(createErrorResponse(
          'Invalid request parameters',
          'VALIDATION_ERROR',
          { errors: errors.array() }
        ));
      }

      const userId = req.user.id;
      const { message, conversationId, contextType = 'general' } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json(createErrorResponse(
          'Message cannot be empty',
          'INVALID_INPUT'
        ));
      }

      if (message.length > 1000) {
        return res.status(400).json(createErrorResponse(
          'Message too long (max 1000 characters)',
          'MESSAGE_TOO_LONG'
        ));
      }

      // Check AI availability
      if (!aiService.isAIEnabled()) {
        return this.handleDisabledAI(res, 'Chat temporarily unavailable');
      }

      // Rate limiting check
      await this.checkRateLimit(userId, 'chat');

      // Build appropriate context based on type
      const context = await ContextBuilderFactory.buildContextForFeature(
        userId,
        contextType,
        { includeTransactions: contextType === 'financial' }
      );

      // Create AI request for chat
      const aiRequest = {
        type: 'chat',
        data: {
          message: message.trim(),
          conversationId: conversationId || `chat_${Date.now()}`,
          context,
          contextType
        },
        instructions: this.buildChatPrompt(contextType)
      };

      // Validate and process
      const validation = validateAIRequest(aiRequest);
      if (!validation.isValid) {
        return res.status(400).json(createErrorResponse(
          'Request validation failed',
          'VALIDATION_ERROR',
          { errors: validation.errors }
        ));
      }

      const result = await aiService.generateResponse(validation.sanitized, {
        userId,
        isPremium: req.user.isPremium || false
      });

      if (!result.success) {
        return res.status(503).json(createErrorResponse(
          result.message || 'Chat service unavailable',
          'AI_SERVICE_ERROR'
        ));
      }

      // Track analytics
      analyticsService.trackEvent('secure_ai_chat', userId, {
        messageLength: message.length,
        contextType,
        provider: result.metadata?.provider
      });

      res.json(createResponse({
        response: result.data?.response || 'I apologize, but I cannot process your request right now.',
        conversationId: aiRequest.data.conversationId,
        contextType,
        metadata: {
          provider: result.metadata?.provider,
          contextVersion: context.version,
          sanitized: true
        }
      }, 'Chat response generated successfully'));

    } catch (error) {
      logger.error('Secure chat request failed', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json(createErrorResponse(
        'Chat temporarily unavailable',
        'SERVICE_ERROR'
      ));
    }
  }

  /**
   * Get AI service status and capabilities
   */
  async getServiceStatus(req, res) {
    try {
      const status = aiService.getStatus();

      res.json(createResponse({
        enabled: status.enabled,
        provider: status.provider,
        ready: status.ready,
        features: status.enabled ? Object.values(this.supportedFeatures) : [],
        categories: Object.values(this.featureCategories),
        timestamp: new Date().toISOString()
      }, 'AI service status retrieved'));

    } catch (error) {
      logger.error('Failed to get AI status', { error: error.message });
      res.status(500).json(createErrorResponse('Failed to get AI status'));
    }
  }

  /**
   * Helper Methods
   */

  async checkRateLimit(userId, action) {
    try {
      await aiRateLimit.checkLimit(userId, action, 1000); // Default token estimate
    } catch (error) {
      throw new Error(`Rate limit exceeded: ${error.message}`);
    }
  }

  handleDisabledAI(res, message) {
    return res.status(503).json(createResponse({
      status: 'disabled',
      message,
      provider: 'none',
      enabled: false
    }, 'AI service status'));
  }

  buildSuggestionPrompt(category, subCategory, lang) {
    const langMap = {
      fr: 'français',
      en: 'English',
      es: 'español'
    };

    const language = langMap[lang] || 'français';

    const categoryPrompts = {
      financial: `Génère des suggestions d'économies financières personnalisées en ${language}.`,
      nutrition: `Génère des conseils nutritionnels et suggestions de repas économiques en ${language}.`,
      lifestyle: `Génère des suggestions d'activités et habitudes de vie économiques en ${language}.`,
      general: `Génère des conseils d'économies généraux en ${language}.`
    };

    return categoryPrompts[category] || categoryPrompts.general;
  }

  buildAnalysisPrompt(analysisType, timeframe) {
    const typePrompts = {
      spending: `Analyse les habitudes de dépenses sur la période ${timeframe} et fournis des insights actionnables.`,
      budget: `Analyse le budget et recommande des optimisations pour la période ${timeframe}.`,
      savings: `Analyse le potentiel d'épargne et recommande des stratégies d'économies.`,
      investment: `Analyse les opportunités d'investissement basées sur le profil financier.`
    };

    return typePrompts[analysisType] || typePrompts.spending;
  }

  buildChatPrompt(contextType) {
    const contextPrompts = {
      financial: 'Tu es un assistant financier qui aide avec les économies et la gestion budgétaire.',
      nutrition: 'Tu es un assistant nutritionnel qui aide avec l\'alimentation économique et saine.',
      lifestyle: 'Tu es un assistant lifestyle qui aide avec les habitudes et activités économiques.',
      general: 'Tu es un assistant d\'économies qui aide avec tous aspects de la vie économique.'
    };

    return contextPrompts[contextType] || contextPrompts.general;
  }
}

// Create singleton instance
const secureAiController = new SecureAiController();

// Export controller methods
module.exports = {
  // Main endpoints
  getSecureSuggestions: secureAiController.getSecureSuggestions.bind(secureAiController),
  getSecureAnalysis: secureAiController.getSecureAnalysis.bind(secureAiController),
  getSecureTransactionClassification: secureAiController.getSecureTransactionClassification.bind(secureAiController),
  processSecureAIChat: secureAiController.processSecureAIChat.bind(secureAiController),
  getServiceStatus: secureAiController.getServiceStatus.bind(secureAiController),

  // Convenience methods for backward compatibility
  getSuggestions: secureAiController.getSecureSuggestions.bind(secureAiController),
  getFoodSuggestions: (req, res) => {
    req.query.category = 'nutrition';
    req.query.subCategory = 'food';
    return secureAiController.getSecureSuggestions(req, res);
  },
  getHabitSuggestions: (req, res) => {
    req.query.category = 'lifestyle';
    req.query.subCategory = 'habits';
    return secureAiController.getSecureSuggestions(req, res);
  },
  getActivitySuggestions: (req, res) => {
    req.query.category = 'lifestyle';
    req.query.subCategory = 'activities';
    return secureAiController.getSecureSuggestions(req, res);
  },
  getTransportSuggestions: (req, res) => {
    req.query.category = 'lifestyle';
    req.query.subCategory = 'transport';
    return secureAiController.getSecureSuggestions(req, res);
  },

  // Analysis endpoints
  analyzeUserData: secureAiController.getSecureAnalysis.bind(secureAiController),
  analyzeSpendingPattern: (req, res) => {
    req.body.analysisType = 'spending';
    return secureAiController.getSecureAnalysis(req, res);
  },
  analyzeSavingsPotential: (req, res) => {
    req.body.analysisType = 'savings';
    return secureAiController.getSecureAnalysis(req, res);
  },

  // Chat endpoint
  processAIChat: secureAiController.processSecureAIChat.bind(secureAiController),

  // Status endpoint
  getAIServiceStatus: secureAiController.getServiceStatus.bind(secureAiController)
};