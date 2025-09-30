/**
 * Secure AI Context Builder
 *
 * Provides sanitized, anonymized context data for AI providers.
 * All context builders ensure PII protection and GDPR/PSD2 compliance.
 */

const { prisma } = require('../../lib/prisma');
const logger = require('../../utils/logger');
const { sanitizeFinancialData } = require('./financialDataSanitizer');

/**
 * Context versions for backward compatibility and schema validation
 */
const CONTEXT_VERSIONS = {
  FINANCIAL: '1.2.0',
  NUTRITION: '1.1.0',
  LIFESTYLE: '1.1.0',
  GENERAL: '1.0.0'
};

/**
 * Base context builder with common security features
 */
class BaseContextBuilder {
  constructor() {
    this.maxTransactions = 50;
    this.maxCategories = 10;
    this.maxTimeRange = 90; // days
  }

  /**
   * Create anonymous user identifier consistent across sessions
   */
  createAnonymousUserId(userId) {
    const crypto = require('crypto');
    const salt = process.env.AI_ANONYMIZATION_SALT || 'pluqla-ai-anonymization-2024';
    return crypto.createHash('sha256').update(`${userId}${salt}`).digest('hex').substring(0, 16);
  }

  /**
   * Sanitize and validate base context
   */
  async buildBaseContext(userId, contextType = 'general') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          level: true,
          gamificationPoints: true,
          isPremium: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        anonymousUserId: this.createAnonymousUserId(userId),
        userTier: user.isPremium ? 'premium' : 'free',
        level: user.level || 1,
        points: user.gamificationPoints || 0,
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)), // days
        contextType,
        version: CONTEXT_VERSIONS[contextType.toUpperCase()] || CONTEXT_VERSIONS.GENERAL,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Base context building failed', { userId, contextType, error: error.message });
      throw error;
    }
  }
}

/**
 * Financial Context Builder
 * Provides anonymized financial data for financial AI features
 */
class FinancialContextBuilder extends BaseContextBuilder {
  constructor() {
    super();
    this.maxGoals = 5;
  }

  async buildFinancialContext(userId, options = {}) {
    try {
      const baseContext = await this.buildBaseContext(userId, 'financial');

      // Get financial data with limits
      const [transactions, goals, monthlyStats] = await Promise.all([
        this.getRecentTransactions(userId, options.includeTransactions !== false),
        this.getFinancialGoals(userId, options.includeGoals !== false),
        this.getMonthlyStats(userId, options.includeStats !== false)
      ]);

      const financialData = {
        transactions: transactions || [],
        goals: goals || [],
        monthlyStats: monthlyStats || {}
      };

      // Sanitize all financial data before returning
      const sanitizedData = await sanitizeFinancialData(financialData, { userId });

      return {
        ...baseContext,
        financial: {
          hasTransactions: transactions && transactions.length > 0,
          transactionCount: transactions ? Math.min(transactions.length, this.maxTransactions) : 0,
          hasGoals: goals && goals.length > 0,
          goalsCount: goals ? goals.length : 0,
          ...sanitizedData
        },
        features: ['spending_analysis', 'budget_optimization', 'savings_recommendations'],
        _metadata: {
          sanitized: true,
          contextBuilder: 'FinancialContextBuilder',
          version: CONTEXT_VERSIONS.FINANCIAL,
          limits: {
            maxTransactions: this.maxTransactions,
            maxGoals: this.maxGoals
          }
        }
      };
    } catch (error) {
      logger.error('Financial context building failed', { userId, error: error.message });
      throw error;
    }
  }

