const prisma = require('../lib/prismaClient');
const logger = require('../utils/logger');

/**
 * AI Usage Quota Service
 * Manages AI token consumption quotas for free and premium users
 *
 * Quota Limits:
 * - Free users: 50 tokens/day
 * - Premium users: 500 tokens/day
 * - Resets daily at midnight UTC
 */
class AIUsageService {
  constructor() {
    // Quota limits per user tier
    this.QUOTA_LIMITS = {
      free: 50,
      premium: 500
    };

    // Feature token costs (can be customized per feature)
    this.FEATURE_COSTS = {
      suggestions: 1,
      chat: 2,
      insights: 3,
      image_analysis: 5
    };

    // Warning threshold (80% of quota)
    this.WARNING_THRESHOLD = 0.8;
  }

  /**
   * Get next reset time (midnight UTC)
   * @returns {Date} Next reset timestamp
   */
  getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get current reset period start time (today midnight UTC)
   * @returns {Date} Current period start
   */
  getCurrentPeriodStart() {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now;
  }

  /**
   * Calculate daily quota based on user tier
   * @param {boolean} isPremium - Whether user is premium
   * @returns {number} Daily quota limit
   */
  getDailyQuota(isPremium) {
    return isPremium ? this.QUOTA_LIMITS.premium : this.QUOTA_LIMITS.free;
  }

  /**
   * Get token cost for a feature
   * @param {string} feature - Feature name
   * @returns {number} Token cost
   */
  getFeatureCost(feature) {
    return this.FEATURE_COSTS[feature] || 1;
  }

  /**
   * Check if user has quota available for a feature
   * @param {string} userId - User ID
   * @param {string} feature - Feature name (suggestions, chat, insights, image_analysis)
   * @returns {Promise<Object>} { allowed: boolean, remaining: number, quota: number, resetAt: Date, warning: boolean }
   */
  async checkQuota(userId, feature = 'suggestions') {
    try {
      // Get user to determine quota
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const dailyQuota = this.getDailyQuota(user.isPremium);
      const tokenCost = this.getFeatureCost(feature);
      const resetAt = this.getNextResetTime();
      const periodStart = this.getCurrentPeriodStart();

      // Get current period usage
      const usageRecords = await prisma.aiUsage.findMany({
        where: {
          userId,
          resetAt: {
            gte: periodStart
          }
        },
        select: {
          tokensUsed: true
        }
      });

      // Calculate total tokens used in current period
      const tokensUsedToday = usageRecords.reduce(
        (sum, record) => sum + record.tokensUsed,
        0
      );

      const remaining = Math.max(0, dailyQuota - tokensUsedToday);
      const allowed = remaining >= tokenCost;
      const warning = remaining <= dailyQuota * this.WARNING_THRESHOLD;

      logger.info('AI quota check', {
        userId,
        feature,
        tokensUsed: tokensUsedToday,
        remaining,
        quota: dailyQuota,
        allowed,
        isPremium: user.isPremium
      });

      return {
        allowed,
        remaining,
        quota: dailyQuota,
        resetAt,
        warning,
        tokensUsed: tokensUsedToday,
        tokenCost,
        isPremium: user.isPremium
      };
    } catch (error) {
      logger.error('Error checking AI quota:', error);
      throw error;
    }
  }

  /**
   * Consume tokens for an AI request
   * @param {string} userId - User ID
   * @param {string} feature - Feature name
   * @param {number} tokens - Number of tokens to consume (optional, defaults to feature cost)
   * @param {Object} metadata - Additional request metadata
   * @returns {Promise<Object>} Updated quota info
   */
  async consumeTokens(userId, feature = 'suggestions', tokens = null, metadata = {}) {
    try {
      // Check quota first
      const quotaCheck = await this.checkQuota(userId, feature);

      const tokensToConsume = tokens !== null ? tokens : quotaCheck.tokenCost;

      if (!quotaCheck.allowed) {
        // Record quota exceeded event
        await this.recordUsage(userId, feature, tokensToConsume, quotaCheck, metadata, true);

        return {
          success: false,
          exceeded: true,
          remaining: quotaCheck.remaining,
          quota: quotaCheck.quota,
          resetAt: quotaCheck.resetAt,
          message: `Daily quota exceeded. You have ${quotaCheck.remaining} tokens remaining. Quota resets at ${quotaCheck.resetAt.toISOString()}.`
        };
      }

      // Record usage
      const usage = await this.recordUsage(userId, feature, tokensToConsume, quotaCheck, metadata, false);

      const newRemaining = quotaCheck.remaining - tokensToConsume;
      const warning = newRemaining <= quotaCheck.quota * this.WARNING_THRESHOLD;

      logger.info('AI tokens consumed', {
        userId,
        feature,
        tokensConsumed: tokensToConsume,
        remaining: newRemaining,
        quota: quotaCheck.quota
      });

      return {
        success: true,
        exceeded: false,
        remaining: newRemaining,
        quota: quotaCheck.quota,
        resetAt: quotaCheck.resetAt,
        warning,
        usageId: usage.id
      };
    } catch (error) {
      logger.error('Error consuming AI tokens:', error);
      throw error;
    }
  }

