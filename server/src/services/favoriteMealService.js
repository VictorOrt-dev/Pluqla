/**
 * Favorite Meal Service
 *
 * Manages user's favorite meals for quick reuse in meal planning
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const analyticsService = require('./analyticsService');

/**
 * Add a meal to favorites
 */
async function addFavoriteMeal(userId, mealData) {
  try {
    const favoriteMeal = await prisma.favoriteMeal.create({
      data: {
        userId,
        mealName: mealData.mealName,
        servings: mealData.servings || 2,
        cookingTimeMin: mealData.cookingTimeMin,
        totalCostEur: mealData.totalCostEur,
        ingredients: JSON.stringify(mealData.ingredients),
        recipe: JSON.stringify(mealData.recipe),
        nutritionInfo: mealData.nutritionInfo ? JSON.stringify(mealData.nutritionInfo) : null,
        difficulty: mealData.difficulty || 'intermediate',
        cuisineType: mealData.cuisineType || null,
        mealType: mealData.mealType,
        tags: mealData.tags ? JSON.stringify(mealData.tags) : null,
        notes: mealData.notes || null
      }
    });

    logger.info('Meal added to favorites', {
      userId,
      favoriteMealId: favoriteMeal.id,
      mealName: favoriteMeal.mealName
    });

    // Track analytics
    analyticsService.trackUserAction(userId, 'meal_favorited', {
      favoriteMealId: favoriteMeal.id,
      mealName: favoriteMeal.mealName,
      mealType: favoriteMeal.mealType,
      cuisineType: favoriteMeal.cuisineType
    });

    return favoriteMeal;
  } catch (error) {
    logger.error('Failed to add favorite meal', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get user's favorite meals
 */
async function getUserFavoriteMeals(userId, options = {}) {
  try {
    const {
      mealType,
      cuisineType,
      limit = 50,
      offset = 0,
      sortBy = 'timesCooked' // timesCooked, lastCookedAt, createdAt
    } = options;

    const where = { userId };
    if (mealType) where.mealType = mealType;
    if (cuisineType) where.cuisineType = cuisineType;

    const orderBy = {};
    if (sortBy === 'timesCooked') {
      orderBy.timesCooked = 'desc';
    } else if (sortBy === 'lastCookedAt') {
      orderBy.lastCookedAt = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [meals, total] = await Promise.all([
      prisma.favoriteMeal.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.favoriteMeal.count({ where })
    ]);

    return {
      meals: meals.map(meal => ({
        ...meal,
        ingredients: JSON.parse(meal.ingredients),
        recipe: JSON.parse(meal.recipe),
        nutritionInfo: meal.nutritionInfo ? JSON.parse(meal.nutritionInfo) : null,
        tags: meal.tags ? JSON.parse(meal.tags) : []
      })),
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  } catch (error) {
    logger.error('Failed to get favorite meals', {
      userId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Remove meal from favorites
 */
async function removeFavoriteMeal(userId, favoriteMealId) {
  try {
    // Verify ownership
    const meal = await prisma.favoriteMeal.findFirst({
      where: {
        id: favoriteMealId,
        userId
      }
    });

    if (!meal) {
      throw new Error('Favorite meal not found or access denied');
    }

    await prisma.favoriteMeal.delete({
      where: { id: favoriteMealId }
    });

    logger.info('Meal removed from favorites', {
      userId,
      favoriteMealId,
      mealName: meal.mealName
    });

    // Track analytics
    analyticsService.trackUserAction(userId, 'meal_unfavorited', {
      favoriteMealId,
      mealName: meal.mealName
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to remove favorite meal', {
      userId,
      favoriteMealId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Increment times cooked for a favorite meal
 */
async function incrementTimesCooked(userId, favoriteMealId) {
  try {
    // Verify ownership
    const meal = await prisma.favoriteMeal.findFirst({
      where: {
        id: favoriteMealId,
        userId
      }
    });

    if (!meal) {
      throw new Error('Favorite meal not found or access denied');
    }

    const updatedMeal = await prisma.favoriteMeal.update({
      where: { id: favoriteMealId },
      data: {
        timesCooked: meal.timesCooked + 1,
        lastCookedAt: new Date()
      }
    });

    logger.info('Favorite meal cooked count updated', {
      userId,
      favoriteMealId,
      timesCooked: updatedMeal.timesCooked
    });

    return updatedMeal;
  } catch (error) {
    logger.error('Failed to update favorite meal cooked count', {
      userId,
      favoriteMealId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Create a planned meal from a favorite
 */
async function useFavoriteInPlan(userId, favoriteMealId, weeklyPlanId, dayOfWeek) {
  try {
    // Get the favorite meal
    const favoriteMeal = await prisma.favoriteMeal.findFirst({
      where: {
        id: favoriteMealId,
        userId
      }
    });

    if (!favoriteMeal) {
      throw new Error('Favorite meal not found or access denied');
    }

    // Verify weekly plan ownership
    const weeklyPlan = await prisma.weeklyMealPlan.findFirst({
      where: {
        id: weeklyPlanId,
        userId
      }
    });

    if (!weeklyPlan) {
      throw new Error('Weekly plan not found or access denied');
    }

    // Create planned meal from favorite
    const plannedMeal = await prisma.plannedMeal.create({
      data: {
        weeklyPlanId,
        dayOfWeek,
        mealType: favoriteMeal.mealType,
        mealName: favoriteMeal.mealName,
        servings: favoriteMeal.servings,
        cookingTimeMin: favoriteMeal.cookingTimeMin,
        totalCostEur: favoriteMeal.totalCostEur,
        ingredients: favoriteMeal.ingredients,
        recipe: favoriteMeal.recipe,
        nutritionInfo: favoriteMeal.nutritionInfo,
        difficulty: favoriteMeal.difficulty,
        cuisineType: favoriteMeal.cuisineType,
        tags: favoriteMeal.tags
      }
    });

    // Increment times cooked
    await incrementTimesCooked(userId, favoriteMealId);

    logger.info('Favorite meal added to plan', {
      userId,
      favoriteMealId,
      weeklyPlanId,
      plannedMealId: plannedMeal.id
    });

    // Track analytics
    analyticsService.trackUserAction(userId, 'favorite_meal_used_in_plan', {
      favoriteMealId,
      weeklyPlanId,
      dayOfWeek,
      mealType: favoriteMeal.mealType
    });

    return plannedMeal;
  } catch (error) {
    logger.error('Failed to use favorite in plan', {
      userId,
      favoriteMealId,
      weeklyPlanId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  addFavoriteMeal,
  getUserFavoriteMeals,
  removeFavoriteMeal,
  incrementTimesCooked,
  useFavoriteInPlan
};
