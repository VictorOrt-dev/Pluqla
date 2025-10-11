/**
 * Meal Plan Sharing Service
 *
 * Handles sharing of weekly meal plans via links
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const crypto = require('crypto');
const analyticsService = require('./analyticsService');

/**
 * Generate unique share token
 */
function generateShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a shareable link for a weekly meal plan
 */
async function createShareLink(userId, weeklyPlanId, options = {}) {
  try {
    const {
      expiresInDays = null, // null = never expires
      allowCopy = true,
      isPublic = true
    } = options;

    // Verify plan ownership
    const weeklyPlan = await prisma.weeklyMealPlan.findFirst({
      where: {
        id: weeklyPlanId,
        userId
      }
    });

    if (!weeklyPlan) {
      throw new Error('Weekly plan not found or access denied');
    }

    // Check if already shared
    const existingShare = await prisma.sharedMealPlan.findFirst({
      where: {
        weeklyPlanId,
        userId
      }
    });

    if (existingShare) {
      // Return existing share link
      logger.info('Returning existing share link', {
        userId,
        weeklyPlanId,
        shareToken: existingShare.shareToken
      });

      return existingShare;
    }

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create share link
    const shareToken = generateShareToken();

    const sharedPlan = await prisma.sharedMealPlan.create({
      data: {
        userId,
        weeklyPlanId,
        shareToken,
        expiresAt,
        allowCopy,
        isPublic
      }
    });

    logger.info('Share link created', {
      userId,
      weeklyPlanId,
      shareToken: sharedPlan.shareToken,
      expiresAt
    });

    // Track analytics
    analyticsService.trackUserAction(userId, 'meal_plan_shared', {
      weeklyPlanId,
      shareToken: sharedPlan.shareToken,
      expiresInDays,
      allowCopy,
      isPublic
    });

    return sharedPlan;
  } catch (error) {
    logger.error('Failed to create share link', {
      userId,
      weeklyPlanId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get shared meal plan by token
 */
async function getSharedPlan(shareToken) {
  try {
    const sharedPlan = await prisma.sharedMealPlan.findUnique({
      where: { shareToken },
      include: {
        weeklyPlan: {
          include: {
            meals: true,
            groceryLists: {
              include: {
                items: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!sharedPlan) {
      throw new Error('Shared plan not found');
    }

    // Check if expired
    if (sharedPlan.expiresAt && new Date() > sharedPlan.expiresAt) {
      throw new Error('Share link has expired');
    }

    // Increment view count
    await prisma.sharedMealPlan.update({
      where: { shareToken },
      data: {
        viewCount: sharedPlan.viewCount + 1,
        lastViewedAt: new Date()
      }
    });

    logger.info('Shared plan viewed', {
      shareToken,
      weeklyPlanId: sharedPlan.weeklyPlanId,
      viewCount: sharedPlan.viewCount + 1
    });

    // Format response
    return {
      ...sharedPlan,
      weeklyPlan: {
        ...sharedPlan.weeklyPlan,
        meals: sharedPlan.weeklyPlan.meals.map(meal => ({
          ...meal,
          ingredients: JSON.parse(meal.ingredients),
          recipe: JSON.parse(meal.recipe),
          nutritionInfo: meal.nutritionInfo ? JSON.parse(meal.nutritionInfo) : null,
          tags: meal.tags ? JSON.parse(meal.tags) : []
        }))
      }
    };
  } catch (error) {
    logger.error('Failed to get shared plan', {
      shareToken,
      error: error.message
    });
    throw error;
  }
}

/**
 * Copy shared plan to user's account
 */
async function copySharedPlan(shareToken, targetUserId) {
  try {
    const sharedPlan = await getSharedPlan(shareToken);

    if (!sharedPlan.allowCopy) {
      throw new Error('This plan does not allow copying');
    }

    const originalPlan = sharedPlan.weeklyPlan;

    // Create new plan for target user
    const newPlan = await prisma.weeklyMealPlan.create({
      data: {
        userId: targetUserId,
        weekStartDate: new Date(), // Start from today
        weekEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        status: 'draft',
        totalBudget: originalPlan.totalBudget,
        actualCost: originalPlan.actualCost,
        mealsCount: originalPlan.mealsCount,
        planHash: crypto.randomBytes(16).toString('hex'),
        generatedBy: 'copied'
      }
    });

    // Copy meals
    const copiedMeals = await Promise.all(
      originalPlan.meals.map(meal =>
        prisma.plannedMeal.create({
          data: {
            weeklyPlanId: newPlan.id,
            dayOfWeek: meal.dayOfWeek,
            mealType: meal.mealType,
            mealName: meal.mealName,
            servings: meal.servings,
            cookingTimeMin: meal.cookingTimeMin,
            totalCostEur: meal.totalCostEur,
            ingredients: meal.ingredients,
            recipe: meal.recipe,
            nutritionInfo: meal.nutritionInfo,
            difficulty: meal.difficulty,
            cuisineType: meal.cuisineType,
            tags: meal.tags
          }
        })
      )
    );

    logger.info('Shared plan copied', {
      shareToken,
      originalPlanId: originalPlan.id,
      newPlanId: newPlan.id,
      targetUserId,
      mealsCount: copiedMeals.length
    });

    // Track analytics
    analyticsService.trackUserAction(targetUserId, 'meal_plan_copied_from_share', {
      shareToken,
      originalPlanId: originalPlan.id,
      newPlanId: newPlan.id,
      mealsCount: copiedMeals.length
    });

    return {
      ...newPlan,
      meals: copiedMeals
    };
  } catch (error) {
    logger.error('Failed to copy shared plan', {
      shareToken,
      targetUserId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete/revoke share link
 */
async function revokeShareLink(userId, shareToken) {
  try {
    const sharedPlan = await prisma.sharedMealPlan.findFirst({
      where: {
        shareToken,
        userId
      }
    });

    if (!sharedPlan) {
      throw new Error('Share link not found or access denied');
    }

    await prisma.sharedMealPlan.delete({
      where: { shareToken }
    });

    logger.info('Share link revoked', {
      userId,
      shareToken,
      weeklyPlanId: sharedPlan.weeklyPlanId
    });

    // Track analytics
    analyticsService.trackUserAction(userId, 'meal_plan_share_revoked', {
      shareToken,
      weeklyPlanId: sharedPlan.weeklyPlanId,
      viewCount: sharedPlan.viewCount
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to revoke share link', {
      userId,
      shareToken,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's shared plans
 */
async function getUserSharedPlans(userId) {
  try {
    const sharedPlans = await prisma.sharedMealPlan.findMany({
      where: { userId },
      include: {
        weeklyPlan: {
          select: {
            id: true,
            weekStartDate: true,
            weekEndDate: true,
            mealsCount: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return sharedPlans;
  } catch (error) {
    logger.error('Failed to get user shared plans', {
      userId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  createShareLink,
  getSharedPlan,
  copySharedPlan,
  revokeShareLink,
  getUserSharedPlans
};
