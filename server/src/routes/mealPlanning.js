/**
 * Meal Planning Routes
 *
 * RESTful API endpoints for Jow-inspired meal planning
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  savePreferences,
  getPreferences,
  createWeeklyPlan,
  getWeeklyPlans,
  updateGroceryItemStatus,
  updatePlannedMeal,
  swapMeal,
  regenerateGroceryList
} = require('../controllers/mealPlanningController');
const {
  createShare,
  revokeShare,
  getUserShares
} = require('../controllers/mealPlanSharingController');
const {
  validatePreferences,
  validateWeeklyPlan,
  validateGroceryItemUpdate,
  validateMealUpdate,
  validateWeeklyPlansQuery,
  validateMealSwap,
  validateGroceryListRegeneration
} = require('../middleware/validation/mealPlanningValidation');
const { ai: aiRateLimit } = require('../middleware/rateLimit');

// All routes require authentication
router.use(authenticateToken);

// User preferences
router.post('/preferences', validatePreferences, savePreferences);
router.get('/preferences', getPreferences);

// Weekly meal plans - apply rate limiting for AI-heavy operations
router.post('/weekly-plan', aiRateLimit, validateWeeklyPlan, createWeeklyPlan);
router.get('/weekly-plans', validateWeeklyPlansQuery, getWeeklyPlans);

// Planned meals
router.patch('/meals/:mealId', validateMealUpdate, updatePlannedMeal);
router.post('/meals/:mealId/swap', aiRateLimit, validateMealSwap, swapMeal);

// Grocery list management
router.patch('/grocery-items/:itemId', validateGroceryItemUpdate, updateGroceryItemStatus);
router.post('/weekly-plans/:planId/regenerate-grocery-list', validateGroceryListRegeneration, regenerateGroceryList);

// Sharing
router.post('/weekly-plans/:planId/share', createShare);
router.get('/shares', getUserShares);
router.delete('/shares/:token', revokeShare);

module.exports = router;
