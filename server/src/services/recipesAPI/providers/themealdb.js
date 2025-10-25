/**
 * TheMealDB API Provider
 *
 * Documentation: https://www.themealdb.com/api.php
 * Rate limits: Free tier = unlimited (but slower)
 * Used as fallback / offline mode
 */

const axios = require('axios');
const logger = require('../../../utils/logger');

class TheMealDBProvider {
  constructor() {
    this.name = 'themealdb';
    this.baseUrl = 'https://www.themealdb.com/api/json/v1/1';
    this.available = true; // Always available (free, unlimited)
    this.unavailableUntil = null;
    this.lastError = null;

    logger.info('TheMealDB provider initialized');
  }

  isAvailable() {
    if (this.unavailableUntil && Date.now() < this.unavailableUntil) {
      return false;
    }
    return true;
  }

  markUnavailable(seconds) {
    this.unavailableUntil = Date.now() + (seconds * 1000);
    logger.warn(`TheMealDB marked unavailable for ${seconds}s`);
  }

  async makeRequest(endpoint) {
    try {
      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        timeout: 5000
      });

      this.lastError = null;
      return response.data;

    } catch (error) {
      this.lastError = error.message;

      if (error.code === 'ECONNABORTED') {
        throw new Error('TheMealDB API timeout');
      }

      throw error;
    }
  }

  async searchRecipes(params) {
    const { query, limit = 20 } = params;

    logger.info('Searching recipes with TheMealDB', { query, limit });

    // TheMealDB only supports simple search
    const data = await this.makeRequest(`search.php?s=${encodeURIComponent(query)}`);

    if (!data.meals) {
      return [];
    }

    // TheMealDB returns all matches, we need to limit
    const meals = data.meals.slice(0, limit);

    return meals.map(meal => this.normalizeRecipe(meal));
  }

  async getRecipeDetails(id) {
    logger.info('Fetching recipe details from TheMealDB', { id });

    const data = await this.makeRequest(`lookup.php?i=${id}`);

    if (!data.meals || data.meals.length === 0) {
      throw new Error('Recipe not found');
    }

    return this.normalizeRecipe(data.meals[0]);
  }

  normalizeRecipe(meal) {
    // Extract ingredients (TheMealDB has a weird format)
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient && ingredient.trim()) {
        ingredients.push({
          name: ingredient.trim(),
          amount: null,
          unit: measure?.trim() || '',
          original: `${measure} ${ingredient}`.trim()
        });
      }
    }

    // Parse instructions into steps
    const instructionText = meal.strInstructions || '';
    const steps = instructionText
      .split(/\r?\n/)
      .filter(step => step.trim().length > 0)
      .map((step, index) => ({
        number: index + 1,
        step: step.trim()
      }));

    // Estimate price (very rough)
    const estimatedPricePerServing = ingredients.length * 0.40; // ~0.40€ per ingredient

    // Estimate calories (TheMealDB doesn't provide nutrition)
    // Very rough estimation based on meal type
    let estimatedCalories = 500; // Default
    if (meal.strCategory === 'Dessert') estimatedCalories = 400;
    if (meal.strCategory === 'Vegetarian') estimatedCalories = 350;

    return {
      id: meal.idMeal,
      title: meal.strMeal,
      image: meal.strMealThumb,
      servings: 4, // TheMealDB doesn't specify, assume 4
      readyInMinutes: 0, // Not provided
      pricePerServing: estimatedPricePerServing,
      sourceUrl: meal.strSource || meal.strYoutube,
      summary: meal.strMeal,
      dishTypes: [meal.strCategory].filter(Boolean),
      cuisines: [meal.strArea].filter(Boolean),
      diets: [],
      ingredients,
      instructions: steps,
      nutrition: {
        calories: estimatedCalories,
        protein: 0,
        carbs: 0,
        fat: 0
      },
      category: meal.strCategory,
      area: meal.strArea,
      tags: meal.strTags ? meal.strTags.split(',').map(t => t.trim()) : [],
      youtubeUrl: meal.strYoutube,
      vegetarian: meal.strCategory === 'Vegetarian',
      vegan: false,
      glutenFree: false,
      dairyFree: false,
      // Note: This is fallback data, less accurate than Spoonacular/Edamam
      estimatedData: true
    };
  }

  /**
   * Get random recipe (bonus feature for "Surprise me!")
   */
  async getRandomRecipe() {
    logger.info('Fetching random recipe from TheMealDB');

    const data = await this.makeRequest('random.php');

    if (!data.meals || data.meals.length === 0) {
      throw new Error('No random recipe found');
    }

    return this.normalizeRecipe(data.meals[0]);
  }

  /**
   * Browse by category (bonus feature)
   */
  async browseByCategory(category) {
    logger.info('Browsing TheMealDB by category', { category });

    const data = await this.makeRequest(`filter.php?c=${encodeURIComponent(category)}`);

    if (!data.meals) {
      return [];
    }

    // Note: This only returns partial data (id, name, image)
    // Full details would require individual lookups
    return data.meals.map(meal => ({
      id: meal.idMeal,
      title: meal.strMeal,
      image: meal.strMealThumb,
      partialData: true // Flag to indicate we need full lookup
    }));
  }
}

module.exports = { TheMealDBProvider };
