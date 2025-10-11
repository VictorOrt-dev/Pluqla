/**
 * Meal Suggestions Routes
 *
 * API endpoints for meal suggestions feature
 *
 * Security:
 * - All routes require authentication
 * - Rate limiting applied
 * - Quota enforcement via middleware
 * - Input validation via middleware
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { aiQuotaMiddleware, addQuotaToResponse } = require('../middleware/aiQuotaMiddleware');
const {
  validateMealSuggestionCreate,
  validateMealSuggestionStatus,
  validateMealSuggestionHistory
} = require('../middleware/validation/mealSuggestionsValidation');
const mealSuggestionsController = require('../controllers/mealSuggestionsController');

// Apply authentication to all routes
router.use(authenticateToken);

// Add quota info to responses
router.use(addQuotaToResponse());

/**
 * POST /api/meal-suggestions
 * Create a new meal suggestion job
 *
 * Security:
 * - Rate limited (AI feature rate limit)
 * - Quota enforced (3 tokens per request)
 * - Input validation
 *
 * Request body:
 * - mealType: string (optional) - breakfast, lunch, dinner, snack, etc.
 * - dietaryRestrictions: array (optional) - vegetarian, vegan, gluten-free, etc.
 * - budget: number (optional) - max budget per meal in EUR (0-200)
 * - servings: number (optional) - number of servings (1-20)
 * - cuisineType: string (optional) - italian, french, chinese, etc.
 * - maxCookingTime: number (optional) - max cooking time in minutes (5-300)
 * - skillLevel: string (optional) - beginner, easy, intermediate, advanced, expert
 * - avoidIngredients: array (optional) - ingredients to avoid
 * - preferredIngredients: array (optional) - preferred ingredients
 * - metadata: object (optional) - additional metadata
 *
 * Response:
 * - 202: Job created (async processing started)
 * - 200: Duplicate job found (returns existing job)
 * - 400: Invalid request
 * - 429: Quota exceeded
 */
router.post(
  '/',
  rateLimit.ai, // AI feature rate limit
  aiQuotaMiddleware('meal_suggestions'), // Quota check (3 tokens)
  validateMealSuggestionCreate, // Input validation
  mealSuggestionsController.createMealSuggestion
);

/**
 * GET /api/meal-suggestions/history
 * Get user's meal suggestion history
 *
 * Security:
 * - Rate limited (general API limit)
 * - Pagination enforced (max 100 items)
 *
 * Query params:
 * - limit: number (1-100, default 20)
 * - offset: number (default 0)
 * - status: string (pending|processing|completed|failed)
 * - mealType: string (breakfast|lunch|dinner|etc)
 *
 * Response:
 * - 200: History retrieved
 * - 400: Invalid request
 */
router.get(
  '/history',
  rateLimit.standard,
  validateMealSuggestionHistory,
  mealSuggestionsController.getMealSuggestionHistory
);

/**
 * GET /api/meal-suggestions/analytics
 * Get user's meal suggestion analytics
 *
 * Security:
 * - Rate limited (general API limit)
 * - User-specific data only
 *
 * Response:
 * - 200: Analytics retrieved
 * - 400: Invalid request
 */
router.get(
  '/analytics',
  rateLimit.standard,
  mealSuggestionsController.getMealSuggestionAnalytics
);

/**
 * GET /api/meal-suggestions/metrics
 * Get meal suggestions system metrics (admin only)
 *
 * Security:
 * - Admin only
 * - Rate limited
 *
 * Response:
 * - 200: Metrics retrieved
 * - 403: Forbidden (non-admin)
 * - 500: Internal error
 */
router.get(
  '/metrics',
  rateLimit.standard,
  mealSuggestionsController.getMealSuggestionMetrics
);

/**
 * GET /api/meal-suggestions/:jobId
 * Get meal suggestion job status and result
 *
 * Security:
 * - Rate limited (general API limit)
 * - User can only access their own jobs
 *
 * Params:
 * - jobId: string (CUID)
 *
 * Response:
 * - 200: Job status retrieved
 * - 404: Job not found
 * - 400: Invalid request
 *
 * IMPORTANT: This route must come LAST to avoid conflicts with /history, /analytics, /metrics
 */
router.get(
  '/:jobId',
  rateLimit.standard, // General API rate limit
  validateMealSuggestionStatus,
  mealSuggestionsController.getMealSuggestionStatus
);

module.exports = router;
