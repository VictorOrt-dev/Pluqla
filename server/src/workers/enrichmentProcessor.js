/**
 * Enrichment Processor
 *
 * Worker processor pour enrichir les recettes avec metadata intelligente
 * Utilise des heuristics pour calculer scores et inférer informations
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Process enrichment job
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>} Result with metadata
 */
async function processEnrichment(job) {
  const { recipeId } = job.data;

  try {
    logger.info('Processing recipe enrichment', { recipeId });

    // Progress 0%
    await job.progress(0);

    // Fetch recipe
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    await job.progress(10);

    // Parse JSON fields
    const ingredients = JSON.parse(recipe.ingredients || '[]');
    const instructions = JSON.parse(recipe.instructions || '[]');
    const tags = JSON.parse(recipe.tags || '[]');
    const nutritionalInfo = recipe.nutritionalInfo ? JSON.parse(recipe.nutritionalInfo) : null;

    await job.progress(20);

    // Calculate scores
    const nutritionScore = calculateNutritionScore(nutritionalInfo);
    const ecoScore = calculateEcoScore(ingredients, tags);
    const complexityScore = calculateComplexityScore(instructions);

    await job.progress(40);

    // Infer metadata
    const allergens = detectAllergens(ingredients);
    const dietTypes = inferDietTypes(ingredients, allergens);
    const mealTypes = inferMealTypes(recipe.title, tags, recipe.cookingTime);
    const seasons = inferSeasons(ingredients);

    await job.progress(60);

    // Build metadata object
    const metadata = {
      nutritionScore,
      ecoScore,
      complexityScore,
      allergens,
      dietTypes,
      mealTypes,
      seasons,
      cuisine: recipe.category?.toLowerCase() || 'general',
      mainIngredient: extractMainIngredient(ingredients),
      prepComplexity: recipe.difficulty?.toLowerCase() || 'medium',
      equipmentNeeded: inferEquipment(instructions),
      storageInfo: {
        leftoverFriendly: inferLeftoverFriendly(recipe.title),
        freezable: inferFreezable(recipe.title),
        shelfLifeDays: inferShelfLife(recipe.title)
      },
      enrichedAt: new Date().toISOString()
    };

    await job.progress(80);

    // Update recipe in DB
    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        metadata,
        lastEnriched: new Date()
      }
    });

    await job.progress(100);

    logger.info('Recipe enriched successfully', {
      recipeId,
      metadata: {
        nutritionScore,
        ecoScore,
        complexityScore,
        allergenCount: allergens.length
      }
    });

    return {
      success: true,
      recipeId,
      metadata
    };

  } catch (error) {
    logger.error('Failed to enrich recipe', {
      recipeId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// ========== HEURISTICS FUNCTIONS ==========

function calculateNutritionScore(nutritionalInfo) {
  if (!nutritionalInfo) return 5; // Neutral

  let score = 5;

  // Bonus protéines
  if (nutritionalInfo.protein > 20) score += 2;
  else if (nutritionalInfo.protein > 10) score += 1;

  // Pénalité calories très élevées
  if (nutritionalInfo.calories > 800) score -= 2;
  else if (nutritionalInfo.calories > 600) score -= 1;

  // Bonus équilibre macros
  if (nutritionalInfo.carbs && nutritionalInfo.calories) {
    const carbsRatio = (nutritionalInfo.carbs * 4) / nutritionalInfo.calories;
    if (carbsRatio > 0.4 && carbsRatio < 0.6) score += 1;
  }

  // Pénalité lipides élevés
  if (nutritionalInfo.fat > 30) score -= 1;

  return Math.max(0, Math.min(10, score));
}

function calculateEcoScore(ingredients, tags) {
  let score = 5;

  const tagsLower = tags.map(t => t.toLowerCase());
  const ingredientText = ingredients.map(i => (i.name || i).toLowerCase()).join(' ');

  // Bonus végétarien/vegan
  if (tagsLower.includes('végétarien')) score += 2;
  if (tagsLower.includes('vegan')) score += 3;

  // Pénalité viande rouge
  if (/boeuf|agneau|veau/i.test(ingredientText)) score -= 2;

  // Bonus local/saison
  if (tagsLower.includes('local')) score += 1;
  if (tagsLower.includes('saison')) score += 1;

  // Pénalité produits exotiques
  if (/avocat|mangue|ananas/i.test(ingredientText)) score -= 0.5;

  return Math.max(0, Math.min(10, score));
}

function calculateComplexityScore(instructions) {
  const stepsCount = instructions.length;

  if (stepsCount <= 3) return 1;
  if (stepsCount <= 5) return 2;
  if (stepsCount <= 7) return 3;
  if (stepsCount <= 10) return 4;
  return 5;
}

function detectAllergens(ingredients) {
  const ingredientText = ingredients.map(i => (i.name || i).toLowerCase()).join(' ');

  const allergenMap = {
    gluten: /blé|farine|pâtes|pain|semoule|orge|seigle/i,
    dairy: /lait|fromage|beurre|crème|yaourt|parmesan|mozzarella/i,
    eggs: /oeuf|œuf/i,
    nuts: /noix|amande|noisette|cacahuète|pistache|noix de cajou/i,
    fish: /poisson|saumon|thon|cabillaud|truite/i,
    shellfish: /crevette|moule|huître|crabe|homard|calamar/i,
    soy: /soja|tofu|sauce soja|miso/i,
    sesame: /sésame|tahini/i
  };

  const detected = [];
  for (const [allergen, regex] of Object.entries(allergenMap)) {
    if (regex.test(ingredientText)) detected.push(allergen);
  }

  return detected;
}

function inferDietTypes(ingredients, allergens) {
  const ingredientText = ingredients.map(i => (i.name || i).toLowerCase()).join(' ');
  const types = [];

  types.push('omnivore'); // Par défaut

  // Végétarien si pas de viande/poisson
  const hasMeat = /viande|poulet|boeuf|porc|agneau|poisson|saumon/i.test(ingredientText);
  if (!hasMeat) types.push('vegetarian');

  // Vegan si végétarien + pas de produits animaux
  if (!hasMeat && !allergens.includes('dairy') && !allergens.includes('eggs')) {
    types.push('vegan');
  }

  return types;
}

function inferMealTypes(title, tags, cookingTime) {
  const titleLower = title.toLowerCase();
  const tagsLower = tags.map(t => t.toLowerCase());
  const types = [];

  // Patterns de détection
  if (/petit[- ]déjeuner|breakfast|pancake|croissant|muesli/i.test(titleLower)) {
    types.push('breakfast');
  }
  if (/déjeuner|lunch|salade|sandwich/i.test(titleLower)) {
    types.push('lunch');
  }
  if (/dîner|dinner|souper|gratin/i.test(titleLower)) {
    types.push('dinner');
  }
  if (/snack|encas|goûter|apéro/i.test(titleLower) || tagsLower.includes('snack')) {
    types.push('snack');
  }
  if (/dessert|gâteau|tarte|mousse|glace/i.test(titleLower)) {
    types.push('dessert');
  }

  // Fallback
  if (types.length === 0) {
    if (cookingTime < 15) {
      types.push('snack');
    } else {
      types.push('lunch', 'dinner');
    }
  }

  return types;
}

function inferSeasons(ingredients) {
  const ingredientText = ingredients.map(i => (i.name || i).toLowerCase()).join(' ');

  const seasonal = {
    spring: /asperge|petit pois|fraise|artichaut|radis|roquette/i,
    summer: /tomate|courgette|aubergine|melon|pêche|poivron|concombre/i,
    fall: /potiron|courge|champignon|châtaigne|raisin|poire/i,
    winter: /chou|poireau|carotte|pomme de terre|endive|topinambur/i
  };

  const matches = [];
  for (const [season, regex] of Object.entries(seasonal)) {
    if (regex.test(ingredientText)) matches.push(season);
  }

  return matches.length > 0 ? matches : ['spring', 'summer', 'fall', 'winter'];
}

function extractMainIngredient(ingredients) {
  if (ingredients.length === 0) return 'mixed';

  const first = ingredients[0];
  const name = (first.name || first).toLowerCase();

  // Extraction mot clé
  const keywords = name.match(/\b(poulet|boeuf|poisson|pâtes|riz|tomate|pomme de terre|lentilles|quinoa)\b/);
  return keywords ? keywords[0] : 'mixed';
}

function inferEquipment(instructions) {
  const instructionText = instructions.join(' ').toLowerCase();
  const equipment = [];

  if (/four|cuire au four|enfourner/i.test(instructionText)) equipment.push('oven');
  if (/poêle|faire revenir|sauter/i.test(instructionText)) equipment.push('pan');
  if (/casserole|bouillir|mijoter/i.test(instructionText)) equipment.push('pot');
  if (/mixer|blender/i.test(instructionText)) equipment.push('blender');
  if (/robot/i.test(instructionText)) equipment.push('food-processor');

  return equipment.length > 0 ? equipment : ['basic'];
}

function inferLeftoverFriendly(title) {
  return /gratin|soupe|ragoût|curry|chili|lasagne/i.test(title);
}

function inferFreezable(title) {
  return /soupe|sauce|ragoût|curry|chili|lasagne|bolognaise/i.test(title);
}

function inferShelfLife(title) {
  // Court: salades, poisson
  if (/salade|poisson|cru/i.test(title)) return 1;

  // Moyen: la plupart
  if (/viande|poulet|légumes/i.test(title)) return 2;

  // Long: soupes, plats mijotés
  if (/soupe|ragoût|curry|chili/i.test(title)) return 4;

  return 2; // Défaut
}

module.exports = {
  processEnrichment
};
