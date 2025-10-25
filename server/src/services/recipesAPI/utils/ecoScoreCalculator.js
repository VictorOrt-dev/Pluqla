/**
 * Pluqla EcoScore Calculator
 *
 * Calculates an ecological impact score (0-100) for recipes
 * Based on ingredients, with optional Open Food Facts enrichment
 *
 * Scoring methodology:
 * - Start at 50 (neutral)
 * - Meat/animal products: -5 to -15 per item
 * - Processed foods: -3 per item
 * - Vegetables/fruits/legumes: +5 per item
 * - Local/seasonal products: +3 per item (if detected)
 * - Organic: +2 per item (if detected)
 */

const axios = require('axios');
const logger = require('../../../utils/logger');

// Open Food Facts API (optional enrichment)
const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2';

// Ingredient categories and their impact scores
const INGREDIENT_SCORES = {
  // High negative impact (meat & animal products)
  meat: {
    keywords: ['beef', 'pork', 'lamb', 'veal', 'boeuf', 'porc', 'agneau', 'viande'],
    score: -15
  },
  poultry: {
    keywords: ['chicken', 'turkey', 'duck', 'poulet', 'dinde', 'volaille'],
    score: -10
  },
  fish: {
    keywords: ['fish', 'salmon', 'tuna', 'cod', 'poisson', 'saumon', 'thon'],
    score: -8
  },
  dairy: {
    keywords: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'lait', 'fromage', 'crème', 'beurre'],
    score: -5
  },
  eggs: {
    keywords: ['egg', 'oeuf'],
    score: -3
  },

  // Processed foods
  processed: {
    keywords: ['canned', 'frozen', 'packaged', 'instant', 'conserve', 'surgelé'],
    score: -3
  },

  // Positive impact
  vegetables: {
    keywords: ['vegetable', 'carrot', 'potato', 'tomato', 'onion', 'garlic', 'légume', 'carotte', 'pomme de terre', 'tomate', 'oignon'],
    score: +5
  },
  fruits: {
    keywords: ['fruit', 'apple', 'banana', 'orange', 'berry', 'pomme', 'banane', 'fraise'],
    score: +5
  },
  legumes: {
    keywords: ['bean', 'lentil', 'chickpea', 'pea', 'haricot', 'lentille', 'pois chiche'],
    score: +6
  },
  grains: {
    keywords: ['rice', 'pasta', 'wheat', 'oat', 'quinoa', 'riz', 'pâtes', 'blé', 'avoine'],
    score: +3
  },
  nuts: {
    keywords: ['nut', 'almond', 'walnut', 'cashew', 'noix', 'amande'],
    score: +4
  },

  // Neutral
  spices: {
    keywords: ['spice', 'salt', 'pepper', 'herb', 'épice', 'sel', 'poivre', 'herbe'],
    score: 0
  }
};

/**
 * Calculate Pluqla EcoScore for a recipe
 * @param {Array} ingredients - Array of ingredient objects
 * @returns {Promise<Object>} - Score data with breakdown
 */
async function calculateEcoScore(ingredients) {
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return {
      score: 50,
      grade: 'C',
      details: {
        message: 'Insufficient ingredient data',
        breakdown: []
      }
    };
  }

  let totalScore = 50; // Start at neutral
  const breakdown = [];

  for (const ingredient of ingredients) {
    const ingredientName = (ingredient.name || ingredient.original || '').toLowerCase();

    if (!ingredientName) continue;

    // Check each category
    for (const [category, config] of Object.entries(INGREDIENT_SCORES)) {
      const matched = config.keywords.some(keyword =>
        ingredientName.includes(keyword)
      );

      if (matched) {
        totalScore += config.score;
        breakdown.push({
          ingredient: ingredient.name || ingredientName,
          category,
          impact: config.score,
          reason: config.score < 0 ? 'Negative environmental impact' : 'Positive environmental choice'
        });
        break; // Only count first match
      }
    }
  }

  // Normalize score to 0-100 range
  const normalizedScore = Math.max(0, Math.min(100, totalScore));

  // Calculate grade
  const grade = getEcoGrade(normalizedScore);

  return {
    score: Math.round(normalizedScore),
    grade,
    details: {
      ingredientsAnalyzed: ingredients.length,
      breakdown,
      recommendations: getRecommendations(normalizedScore, breakdown)
    }
  };
}

