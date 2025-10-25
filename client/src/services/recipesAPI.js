/**
 * Recipes API Client
 *
 * Frontend service for interacting with recipes API endpoints
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004/api';

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Create axios instance with auth interceptor
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Recipes API Service
 */
export const recipesAPI = {
  /**
   * Search recipes
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Search results
   */
  searchRecipes: async (params) => {
    const { data } = await apiClient.get('/recipes/search', { params });
    return data.data;
  },

  /**
   * Get recipe details
   * @param {string} provider - Provider name
   * @param {string} id - Recipe ID
   * @returns {Promise<Object>} Recipe details
   */
  getRecipeDetails: async (provider, id) => {
    const { data } = await apiClient.get(`/recipes/${provider}/${id}`);
    return data.data.recipe;
  },

  /**
   * Get random recipe
   * @returns {Promise<Object>} Random recipe
   */
  getRandomRecipe: async () => {
    const { data } = await apiClient.get('/recipes/random');
    return data.data.recipe;
  },

  /**
   * Get providers status
   * @returns {Promise<Array>} Providers status
   */
  getProvidersStatus: async () => {
    const { data } = await apiClient.get('/recipes/providers/status');
    return data.data.providers;
  },
};

/**
 * Favorites API Service
 */
export const favoritesAPI = {
  /**
   * Get user's favorite recipes
   * @returns {Promise<Array>} Favorites
   */
  getFavorites: async () => {
    const { data } = await apiClient.get('/recipes/favorites');
    return data.data.favorites;
  },

  /**
   * Add recipe to favorites
   * @param {string} externalId - Recipe ID from provider
   * @param {string} provider - Provider name
   * @returns {Promise<Object>} Created favorite
   */
  addFavorite: async (externalId, provider) => {
    const { data } = await apiClient.post('/recipes/favorites', {
      externalId,
      provider,
    });
    return data.data.favorite;
  },

  /**
   * Remove recipe from favorites
   * @param {string} favoriteId - Favorite ID
   * @returns {Promise<void>}
   */
  removeFavorite: async (favoriteId) => {
    await apiClient.delete(`/recipes/favorites/${favoriteId}`);
  },

  /**
   * Check if recipe is favorited
   * @param {string} provider - Provider name
   * @param {string} externalId - Recipe ID
   * @returns {Promise<boolean>} Is favorited
   */
  checkFavorite: async (provider, externalId) => {
    const { data } = await apiClient.get(`/recipes/favorites/check/${provider}/${externalId}`);
    return data.data.isFavorited;
  },

  /**
   * Refresh favorite data
   * @param {string} favoriteId - Favorite ID
   * @returns {Promise<Object>} Updated favorite
   */
  refreshFavorite: async (favoriteId) => {
    const { data } = await apiClient.post(`/recipes/favorites/${favoriteId}/refresh`);
    return data.data.favorite;
  },
};

/**
 * Food Spending API Service
 */
export const foodSpendingAPI = {
  /**
   * Log food spending
   * @param {Object} spendingData - Spending data
   * @returns {Promise<Object>} Created log
   */
  logSpending: async (spendingData) => {
    const { data } = await apiClient.post('/food-spending', spendingData);
    return data.data.log;
  },

  /**
   * Get food spending logs
   * @param {string} startDate - Start date (ISO)
   * @param {string} endDate - End date (ISO)
   * @returns {Promise<Array>} Spending logs
   */
  getSpending: async (startDate, endDate) => {
    const { data } = await apiClient.get('/food-spending', {
      params: { startDate, endDate },
    });
    return data.data.logs;
  },

  /**
   * Get monthly statistics
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Monthly stats
   */
  getMonthlyStats: async (year, month) => {
    const { data } = await apiClient.get('/food-spending/stats/monthly', {
      params: { year, month },
    });
    return data.data;
  },

  /**
   * Get spending trend
   * @param {number} months - Number of months
   * @returns {Promise<Array>} Trend data
   */
  getSpendingTrend: async (months = 6) => {
    const { data } = await apiClient.get('/food-spending/stats/trend', {
      params: { months },
    });
    return data.data.trend;
  },

  /**
   * Update food budget
   * @param {number} budgetEur - Monthly budget in EUR
   * @returns {Promise<Object>} Updated budget
   */
  updateBudget: async (budgetEur) => {
    const { data } = await apiClient.put('/food-spending/budget', { budgetEur });
    return data.data;
  },

  /**
   * Delete spending log
   * @param {string} logId - Log ID
   * @returns {Promise<void>}
   */
  deleteSpending: async (logId) => {
    await apiClient.delete(`/food-spending/${logId}`);
  },

  // ============================================================================
  // PHASE 5: Prévision vs Réalité
  // ============================================================================

  /**
   * Trigger manual matching of forecasts with transactions
   * @param {string} startDate - Start date (ISO format, optional)
   * @param {string} endDate - End date (ISO format, optional)
   * @returns {Promise<Object>} Match results
   */
  matchForecasts: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const { data } = await apiClient.post('/food-spending/match', null, { params });
    return data.data;
  },

  /**
   * Get forecast vs reality statistics
   * @param {string} startDate - Start date (ISO format, optional)
   * @param {string} endDate - End date (ISO format, optional)
   * @returns {Promise<Object>} Stats
   */
  getForecastVsRealityStats: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const { data } = await apiClient.get('/food-spending/forecast-vs-reality', { params });
    return data.data;
  },

  /**
   * Check for potential duplicate before adding forecast
   * @param {number} amount - Amount to check
   * @param {string} date - Date to check (ISO format)
   * @returns {Promise<Object>} Duplicate check result
   */
  checkDuplicate: async (amount, date) => {
    const { data } = await apiClient.post('/food-spending/check-duplicate', {
      amount,
      date,
    });
    return data.data;
  },
};

export default {
  recipes: recipesAPI,
  favorites: favoritesAPI,
  foodSpending: foodSpendingAPI,
};
