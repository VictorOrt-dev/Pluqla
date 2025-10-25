import { useState, useCallback, useEffect, useRef } from 'react';
import { apiAdapter } from '../services/api/apiAdapter';
import secureLogger from '../utils/secureLogger';

const STORAGE_KEY = 'alimentation_favorites';

// ✨ Phase 7 - Debounce delay for search optimization
const SEARCH_DEBOUNCE_MS = 300;

/**
 * ✨ Phase 1C - Smart Recipe Hook with Backend Integration
 *
 * Integrates with Phase 1A/1B backend:
 * - Fetching recipes from API with filters
 * - Search and filtering capabilities
 * - Favorite management (API + localStorage backup)
 * - 🧠 Smart suggestions based on preferences (Phase 1A)
 * - 📊 Interaction tracking with fraud detection (Phase 1B)
 * - 🔥 Popularity scores display
 * - Loading and error states
 */
export const useRecipesAPI = () => {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState(15);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // ✨ Phase 1C: Sort by popularity
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });

  // ✨ Phase 1C - Smart Suggestions State
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // ✨ Phase 1C - Interaction Tracking State
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [lastFraudCheck, setLastFraudCheck] = useState(null);

  // ✨ Phase 7 - Debounce timer ref
  const searchDebounceTimer = useRef(null);

  // Load favorites from localStorage
  const [localFavorites, setLocalFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      secureLogger.error('Failed to load favorites from localStorage', {
        error: error.message
      });
      return [];
    }
  });

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localFavorites));
    } catch (error) {
      secureLogger.error('Failed to save favorites to localStorage', {
        error: error.message
      });
    }
  }, [localFavorites]);

  /**
   * Fetch recipes from API with filters
   */
  const fetchRecipes = useCallback(async (options = {}) => {
    const {
      search = searchQuery,
      price = maxPrice,
      cat = category,
      diff = difficulty,
      limit = 50,
      offset = 0
    } = options;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (search) params.append('search', search);
      if (price) params.append('maxPrice', price);
      if (cat) params.append('category', cat);
      if (diff) params.append('difficulty', diff);
      if (sortBy) params.append('sortBy', sortBy); // ✨ Phase 1C: Sort by popularity
      params.append('limit', limit);
      params.append('offset', offset);

      const response = await apiAdapter.get(`/recipes?${params.toString()}`);

      setRecipes(response.data.recipes || []);
      setPagination(response.data.pagination || {
        total: 0,
        limit,
        offset,
        hasMore: false
      });

      secureLogger.info('Recipes fetched successfully', {
        count: response.data.recipes?.length || 0,
        filters: { search, price, cat, diff }
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to load recipes';
      setError(errorMessage);
      secureLogger.error('Failed to fetch recipes', {
        error: err.message,
        filters: { search, price, cat, diff }
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, maxPrice, category, difficulty, sortBy]);

  /**
   * Fetch recipe by ID
   */
  const fetchRecipeById = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiAdapter.get(`/recipes/${id}`);
      setSelectedRecipe(response.data.recipe);

      secureLogger.info('Recipe fetched successfully', { recipeId: id });
      return response.data.recipe;
    } catch (err) {
      const errorMessage = err.message || 'Failed to load recipe';
      setError(errorMessage);
      secureLogger.error('Failed to fetch recipe', {
        error: err.message,
        recipeId: id
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add recipe to favorites (API + localStorage)
   */
  const addFavorite = useCallback(async (recipeId) => {
    try {
      // Optimistic update to localStorage
      setLocalFavorites(prev => {
        if (prev.includes(recipeId)) return prev;
        return [...prev, recipeId];
      });

      // Sync with API
      await apiAdapter.post(`/recipes/${recipeId}/favorite`);

      secureLogger.info('Recipe added to favorites', { recipeId });
    } catch (err) {
      // Rollback on error
      setLocalFavorites(prev => prev.filter(id => id !== recipeId));

      secureLogger.error('Failed to add favorite', {
        error: err.message,
        recipeId
      });

      throw err;
    }
  }, []);

  /**
   * Remove recipe from favorites (API + localStorage)
   */
  const removeFavorite = useCallback(async (recipeId) => {
    // Store previous state for rollback
    const previousFavorites = [...localFavorites];

    try {
      // Optimistic update to localStorage
      setLocalFavorites(prev => prev.filter(id => id !== recipeId));

      // Sync with API
      await apiAdapter.delete(`/recipes/${recipeId}/favorite`);

      secureLogger.info('Recipe removed from favorites', { recipeId });
    } catch (err) {
      // Rollback on error
      setLocalFavorites(previousFavorites);

      secureLogger.error('Failed to remove favorite', {
        error: err.message,
        recipeId
      });

      throw err;
    }
  }, [localFavorites]);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = useCallback(async (recipeId) => {
    const isFav = localFavorites.includes(recipeId);

    if (isFav) {
      await removeFavorite(recipeId);
    } else {
      await addFavorite(recipeId);
    }
  }, [localFavorites, addFavorite, removeFavorite]);

  /**
   * Check if recipe is favorited
   */
  const isFavorite = useCallback((recipeId) => {
    return localFavorites.includes(recipeId);
  }, [localFavorites]);

  /**
   * Get favorite recipes (full objects)
   */
  const getFavoriteRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiAdapter.get('/recipes/favorites/list');

      secureLogger.info('Favorite recipes fetched', {
        count: response.data.favorites?.length || 0
      });

      return response.data.favorites || [];
    } catch (err) {
      const errorMessage = err.message || 'Failed to load favorite recipes';
      setError(errorMessage);
      secureLogger.error('Failed to fetch favorite recipes', {
        error: err.message
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear selected recipe
   */
  const clearSelection = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  /**
   * Refresh recipes with current filters
   */
  const refreshRecipes = useCallback(() => {
    return fetchRecipes();
  }, [fetchRecipes]);

  /**
   * ✨ Phase 7 - Debounced fetch recipes
   * Prevents API spam when user types quickly
   * @param {Object} options - Fetch options
   */
  const debouncedFetchRecipes = useCallback((options = {}) => {
    // Clear existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // Set new timer
    searchDebounceTimer.current = setTimeout(() => {
      fetchRecipes(options);
    }, SEARCH_DEBOUNCE_MS);
  }, [fetchRecipes]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  // ============================================================================
  // ✨ PHASE 1C - SMART SUGGESTIONS (Phase 1A Integration)
  // ============================================================================

  /**
   * Fetch smart recipe suggestions based on user preferences
   * Uses Phase 1A smart suggestion algorithm
   */
  const fetchSmartSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);

    try {
      const response = await apiAdapter.get('/recipes/suggestions/smart');

      if (response.data?.success && Array.isArray(response.data.suggestions)) {
        setSmartSuggestions(response.data.suggestions);

        secureLogger.info('Smart suggestions fetched', {
          count: response.data.suggestions.length,
          reasons: response.data.suggestions.map(s => s.reason)
        });
      } else {
        setSmartSuggestions([]);
      }
    } catch (err) {
      secureLogger.error('Failed to fetch smart suggestions', {
        error: err.message
      });
      setSmartSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  // ============================================================================
  // ✨ PHASE 1C - INTERACTION TRACKING (Phase 1B Integration)
  // ============================================================================

  /**
   * Track recipe interaction with fraud detection
   * @param {string} recipeId - Recipe ID
   * @param {string} interactionType - 'view', 'cook', 'favorite'
   * @returns {Promise<{success: boolean, fraudCheck?: object}>}
   */
  const trackInteraction = useCallback(async (recipeId, interactionType) => {
    if (!recipeId || !interactionType) {
      return { success: false };
    }

    setInteractionLoading(true);

    try {
      const response = await apiAdapter.post('/recipe-interactions', {
        recipeId,
        interactionType
      });

      if (response.data?.success) {
        const { fraudCheck } = response.data;

        // Store fraud check results
        setLastFraudCheck(fraudCheck);

        // Log suspicious activity
        if (fraudCheck?.isSuspicious) {
          secureLogger.warn('Suspicious interaction detected', {
            recipeId,
            interactionType,
            fraudScore: fraudCheck.score,
            reasons: fraudCheck.reasons
          });
        } else {
          secureLogger.debug('Interaction tracked', {
            recipeId,
            interactionType,
            fraudScore: fraudCheck?.score || 0
          });
        }

        return { success: true, fraudCheck };
      }

      return { success: false };
    } catch (err) {
      secureLogger.error('Failed to track interaction', {
        error: err.message,
        recipeId,
        interactionType
      });
      return { success: false };
    } finally {
      setInteractionLoading(false);
    }
  }, []);

  /**
   * Mark recipe as cooked
   */
  const markAsCooked = useCallback(async (recipeId) => {
    const result = await trackInteraction(recipeId, 'cook');

    if (result.success) {
      secureLogger.info('Recipe marked as cooked', { recipeId });
    }

    return result.success;
  }, [trackInteraction]);

  // ============================================================================
  // ✨ PHASE 1C - ENHANCED RECIPE SELECTION WITH TRACKING
  // ============================================================================

  /**
   * Fetch recipe by ID and track view interaction
   */
  const selectRecipe = useCallback(async (recipeId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiAdapter.get(`/recipes/${recipeId}`);
      setSelectedRecipe(response.data.recipe);

      // ✨ Phase 1C: Track view interaction
      await trackInteraction(recipeId, 'view');

      secureLogger.info('Recipe selected and view tracked', { recipeId });
      return response.data.recipe;
    } catch (err) {
      const errorMessage = err.message || 'Failed to load recipe';
      setError(errorMessage);
      secureLogger.error('Failed to select recipe', {
        error: err.message,
        recipeId
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [trackInteraction]);

  // ============================================================================
  // ✨ PHASE 1C - ENHANCED FAVORITES WITH TRACKING
  // ============================================================================

  /**
   * Add recipe to favorites with interaction tracking
   */
  const addFavoriteEnhanced = useCallback(async (recipeId) => {
    try {
      // Optimistic update to localStorage
      setLocalFavorites(prev => {
        if (prev.includes(recipeId)) return prev;
        return [...prev, recipeId];
      });

      // Sync with API
      await apiAdapter.post(`/recipes/${recipeId}/favorite`);

      // ✨ Phase 1C: Track favorite interaction
      await trackInteraction(recipeId, 'favorite');

      secureLogger.info('Recipe added to favorites and tracked', { recipeId });
    } catch (err) {
      // Rollback on error
      setLocalFavorites(prev => prev.filter(id => id !== recipeId));

      secureLogger.error('Failed to add favorite', {
        error: err.message,
        recipeId
      });

      throw err;
    }
  }, [trackInteraction]);

  return {
    // State
    recipes,
    selectedRecipe,
    searchQuery,
    maxPrice,
    category,
    difficulty,
    sortBy, // ✨ Phase 1C
    loading,
    isLoading: loading, // Alias for compatibility
    error,
    pagination,
    favorites: localFavorites,

    // ✨ Phase 1C - Smart Suggestions
    smartSuggestions,
    suggestionsLoading,

    // ✨ Phase 1C - Interaction Tracking
    interactionLoading,
    lastFraudCheck,

    // Setters
    setSearchQuery,
    setMaxPrice,
    setCategory,
    setDifficulty,
    setSortBy, // ✨ Phase 1C

    // Actions
    fetchRecipes,
    fetchRecipeById, // Original (no tracking)
    selectRecipe, // ✨ Phase 1C: Enhanced with view tracking
    addFavorite, // Original (no tracking)
    addFavoriteEnhanced, // ✨ Phase 1C: With tracking
    removeFavorite,
    toggleFavorite,
    isFavorite,
    getFavoriteRecipes,
    clearSelection,
    refreshRecipes,
    debouncedFetchRecipes, // ✨ Phase 7: Optimized search

    // ✨ Phase 1C - New Actions
    fetchSmartSuggestions,
    trackInteraction,
    markAsCooked
  };
};
