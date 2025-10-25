/**
 * Favorite Recipe Service
 *
 * Manages user favorite recipes from external APIs
 * New structure: stores externalId + provider instead of local recipe reference
 */

const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');
const { getRecipesAPIService } = require('./recipesAPI');

/**
 * Get user's favorite recipes
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Favorite recipes with enriched data
 */
const getFavoriteRecipes = async (userId) => {
  try {
    const favorites = await prisma.favoriteRecipe.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info('Favorite recipes retrieved', {
      userId,
      count: favorites.length
    });

    // Return cached recipe data
    return favorites.map(fav => ({
      id: fav.id,
      userId: fav.userId,
      externalId: fav.externalId,
      provider: fav.provider,
      recipe: fav.recipeData, // Cached data
      pricePerServing: fav.pricePerServing,
      ecoScore: fav.ecoScore,
      createdAt: fav.createdAt
    }));

  } catch (error) {
    logger.error('Failed to get favorite recipes', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Add recipe to favorites
 * @param {string} userId - User ID
 * @param {string} externalId - Recipe ID from provider
 * @param {string} provider - Provider name ('spoonacular', 'edamam', 'themealdb')
 * @returns {Promise<Object>} - Created favorite
 */
const addFavoriteRecipe = async (userId, externalId, provider) => {
  try {
    // Fetch full recipe data from API to cache it
    const recipesAPI = getRecipesAPIService();
    const recipe = await recipesAPI.getRecipeDetails(externalId, provider);

    // Cache only essential data (not the full recipe to save space)
    const recipeDataToCache = {
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      servings: recipe.servings,
      readyInMinutes: recipe.readyInMinutes,
      sourceUrl: recipe.sourceUrl,
      summary: recipe.summary?.substring(0, 200), // Truncate summary
      dishTypes: recipe.dishTypes,
      cuisines: recipe.cuisines,
      diets: recipe.diets,
      vegetarian: recipe.vegetarian,
      vegan: recipe.vegan,
      glutenFree: recipe.glutenFree
    };

    const favorite = await prisma.favoriteRecipe.create({
      data: {
        userId,
        externalId,
        provider,
        recipeData: recipeDataToCache,
        pricePerServing: recipe.pricePerServingEur,
        ecoScore: recipe.ecoScore
      }
    });

    logger.info('Recipe added to favorites', {
      userId,
      externalId,
      provider,
      recipeName: recipe.title
    });

    return {
      id: favorite.id,
      userId: favorite.userId,
      externalId: favorite.externalId,
      provider: favorite.provider,
      recipe: favorite.recipeData,
      pricePerServing: favorite.pricePerServing,
      ecoScore: favorite.ecoScore,
      createdAt: favorite.createdAt
    };

  } catch (error) {
    // Check for duplicate
    if (error.code === 'P2002') {
      const duplicateError = new Error('Recipe already in favorites');
      duplicateError.code = 'DUPLICATE_FAVORITE';
      throw duplicateError;
    }

    logger.error('Failed to add favorite recipe', {
      userId,
      externalId,
      provider,
      error: error.message
    });
    throw error;
  }
};

/**
 * Remove recipe from favorites
 * @param {string} userId - User ID
 * @param {string} favoriteId - Favorite record ID
 * @returns {Promise<boolean>} - Success status
 */
const removeFavoriteRecipe = async (userId, favoriteId) => {
  try {
    const result = await prisma.favoriteRecipe.deleteMany({
      where: {
        id: favoriteId,
        userId // Ensure user owns this favorite
      }
    });

    if (result.count === 0) {
      const notFoundError = new Error('Favorite not found');
      notFoundError.code = 'FAVORITE_NOT_FOUND';
      throw notFoundError;
    }

    logger.info('Recipe removed from favorites', {
      userId,
      favoriteId
    });

    return true;

  } catch (error) {
    logger.error('Failed to remove favorite recipe', {
      userId,
      favoriteId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Check if recipe is favorited by user
 * @param {string} userId - User ID
 * @param {string} externalId - Recipe ID from provider
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>} - Is favorited
 */
const isFavorited = async (userId, externalId, provider) => {
  try {
    const favorite = await prisma.favoriteRecipe.findFirst({
      where: {
        userId,
        externalId,
        provider
      }
    });

    return !!favorite;

  } catch (error) {
    logger.error('Failed to check favorite status', {
      userId,
      externalId,
      provider,
      error: error.message
    });
    return false;
  }
};

/**
 * Refresh cached recipe data for a favorite
 * (Useful to update price/eco-score if they changed)
 * @param {string} favoriteId - Favorite record ID
 * @returns {Promise<Object>} - Updated favorite
 */
const refreshFavoriteData = async (favoriteId) => {
  try {
    const favorite = await prisma.favoriteRecipe.findUnique({
      where: { id: favoriteId }
    });

    if (!favorite) {
      throw new Error('Favorite not found');
    }

    // Fetch fresh data from API
    const recipesAPI = getRecipesAPIService();
    const recipe = await recipesAPI.getRecipeDetails(
      favorite.externalId,
      favorite.provider
    );

    // Update cache
    const recipeDataToCache = {
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      servings: recipe.servings,
      readyInMinutes: recipe.readyInMinutes,
      sourceUrl: recipe.sourceUrl,
      summary: recipe.summary?.substring(0, 200),
      dishTypes: recipe.dishTypes,
      cuisines: recipe.cuisines,
      diets: recipe.diets,
      vegetarian: recipe.vegetarian,
      vegan: recipe.vegan,
      glutenFree: recipe.glutenFree
    };

    const updated = await prisma.favoriteRecipe.update({
      where: { id: favoriteId },
      data: {
        recipeData: recipeDataToCache,
        pricePerServing: recipe.pricePerServingEur,
        ecoScore: recipe.ecoScore,
        updatedAt: new Date()
      }
    });

    logger.info('Favorite recipe data refreshed', {
      favoriteId,
      recipeName: recipe.title
    });

    return updated;

  } catch (error) {
    logger.error('Failed to refresh favorite recipe data', {
      favoriteId,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  getFavoriteRecipes,
  addFavoriteRecipe,
  removeFavoriteRecipe,
  isFavorited,
  refreshFavoriteData
};