  /**
   * Record AI usage in database
   * @private
   */
  async recordUsage(userId, feature, tokensUsed, quotaCheck, metadata, exceeded) {
    try {
      const usage = await prisma.aiUsage.create({
        data: {
          userId,
          feature,
          tokensUsed,
          tokensRemaining: quotaCheck.remaining - (exceeded ? 0 : tokensUsed),
          dailyQuota: quotaCheck.quota,
          quotaExceeded: exceeded,
          resetAt: quotaCheck.resetAt,
          requestMetadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress: metadata.ipAddress || null,
          userAgent: metadata.userAgent || null
        }
      });

      return usage;
    } catch (error) {
      logger.error('Error recording AI usage:', error);
      throw error;
    }
  }

  /**
   * Reset user quota (for testing or admin purposes)
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async resetQuota(userId) {
    try {
      const periodStart = this.getCurrentPeriodStart();

      // Delete all usage records for current period
      const deleted = await prisma.aiUsage.deleteMany({
        where: {
          userId,
          resetAt: {
            gte: periodStart
          }
        }
      });

      logger.info('AI quota reset', {
        userId,
        recordsDeleted: deleted.count
      });

      return {
        success: true,
        recordsDeleted: deleted.count,
        message: 'Quota reset successfully'
      };
    } catch (error) {
      logger.error('Error resetting AI quota:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for a user
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back (default: 7)
   * @returns {Promise<Object>} Usage statistics
   */
  async getUserStats(userId, days = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const records = await prisma.aiUsage.findMany({
        where: {
          userId,
          createdAt: {
            gte: since
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate statistics
      const totalTokens = records.reduce((sum, r) => sum + r.tokensUsed, 0);
      const byFeature = records.reduce((acc, r) => {
        acc[r.feature] = (acc[r.feature] || 0) + r.tokensUsed;
        return acc;
      }, {});

      const exceededCount = records.filter(r => r.quotaExceeded).length;

      return {
        period: { days, since },
        totalRequests: records.length,
        totalTokens,
        byFeature,
        quotaExceededCount: exceededCount,
        averageTokensPerDay: Math.round(totalTokens / days)
      };
    } catch (error) {
      logger.error('Error getting user AI stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup old usage records (older than 30 days)
   * @returns {Promise<number>} Number of records deleted
   */
  async cleanupOldRecords() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.aiUsage.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      logger.info('Cleaned up old AI usage records', {
        recordsDeleted: result.count
      });

      return result.count;
    } catch (error) {
      logger.error('Error cleaning up AI usage records:', error);
      throw error;
    }
  }
}

// Export singleton instance
const aiUsageService = new AIUsageService();

module.exports = {
  // Service instance
  aiUsageService,

  // Public methods
  checkQuota: aiUsageService.checkQuota.bind(aiUsageService),
  consumeTokens: aiUsageService.consumeTokens.bind(aiUsageService),
  resetQuota: aiUsageService.resetQuota.bind(aiUsageService),
  getUserStats: aiUsageService.getUserStats.bind(aiUsageService),
  cleanupOldRecords: aiUsageService.cleanupOldRecords.bind(aiUsageService),

  // Helper getters
  getDailyQuota: aiUsageService.getDailyQuota.bind(aiUsageService),
  getFeatureCost: aiUsageService.getFeatureCost.bind(aiUsageService),

  // Constants
  QUOTA_LIMITS: aiUsageService.QUOTA_LIMITS,
  FEATURE_COSTS: aiUsageService.FEATURE_COSTS
};
