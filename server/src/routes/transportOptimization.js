/**
 * Transport Optimization Routes
 *
 * API endpoints for transport cost optimization feature
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
  validateTransportOptimizationCreate,
  validateTransportOptimizationStatus,
  validateTransportOptimizationHistory
} = require('../middleware/validation/transportOptimizationValidation');
const transportOptimizationController = require('../controllers/transportOptimizationController');

// Apply authentication to all routes
router.use(authenticateToken);

// Add quota info to responses
router.use(addQuotaToResponse());

/**
 * POST /api/transport-optimize
 * Create a new transport optimization job
 *
 * Security:
 * - Rate limited (same as AI features)
 * - Quota enforced (2 tokens per request)
 * - Input validation
 */
router.post(
  '/',
  rateLimit.ai, // AI feature rate limit
  aiQuotaMiddleware('transport_optimization'), // Quota check (2 tokens)
  validateTransportOptimizationCreate, // Input validation
  transportOptimizationController.createTransportOptimization
);

/**
 * GET /api/transport-optimize/history
 * Get user's transport optimization history
 *
 * Security:
 * - Rate limited (general API limit)
 * - Pagination enforced (max 100 items)
 */
router.get(
  '/history',
  rateLimit.standard,
  validateTransportOptimizationHistory,
  transportOptimizationController.getTransportOptimizationHistory
);

/**
 * GET /api/transport-optimize/analytics
 * Get user's transport optimization analytics
 *
 * Security:
 * - Rate limited (general API limit)
 * - User-specific data only
 */
router.get(
  '/analytics',
  rateLimit.standard,
  transportOptimizationController.getTransportOptimizationAnalytics
);

/**
 * GET /api/transport-optimize/metrics
 * Get transport optimization system metrics (admin only)
 *
 * Security:
 * - Admin only
 * - Rate limited
 */
router.get(
  '/metrics',
  rateLimit.standard,
  transportOptimizationController.getTransportOptimizationMetrics
);

/**
 * GET /api/transport-optimize/:jobId
 * Get transport optimization job status and result
 *
 * Security:
 * - Rate limited (general API limit)
 * - User can only access their own jobs
 *
 * IMPORTANT: This route must come LAST to avoid conflicts with /history, /analytics, /metrics
 */
router.get(
  '/:jobId',
  rateLimit.standard, // General API rate limit
  validateTransportOptimizationStatus,
  transportOptimizationController.getTransportOptimizationStatus
);

module.exports = router;
