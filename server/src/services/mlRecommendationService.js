/**
 * Phase 9A - ML Recommendation Service
 * =====================================
 *
 * Node.js service that interfaces with Python ML recommendation engine.
 * Uses child_process to spawn Python inference script.
 *
 * Author: Pluqla Dev Team
 * Date: 2025-10-25
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Call Python ML model for recommendations
 *
 * @param {string} userId - User ID
 * @param {Object} options - Options
 * @param {number} options.n - Number of recommendations (default: 10)
 * @param {number} options.budgetMax - Maximum budget per recipe
 * @param {string[]} options.excludeRecipeIds - Recipe IDs to exclude
 * @returns {Promise<Object>} Recommendations result
 */
async function getMLRecommendations(userId, options = {}) {
  const { n = 10, budgetMax, excludeRecipeIds = [] } = options;

  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../ml/predict.py');
    const modelPath = path.join(__dirname, '../../ml-models');

    // Build arguments
    const args = [
      pythonScript,
      '--user-id', userId,
      '--n', String(n),
      '--model-path', modelPath,
    ];

    if (budgetMax) {
      args.push('--budget', String(budgetMax));
    }

    if (excludeRecipeIds.length > 0) {
      args.push('--exclude', excludeRecipeIds.join(','));
    }

    // Spawn Python process
    const python = spawn('python', args, {
      cwd: path.join(__dirname, '../../'),
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0 && code !== 1) {
        logger.error('Python ML inference failed', {
          code,
          stderr,
          userId,
        });
        return reject(new Error(`ML inference failed with code ${code}: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);

        if (!result.success) {
          // Handle model not trained error gracefully
          if (result.error === 'MODEL_NOT_TRAINED') {
            logger.warn('ML model not trained yet', { userId });
            return resolve({
              success: false,
              error: 'MODEL_NOT_TRAINED',
              message: 'Le modèle de recommandation n\'est pas encore entraîné',
              recommendations: [],
              fallback: true,
            });
          }

          logger.error('ML inference returned error', {
            error: result.error,
            message: result.message,
            userId,
          });
          return reject(new Error(result.message));
        }

        logger.info('ML recommendations generated', {
          userId,
          count: result.count,
        });

        resolve(result);
      } catch (error) {
        logger.error('Failed to parse ML inference output', {
          error: error.message,
          stdout,
          userId,
        });
        reject(new Error('Invalid ML inference output'));
      }
    });

    python.on('error', (error) => {
      logger.error('Failed to spawn Python process', {
        error: error.message,
        userId,
      });
      reject(new Error('ML service unavailable'));
    });
  });
}

/**
 * Get fallback recommendations when ML is not available
 *
 * @param {string} userId - User ID
 * @param {number} limit - Number of recommendations
 * @returns {Promise<Object[]>} Popular recipes
 */
async function getFallbackRecommendations(userId, limit = 10) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Get popular recipes based on favorites count
    const popularRecipes = await prisma.recipe.findMany({
      include: {
        _count: {
          select: { favorites: true },
        },
        ingredients: true,
      },
      orderBy: {
        favorites: {
          _count: 'desc',
        },
      },
      take: limit * 2, // Get more to filter
    });

    // Filter out already favorited recipes
    const userFavorites = await prisma.favoriteRecipe.findMany({
      where: { userId },
      select: { recipeId: true },
    });

    const favoritedIds = new Set(userFavorites.map((f) => f.recipeId));

    const filteredRecipes = popularRecipes
      .filter((recipe) => !favoritedIds.has(recipe.id))
      .slice(0, limit);

    // Format like ML recommendations
    return filteredRecipes.map((recipe, index) => ({
      recipeId: recipe.id,
      score: 1 - index * 0.05, // Decreasing score
      matchPercentage: Math.max(50, 100 - index * 5),
      reason: 'Recette populaire auprès de la communauté',
      recipe: {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        tags: recipe.tags,
        cuisine: recipe.cuisine,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        estimatedCost: recipe.estimatedCost,
        imageUrl: recipe.imageUrl,
        ingredients: recipe.ingredients,
      },
    }));
  } catch (error) {
    logger.error('Fallback recommendations failed', {
      error: error.message,
      userId,
    });
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get recommendations with automatic fallback
 *
 * @param {string} userId - User ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Recommendations with metadata
 */
async function getRecommendations(userId, options = {}) {
  const startTime = Date.now();

  try {
    // Try ML recommendations first
    const result = await getMLRecommendations(userId, options);

    if (result.success && result.recommendations.length > 0) {
      return {
        success: true,
        source: 'ml',
        recommendations: result.recommendations,
        count: result.count,
        userId,
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    // Fallback to popular recipes
    logger.info('Using fallback recommendations', { userId, reason: result.error });

    const fallbackRecs = await getFallbackRecommendations(userId, options.n || 10);

    return {
      success: true,
      source: 'fallback',
      recommendations: fallbackRecs,
      count: fallbackRecs.length,
      userId,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      fallbackReason: result.error || 'ML unavailable',
    };
  } catch (error) {
    logger.error('Recommendations failed completely', {
      error: error.message,
      userId,
    });

    // Last resort fallback
    const fallbackRecs = await getFallbackRecommendations(userId, options.n || 10);

    return {
      success: true,
      source: 'fallback',
      recommendations: fallbackRecs,
      count: fallbackRecs.length,
      userId,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      fallbackReason: error.message,
    };
  }
}

/**
 * Check if ML model is trained and available
 *
 * @returns {Promise<Object>} Model status
 */
async function checkMLModelStatus() {
  const fs = require('fs').promises;
  const modelPath = path.join(__dirname, '../../ml-models/recommender_model.pkl');
  const trainingReportPath = path.join(__dirname, '../../ml-models/training_report.json');

  try {
    // Check if model file exists
    await fs.access(modelPath);

    // Read training report if available
    let trainingReport = null;
    try {
      const reportContent = await fs.readFile(trainingReportPath, 'utf-8');
      trainingReport = JSON.parse(reportContent);
    } catch {
      // Report not available
    }

    return {
      available: true,
      modelPath,
      trainingDate: trainingReport?.training_date,
      stats: trainingReport?.model_stats,
    };
  } catch {
    return {
      available: false,
      message: 'Model not trained yet. Run: node src/ml/export_training_data.js && python src/ml/train.py',
    };
  }
}

module.exports = {
  getRecommendations,
  getMLRecommendations,
  getFallbackRecommendations,
  checkMLModelStatus,
};
