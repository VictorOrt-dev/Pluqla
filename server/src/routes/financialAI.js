/**
 * Financial AI Routes - AI-Powered Insights and Projections
 * Handles routes for habit analysis, projections, and health score
 */

const express = require('express');
const router = express.Router();
const { getAIInsights, getProjections, getHealthScore } = require('../controllers/financialAIController');
const { authenticate } = require('../middleware/auth');
const { requirePremium } = require('../middleware/requirePremium');
const financialRateLimit = require('../middleware/financialRateLimit');

/**
 * @route   GET /api/financial/ai/insights
 * @desc    Get AI-powered financial insights and habit analysis
 * @access  Private
 */
router.get(
  '/insights',
  authenticate,
  financialRateLimit.apiCalls,
  getAIInsights
);

/**
 * @route   GET /api/financial/ai/projections
 * @desc    Get financial projections and what-if scenarios
 * @access  Private (Premium required)
 */
router.get(
  '/projections',
  authenticate,
  requirePremium({ feature: 'Financial Projections' }),
  financialRateLimit.apiCalls,
  getProjections
);

/**
 * @route   GET /api/financial/ai/health-score
 * @desc    Calculate financial health score
 * @access  Private
 */
router.get(
  '/health-score',
  authenticate,
  financialRateLimit.apiCalls,
  getHealthScore
);

module.exports = router;
