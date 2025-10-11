/**
 * Favorite Meal Controller
 *
 * Handles HTTP requests for favorite meal management
 */

const favoriteMealService = require('../services/favoriteMealService');
const logger = require('../utils/logger');

/**
 * POST /api/favorite-meals
 * Add a meal to favorites
 */
async function addFavorite(req, res) {
  try {
    const userId = req.user.id;
    const mealData = req.body;

    const favoriteMeal = await favoriteMealService.addFavoriteMeal(userId, mealData);

    res.status(201).json({
      success: true,
      data: favoriteMeal,
      message: 'Meal added to favorites'
    });
  } catch (error) {
    logger.error('Error adding favorite meal', {
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
 * GET /api/favorite-meals
 * Get user's favorite meals
 */
async function getFavorites(req, res) {
  try {
    const userId = req.user.id;
    const { mealType, cuisineType, limit, offset, sortBy } = req.query;

    const result = await favoriteMealService.getUserFavoriteMeals(userId, {
      mealType,
      cuisineType,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      sortBy
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error getting favorite meals', {
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
 * DELETE /api/favorite-meals/:id
 * Remove meal from favorites
 */
async function removeFavorite(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await favoriteMealService.removeFavoriteMeal(userId, id);

    res.status(200).json({
      success: true,
      message: 'Meal removed from favorites'
    });
  } catch (error) {
    logger.error('Error removing favorite meal', {
      userId: req.user?.id,
      favoriteMealId: req.params?.id,
      error: error.message
    });

    const statusCode = error.message.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/favorite-meals/:id/use
 * Use a favorite meal in a weekly plan
 */
async function useFavoriteInPlan(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { weeklyPlanId, dayOfWeek } = req.body;

    const plannedMeal = await favoriteMealService.useFavoriteInPlan(
      userId,
      id,
      weeklyPlanId,
      dayOfWeek
    );

    res.status(201).json({
      success: true,
      data: plannedMeal,
      message: 'Favorite meal added to plan'
    });
  } catch (error) {
    logger.error('Error using favorite in plan', {
      userId: req.user?.id,
      favoriteMealId: req.params?.id,
      error: error.message
    });

    const statusCode = error.message.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  addFavorite,
  getFavorites,
  removeFavorite,
  useFavoriteInPlan
};
