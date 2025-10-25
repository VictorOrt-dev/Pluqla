/**
 * Phase 9A - ML Recommendations Routes
 * =====================================
 *
 * API routes for ML-powered recipe recommendations.
 *
 * Endpoints:
 * - GET  /api/v1/ml/recommendations - Get personalized recommendations
 * - POST /api/v1/ml/feedback        - Record user feedback
 * - GET  /api/v1/ml/status          - Get model training status
 *
 * Author: Pluqla Dev Team
 * Date: 2025-10-25
 */

const express = require('express');
const router = express.Router();
const mlRecommendationController = require('../controllers/mlRecommendationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   GET /api/v1/ml/recommendations
 * @desc    Get personalized recipe recommendations
 * @access  Private
 * @query   {number} n - Number of recommendations (default: 10, max: 50)
 * @query   {number} budgetMax - Maximum budget per recipe in euros
 * @query   {string} excludeIds - Comma-separated recipe IDs to exclude
 */
router.get(
  '/recommendations',
  authenticateToken,
  mlRecommendationController.getRecommendations
);

/**
 * @route   POST /api/v1/ml/feedback
 * @desc    Record user feedback on recommendations
 * @access  Private
 * @body    {string} recipeId - Recipe ID
 * @body    {string} action - Action: 'like' | 'dislike' | 'view' | 'favorite'
 * @body    {string} recommendationId - Optional recommendation session ID
 */
router.post(
  '/feedback',
  authenticateToken,
  mlRecommendationController.recordFeedback
);

/**
 * @route   GET /api/v1/ml/status
 * @desc    Get ML model training status and statistics
 * @access  Private (Admin only - can be opened later)
 */
router.get(
  '/status',
  authenticateToken,
  mlRecommendationController.getModelStatus
);

module.exports = router;
