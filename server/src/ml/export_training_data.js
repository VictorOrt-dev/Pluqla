/**
 * Phase 9A - ML Training Data Export Script
 * ==========================================
 *
 * Exports recipes and user favorites from PostgreSQL to JSON format
 * for ML model training.
 *
 * Usage: node src/ml/export_training_data.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

const ML_DATA_DIR = path.join(__dirname, '../../ml-data');

/**
 * Export recipes data for ML training
 */
async function exportRecipes() {
  console.log('📚 Exporting recipes data...');

  const recipes = await prisma.recipe.findMany({
    include: {
      ingredients: true,
    },
  });

  // Transform to ML-friendly format
  const recipesData = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title || '',
    description: recipe.description || '',
    tags: recipe.tags || [],
    cuisine: recipe.cuisine || 'unknown',
    difficulty: recipe.difficulty || 2,
    prepTime: recipe.prepTime || 30,
    cookTime: recipe.cookTime || 30,
    servings: recipe.servings || 4,
    estimatedCost: recipe.estimatedCost || 10,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name || '',
      quantity: ing.quantity || '',
      unit: ing.unit || '',
    })),
    imageUrl: recipe.imageUrl || '',
    sourceUrl: recipe.sourceUrl || '',
    provider: recipe.provider || '',
    createdAt: recipe.createdAt?.toISOString(),
  }));

  const outputPath = path.join(ML_DATA_DIR, 'recipes.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(recipesData, null, 2),
    'utf-8'
  );

  console.log(`✅ Exported ${recipesData.length} recipes to ${outputPath}`);

  return recipesData;
}

/**
 * Export user favorites for collaborative filtering
 */
async function exportFavorites() {
  console.log('❤️ Exporting user favorites data...');

  const favorites = await prisma.favoriteRecipe.findMany({
    select: {
      id: true,
      userId: true,
      recipeId: true,
      createdAt: true,
    },
  });

  // Transform to ML-friendly format
  const favoritesData = favorites.map((fav) => ({
    id: fav.id,
    userId: fav.userId,
    recipeId: fav.recipeId,
    createdAt: fav.createdAt?.toISOString(),
  }));

  const outputPath = path.join(ML_DATA_DIR, 'favorites.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(favoritesData, null, 2),
    'utf-8'
  );

  console.log(`✅ Exported ${favoritesData.length} favorites to ${outputPath}`);

  return favoritesData;
}

/**
 * Export meal planning history (optional - for future enhancements)
 */
async function exportMealPlans() {
  console.log('📅 Exporting meal planning history...');

  const mealPlans = await prisma.weeklyMealPlan.findMany({
    include: {
      meals: {
        include: {
          recipe: true,
        },
      },
    },
    where: {
      createdAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      },
    },
  });

  // Transform to ML-friendly format
  const mealPlansData = mealPlans.map((plan) => ({
    id: plan.id,
    userId: plan.userId,
    weekStart: plan.weekStart?.toISOString(),
    weekEnd: plan.weekEnd?.toISOString(),
    meals: plan.meals.map((meal) => ({
      recipeId: meal.recipeId,
      mealType: meal.mealType,
      dayOfWeek: meal.dayOfWeek,
    })),
    createdAt: plan.createdAt?.toISOString(),
  }));

  const outputPath = path.join(ML_DATA_DIR, 'meal_plans.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(mealPlansData, null, 2),
    'utf-8'
  );

  console.log(`✅ Exported ${mealPlansData.length} meal plans to ${outputPath}`);

  return mealPlansData;
}

/**
 * Generate summary statistics for exported data
 */
async function generateDataSummary(recipes, favorites, mealPlans) {
  console.log('\n📊 Data Summary:');
  console.log('================');
  console.log(`Total Recipes: ${recipes.length}`);
  console.log(`Total Favorites: ${favorites.length}`);
  console.log(`Total Meal Plans: ${mealPlans.length}`);

  // User statistics
  const uniqueUsers = new Set(favorites.map((f) => f.userId)).size;
  console.log(`Unique Users: ${uniqueUsers}`);

  // Average favorites per user
  const avgFavoritesPerUser = favorites.length / uniqueUsers;
  console.log(`Avg Favorites/User: ${avgFavoritesPerUser.toFixed(2)}`);

  // Recipe popularity
  const recipeFavCounts = {};
  favorites.forEach((fav) => {
    recipeFavCounts[fav.recipeId] = (recipeFavCounts[fav.recipeId] || 0) + 1;
  });

  const mostPopularRecipes = Object.entries(recipeFavCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\nTop 5 Most Favorited Recipes:');
  mostPopularRecipes.forEach(([recipeId, count], idx) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    console.log(`  ${idx + 1}. ${recipe?.title || recipeId}: ${count} favorites`);
  });

  // Sparsity calculation
  const totalPossibleInteractions = uniqueUsers * recipes.length;
  const sparsity = (1 - favorites.length / totalPossibleInteractions) * 100;
  console.log(`\nMatrix Sparsity: ${sparsity.toFixed(2)}%`);

  // Save summary to file
  const summary = {
    exportDate: new Date().toISOString(),
    stats: {
      totalRecipes: recipes.length,
      totalFavorites: favorites.length,
      totalMealPlans: mealPlans.length,
      uniqueUsers,
      avgFavoritesPerUser: parseFloat(avgFavoritesPerUser.toFixed(2)),
      matrixSparsity: parseFloat(sparsity.toFixed(2)),
    },
    topRecipes: mostPopularRecipes.map(([recipeId, count]) => {
      const recipe = recipes.find((r) => r.id === recipeId);
      return {
        recipeId,
        title: recipe?.title || 'Unknown',
        favoriteCount: count,
      };
    }),
  };

  const summaryPath = path.join(ML_DATA_DIR, 'data_summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log(`\n✅ Summary saved to ${summaryPath}`);
}

/**
 * Main export function
 */
async function main() {
  console.log('🚀 Starting ML Training Data Export...\n');

  try {
    // Create output directory
    await fs.mkdir(ML_DATA_DIR, { recursive: true });

    // Export all data
    const recipes = await exportRecipes();
    const favorites = await exportFavorites();
    const mealPlans = await exportMealPlans();

    // Generate summary
    await generateDataSummary(recipes, favorites, mealPlans);

    console.log('\n✅ Export completed successfully!');
    console.log(`\n📁 Data exported to: ${ML_DATA_DIR}`);
    console.log('\n🎯 Next step: Run model training with:');
    console.log('   python src/ml/train.py\n');
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { exportRecipes, exportFavorites, exportMealPlans };
