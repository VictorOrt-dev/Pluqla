/**
 * Favorite Meals Routes
 *
 * RESTful API endpoints for favorite meal management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  addFavorite,
  getFavorites,
  removeFavorite,
  useFavoriteInPlan
} = require('../controllers/favoriteMealController');

// All routes require authentication
router.use(authenticateToken);

// Favorite meals CRUD
router.post('/', addFavorite);
router.get('/', getFavorites);
router.delete('/:id', removeFavorite);

// Use favorite in plan
router.post('/:id/use', useFavoriteInPlan);

module.exports = router;
