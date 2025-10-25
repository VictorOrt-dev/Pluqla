/**
 * Recipe Interactions Routes
 *
 * Endpoints pour tracking des interactions utilisateur avec les recettes
 * Intègre fraud detection + rate limiting
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

// Middlewares
const { authenticateToken } = require('../middleware/auth');
const { attachIPHash } = require('../services/ipDeduplicationService');
const { recipeInteractionLimiter } = require('../middleware/rateLimiting');
const { detectFraud, flagInteractionAsSuspicious } = require('../services/fraudDetectionService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Appliquer middlewares à toutes les routes
router.use(attachIPHash);
router.use(authenticateToken);
router.use(recipeInteractionLimiter);

/**
 * @route   POST /api/recipe-interactions
 * @desc    Enregistrer une interaction utilisateur (view, cook, favorite)
 * @access  Private + Rate Limited
 * @body    { recipeId: string, interactionType: "view"|"cook"|"favorite" }
 */
router.post('/', detectFraud, async (req, res) => {
  const { recipeId, interactionType } = req.body;
  const userId = req.user.id;
  const ipHash = req.ipHash;
  const fraudScore = req.fraudScore;

  try {
    // Validation
    if (!recipeId || !interactionType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'recipeId et interactionType sont requis'
      });
    }

    const validTypes = ['view', 'cook', 'favorite'];
    if (!validTypes.includes(interactionType)) {
      return res.status(400).json({
        error: 'Invalid interaction type',
        message: `Type doit être: ${validTypes.join(', ')}`
      });
    }

    // Vérifier que la recette existe
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, title: true }
    });

    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found'
      });
    }

    // Créer l'interaction
    const interaction = await prisma.recipeInteraction.create({
      data: {
        userId,
        recipeId,
        interactionType,
        ipHash,
        metadata: {
          suspicious: fraudScore?.isSuspicious || false,
          fraudScore: fraudScore?.score || 0,
          fraudReasons: fraudScore?.reasons || [],
          userAgent: req.headers['user-agent'],
          deviceFingerprint: req.deviceFingerprint
        }
      }
    });

    logger.info('Recipe interaction recorded', {
      interactionId: interaction.id,
      userId,
      recipeId,
      interactionType,
      fraudScore: fraudScore?.score,
      isSuspicious: fraudScore?.isSuspicious
    });

    // Si très suspect, logger en warning
    if (fraudScore?.score >= 70) {
      logger.warn('Suspicious recipe interaction', {
        interactionId: interaction.id,
        userId,
        recipeId,
        fraudScore: fraudScore.score,
        reasons: fraudScore.reasons
      });
    }

    res.status(201).json({
      success: true,
      interaction: {
        id: interaction.id,
        recipeId: interaction.recipeId,
        interactionType: interaction.interactionType,
        createdAt: interaction.createdAt
      },
      fraudCheck: {
        score: fraudScore?.score,
        isSuspicious: fraudScore?.isSuspicious
      }
    });

  } catch (error) {
    logger.error('Error creating recipe interaction', {
      userId,
      recipeId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to record interaction',
      message: 'Une erreur est survenue'
    });
  }
});

/**
 * @route   GET /api/recipe-interactions/my-history
 * @desc    Récupérer l'historique d'interactions de l'utilisateur
 * @access  Private
 */
router.get('/my-history', async (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0, type } = req.query;

  try {
    const where = { userId };
    if (type) {
      where.interactionType = type;
    }

    const interactions = await prisma.recipeInteraction.findMany({
      where,
      select: {
        id: true,
        recipeId: true,
        interactionType: true,
        createdAt: true,
        recipe: {
          select: {
            title: true,
            category: true,
            difficulty: true,
            cookingTime: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.recipeInteraction.count({ where });

    res.status(200).json({
      interactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > (parseInt(offset) + parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Error fetching interaction history', {
      userId,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch history'
    });
  }
});

/**
 * @route   GET /api/recipe-interactions/stats
 * @desc    Statistiques d'interactions de l'utilisateur
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  const userId = req.user.id;

  try {
    const [totalViews, totalCooks, totalFavorites] = await Promise.all([
      prisma.recipeInteraction.count({
        where: { userId, interactionType: 'view' }
      }),
      prisma.recipeInteraction.count({
        where: { userId, interactionType: 'cook' }
      }),
      prisma.recipeInteraction.count({
        where: { userId, interactionType: 'favorite' }
      })
    ]);

    // Recettes les plus consultées
    const topRecipes = await prisma.recipeInteraction.groupBy({
      by: ['recipeId'],
      where: { userId },
      _count: { recipeId: true },
      orderBy: { _count: { recipeId: 'desc' } },
      take: 10
    });

    // Enrichir avec les titres
    const topRecipesWithDetails = await Promise.all(
      topRecipes.map(async (item) => {
        const recipe = await prisma.recipe.findUnique({
          where: { id: item.recipeId },
          select: { title: true, category: true }
        });
        return {
          recipeId: item.recipeId,
          count: item._count.recipeId,
          recipe
        };
      })
    );

    res.status(200).json({
      stats: {
        totalViews,
        totalCooks,
        totalFavorites,
        totalInteractions: totalViews + totalCooks + totalFavorites
      },
      topRecipes: topRecipesWithDetails
    });

  } catch (error) {
    logger.error('Error fetching interaction stats', {
      userId,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch stats'
    });
  }
});

module.exports = router;