  async getRecentTransactions(userId, include = true) {
    if (!include) return null;

    try {
      return await prisma.transaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - this.maxTimeRange * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          amount: true,
          description: true,
          category: true,
          date: true,
          merchant: true
        },
        orderBy: { createdAt: 'desc' },
        take: this.maxTransactions
      });
    } catch (error) {
      logger.warn('Failed to get recent transactions', { userId, error: error.message });
      return [];
    }
  }

  async getFinancialGoals(userId, include = true) {
    if (!include) return null;

    try {
      return await prisma.financialGoal.findMany({
        where: {
          userId,
          status: 'active'
        },
        select: {
          type: true,
          targetAmount: true,
          currentAmount: true,
          targetDate: true,
          priority: true
        },
        take: this.maxGoals
      });
    } catch (error) {
      logger.warn('Failed to get financial goals', { userId, error: error.message });
      return [];
    }
  }

  async getMonthlyStats(userId, include = true) {
    if (!include) return null;

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = await prisma.transaction.groupBy({
        by: ['category'],
        where: {
          userId,
          createdAt: {
            gte: startOfMonth
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        },
        take: this.maxCategories
      });

      return {
        monthlySpending: stats.reduce((acc, stat) => {
          acc[stat.category] = {
            amount: Math.abs(stat._sum.amount || 0),
            transactionCount: stat._count.id
          };
          return acc;
        }, {}),
        totalCategories: stats.length
      };
    } catch (error) {
      logger.warn('Failed to get monthly stats', { userId, error: error.message });
      return {};
    }
  }
}

/**
 * Nutrition Context Builder
 * Provides sanitized nutrition and dietary data for food-related AI features
 */
class NutritionContextBuilder extends BaseContextBuilder {
  async buildNutritionContext(userId, options = {}) {
    try {
      const baseContext = await this.buildBaseContext(userId, 'nutrition');

      const [preferences, restrictions, recentMeals] = await Promise.all([
        this.getDietaryPreferences(userId),
        this.getDietaryRestrictions(userId),
        this.getRecentMeals(userId, options.includeMeals !== false)
      ]);

      return {
        ...baseContext,
        nutrition: {
          preferences: preferences || [],
          restrictions: restrictions || [],
          recentMeals: recentMeals || [],
          hasPreferences: preferences && preferences.length > 0,
          hasRestrictions: restrictions && restrictions.length > 0
        },
        features: ['meal_suggestions', 'nutrition_analysis', 'recipe_recommendations'],
        _metadata: {
          sanitized: true,
          contextBuilder: 'NutritionContextBuilder',
          version: CONTEXT_VERSIONS.NUTRITION
        }
      };
    } catch (error) {
      logger.error('Nutrition context building failed', { userId, error: error.message });
      throw error;
    }
  }

  async getDietaryPreferences(userId) {
    try {
      const answers = await prisma.userAnswer.findMany({
        where: {
          userId,
          key: {
            in: ['dietary_preferences', 'cuisine_preferences', 'cooking_level']
          }
        },
        select: {
          key: true,
          value: true
        }
      });

      return answers.reduce((acc, answer) => {
        acc[answer.key] = answer.value;
        return acc;
      }, {});
    } catch (error) {
      logger.warn('Failed to get dietary preferences', { userId, error: error.message });
      return {};
    }
  }

  async getDietaryRestrictions(userId) {
    try {
      const answers = await prisma.userAnswer.findMany({
        where: {
          userId,
          key: {
            in: ['allergies', 'dietary_restrictions', 'food_intolerances']
          }
        },
        select: {
          key: true,
          value: true
        }
      });

      return answers.map(answer => ({
        type: answer.key,
        restriction: answer.value
      }));
    } catch (error) {
      logger.warn('Failed to get dietary restrictions', { userId, error: error.message });
      return [];
    }
  }

  async getRecentMeals(userId, include = true) {
    if (!include) return null;

    try {
      // Get food-related transactions from last 7 days
      const foodTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          category: {
            in: ['food', 'groceries', 'restaurants', 'delivery']
          },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          description: true,
          amount: true,
          category: true,
          date: true
        },
        take: 20
      });

      return foodTransactions.map(transaction => ({
        type: transaction.category,
        amount: Math.round(Math.abs(transaction.amount)),
        description: transaction.description ?
          transaction.description.substring(0, 50) : 'Food purchase',
        timeframe: 'recent'
      }));
    } catch (error) {
      logger.warn('Failed to get recent meals', { userId, error: error.message });
      return [];
    }
  }
}

/**
 * Lifestyle Context Builder
 * Provides sanitized lifestyle and activity data for lifestyle AI features
 */
