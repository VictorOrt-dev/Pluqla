/**
 * Shared Meal Plans Routes (Public)
 *
 * Public endpoints for viewing shared meal plans
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getShared,
  copyShared
} = require('../controllers/mealPlanSharingController');

// Public route - no auth required
router.get('/meal-plan/:token', getShared);

// Copy requires authentication
router.post('/meal-plan/:token/copy', authenticateToken, copyShared);

module.exports = router;
