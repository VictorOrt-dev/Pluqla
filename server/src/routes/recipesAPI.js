/**
 * Recipes API Routes
 *
 * RESTful API endpoints for recipe management using external APIs
 * Replaces the old local DB-based recipe routes
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const recipesAPIController = require('../controllers/recipesAPIController');
const favoriteRecipeController = require('../controllers/favoriteRecipeController');

// =================================
// PUBLIC ROUTES (No auth required)
// =================================

/**
 * Search recipes
 * @route GET /api/recipes/search
 * @query {string} query - Search query (required)
 * @query {number} budgetMax - Max budget per serving in EUR
 * @query {string} diet - Diet type (vegetarian, vegan, etc.)
 * @query {number} timeMax - Max cooking time in minutes
 * @query {number} limit - Results limit (default: 20)
 * @query {number} offset - Pagination offset (default: 0)
 */
router.get('/search', recipesAPIController.searchRecipes);

/**
 * Get recipe details
 * @route GET /api/recipes/:provider/:id
 * @param {string} provider - Provider name (spoonacular, edamam, themealdb)
 * @param {string} id - Recipe ID from provider
 */
router.get('/:provider/:id', recipesAPIController.getRecipeDetails);

/**
 * Get random recipe suggestion
 * @route GET /api/recipes/random
 */
router.get('/random', recipesAPIController.getRandomRecipe);

/**
 * Get provider health status
 * @route GET /api/recipes/providers/status
 */
router.get('/providers/status', recipesAPIController.getProvidersStatus);

// =================================
// PROTECTED ROUTES (Auth required)
// =================================

router.use(authenticateToken);

/**
 * Get user's favorite recipes
 * @route GET /api/recipes/favorites
 */
router.get('/favorites', favoriteRecipeController.getFavoriteRecipes);

/**
 * Check if recipe is favorited
 * @route GET /api/recipes/favorites/check/:provider/:externalId
 */
router.get('/favorites/check/:provider/:externalId', favoriteRecipeController.checkFavoriteStatus);

/**
 * Add recipe to favorites
 * @route POST /api/recipes/favorites
 * @body {string} externalId - Recipe ID from provider
 * @body {string} provider - Provider name
 */
router.post('/favorites', favoriteRecipeController.addFavoriteRecipe);

/**
 * Remove recipe from favorites
 * @route DELETE /api/recipes/favorites/:id
 * @param {string} id - Favorite record ID
 */
router.delete('/favorites/:id', favoriteRecipeController.removeFavoriteRecipe);

/**
 * Refresh cached data for a favorite
 * @route POST /api/recipes/favorites/:id/refresh
 */
router.post('/favorites/:id/refresh', favoriteRecipeController.refreshFavorite);

module.exports = router;
