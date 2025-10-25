/**
 * Recipe Routes
 *
 * RESTful API endpoints for recipe management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getFavoriteRecipes,
  addFavoriteRecipe,
  removeFavoriteRecipe
} = require('../controllers/recipeController');
const {
  validateRecipeCreate,
  validateRecipeUpdate,
  validateRecipeId,
  validateRecipeQuery
} = require('../middleware/validation/recipeValidation');

// Public routes (no auth required)
router.get('/', validateRecipeQuery, getAllRecipes);
router.get('/:id', validateRecipeId, getRecipeById);

// Protected routes (auth required)
router.use(authenticateToken);

// Recipe management
router.post('/', validateRecipeCreate, createRecipe);
router.put('/:id', validateRecipeId, validateRecipeUpdate, updateRecipe);
router.delete('/:id', validateRecipeId, deleteRecipe);

// Favorites
router.get('/favorites/list', getFavoriteRecipes);
router.post('/:id/favorite', validateRecipeId, addFavoriteRecipe);
router.delete('/:id/favorite', validateRecipeId, removeFavoriteRecipe);

module.exports = router;
