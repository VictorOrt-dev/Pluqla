/**
 * Phase 9A - ML Recommendation Controller
 * ========================================
 *
 * Handles HTTP requests for ML-powered recipe recommendations.
 *
 * Author: Pluqla Dev Team
 * Date: 2025-10-25
 */

const mlRecommendationService = require('../services/mlRecommendationService');
const logger = require('../utils/logger');

/**
 * GET /api/v1/ml/recommendations
 *
 * Get personalized recipe recommendations for a user.
 *
 * Query params:
 * - n: Number of recommendations (default: 10, max: 50)
 * - budgetMax: Maximum budget per recipe in euros
 * - excludeIds: Comma-separated recipe IDs to exclude
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getRecommendations(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    // Parse query parameters
    const n = Math.min(parseInt(req.query.n) || 10, 50); // Max 50 recs
    const budgetMax = req.query.budgetMax ? parseFloat(req.query.budgetMax) : undefined;
    const excludeIds = req.query.excludeIds
      ? req.query.excludeIds.split(',').map((id) => id.trim())
      : [];

    logger.info('Getting ML recommendations', {
      userId,
      n,
      budgetMax,
      excludeIdsCount: excludeIds.length,
    });

    // Get recommendations
    const result = await mlRecommendationService.getRecommendations(userId, {
      n,
      budgetMax,
      excludeRecipeIds: excludeIds,
    });

    // Track metrics (if Prometheus is available)
    try {
      const { mlRecommendationDuration, mlRecommendationSource } = require('../config/prometheus');

      if (mlRecommendationDuration) {
        mlRecommendationDuration.observe(
          { source: result.source },
          result.durationMs / 1000
        );
      }

      if (mlRecommendationSource) {
        mlRecommendationSource.inc({ source: result.source });
      }
    } catch {
      // Prometheus not available, skip metrics
    }

    res.json(result);
  } catch (error) {
    logger.error('Failed to get recommendations', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'RECOMMENDATION_ERROR',
      message: 'Une erreur est survenue lors de la génération des recommandations',
    });
  }
}

/**
 * POST /api/v1/ml/feedback
 *
 * Record user feedback on recommendations (for future model improvement).
 *
 * Body:
 * - recipeId: Recipe ID
 * - action: 'like' | 'dislike' | 'view' | 'favorite'
 * - recommendationId: Optional recommendation session ID
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function recordFeedback(req, res) {
  try {
    const userId = req.user?.id;
    const { recipeId, action, recommendationId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    if (!recipeId || !action) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'recipeId and action are required',
      });
    }

    // Store feedback for future model retraining
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Store in a feedback table (create this table in future migration)
      // For now, just log it
      logger.info('ML recommendation feedback', {
        userId,
        recipeId,
        action,
        recommendationId,
        timestamp: new Date().toISOString(),
      });

      // If action is 'favorite', automatically create favorite
      if (action === 'favorite') {
        await prisma.favoriteRecipe.upsert({
          where: {
            userId_recipeId: {
              userId,
              recipeId,
            },
          },
          create: {
            userId,
            recipeId,
          },
          update: {},
        });
      }

      res.json({
        success: true,
        message: 'Feedback enregistré avec succès',
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    logger.error('Failed to record feedback', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'FEEDBACK_ERROR',
      message: 'Erreur lors de l\'enregistrement du feedback',
    });
  }
}

/**
 * GET /api/v1/ml/status
 *
 * Get ML model training status and statistics.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getModelStatus(req, res) {
  try {
    const status = await mlRecommendationService.checkMLModelStatus();

    res.json({
      success: true,
      model: status,
    });
  } catch (error) {
    logger.error('Failed to get model status', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'STATUS_ERROR',
      message: 'Erreur lors de la récupération du statut du modèle',
    });
  }
}

module.exports = {
  getRecommendations,
  recordFeedback,
  getModelStatus,
};
