/**
 * Photo Match Routes
 *
 * API endpoints for IA Photo Match feature
 * Integrated into the Features Mode on homescreen
 *
 * Security:
 * - All routes require authentication
 * - AI quota middleware enforces limits
 * - Rate limiting applied
 * - Input validation on all endpoints
 */

const express = require('express');
const router = express.Router();

// Middleware
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { aiQuotaMiddleware, addQuotaToResponse } = require('../middleware/aiQuotaMiddleware');

// Validation
const {
  validatePhotoMatchCreate,
  validatePhotoMatchStatus,
  validatePhotoMatchHistory
} = require('../middleware/validation/photoMatchValidation');

// Controller
const photoMatchController = require('../controllers/photoMatchController');

// All routes require authentication
router.use(authenticateToken);

// Add quota info to responses
router.use(addQuotaToResponse());

/**
 * POST /api/ia/photo-match
 * Create a new photo match job
 *
 * Body:
 *   - image: string (base64 or URL)
 *   - metadata: object (optional)
 *
 * Quota: 5 tokens per request (configured in aiUsageService)
 */
router.post(
  '/',
  rateLimit.ai, // AI-specific rate limit
  aiQuotaMiddleware('photo_match'), // Quota enforcement
  validatePhotoMatchCreate, // Input validation
  photoMatchController.createPhotoMatch
);

/**
 * GET /api/ia/photo-match/:jobId
 * Get photo match job status and result
 *
 * Params:
 *   - jobId: string (CUID)
 *
 * No quota consumption (read operation)
 */
router.get(
  '/:jobId',
  rateLimit.standard, // Standard rate limit
  validatePhotoMatchStatus,
  photoMatchController.getPhotoMatchStatus
);

/**
 * GET /api/ia/photo-match/history
 * Get user's photo match history
 *
 * Query params:
 *   - limit: number (1-100, default 20)
 *   - offset: number (default 0)
 *   - status: string (pending|processing|completed|failed)
 *
 * No quota consumption (read operation)
 */
router.get(
  '/history',
  rateLimit.standard,
  validatePhotoMatchHistory,
  photoMatchController.getPhotoMatchHistory
);

/**
 * GET /api/ia/photo-match/analytics
 * Get photo match analytics for user
 *
 * No quota consumption (read operation)
 */
router.get(
  '/analytics',
  rateLimit.standard,
  photoMatchController.getPhotoMatchAnalytics
);

/**
 * GET /api/ia/photo-match/metrics
 * Get queue metrics (admin only)
 *
 * No quota consumption (admin operation)
 */
router.get(
  '/metrics',
  rateLimit.standard,
  photoMatchController.getPhotoMatchMetrics
);

module.exports = router;
