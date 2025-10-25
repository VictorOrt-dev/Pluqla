/**
 * Spoonacular API Provider
 *
 * Documentation: https://spoonacular.com/food-api/docs
 * Rate limits: Free tier = 150 req/day
 */

const axios = require('axios');
const logger = require('../../../utils/logger');

class SpoonacularProvider {
  constructor() {
    this.name = 'spoonacular';
    this.baseUrl = 'https://api.spoonacular.com';
    this.apiKey = process.env.SPOONACULAR_API_KEY;
    this.available = !!this.apiKey;
    this.unavailableUntil = null;
    this.lastError = null;

    // Rate limiting
    this.dailyQuota = 150;
    this.requestsToday = 0;
    this.quotaResetDate = new Date().toDateString();

    if (!this.apiKey) {
      logger.warn('Spoonacular API key not configured');
    } else {
      logger.info('Spoonacular provider initialized');
    }
  }

  /**
   * Check if provider is currently available
   */
  isAvailable() {
    // Check if API key exists
    if (!this.apiKey) return false;

    // Check if temporarily unavailable
    if (this.unavailableUntil && Date.now() < this.unavailableUntil) {
      return false;
    }

    // Reset daily quota if new day
    const today = new Date().toDateString();
    if (today !== this.quotaResetDate) {
      this.requestsToday = 0;
      this.quotaResetDate = today;
    }

    // Check daily quota
    if (this.requestsToday >= this.dailyQuota) {
      logger.warn('Spoonacular daily quota exceeded', {
        requests: this.requestsToday,
        quota: this.dailyQuota
      });
      return false;
    }

    return true;
  }

  /**
   * Mark provider as temporarily unavailable
   * @param {number} seconds - Duration in seconds
   */
  markUnavailable(seconds) {
    this.unavailableUntil = Date.now() + (seconds * 1000);
    logger.warn(`Spoonacular marked unavailable for ${seconds}s`);
  }

  /**
   * Get remaining quota
   */
  getQuotaRemaining() {
    return Math.max(0, this.dailyQuota - this.requestsToday);
  }

  /**
   * Make API request with error handling
   * @private
   */
  async makeRequest(endpoint, params = {}) {
    try {
      this.requestsToday++;

      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          ...params,
          apiKey: this.apiKey
        },
        timeout: 5000
      });

      this.lastError = null;
      return response.data;

    } catch (error) {
      this.lastError = error.message;

      // Handle rate limiting
      if (error.response?.status === 402 || error.response?.status === 429) {
        const quotaError = new Error('Spoonacular quota exceeded');
        quotaError.code = 'QUOTA_EXCEEDED';
        throw quotaError;
      }

      // Handle timeout
      if (error.code === 'ECONNABORTED') {
        throw new Error('Spoonacular API timeout');
      }

      throw error;
    }
  }

  /**
   * Search recipes
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} - Normalized recipes
   */
  async searchRecipes(params) {
    const { query, budgetMax, diet, timeMax, limit = 20 } = params;

    const searchParams = {
      query,
      number: limit,
      addRecipeInformation: true,
      fillIngredients: true,
      instructionsRequired: true
    };

    // Apply filters
    if (budgetMax) {
      // Convert EUR to USD for API (rough estimate)
      searchParams.maxPrice = budgetMax / 0.93;
    }

    if (diet) {
      searchParams.diet = diet;
    }

    if (timeMax) {
      searchParams.maxReadyTime = timeMax;
    }

    logger.info('Searching recipes with Spoonacular', { query, limit });

    const data = await this.makeRequest('/recipes/complexSearch', searchParams);

    // Normalize to Pluqla format
    return (data.results || []).map(recipe => this.normalizeRecipe(recipe));
  }

  /**
   * Get recipe details
   * @param {string} id - Spoonacular recipe ID
   * @returns {Promise<Object>} - Recipe details
   */
  async getRecipeDetails(id) {
    logger.info('Fetching recipe details from Spoonacular', { id });

    const recipe = await this.makeRequest(`/recipes/${id}/information`, {
      includeNutrition: true
    });

    return this.normalizeRecipe(recipe);
  }

  /**
   * Normalize Spoonacular recipe to Pluqla format
   * @private
   */
  normalizeRecipe(recipe) {
    // Extract nutrition data
    const nutrition = recipe.nutrition?.nutrients || [];
    const calories = nutrition.find(n => n.name === 'Calories')?.amount || 0;
    const protein = nutrition.find(n => n.name === 'Protein')?.amount || 0;
    const carbs = nutrition.find(n => n.name === 'Carbohydrates')?.amount || 0;
    const fat = nutrition.find(n => n.name === 'Fat')?.amount || 0;

    // Extract ingredients
    const ingredients = (recipe.extendedIngredients || []).map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      original: ing.original
    }));

    // Extract instructions
    const instructions = recipe.analyzedInstructions?.[0]?.steps || [];
    const steps = instructions.map(step => ({
      number: step.number,
      step: step.step,
      ingredients: step.ingredients?.map(i => i.name) || [],
      equipment: step.equipment?.map(e => e.name) || []
    }));

    return {
      id: recipe.id.toString(),
      title: recipe.title,
      image: recipe.image,
      servings: recipe.servings || 1,
      readyInMinutes: recipe.readyInMinutes || 0,
      pricePerServing: recipe.pricePerServing ? recipe.pricePerServing / 100 : 0, // cents to dollars
      sourceUrl: recipe.sourceUrl,
      summary: recipe.summary?.replace(/<[^>]*>/g, '') || '', // Strip HTML
      dishTypes: recipe.dishTypes || [],
      cuisines: recipe.cuisines || [],
      diets: recipe.diets || [],
      ingredients,
      instructions: steps.length > 0 ? steps : recipe.instructions || [],
      nutrition: {
        calories,
        protein,
        carbs,
        fat
      },
      vegetarian: recipe.vegetarian || false,
      vegan: recipe.vegan || false,
      glutenFree: recipe.glutenFree || false,
      dairyFree: recipe.dairyFree || false,
      veryHealthy: recipe.veryHealthy || false,
      cheap: recipe.cheap || false,
      veryPopular: recipe.veryPopular || false,
      sustainable: recipe.sustainable || false,
      aggregateLikes: recipe.aggregateLikes || 0,
      spoonacularScore: recipe.spoonacularScore || 0,
      healthScore: recipe.healthScore || 0
    };
  }
}

module.exports = { SpoonacularProvider };
