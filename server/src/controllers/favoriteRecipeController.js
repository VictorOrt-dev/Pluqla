/**
 * Favorite Recipe Controller
 *
 * Handles user favorite recipes from external APIs
 */

const favoriteRecipeService = require('../services/favoriteRecipeService');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Get user's favorite recipes
 * @route GET /api/recipes/favorites
 */
const getFavoriteRecipes = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const favorites = await favoriteRecipeService.getFavoriteRecipes(userId);

    logger.info('Favorite recipes retrieved', {
      userId,
      count: favorites.length
    });

    return sendSuccess(res, { favorites });

  } catch (error) {
    logger.error('Failed to get favorite recipes', {
      userId: req.user.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Add recipe to favorites
 * @route POST /api/recipes/favorites
 * @body {externalId, provider}
 */
const addFavoriteRecipe = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { externalId, provider } = req.body;

    if (!externalId || !provider) {
      return sendError(res, 'External ID and provider are required', 400, [
        { field: 'externalId', type: 'REQUIRED' },
        { field: 'provider', type: 'REQUIRED' }
      ]);
    }

    // Validate provider
    const validProviders = ['spoonacular', 'edamam', 'themealdb'];
    if (!validProviders.includes(provider)) {
      return sendError(res, `Invalid provider. Must be one of: ${validProviders.join(', ')}`, 400, [{
        field: 'provider',
        type: 'INVALID_VALUE'
      }]);
    }

    const favorite = await favoriteRecipeService.addFavoriteRecipe(
      userId,
      externalId,
      provider
    );

    logger.info('Recipe added to favorites', {
      userId,
      externalId,
      provider
    });

    return sendSuccess(res, { favorite }, 'Recipe added to favorites', 201);

  } catch (error) {
    if (error.code === 'DUPLICATE_FAVORITE') {
      return sendError(res, 'Recipe already in favorites', 409, [{
        type: 'DUPLICATE_FAVORITE'
      }]);
    }

    logger.error('Failed to add favorite recipe', {
      userId: req.user.userId,
      body: req.body,
      error: error.message
    });
    next(error);
  }
};

/**
 * Remove recipe from favorites
 * @route DELETE /api/recipes/favorites/:id
 */
const removeFavoriteRecipe = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await favoriteRecipeService.removeFavoriteRecipe(userId, id);

    logger.info('Recipe removed from favorites', {
      userId,
      favoriteId: id
    });

    return sendSuccess(res, null, 'Recipe removed from favorites');

  } catch (error) {
    if (error.code === 'FAVORITE_NOT_FOUND') {
      return sendError(res, 'Favorite not found', 404, [{
        type: 'FAVORITE_NOT_FOUND'
      }]);
    }

    logger.error('Failed to remove favorite recipe', {
      userId: req.user.userId,
      favoriteId: req.params.id,
      error: error.message
    });
    next(error);
  }
};

/**
 * Check if recipe is favorited
 * @route GET /api/recipes/favorites/check/:provider/:externalId
 */
const checkFavoriteStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { provider, externalId } = req.params;

    const isFavorited = await favoriteRecipeService.isFavorited(
      userId,
      externalId,
      provider
    );

    return sendSuccess(res, {
      isFavorited,
      externalId,
      provider
    });

  } catch (error) {
    logger.error('Failed to check favorite status', {
      userId: req.user.userId,
      params: req.params,
      error: error.message
    });
    next(error);
  }
};

/**
 * Refresh cached data for a favorite recipe
 * @route POST /api/recipes/favorites/:id/refresh
 */
const refreshFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;

    const favorite = await favoriteRecipeService.refreshFavoriteData(id);

    logger.info('Favorite recipe data refreshed', {
      userId: req.user.userId,
      favoriteId: id
    });

    return sendSuccess(res, { favorite }, 'Favorite refreshed successfully');

  } catch (error) {
    logger.error('Failed to refresh favorite', {
      userId: req.user.userId,
      favoriteId: req.params.id,
      error: error.message
    });
    next(error);
  }
};

module.exports = {
  getFavoriteRecipes,
  addFavoriteRecipe,
  removeFavoriteRecipe,
  checkFavoriteStatus,
  refreshFavorite
};
