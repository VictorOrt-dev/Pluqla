/**
 * Transport Trips Routes
 *
 * API endpoints for user transport trip CRUD operations
 *
 * Security:
 * - All routes require authentication
 * - Rate limiting applied
 * - Input validation via middleware
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const {
  validateTripCreate,
  validateTripUpdate,
  validateTripId,
  validateTripListQuery
} = require('../middleware/validation/transportTripValidation');
const transportTripController = require('../controllers/transportTripController');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * POST /api/trips
 * Create a new transport trip
 *
 * Security:
 * - Rate limited (standard API limit)
 * - Input validation
 * - User authentication required
 */
router.post(
  '/',
  rateLimit.standard,
  validateTripCreate,
  transportTripController.createTrip
);

/**
 * GET /api/trips
 * Get user's transport trips
 *
 * Security:
 * - Rate limited (standard API limit)
 * - Query validation
 */
router.get(
  '/',
  rateLimit.standard,
  validateTripListQuery,
  transportTripController.getUserTrips
);

/**
 * GET /api/trips/:id
 * Get single trip by ID
 *
 * Security:
 * - Rate limited (standard API limit)
 * - User can only access their own trips
 * - ID validation
 */
router.get(
  '/:id',
  rateLimit.standard,
  validateTripId,
  transportTripController.getTripById
);

/**
 * PUT /api/trips/:id
 * Update transport trip
 *
 * Security:
 * - Rate limited (standard API limit)
 * - Input and ID validation
 * - User can only update their own trips
 */
router.put(
  '/:id',
  rateLimit.standard,
  validateTripId,
  validateTripUpdate,
  transportTripController.updateTrip
);

/**
 * DELETE /api/trips/:id
 * Delete transport trip
 *
 * Security:
 * - Rate limited (standard API limit)
 * - ID validation
 * - User can only delete their own trips
 */
router.delete(
  '/:id',
  rateLimit.standard,
  validateTripId,
  transportTripController.deleteTrip
);

module.exports = router;
