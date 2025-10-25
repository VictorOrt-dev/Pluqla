/**
 * Recipes API Service - Multi-Provider Architecture
 *
 * Supports multiple recipe APIs with automatic fallback:
 * 1. Spoonacular (primary)
 * 2. Edamam (fallback 1)
 * 3. TheMealDB (fallback 2 / offline mode)
 *
 * Features:
 * - Automatic provider fallback on error/quota exceeded
 * - Redis cache (24h) with node-cache fallback
 * - Price conversion USD → EUR with France adjustment
 * - Pluqla EcoScore calculation
 * - Rate limiting per provider
 */

const logger = require('../../utils/logger');
const { getCacheService } = require('./cacheService');
const { SpoonacularProvider } = require('./providers/spoonacular');
const { EdamamProvider } = require('./providers/edamam');
const { TheMealDBProvider } = require('./providers/themealdb');
const { convertPrice } = require('./utils/priceConverter');
const { calculateEcoScore } = require('./utils/ecoScoreCalculator');

class RecipesAPIService {
  constructor() {
    this.cache = getCacheService();

    // Initialize providers in priority order
    this.providers = [
      new SpoonacularProvider(),
      new EdamamProvider(),
      new TheMealDBProvider()
    ];

    this.providerMap = {
      spoonacular: this.providers[0],
      edamam: this.providers[1],
      themealdb: this.providers[2]
    };

    logger.info('RecipesAPIService initialized with providers:', {
      providers: this.providers.map(p => p.name)
    });
  }

  /**
   * Search recipes with filters
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {number} params.budgetMax - Max budget per serving (EUR)
   * @param {string} params.diet - Diet type (vegetarian, vegan, etc.)
   * @param {number} params.timeMax - Max cooking time (minutes)
   * @param {number} params.limit - Results limit
   * @returns {Promise<Array>} - Normalized recipes
   */
  async searchRecipes(params) {
    const { query, budgetMax, diet, timeMax, limit = 20 } = params;

    // Generate cache key
    const cacheKey = `recipes:search:${JSON.stringify(params)}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for recipe search', { query, cached: true });
      return JSON.parse(cached);
    }

    // Try each provider until success
    for (const provider of this.providers) {
      try {
        if (!provider.isAvailable()) {
          logger.warn(`Provider ${provider.name} not available, skipping`);
          continue;
        }

        logger.info(`Searching recipes with ${provider.name}`, { query, limit });

        const recipes = await provider.searchRecipes({
          query,
          budgetMax,
          diet,
          timeMax,
          limit
        });

        // Normalize and enrich recipes
        const enrichedRecipes = await this.enrichRecipes(recipes, provider.name);

        // Cache results for 24h
        await this.cache.set(cacheKey, JSON.stringify(enrichedRecipes), 86400);

        logger.info(`Recipe search successful with ${provider.name}`, {
          query,
          count: enrichedRecipes.length
        });

        return enrichedRecipes;

      } catch (error) {
        logger.error(`${provider.name} search failed, trying next provider`, {
          error: error.message,
          query
        });

        // If quota exceeded, mark provider as unavailable temporarily
        if (error.code === 'QUOTA_EXCEEDED') {
          provider.markUnavailable(3600); // 1 hour
        }
      }
    }

    // All providers failed
    logger.error('All recipe providers failed', { query });
    throw new Error('Unable to search recipes: all providers unavailable');
  }

  /**
   * Get recipe details by ID and provider
   * @param {string} externalId - Recipe ID from provider
   * @param {string} providerName - Provider name
   * @returns {Promise<Object>} - Recipe details
   */
  async getRecipeDetails(externalId, providerName) {
    // Generate cache key
    const cacheKey = `recipe:details:${providerName}:${externalId}`;

    // Check cache (7 days TTL for details)
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for recipe details', { externalId, provider: providerName });
      return JSON.parse(cached);
    }

    const provider = this.providerMap[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    if (!provider.isAvailable()) {
      throw new Error(`Provider ${providerName} is currently unavailable`);
    }

    try {
      logger.info(`Fetching recipe details from ${providerName}`, { externalId });

      const recipe = await provider.getRecipeDetails(externalId);

      // Enrich with price conversion and eco-score
      const enrichedRecipe = await this.enrichRecipe(recipe, providerName);

      // Cache for 7 days
      await this.cache.set(cacheKey, JSON.stringify(enrichedRecipe), 604800);

      return enrichedRecipe;

    } catch (error) {
      logger.error(`Failed to fetch recipe details from ${providerName}`, {
        error: error.message,
        externalId
      });
      throw error;
    }
  }

  /**
   * Enrich multiple recipes with Pluqla-specific data
   * @private
   */
  async enrichRecipes(recipes, providerName) {
    return Promise.all(
      recipes.map(recipe => this.enrichRecipe(recipe, providerName))
    );
  }

  /**
   * Enrich a single recipe with Pluqla-specific data
   * @private
   */
  async enrichRecipe(recipe, providerName) {
    try {
      // Convert price USD → EUR
      const priceEur = convertPrice(recipe.pricePerServing || 0);

      // Calculate Pluqla EcoScore
      const ecoScore = await calculateEcoScore(recipe.ingredients || []);

      return {
        ...recipe,
        provider: providerName,
        pricePerServingEur: priceEur,
        totalPriceEur: priceEur * (recipe.servings || 1),
        ecoScore: ecoScore.score,
        ecoScoreGrade: ecoScore.grade,
        ecoScoreDetails: ecoScore.details,
        enrichedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to enrich recipe', {
        error: error.message,
        recipeId: recipe.id
      });
      // Return recipe as-is if enrichment fails
      return {
        ...recipe,
        provider: providerName,
        enrichmentFailed: true
      };
    }
  }

  /**
   * Get provider health status
   * @returns {Object} - Status of all providers
   */
  getProvidersStatus() {
    return this.providers.map(provider => ({
      name: provider.name,
      available: provider.isAvailable(),
      quotaRemaining: provider.getQuotaRemaining?.() || null,
      lastError: provider.lastError || null
    }));
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create RecipesAPIService instance
 */
function getRecipesAPIService() {
  if (!instance) {
    instance = new RecipesAPIService();
  }
  return instance;
}

module.exports = {
  getRecipesAPIService,
  RecipesAPIService
};
