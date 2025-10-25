/**
 * Recipes API Controller
 *
 * Handles recipe operations using external APIs (Spoonacular, Edamam, TheMealDB)
 * Replaces the old local DB-based recipe system
 */

const { getRecipesAPIService } = require('../services/recipesAPI');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Search recipes from external APIs
 * @route GET /api/recipes/search
 */
const searchRecipes = async (req, res, next) => {
  try {
    const {
      query,
      budgetMax,
      diet,
      timeMax,
      limit = 20,
      offset = 0
    } = req.query;

    if (!query || query.trim().length === 0) {
      return sendError(res, 'Search query is required', 400, [{
        field: 'query',
        type: 'REQUIRED'
      }]);
    }

    logger.info('Searching recipes via API', {
      query,
      budgetMax,
      diet,
      timeMax,
      limit,
      userId: req.user?.userId
    });

    const recipesAPI = getRecipesAPIService();

    const recipes = await recipesAPI.searchRecipes({
      query: query.trim(),
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      diet,
      timeMax: timeMax ? parseInt(timeMax) : undefined,
      limit: parseInt(limit)
    });

    // Apply offset manually (since APIs don't all support it)
    const offsetNum = parseInt(offset);
    const paginatedRecipes = recipes.slice(offsetNum, offsetNum + parseInt(limit));

    logger.info('Recipe search successful', {
      query,
      totalResults: recipes.length,
      returned: paginatedRecipes.length,
      userId: req.user?.userId
    });

    return sendSuccess(res, {
      recipes: paginatedRecipes,
      pagination: {
        total: recipes.length,
        limit: parseInt(limit),
        offset: offsetNum,
        hasMore: offsetNum + parseInt(limit) < recipes.length
      },
      providers: recipesAPI.getProvidersStatus()
    });

  } catch (error) {
    logger.error('Recipe search failed', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.userId
    });

    if (error.message.includes('all providers unavailable')) {
      return sendError(res, 'Recipe search service temporarily unavailable', 503, [{
        type: 'SERVICE_UNAVAILABLE',
        message: 'All recipe providers are currently unavailable. Please try again later.'
      }]);
    }

    next(error);
  }
};

/**
 * Get recipe details by ID and provider
 * @route GET /api/recipes/:provider/:id
 */
const getRecipeDetails = async (req, res, next) => {
  try {
    const { provider, id } = req.params;

    if (!provider || !id) {
      return sendError(res, 'Provider and recipe ID are required', 400);
    }

    // Validate provider
    const validProviders = ['spoonacular', 'edamam', 'themealdb'];
    if (!validProviders.includes(provider)) {
      return sendError(res, `Invalid provider. Must be one of: ${validProviders.join(', ')}`, 400, [{
        field: 'provider',
        type: 'INVALID_VALUE'
      }]);
    }

    logger.info('Fetching recipe details', {
      provider,
      recipeId: id,
      userId: req.user?.userId
    });

    const recipesAPI = getRecipesAPIService();
    const recipe = await recipesAPI.getRecipeDetails(id, provider);

    logger.info('Recipe details fetched successfully', {
      provider,
      recipeId: id,
      recipeName: recipe.title,
      userId: req.user?.userId
    });

    return sendSuccess(res, { recipe });

  } catch (error) {
    logger.error('Failed to fetch recipe details', {
      error: error.message,
      provider: req.params.provider,
      recipeId: req.params.id,
      userId: req.user?.userId
    });

    if (error.message.includes('unavailable')) {
      return sendError(res, 'Recipe provider temporarily unavailable', 503);
    }

    if (error.message.includes('not found')) {
      return sendError(res, 'Recipe not found', 404, [{
        type: 'RECIPE_NOT_FOUND'
      }]);
    }

    next(error);
  }
};

/**
 * Get random recipe suggestion (bonus feature)
 * @route GET /api/recipes/random
 */
const getRandomRecipe = async (req, res, next) => {
  try {
    logger.info('Fetching random recipe', {
      userId: req.user?.userId
    });

    const recipesAPI = getRecipesAPIService();

    // Use TheMealDB for random recipe (they have a dedicated endpoint)
    const provider = recipesAPI.providerMap.themealdb;

    if (!provider || !provider.isAvailable()) {
      return sendError(res, 'Random recipe feature temporarily unavailable', 503);
    }

    const recipe = await provider.getRandomRecipe();

    // Enrich with price and eco-score
    const enrichedRecipe = await recipesAPI.enrichRecipe(recipe, 'themealdb');

    logger.info('Random recipe fetched successfully', {
      recipeName: enrichedRecipe.title,
      userId: req.user?.userId
    });

    return sendSuccess(res, { recipe: enrichedRecipe });

  } catch (error) {
    logger.error('Failed to fetch random recipe', {
      error: error.message,
      userId: req.user?.userId
    });
    next(error);
  }
};

/**
 * Get provider health status
 * @route GET /api/recipes/providers/status
 */
const getProvidersStatus = async (req, res, next) => {
  try {
    const recipesAPI = getRecipesAPIService();
    const status = recipesAPI.getProvidersStatus();

    return sendSuccess(res, {
      providers: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get providers status', {
      error: error.message
    });
    next(error);
  }
};

module.exports = {
  searchRecipes,
  getRecipeDetails,
  getRandomRecipe,
  getProvidersStatus
};
