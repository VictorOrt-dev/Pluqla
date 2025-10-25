/**
 * Recipe Controller
 *
 * Handles recipe CRUD operations and favorites
 */

const recipeService = require('../services/recipeService');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Get all recipes with optional filters
 * @route GET /api/recipes
 */
const getAllRecipes = async (req, res, next) => {
  try {
    const { category, difficulty, maxPrice, search, limit = 50, offset = 0 } = req.query;

    const filters = {
      category,
      difficulty,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const { recipes, total } = await recipeService.getAllRecipes(filters);

    logger.info('Recipes retrieved successfully', {
      filters,
      count: recipes.length,
      total
    });

    return sendSuccess(res, {
      recipes,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: (filters.offset + filters.limit) < total
      }
    });
  } catch (error) {
    logger.error('Failed to get recipes', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get recipe by ID
 * @route GET /api/recipes/:id
 */
const getRecipeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const recipe = await recipeService.getRecipeById(id);

    if (!recipe) {
      return sendError(res, 'Recipe not found', 404, [{ type: 'RECIPE_NOT_FOUND' }]);
    }

    logger.info('Recipe retrieved successfully', {
      recipeId: id
    });

    return sendSuccess(res, { recipe });
  } catch (error) {
    logger.error('Failed to get recipe', {
      recipeId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Create new recipe
 * @route POST /api/recipes
 */
const createRecipe = async (req, res, next) => {
  try {
    const recipeData = {
      ...req.body,
      ingredients: JSON.stringify(req.body.ingredients),
      instructions: JSON.stringify(req.body.instructions),
      tags: req.body.tags ? JSON.stringify(req.body.tags) : JSON.stringify([]),
      nutritionalInfo: req.body.nutritionalInfo ? JSON.stringify(req.body.nutritionalInfo) : null
    };

    const recipe = await recipeService.createRecipe(recipeData);

    logger.info('Recipe created successfully', {
      userId: req.user.userId,
      recipeId: recipe.id
    });

    return sendSuccess(res, { recipe }, 'Recipe created successfully', 201);
  } catch (error) {
    logger.error('Failed to create recipe', {
      userId: req.user.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update recipe
 * @route PUT /api/recipes/:id
 */
const updateRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updateData = { ...req.body };

    // Convert arrays to JSON strings if present
    if (updateData.ingredients) {
      updateData.ingredients = JSON.stringify(updateData.ingredients);
    }
    if (updateData.instructions) {
      updateData.instructions = JSON.stringify(updateData.instructions);
    }
    if (updateData.tags) {
      updateData.tags = JSON.stringify(updateData.tags);
    }
    if (updateData.nutritionalInfo) {
      updateData.nutritionalInfo = JSON.stringify(updateData.nutritionalInfo);
    }

    const recipe = await recipeService.updateRecipe(id, updateData);

    if (!recipe) {
      return sendError(res, 'Recipe not found', 404, [{ type: 'RECIPE_NOT_FOUND' }]);
    }

    logger.info('Recipe updated successfully', {
      userId: req.user.userId,
      recipeId: id
    });

    return sendSuccess(res, { recipe }, 'Recipe updated successfully');
  } catch (error) {
    logger.error('Failed to update recipe', {
      userId: req.user.userId,
      recipeId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Delete recipe
 * @route DELETE /api/recipes/:id
 */
const deleteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;

    const recipe = await recipeService.deleteRecipe(id);

    if (!recipe) {
      return sendError(res, 'Recipe not found', 404, [{ type: 'RECIPE_NOT_FOUND' }]);
    }

    logger.info('Recipe deleted successfully', {
      userId: req.user.userId,
      recipeId: id
    });

    return sendSuccess(res, null, 'Recipe deleted successfully');
  } catch (error) {
    logger.error('Failed to delete recipe', {
      userId: req.user.userId,
      recipeId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get user's favorite recipes
 * @route GET /api/recipes/favorites/list
 */
const getFavoriteRecipes = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const favorites = await recipeService.getFavoriteRecipes(userId);

    logger.info('Favorite recipes retrieved successfully', {
      userId,
      count: favorites.length
    });

    return sendSuccess(res, { favorites });
  } catch (error) {
    logger.error('Failed to get favorite recipes', {
      userId: req.user.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Add recipe to favorites
 * @route POST /api/recipes/:id/favorite
 */
const addFavoriteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const favorite = await recipeService.addFavoriteRecipe(userId, id);

    logger.info('Recipe added to favorites', {
      userId,
      recipeId: id
    });

    return sendSuccess(res, { favorite }, 'Recipe added to favorites', 201);
  } catch (error) {
    // Check for duplicate favorite error
    if (error.code === 'P2002') {
      return sendError(res, 'Recipe already in favorites', 409, [{ type: 'ALREADY_FAVORITED' }]);
    }

    logger.error('Failed to add favorite recipe', {
      userId: req.user.userId,
      recipeId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Remove recipe from favorites
 * @route DELETE /api/recipes/:id/favorite
 */
const removeFavoriteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const favorite = await recipeService.removeFavoriteRecipe(userId, id);

    if (!favorite) {
      return sendError(res, 'Favorite not found', 404, [{ type: 'FAVORITE_NOT_FOUND' }]);
    }

    logger.info('Recipe removed from favorites', {
      userId,
      recipeId: id
    });

    return sendSuccess(res, null, 'Recipe removed from favorites');
  } catch (error) {
    logger.error('Failed to remove favorite recipe', {
      userId: req.user.userId,
      recipeId: req.params.id,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getFavoriteRecipes,
  addFavoriteRecipe,
  removeFavoriteRecipe
};
