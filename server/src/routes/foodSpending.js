/**
 * Food Spending Routes
 *
 * API endpoints for tracking food expenses and budget management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const foodSpendingController = require('../controllers/foodSpendingController');

// All routes require authentication
router.use(authenticateToken);

/**
 * Log a food expense
 * @route POST /api/food-spending
 * @body {string} externalId - Recipe ID from provider
 * @body {string} provider - Provider name
 * @body {string} recipeName - Name of the recipe
 * @body {number} costEur - Cost per serving in EUR
 * @body {number} servings - Number of servings (optional, default: 1)
 * @body {object} metadata - Additional metadata (optional)
 */
router.post('/', foodSpendingController.logFoodSpending);

/**
 * Get food spending logs
 * @route GET /api/food-spending
 * @query {string} startDate - Start date (ISO format, optional)
 * @query {string} endDate - End date (ISO format, optional)
 */
router.get('/', foodSpendingController.getFoodSpending);

/**
 * Get monthly food spending statistics
 * @route GET /api/food-spending/stats/monthly
 * @query {number} year - Year (optional, defaults to current)
 * @query {number} month - Month 1-12 (optional, defaults to current)
 */
router.get('/stats/monthly', foodSpendingController.getMonthlyStats);

/**
 * Get food spending trend (last N months)
 * @route GET /api/food-spending/stats/trend
 * @query {number} months - Number of months to look back (default: 6, max: 24)
 */
router.get('/stats/trend', foodSpendingController.getSpendingTrend);

/**
 * Update monthly food budget
 * @route PUT /api/food-spending/budget
 * @body {number} budgetEur - Monthly budget in EUR
 */
router.put('/budget', foodSpendingController.updateFoodBudget);

/**
 * Delete food spending log
 * @route DELETE /api/food-spending/:id
 * @param {string} id - Log ID
 */
router.delete('/:id', foodSpendingController.deleteFoodSpending);

// ============================================================================
// PHASE 5: Prévision vs Réalité - Matching & Stats
// ============================================================================

/**
 * Trigger manual matching of forecasts with bank transactions
 * @route POST /api/food-spending/match
 * @query {string} startDate - Start date (ISO format, optional)
 * @query {string} endDate - End date (ISO format, optional)
 */
router.post('/match', foodSpendingController.matchForecasts);

/**
 * Get forecast vs reality statistics
 * @route GET /api/food-spending/forecast-vs-reality
 * @query {string} startDate - Start date (ISO format, optional)
 * @query {string} endDate - End date (ISO format, optional)
 */
router.get('/forecast-vs-reality', foodSpendingController.getForecastVsRealityStats);

/**
 * Check for potential duplicate before adding forecast
 * @route POST /api/food-spending/check-duplicate
 * @body {number} amount - Amount to check
 * @body {string} date - Date to check (ISO format)
 */
router.post('/check-duplicate', foodSpendingController.checkDuplicate);

module.exports = router;