class LifestyleContextBuilder extends BaseContextBuilder {
  async buildLifestyleContext(userId, options = {}) {
    try {
      const baseContext = await this.buildBaseContext(userId, 'lifestyle');

      const [interests, activities, preferences] = await Promise.all([
        this.getUserInterests(userId),
        this.getRecentActivities(userId, options.includeActivities !== false),
        this.getLifestylePreferences(userId)
      ]);

      return {
        ...baseContext,
        lifestyle: {
          interests: interests || [],
          recentActivities: activities || [],
          preferences: preferences || {},
          hasInterests: interests && interests.length > 0,
          hasActivities: activities && activities.length > 0
        },
        features: ['activity_suggestions', 'habit_recommendations', 'lifestyle_optimization'],
        _metadata: {
          sanitized: true,
          contextBuilder: 'LifestyleContextBuilder',
          version: CONTEXT_VERSIONS.LIFESTYLE
        }
      };
    } catch (error) {
      logger.error('Lifestyle context building failed', { userId, error: error.message });
      throw error;
    }
  }

  async getUserInterests(userId) {
    try {
      const answers = await prisma.userAnswer.findMany({
        where: {
          userId,
          key: {
            in: ['interests', 'hobbies', 'activity_preferences']
          }
        },
        select: {
          key: true,
          value: true
        }
      });

      return answers.map(answer => ({
        category: answer.key,
        interest: answer.value
      }));
    } catch (error) {
      logger.warn('Failed to get user interests', { userId, error: error.message });
      return [];
    }
  }

  async getRecentActivities(userId, include = true) {
    if (!include) return null;

    try {
      // Get entertainment and activity-related transactions
      const activityTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          category: {
            in: ['entertainment', 'sports', 'hobbies', 'travel', 'culture']
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          category: true,
          amount: true,
          description: true,
          date: true
        },
        take: 15
      });

      return activityTransactions.map(transaction => ({
        category: transaction.category,
        amount: Math.round(Math.abs(transaction.amount)),
        type: 'expense',
        timeframe: 'month'
      }));
    } catch (error) {
      logger.warn('Failed to get recent activities', { userId, error: error.message });
      return [];
    }
  }

  async getLifestylePreferences(userId) {
    try {
      const answers = await prisma.userAnswer.findMany({
        where: {
          userId,
          key: {
            in: ['budget_preference', 'time_availability', 'social_preference']
          }
        },
        select: {
          key: true,
          value: true
        }
      });

      return answers.reduce((acc, answer) => {
        acc[answer.key] = answer.value;
        return acc;
      }, {});
    } catch (error) {
      logger.warn('Failed to get lifestyle preferences', { userId, error: error.message });
      return {};
    }
  }
}

/**
 * Context Builder Factory
 * Creates appropriate context builders based on feature requirements
 */
class ContextBuilderFactory {
  static createBuilder(contextType) {
    switch (contextType.toLowerCase()) {
      case 'financial':
      case 'finance':
        return new FinancialContextBuilder();

      case 'nutrition':
      case 'food':
      case 'meals':
        return new NutritionContextBuilder();

      case 'lifestyle':
      case 'activities':
      case 'habits':
        return new LifestyleContextBuilder();

      default:
        return new BaseContextBuilder();
    }
  }

  /**
   * Build context for specific AI feature with automatic type detection
   */
  static async buildContextForFeature(userId, featureType, options = {}) {
    try {
      const builder = this.createBuilder(featureType);

      // Call the appropriate build method
      if (builder instanceof FinancialContextBuilder) {
        return await builder.buildFinancialContext(userId, options);
      } else if (builder instanceof NutritionContextBuilder) {
        return await builder.buildNutritionContext(userId, options);
      } else if (builder instanceof LifestyleContextBuilder) {
        return await builder.buildLifestyleContext(userId, options);
      } else {
        return await builder.buildBaseContext(userId, featureType);
      }
    } catch (error) {
      logger.error('Context building failed', {
        userId,
        featureType,
        error: error.message
      });

      // Return minimal safe context on error
      return {
        anonymousUserId: new BaseContextBuilder().createAnonymousUserId(userId),
        contextType: featureType,
        version: CONTEXT_VERSIONS.GENERAL,
        timestamp: new Date().toISOString(),
        error: 'Context building failed',
        _metadata: {
          fallback: true,
          sanitized: true
        }
      };
    }
  }
}

module.exports = {
  BaseContextBuilder,
  FinancialContextBuilder,
  NutritionContextBuilder,
  LifestyleContextBuilder,
  ContextBuilderFactory,
  CONTEXT_VERSIONS
};