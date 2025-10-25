/**
 * Edamam API Provider
 *
 * Documentation: https://developer.edamam.com/edamam-recipe-api
 * Rate limits: Free tier = 10 req/min, 10,000 req/month
 */

const axios = require('axios');
const logger = require('../../../utils/logger');

class EdamamProvider {
  constructor() {
    this.name = 'edamam';
    this.baseUrl = 'https://api.edamam.com/api/recipes/v2';
    this.appId = process.env.EDAMAM_APP_ID;
    this.appKey = process.env.EDAMAM_APP_KEY;
    this.available = !!(this.appId && this.appKey);
    this.unavailableUntil = null;
    this.lastError = null;

    if (!this.available) {
      logger.warn('Edamam API credentials not configured');
    } else {
      logger.info('Edamam provider initialized');
    }
  }

  isAvailable() {
    if (!this.appId || !this.appKey) return false;

    if (this.unavailableUntil && Date.now() < this.unavailableUntil) {
      return false;
    }

    return true;
  }

  markUnavailable(seconds) {
    this.unavailableUntil = Date.now() + (seconds * 1000);
    logger.warn(`Edamam marked unavailable for ${seconds}s`);
  }

  async makeRequest(params = {}) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          ...params,
          type: 'public',
          app_id: this.appId,
          app_key: this.appKey
        },
        timeout: 5000
      });

      this.lastError = null;
      return response.data;

    } catch (error) {
      this.lastError = error.message;

      if (error.response?.status === 429) {
        const quotaError = new Error('Edamam rate limit exceeded');
        quotaError.code = 'QUOTA_EXCEEDED';
        throw quotaError;
      }

      if (error.code === 'ECONNABORTED') {
        throw new Error('Edamam API timeout');
      }

      throw error;
    }
  }

  async searchRecipes(params) {
    const { query, budgetMax, diet, timeMax, limit = 20 } = params;

    const searchParams = {
      q: query,
      to: limit
    };

    if (diet) {
      searchParams.diet = diet;
    }

    if (timeMax) {
      searchParams.time = `1-${timeMax}`;
    }

    logger.info('Searching recipes with Edamam', { query, limit });

    const data = await this.makeRequest(searchParams);

    // Normalize results
    return (data.hits || []).map(hit => this.normalizeRecipe(hit.recipe));
  }

  async getRecipeDetails(id) {
    logger.info('Fetching recipe details from Edamam', { id });

    // Edamam uses URI as ID
    const data = await this.makeRequest({
      uri: id
    });

    if (data.hits && data.hits.length > 0) {
      return this.normalizeRecipe(data.hits[0].recipe);
    }

    throw new Error('Recipe not found');
  }

  normalizeRecipe(recipe) {
    // Edamam provides good nutrition data
    const nutrition = recipe.totalNutrients || {};
    const calories = nutrition.ENERC_KCAL?.quantity || 0;
    const protein = nutrition.PROCNT?.quantity || 0;
    const carbs = nutrition.CHOCDF?.quantity || 0;
    const fat = nutrition.FAT?.quantity || 0;

    // Extract ingredients
    const ingredients = (recipe.ingredients || []).map(ing => ({
      name: ing.food,
      amount: ing.quantity,
      unit: ing.measure,
      original: ing.text,
      weight: ing.weight
    }));

    // Edamam doesn't provide step-by-step instructions, only URL
    const instructions = recipe.url ? [{
      number: 1,
      step: `Voir les instructions complètes sur ${recipe.source}`,
      url: recipe.url
    }] : [];

    // Estimate price based on ingredient count (rough approximation)
    const estimatedPricePerServing = ingredients.length * 0.50; // ~0.50€ per ingredient

    return {
      id: recipe.uri, // Edamam uses URI as ID
      title: recipe.label,
      image: recipe.image,
      servings: recipe.yield || 1,
      readyInMinutes: recipe.totalTime || 0,
      pricePerServing: estimatedPricePerServing,
      sourceUrl: recipe.url,
      source: recipe.source,
      summary: recipe.label, // Edamam doesn't provide summary
      dishTypes: recipe.dishType || [],
      cuisines: recipe.cuisineType || [],
      diets: recipe.dietLabels || [],
      mealTypes: recipe.mealType || [],
      ingredients,
      instructions,
      nutrition: {
        calories: calories / (recipe.yield || 1), // Per serving
        protein: protein / (recipe.yield || 1),
        carbs: carbs / (recipe.yield || 1),
        fat: fat / (recipe.yield || 1)
      },
      healthLabels: recipe.healthLabels || [],
      cautions: recipe.cautions || [],
      vegetarian: (recipe.healthLabels || []).includes('Vegetarian'),
      vegan: (recipe.healthLabels || []).includes('Vegan'),
      glutenFree: (recipe.healthLabels || []).includes('Gluten-Free'),
      dairyFree: (recipe.healthLabels || []).includes('Dairy-Free'),
      calories: recipe.calories || 0,
      totalWeight: recipe.totalWeight || 0
    };
  }
}

module.exports = { EdamamProvider };