/**
 * Get eco-score grade from score
 * @param {number} score - Score 0-100
 * @returns {string} - Grade A-E
 */
function getEcoGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'E';
}

/**
 * Get color for grade display
 * @param {string} grade - Grade A-E
 * @returns {string} - Hex color
 */
function getGradeColor(grade) {
  const colors = {
    'A': '#2ECC71', // Green
    'B': '#A8E063', // Light green
    'C': '#F39C12', // Orange
    'D': '#E67E22', // Dark orange
    'E': '#E74C3C'  // Red
  };
  return colors[grade] || '#95A5A6';
}

/**
 * Get grade emoji
 * @param {string} grade - Grade A-E
 * @returns {string} - Emoji
 */
function getGradeEmoji(grade) {
  const emojis = {
    'A': '🌱',
    'B': '🍃',
    'C': '⚠️',
    'D': '🔶',
    'E': '🔴'
  };
  return emojis[grade] || '❓';
}

/**
 * Get improvement recommendations
 * @param {number} score - Current score
 * @param {Array} breakdown - Ingredient breakdown
 * @returns {Array} - Recommendations
 */
function getRecommendations(score, breakdown) {
  const recommendations = [];

  // Count negative impacts
  const meatCount = breakdown.filter(b => b.category === 'meat' || b.category === 'poultry').length;
  const dairyCount = breakdown.filter(b => b.category === 'dairy').length;
  const veggieCount = breakdown.filter(b => b.category === 'vegetables' || b.category === 'legumes').length;

  if (meatCount > 0) {
    recommendations.push({
      type: 'reduce_meat',
      message: 'Réduire la quantité de viande ou utiliser une alternative végétale',
      potentialGain: 10
    });
  }

  if (dairyCount > 2) {
    recommendations.push({
      type: 'reduce_dairy',
      message: 'Limiter les produits laitiers ou utiliser des alternatives végétales',
      potentialGain: 5
    });
  }

  if (veggieCount < 3) {
    recommendations.push({
      type: 'add_vegetables',
      message: 'Ajouter plus de légumes et légumineuses',
      potentialGain: 8
    });
  }

  if (score < 50) {
    recommendations.push({
      type: 'general',
      message: 'Privilégier les produits locaux et de saison',
      potentialGain: 5
    });
  }

  return recommendations;
}

/**
 * Enrich ingredient data with Open Food Facts (optional, async)
 * @param {string} ingredientName - Ingredient name
 * @returns {Promise<Object|null>} - OFF data or null
 */
async function enrichWithOpenFoodFacts(ingredientName) {
  try {
    const response = await axios.get(`${OFF_API_URL}/search`, {
      params: {
        search_terms: ingredientName,
        search_simple: 1,
        json: 1,
        page_size: 1
      },
      timeout: 2000
    });

    const product = response.data?.products?.[0];
    if (!product) return null;

    return {
      productName: product.product_name,
      nutriScore: product.nutriscore_grade,
      ecoScore: product.ecoscore_grade,
      novaGroup: product.nova_group,
      labels: product.labels_tags || []
    };

  } catch (error) {
    logger.warn('Open Food Facts enrichment failed', {
      ingredient: ingredientName,
      error: error.message
    });
    return null;
  }
}

module.exports = {
  calculateEcoScore,
  getEcoGrade,
  getGradeColor,
  getGradeEmoji,
  getRecommendations,
  enrichWithOpenFoodFacts
};
