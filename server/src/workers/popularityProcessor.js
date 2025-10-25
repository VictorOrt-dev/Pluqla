/**
 * Popularity Processor
 *
 * Worker processor pour calculer les scores de popularité
 * Implémente la formule définie dans POPULARITY_SCORE_SPEC.md
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Configuration poids (cf. POPULARITY_SCORE_SPEC.md)
const WEIGHTS = {
  W_VIEWS: 1.0,
  W_COOKS: 3.0,
  W_FAVORITES: 7.0
};

const DECAY_RATE = 0.3; // 30% decay max par an

/**
 * Process calculate-all job (CRON)
 * Recalcule tous les scores de popularité
 */
async function processCalculateAll(job) {
  const startTime = Date.now();

  try {
    logger.info('Starting popularity calculation for all recipes');

    // Progress 0%
    await job.progress(0);

    // Fetch toutes les recettes actives
    const recipes = await prisma.recipe.findMany({
      where: { isActive: true },
      select: { id: true, createdAt: true }
    });

    const totalRecipes = recipes.length;
    let processed = 0;
    let errors = 0;

    logger.info(`Found ${totalRecipes} recipes to process`);

    // Process en batch
    for (const recipe of recipes) {
      try {
        const newScore = await calculatePopularityScore(recipe.id, recipe.createdAt);

        await prisma.recipe.update({
          where: { id: recipe.id },
          data: { popularityScore: newScore }
        });

        processed++;

        // Update progress
        const progress = Math.round((processed / totalRecipes) * 100);
        await job.progress(progress);

      } catch (error) {
        errors++;
        logger.error('Failed to calculate score for recipe', {
          recipeId: recipe.id,
          error: error.message
        });
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    logger.info('Popularity calculation completed', {
      total: totalRecipes,
      processed,
      errors,
      duration_seconds: duration
    });

    return {
      success: true,
      processed,
      errors,
      duration
    };

  } catch (error) {
    logger.error('Failed to calculate all popularity scores', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Process calculate-one job
 * Calcule le score d'une seule recette
 */
async function processCalculateOne(job) {
  const { recipeId } = job.data;

  try {
    logger.info('Calculating popularity for recipe', { recipeId });

    await job.progress(20);

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { createdAt: true }
    });

    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    await job.progress(50);

    const newScore = await calculatePopularityScore(recipeId, recipe.createdAt);

    await job.progress(80);

    await prisma.recipe.update({
      where: { id: recipeId },
      data: { popularityScore: newScore }
    });

    await job.progress(100);

    logger.info('Recipe popularity calculated', {
      recipeId,
      score: newScore
    });

    return {
      success: true,
      recipeId,
      score: newScore
    };

  } catch (error) {
    logger.error('Failed to calculate recipe popularity', {
      recipeId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Calculate popularity score for a recipe
 * Implements formula from POPULARITY_SCORE_SPEC.md
 *
 * @param {string} recipeId - Recipe ID
 * @param {Date} createdAt - Recipe creation date
 * @returns {Promise<number>} Popularity score 0-100
 */
async function calculatePopularityScore(recipeId, createdAt) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. Unique views (30 jours) - utiliser groupBy au lieu de count avec distinct
  const uniqueViewsResult = await prisma.recipeInteraction.groupBy({
    by: ['userId'],
    where: {
      recipeId,
      interactionType: 'view',
      createdAt: { gte: thirtyDaysAgo }
    }
  });
  const uniqueViews = uniqueViewsResult.length;

  // 2. Cook events (30 jours)
  const cookEvents = await prisma.recipeInteraction.count({
    where: {
      recipeId,
      interactionType: 'cook',
      createdAt: { gte: thirtyDaysAgo }
    }
  });

  // 3. Favorites (lifetime)
  const favoriteEvents = await prisma.favoriteRecipe.count({
    where: { recipeId }
  });

  // 4. Anti-spam: calcul ratio suspicious
  const totalInteractions = await prisma.recipeInteraction.count({
    where: {
      recipeId,
      createdAt: { gte: thirtyDaysAgo }
    }
  });

  let suspiciousInteractions = 0;
  if (totalInteractions > 0) {
    // Interactions flaggées comme suspectes dans metadata
    suspiciousInteractions = await prisma.recipeInteraction.count({
      where: {
        recipeId,
        createdAt: { gte: thirtyDaysAgo },
        // Note: Prisma JSONB query syntax
        metadata: {
          path: ['suspicious'],
          equals: true
        }
      }
    });
  }

  const suspiciousRatio = totalInteractions > 0
    ? suspiciousInteractions / totalInteractions
    : 0;

  // 5. Anti-spam penalty
  const antiSpamPenalty = 1.0 - Math.min(suspiciousRatio * 0.8, 0.9);

  // 6. Decay factor (âge de la recette)
  const age_days = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.max(0.5, 1.0 - (age_days / 365) * DECAY_RATE);

  // 7. Score brut
  const rawScore = (
    uniqueViews * WEIGHTS.W_VIEWS +
    cookEvents * WEIGHTS.W_COOKS +
    favoriteEvents * WEIGHTS.W_FAVORITES
  ) * decayFactor * antiSpamPenalty;

  // 8. Normalisation 0-100
  const popularityScore = Math.min(Math.max(rawScore, 0), 100);

  logger.debug('Popularity score calculated', {
    recipeId,
    components: {
      uniqueViews,
      cookEvents,
      favoriteEvents,
      totalInteractions,
      suspiciousInteractions,
      suspiciousRatio: suspiciousRatio.toFixed(2),
      antiSpamPenalty: antiSpamPenalty.toFixed(2),
      decayFactor: decayFactor.toFixed(2),
      rawScore: rawScore.toFixed(2),
      finalScore: popularityScore.toFixed(2)
    }
  });

  return popularityScore;
}

module.exports = {
  processCalculateAll,
  processCalculateOne,
  calculatePopularityScore
};
