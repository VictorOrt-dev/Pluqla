/**
 * AI Proxy Routes - Secure backend proxy for AI API calls
 * Keeps API keys safe on server-side only
 */

const express = require('express');

const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Proxy endpoint for AI chat completions
 * @route POST /api/ai-proxy/chat
 * @access Private
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const {
      prompt, model = 'gpt-3.5-turbo', maxTokens = 500, temperature = 0.7
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return sendError(res, 'Prompt is required', 400, 'missing_prompt');
    }

    if (prompt.length > 2000) {
      return sendError(res, 'Prompt too long (max 2000 characters)', 400, 'prompt_too_long');
    }

    // Log request for security monitoring
    logger.info('AI proxy request', {
      userId: req.user.id,
      promptLength: prompt.length,
      model,
      ip: req.ip
    });

    // Call AI service with server-side API keys
    const response = await aiService.generateResponse(prompt, {
      provider: 'openai',
      model,
      maxTokens,
      temperature
    });

    return sendSuccess(res, {
      response: response.text || response.content,
      model: response.model,
      usage: response.usage
    }, 'AI response generated successfully');
  } catch (error) {
    logger.error('AI proxy error', {
      userId: req.user?.id,
      errorMessage: error.message,
      errorName: error.name
    });

    if (error.message.includes('API key')) {
      return sendError(res, 'AI service configuration error', 500, 'ai_config_error');
    }

    if (error.message.includes('rate limit')) {
      return sendError(res, 'AI service rate limit exceeded', 429, 'rate_limit_exceeded');
    }

    return sendError(res, 'AI service temporarily unavailable', 500, 'ai_service_error');
  }
});

/**
 * Proxy endpoint for AI suggestions
 * @route POST /api/ai-proxy/suggestions
 * @access Private
 */
router.post('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { category, userProfile, limit = 5 } = req.body;

    if (!category) {
      return sendError(res, 'Category is required', 400, 'missing_category');
    }

    // Use existing AI service method
    const suggestions = await aiService.getSuggestions(category, userProfile, { limit });

    return sendSuccess(res, {
      suggestions,
      category,
      generated_at: new Date().toISOString()
    }, 'Suggestions generated successfully');
  } catch (error) {
    logger.error('AI suggestions proxy error', {
      userId: req.user?.id,
      category: req.body.category,
      errorMessage: error.message
    });

    return sendError(res, 'Unable to generate suggestions', 500, 'suggestions_error');
  }
});

/**
 * Health check for AI services
 * @route GET /api/ai-proxy/health
 * @access Private
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health = {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      status: 'operational',
      timestamp: new Date().toISOString()
    };

    return sendSuccess(res, health, 'AI services status');
  } catch (error) {
    logger.error('AI health check error', error);
    return sendError(res, 'Health check failed', 500, 'health_check_error');
  }
});

module.exports = router;
