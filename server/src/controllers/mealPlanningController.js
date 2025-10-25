/**
 * Meal Planning Controller
 *
 * Handles HTTP requests for meal planning features
 */

const mealPlanningService = require('../services/mealPlanningService');
const {
  saveUserMealPreferences,
  getUserMealPreferences,
  generateWeeklyMealPlan,
  getUserWeeklyMealPlans,
  updateGroceryItem,
  swapPlannedMeal,
  generateGroceryList
} = mealPlanningService;
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * POST /api/meal-planning/preferences
 * Save user meal preferences
 */
async function savePreferences(req, res) {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const result = await saveUserMealPreferences(userId, preferences);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Meal preferences saved successfully'
    });

  } catch (error) {
    logger.error('Error saving meal preferences', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/meal-planning/preferences
 * Get user meal preferences
 */
async function getPreferences(req, res) {
  try {
    const userId = req.user.id;

    const preferences = await getUserMealPreferences(userId);

    if (!preferences) {
      return res.status(404).json({
        success: false,
        error: 'No preferences found. Please complete onboarding first.'
      });
    }

    res.status(200).json({
      success: true,
      data: preferences
    });

  } catch (error) {
    logger.error('Error getting meal preferences', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/meal-planning/weekly-plan
 * Generate weekly meal plan
 */
async function createWeeklyPlan(req, res) {
  try {
    const userId = req.user.id;
    const { weekStartDate, allowDuplicate } = req.body;

    const result = await generateWeeklyMealPlan(userId, {
      weekStartDate,
      allowDuplicate
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Weekly meal plan generated successfully'
    });

  } catch (error) {
    logger.error('Error generating weekly meal plan', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/meal-planning/weekly-plans
 * Get user's weekly meal plans
 */
async function getWeeklyPlans(req, res) {
  try {
    const userId = req.user.id;
    const { status, limit, offset } = req.query;

    const result = await getUserWeeklyMealPlans(userId, {
      status,
      limit: limit ? parseInt(limit) : 10,
      offset: offset ? parseInt(offset) : 0
    });

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error getting weekly meal plans', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * PATCH /api/meal-planning/grocery-items/:itemId
 * Update grocery item (check/uncheck, add cost, notes)
 */
async function updateGroceryItemStatus(req, res) {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const updates = req.body;

    const result = await updateGroceryItem(itemId, userId, updates);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Grocery item updated successfully'
    });

  } catch (error) {
    logger.error('Error updating grocery item', {
      userId: req.user?.id,
      itemId: req.params?.itemId,
      error: error.message
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * PATCH /api/meal-planning/meals/:mealId
 * Update planned meal (mark as cooked, add rating, notes)
 */
async function updatePlannedMeal(req, res) {
  try {
    const userId = req.user.id;
    const { mealId } = req.params;
    const { isCooked, rating, notes } = req.body;

    // Verify ownership
    const meal = await prisma.plannedMeal.findFirst({
      where: {
        id: mealId,
        weeklyPlan: {
          userId
        }
      }
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        error: 'Meal not found or access denied'
      });
    }

    // Update meal
    const updatedMeal = await prisma.plannedMeal.update({
      where: { id: mealId },
      data: {
        isCooked: isCooked !== undefined ? isCooked : meal.isCooked,
        cookedAt: isCooked ? new Date() : meal.cookedAt,
        rating: rating !== undefined ? rating : meal.rating,
        notes: notes !== undefined ? notes : meal.notes
      }
    });

    logger.info('Planned meal updated', {
      userId,
      mealId,
      isCooked: updatedMeal.isCooked,
      rating: updatedMeal.rating
    });

    res.status(200).json({
      success: true,
      data: updatedMeal,
      message: 'Meal updated successfully'
    });

  } catch (error) {
    logger.error('Error updating planned meal', {
      userId: req.user?.id,
      mealId: req.params?.mealId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/meal-planning/meals/:mealId/swap
 * Swap a planned meal with a new AI suggestion
 */
async function swapMeal(req, res) {
  try {
    const userId = req.user.id;
    const { mealId } = req.params;
    const { preferredCuisine } = req.body;

    const result = await swapPlannedMeal(userId, mealId, {
      preferredCuisine
    });

    logger.info('Meal swapped', {
      userId,
      mealId,
      newMealName: result.meal.mealName
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Meal swapped successfully'
    });

  } catch (error) {
    logger.error('Error swapping meal', {
      userId: req.user?.id,
      mealId: req.params?.mealId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/meal-planning/weekly-plans/:planId/regenerate-grocery-list
 * Regenerate grocery list for a weekly plan after meal swaps
 */
async function regenerateGroceryList(req, res) {
  try {
    const userId = req.user.id;
    const { planId } = req.params;

    // Verify ownership
    const plan = await prisma.weeklyMealPlan.findFirst({
      where: {
        id: planId,
        userId
      },
      include: {
        meals: true,
        groceryLists: true
      }
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Weekly plan not found or access denied'
      });
    }

    // Archive old grocery list
    if (plan.groceryLists && plan.groceryLists.length > 0) {
      await prisma.groceryList.updateMany({
        where: { weeklyPlanId: planId },
        data: { status: 'archived' }
      });
    }

    // Generate new grocery list
    const groceryList = await generateGroceryList(planId, plan.meals);

    logger.info('Grocery list regenerated', {
      userId,
      planId,
      totalItems: groceryList.items?.length || 0
    });

    res.status(200).json({
      success: true,
      data: groceryList,
      message: 'Grocery list regenerated successfully'
    });

  } catch (error) {
    logger.error('Error regenerating grocery list', {
      userId: req.user?.id,
      planId: req.params?.planId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  savePreferences,
  getPreferences,
  createWeeklyPlan,
  getWeeklyPlans,
  updateGroceryItemStatus,
  updatePlannedMeal,
  swapMeal,
  regenerateGroceryList
};
