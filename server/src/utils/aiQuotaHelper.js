const { consumeTokens } = require('../services/aiUsageService');
const logger = require('./logger');

/**
 * Helper function to consume AI tokens after successful request
 * @param {Object} req - Express request object
 * @param {string} feature - AI feature name
 * @param {number} tokens - Optional token count override
 * @returns {Promise<Object>} Consumption result
 */
async function consumeAITokens(req, feature, tokens = null) {
  try {
    if (!req.user || !req.user.id) {
      logger.warn('Cannot consume AI tokens: no user in request');
      return { success: false, error: 'No user' };
    }

    const metadata = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      category: req.body?.category || req.query?.category,
      language: req.body?.language || req.query?.lang || 'fr'
    };

    const result = await consumeTokens(req.user.id, feature, tokens, metadata);

    if (!result.success) {
      logger.warn('AI token consumption failed', {
        userId: req.user.id,
        feature,
        error: result.message
      });
    }

    return result;
  } catch (error) {
    logger.error('Error consuming AI tokens:', error);
    // Don't fail the request if token consumption fails
    return { success: false, error: error.message };
  }
}

/**
 * Middleware wrapper to automatically consume tokens after successful response
 * @param {string} feature - AI feature name
 * @param {number} tokens - Optional token count
 * @returns {Function} Express middleware
 */
function autoConsumeTokens(feature, tokens = null) {
  return async (req, res, next) => {
    // Wrap res.json to consume tokens on success
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      // Only consume tokens if response is successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await consumeAITokens(req, feature, tokens);
      }

      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  consumeAITokens,
  autoConsumeTokens
};
