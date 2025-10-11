/**
 * useMealSuggestions Hook
 *
 * React hook for meal suggestions functionality
 * Handles meal request submission, polling, and result management
 *
 * Usage:
 *   const { requestMeals, loading, meals, error, quota } = useMealSuggestions();
 *   requestMeals({ mealType: 'dinner', servings: 2 }).then(result => console.log(result));
 */

import { useState, useCallback } from 'react';
import apiAdapter from '../services/api/apiAdapter';

/**
 * Meal Suggestions Hook
 * @returns {Object} Hook state and methods
 */
export function useMealSuggestions() {
  const [loading, setLoading] = useState(false);
  const [meals, setMeals] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [quota, setQuota] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  /**
   * Request meal suggestions
   * @param {Object} params - Request parameters
   * @param {string} params.mealType - Type of meal (breakfast, lunch, dinner, snack, dessert, any)
   * @param {Array<string>} params.dietaryRestrictions - Dietary restrictions
   * @param {number} params.budget - Max budget in EUR (0-200)
   * @param {number} params.servings - Number of servings (1-20)
   * @param {string} params.cuisineType - Cuisine type (italian, french, chinese, etc.)
   * @param {number} params.maxCookingTime - Max cooking time in minutes (5-300)
   * @param {string} params.skillLevel - Skill level (beginner, easy, intermediate, advanced, expert)
   * @param {Array<string>} params.avoidIngredients - Ingredients to avoid
   * @param {Array<string>} params.preferredIngredients - Preferred ingredients
   * @returns {Promise<Object>} Meal suggestions result
   */
  const requestMeals = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    setMeals(null);
    setProgress(10);

    try {
      // Validate params
      const {
        mealType,
        dietaryRestrictions = [],
        budget,
        servings = 2,
        cuisineType,
        maxCookingTime,
        skillLevel,
        avoidIngredients = [],
        preferredIngredients = []
      } = params;

      // Basic validation
      if (servings && (servings < 1 || servings > 20)) {
        throw new Error('Servings must be between 1 and 20');
      }

      if (budget && (budget < 0 || budget > 200)) {
        throw new Error('Budget must be between 0 and 200 EUR');
      }

      if (maxCookingTime && (maxCookingTime < 5 || maxCookingTime > 300)) {
        throw new Error('Cooking time must be between 5 and 300 minutes');
      }

      setProgress(20);

      // Create job
      const createResponse = await apiAdapter.post('/meal-suggestions', {
        mealType,
        dietaryRestrictions,
        budget,
        servings,
        cuisineType,
        maxCookingTime,
        skillLevel,
        avoidIngredients,
        preferredIngredients,
        metadata: {
          source: 'homescreen',
          category: 'repas'
        }
      });

      if (!createResponse.data.success) {
        throw new Error(createResponse.data.error?.message || 'Failed to create job');
      }

      const jobId = createResponse.data.data.jobId;
      const quotaInfo = createResponse.data.quota;
      const isDuplicate = createResponse.data.data.duplicate;

      setQuota(quotaInfo);
      setProgress(isDuplicate ? 80 : 30);

      // Poll for result
      const jobResult = await pollJobStatus(jobId, (currentProgress) => {
        setProgress(30 + (currentProgress / 100) * 70); // 30% -> 100%
      });

      setMeals(jobResult);
      setProgress(100);

      return jobResult;

    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Poll job status until completion
   * @param {string} jobId - Job ID to poll
   * @param {Function} onProgress - Progress callback
   * @param {number} maxAttempts - Max polling attempts (default 60, ~2 minutes for AI)
   * @param {number} interval - Polling interval in ms (default 2000)
   * @returns {Promise<Object>} Job result
   */
  const pollJobStatus = async (jobId, onProgress, maxAttempts = 60, interval = 2000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await apiAdapter.get(`/meal-suggestions/${jobId}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get job status');
      }

      const jobData = response.data.data;

      // Update progress (estimate based on status)
      const progressPercent = {
        'pending': 10,
        'processing': 60,
        'completed': 100,
        'failed': 0
      }[jobData.status] || 0;

      onProgress(progressPercent);

      // Job completed successfully
      if (jobData.status === 'completed') {
        return jobData.result;
      }

      // Job failed
      if (jobData.status === 'failed') {
        throw new Error(jobData.error?.message || 'Job processing failed');
      }

      // Still pending/processing - wait and retry
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    // Timeout
    throw new Error('Request timeout - job is taking too long to process');
  };

  /**
   * Fetch user's meal suggestion history
   * @param {Object} options - Query options
   * @param {number} options.limit - Max results (default 20)
   * @param {number} options.offset - Offset for pagination (default 0)
   * @param {string} options.status - Filter by status
   * @param {string} options.mealType - Filter by meal type
   * @returns {Promise<Object>} History data
   */
  const fetchHistory = useCallback(async (options = {}) => {
    try {
      const { limit = 20, offset = 0, status, mealType } = options;

      const queryParams = new URLSearchParams();
      if (limit) queryParams.append('limit', limit);
      if (offset) queryParams.append('offset', offset);
      if (status) queryParams.append('status', status);
      if (mealType) queryParams.append('mealType', mealType);

      const response = await apiAdapter.get(`/meal-suggestions/history?${queryParams.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to fetch history');
      }

      setHistory(response.data.data.jobs);
      return response.data.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Fetch user's meal suggestion analytics
   * @returns {Promise<Object>} Analytics data
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await apiAdapter.get('/meal-suggestions/analytics');

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to fetch analytics');
      }

      setAnalytics(response.data.data);
      return response.data.data;
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setMeals(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    // State
    loading,
    meals,
    error,
    progress,
    quota,
    history,
    analytics,

    // Methods
    requestMeals,
    fetchHistory,
    fetchAnalytics,
    clearError,
    reset
  };
}

export default useMealSuggestions;
