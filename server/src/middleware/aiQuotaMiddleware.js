const { checkQuota } = require('../services/aiUsageService');
const logger = require('../utils/logger');

/**
 * AI Quota Middleware
 * Enforces AI usage quotas before allowing access to AI endpoints
 *
 * Usage:
 *   router.post('/suggestions', aiQuotaMiddleware('suggestions'), controller)
 *   router.post('/chat', aiQuotaMiddleware('chat'), controller)
 */

/**
 * Create AI quota middleware for a specific feature
 * @param {string} feature - Feature name (suggestions, chat, insights, image_analysis)
 * @returns {Function} Express middleware
 */
function aiQuotaMiddleware(feature = 'suggestions') {
  return async (req, res, next) => {
    try {
      // Skip quota check if user is not authenticated
      if (!req.user || !req.user.id) {
        logger.warn('AI quota middleware: No authenticated user', {
          path: req.path,
          feature
        });
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to use AI features'
        });
      }

      const userId = req.user.id;

      // Check quota
      const quotaCheck = await checkQuota(userId, feature);

      // Add quota info to request object for use in controllers
      req.aiQuota = quotaCheck;

      // If quota exceeded, block request
      if (!quotaCheck.allowed) {
        logger.warn('AI quota exceeded', {
          userId,
          feature,
          remaining: quotaCheck.remaining,
          quota: quotaCheck.quota,
          isPremium: quotaCheck.isPremium
        });

        return res.status(429).json({
          error: 'Quota exceeded',
          message: quotaCheck.isPremium
            ? `You have reached your daily premium quota of ${quotaCheck.quota} AI requests.`
            : `You have reached your daily free quota of ${quotaCheck.quota} AI requests. Upgrade to premium for ${quotaCheck.quota * 10}x more!`,
          details: {
            remaining: quotaCheck.remaining,
            quota: quotaCheck.quota,
            resetAt: quotaCheck.resetAt,
            isPremium: quotaCheck.isPremium,
            upgradeUrl: quotaCheck.isPremium ? null : '/premium'
          }
        });
      }

      // If warning threshold reached, add warning header
      if (quotaCheck.warning) {
        res.setHeader('X-AI-Quota-Warning', 'true');
        res.setHeader('X-AI-Quota-Remaining', quotaCheck.remaining.toString());
      }

      // Add quota headers for client info
      res.setHeader('X-AI-Quota-Limit', quotaCheck.quota.toString());
      res.setHeader('X-AI-Quota-Remaining', quotaCheck.remaining.toString());
      res.setHeader('X-AI-Quota-Reset', quotaCheck.resetAt.toISOString());

      logger.info('AI quota check passed', {
        userId,
        feature,
        remaining: quotaCheck.remaining,
        quota: quotaCheck.quota
      });

      next();
    } catch (error) {
      logger.error('AI quota middleware error:', error);

      // On error, allow request to proceed (fail open for better UX)
      // but log the error for investigation
      logger.error('AI quota check failed, allowing request to proceed', {
        userId: req.user?.id,
        feature,
        error: error.message
      });

      next();
    }
  };
}

/**
 * Optional middleware to add quota info to response
 * Adds quota details to the JSON response automatically
 */
function addQuotaToResponse() {
  return (req, res, next) => {
    // Wrap res.json to add quota info
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Only add quota if we have it and response is successful
      if (req.aiQuota && res.statusCode >= 200 && res.statusCode < 300) {
        data.quota = {
          remaining: req.aiQuota.remaining,
          limit: req.aiQuota.quota,
          resetAt: req.aiQuota.resetAt,
          warning: req.aiQuota.warning
        };
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Admin middleware to bypass quota checks
 * Use for admin/testing endpoints
 */
function bypassQuotaForAdmin() {
  return (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      logger.info('Bypassing AI quota for admin', {
        userId: req.user.id,
        path: req.path
      });

      // Set artificial quota that will always pass
      req.aiQuota = {
        allowed: true,
        remaining: 999999,
        quota: 999999,
        warning: false,
        bypass: true
      };
    }

    next();
  };
}

module.exports = {
  aiQuotaMiddleware,
  addQuotaToResponse,
  bypassQuotaForAdmin
};
