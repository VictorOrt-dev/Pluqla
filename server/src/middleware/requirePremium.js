/**
 * 🔒 PREMIUM TIER ENFORCEMENT MIDDLEWARE
 *
 * Protects routes requiring Premium subscription.
 * Returns 403 for Free users with upgrade prompt.
 *
 * Usage:
 *   router.post('/premium-feature', 
 *     authenticateToken,
 *     requirePremium({ feature: 'AI suggestions' }),
 *     controller.handle
 *   );
 *
 * Features:
 * - Checks subscriptionTier enum (FREE/PREMIUM/ENTERPRISE)
 * - Fallback to isPremium boolean for backward compatibility
 * - Admin bypass (configurable)
 * - Subscription expiration check
 * - Clear 403 JSON with upgrade URL and benefits list
 */

const logger = require('../utils/logger');

/**
 * Middleware to require Premium subscription
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowAdmin - Allow admins to bypass (default: true)
 * @param {string} options.feature - Feature name for logging and error messages
 * @returns {Function} Express middleware
 */
function requirePremium(options = {}) {
  const {
    allowAdmin = true,
    feature = 'this premium feature'
  } = options;

  return (req, res, next) => {
    // Check authentication first
    if (!req.user || !req.user.id) {
      logger.warn('Premium middleware: No authenticated user', {
        path: req.path,
        method: req.method,
        feature
      });

      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this feature',
        details: {
          loginUrl: '/login',
          signupUrl: '/register'
        }
      });
    }

    const user = req.user;

    // Admin bypass (if enabled)
    if (allowAdmin && user.role === 'admin') {
      logger.debug('Premium check bypassed for admin', {
        userId: user.id,
        email: user.email,
        feature,
        path: req.path
      });
      return next();
    }

    // Check subscription tier (new field) OR fallback to isPremium (backward compatibility)
    const isPremium = 
      user.subscriptionTier === 'PREMIUM' || 
      user.subscriptionTier === 'ENTERPRISE' ||
      user.isPremium === true;

    if (!isPremium) {
      logger.warn('Premium access denied for free user', {
        userId: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier || 'FREE',
        isPremium: user.isPremium,
        feature,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Premium subscription required',
        message: `Upgrade to premium to access ${feature}`,
        details: {
          feature,
          currentTier: user.subscriptionTier || (user.isPremium ? 'PREMIUM' : 'FREE'),
          requiredTier: 'PREMIUM',
          upgradeUrl: '/subscription',
          pricing: {
            monthly: '5€',
            currency: 'EUR'
          },
          benefits: [
            '500 AI requests per day (10x more)',
            'Transport route optimization',
            'Photo match analysis',
            'Premium meal planning',
            'Activity recommendations',
            'Advanced analytics & insights',
            'Priority customer support',
            'Enhanced privacy & security'
          ]
        }
      });
    }

    // Check if subscription expired (if end date exists)
    if (user.subscriptionEndDate) {
      const endDate = new Date(user.subscriptionEndDate);
      const now = new Date();

      if (now > endDate) {
        logger.warn('Premium subscription expired', {
          userId: user.id,
          email: user.email,
          subscriptionEndDate: user.subscriptionEndDate,
          feature
        });

        return res.status(403).json({
          error: 'Subscription expired',
          message: 'Your premium subscription has expired. Please renew to continue accessing premium features.',
          details: {
            expiredAt: user.subscriptionEndDate,
            daysExpired: Math.floor((now - endDate) / (1000 * 60 * 60 * 24)),
            upgradeUrl: '/subscription',
            renewUrl: '/subscription'
          }
        });
      }
    }

    // Premium check passed
    logger.info('Premium access granted', {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      feature,
      path: req.path
    });

    next();
  };
}

/**
 * Get user's premium status (utility function)
 * @param {Object} user - User object from req.user
 * @returns {Object} Premium status details
 */
function getPremiumStatus(user) {
  if (!user) {
    return {
      isPremium: false,
      tier: 'FREE',
      status: 'unauthenticated'
    };
  }

  const isPremium = 
    user.subscriptionTier === 'PREMIUM' || 
    user.subscriptionTier === 'ENTERPRISE' ||
    user.isPremium === true;

  let status = 'active';
  if (user.subscriptionEndDate && new Date() > new Date(user.subscriptionEndDate)) {
    status = 'expired';
  }

  return {
    isPremium,
    tier: user.subscriptionTier || (user.isPremium ? 'PREMIUM' : 'FREE'),
    status,
    startDate: user.subscriptionStartDate || null,
    endDate: user.subscriptionEndDate || null,
    isAdmin: user.role === 'admin'
  };
}

module.exports = {
  requirePremium,
  getPremiumStatus
};
