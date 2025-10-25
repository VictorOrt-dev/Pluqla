/**
 * Custom React Query hooks for Recipes API (External APIs)
 *
 * Replaces useRecipesAPI.js with React Query-based hooks
 * for Spoonacular/Edamam/TheMealDB integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesAPI, favoritesAPI, foodSpendingAPI } from '../services/recipesAPI';
import { queryKeys, invalidateQueries } from '../config/queryClient';

// Import toast utility (create if doesn't exist)
const showToast = (message, type = 'info') => {
  // Temporary implementation - will be replaced with PluqlaToast
  console.log(`[${type.toUpperCase()}] ${message}`);
};

// ============================================================================
// RECIPES HOOKS
// ============================================================================

/**
 * Hook to search recipes
 * @param {Object} params - Search parameters
 * @param {Object} options - React Query options
 */
export const useRecipeSearch = (params, options = {}) => {
  return useQuery({
    queryKey: queryKeys.recipes.search(params),
    queryFn: () => recipesAPI.searchRecipes(params),
    enabled: !!params.query, // Only run if query is provided
    ...options,
  });
};

/**
 * Hook to get recipe details
 * @param {string} provider - Provider name
 * @param {string} id - Recipe ID
 * @param {Object} options - React Query options
 */
export const useRecipeDetails = (provider, id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.recipes.details(provider, id),
    queryFn: () => recipesAPI.getRecipeDetails(provider, id),
    enabled: !!(provider && id), // Only run if both are provided
    ...options,
  });
};

/**
 * Hook to get random recipe
 * @param {Object} options - React Query options
 */
export const useRandomRecipe = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.recipes.random,
    queryFn: () => recipesAPI.getRandomRecipe(),
    ...options,
  });
};

/**
 * Hook to get providers status
 * @param {Object} options - React Query options
 */
export const useProvidersStatus = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.recipes.providers,
    queryFn: () => recipesAPI.getProvidersStatus(),
    refetchInterval: 60000, // Refetch every minute
    ...options,
  });
};

// ============================================================================
// FAVORITES HOOKS
// ============================================================================

/**
 * Hook to get user's favorite recipes
 * @param {Object} options - React Query options
 */
export const useFavoriteRecipes = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.favorites.list,
    queryFn: () => favoritesAPI.getFavorites(),
    ...options,
  });
};

/**
 * Hook to check if recipe is favorited
 * @param {string} provider - Provider name
 * @param {string} externalId - Recipe ID
 * @param {Object} options - React Query options
 */
export const useIsFavorited = (provider, externalId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.favorites.check(provider, externalId),
    queryFn: () => favoritesAPI.checkFavorite(provider, externalId),
    enabled: !!(provider && externalId),
    ...options,
  });
};

/**
 * Hook to add recipe to favorites
 */
export const useAddFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ externalId, provider }) =>
      favoritesAPI.addFavorite(externalId, provider),
    onSuccess: (data) => {
      // Invalidate favorites queries
      invalidateQueries.favorites();

      // Update check query
      queryClient.setQueryData(
        queryKeys.favorites.check(data.provider, data.externalId),
        true
      );

      showToast('Recette ajoutée aux favoris ! 🌟', 'success');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'ajout aux favoris';
      showToast(message, 'error');
    },
  });
};

/**
 * Hook to remove recipe from favorites
 */
export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ favoriteId, provider, externalId }) =>
      favoritesAPI.removeFavorite(favoriteId),
    onSuccess: (_, variables) => {
      // Invalidate favorites queries
      invalidateQueries.favorites();

      // Update check query
      if (variables.provider && variables.externalId) {
        queryClient.setQueryData(
          queryKeys.favorites.check(variables.provider, variables.externalId),
          false
        );
      }

      showToast('Recette retirée des favoris', 'info');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      showToast(message, 'error');
    },
  });
};

/**
 * Hook to refresh favorite data
 */
export const useRefreshFavorite = () => {
  return useMutation({
    mutationFn: (favoriteId) => favoritesAPI.refreshFavorite(favoriteId),
    onSuccess: () => {
      invalidateQueries.favorites();
      showToast('Données mises à jour ! ✨', 'success');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour';
      showToast(message, 'error');
    },
  });
};

// ============================================================================
// FOOD SPENDING HOOKS
// ============================================================================

/**
 * Hook to get food spending logs
 * @param {string} startDate - Start date (ISO)
 * @param {string} endDate - End date (ISO)
 * @param {Object} options - React Query options
 */
export const useFoodSpending = (startDate, endDate, options = {}) => {
  return useQuery({
    queryKey: queryKeys.foodSpending.list(startDate, endDate),
    queryFn: () => foodSpendingAPI.getSpending(startDate, endDate),
    ...options,
  });
};

/**
 * Hook to get monthly food spending statistics
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Object} options - React Query options
 */
export const useMonthlyFoodStats = (year, month, options = {}) => {
  return useQuery({
    queryKey: queryKeys.foodSpending.monthly(year, month),
    queryFn: () => foodSpendingAPI.getMonthlyStats(year, month),
    enabled: !!(year && month),
    ...options,
  });
};

/**
 * Hook to get food spending trend
 * @param {number} months - Number of months
 * @param {Object} options - React Query options
 */
export const useFoodSpendingTrend = (months = 6, options = {}) => {
  return useQuery({
    queryKey: queryKeys.foodSpending.trend(months),
    queryFn: () => foodSpendingAPI.getSpendingTrend(months),
    ...options,
  });
};

/**
 * Hook to log food spending
 */
export const useLogFoodSpending = () => {
  return useMutation({
    mutationFn: (spendingData) => foodSpendingAPI.logSpending(spendingData),
    onSuccess: () => {
      invalidateQueries.foodSpending();
      showToast('Dépense enregistrée ! 💰', 'success');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
      showToast(message, 'error');
    },
  });
};

/**
 * Hook to update food budget
 */
export const useUpdateFoodBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budgetEur) => foodSpendingAPI.updateBudget(budgetEur),
    onSuccess: () => {
      invalidateQueries.foodSpending();
      queryClient.invalidateQueries(queryKeys.foodSpending.budget);
      showToast('Budget mis à jour ! 📊', 'success');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour du budget';
      showToast(message, 'error');
    },
  });
};

/**
 * Hook to delete food spending log
 */
export const useDeleteFoodSpending = () => {
  return useMutation({
    mutationFn: (logId) => foodSpendingAPI.deleteSpending(logId),
    onSuccess: () => {
      invalidateQueries.foodSpending();
      showToast('Dépense supprimée', 'info');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      showToast(message, 'error');
    },
  });
};

// ============================================================================
// PHASE 5: PRÉVISION VS RÉALITÉ HOOKS
// ============================================================================

/**
 * Hook to get forecast vs reality statistics
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @param {Object} options - React Query options
 */
export const useForecastVsRealityStats = (startDate, endDate, options = {}) => {
  return useQuery({
    queryKey: queryKeys.foodSpending.forecastVsReality(startDate, endDate),
    queryFn: () => foodSpendingAPI.getForecastVsRealityStats(startDate, endDate),
    ...options,
  });
};

/**
 * Hook to trigger manual matching of forecasts with transactions
 */
export const useMatchForecasts = () => {
  return useMutation({
    mutationFn: ({ startDate, endDate }) =>
      foodSpendingAPI.matchForecasts(startDate, endDate),
    onSuccess: (data) => {
      invalidateQueries.foodSpending();
      showToast(
        `Matching terminé ! ${data.matched} correspondances trouvées 🎯`,
        'success'
      );
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors du matching';
      showToast(message, 'error');
    },
  });
};

/**
 * Hook to check for duplicate before adding forecast
 */
export const useCheckDuplicate = () => {
  return useMutation({
    mutationFn: ({ amount, date }) => foodSpendingAPI.checkDuplicate(amount, date),
    // No toast on success - handled by component
    onError: (error) => {
      const message = error.response?.data?.message || 'Erreur lors de la vérification';
      showToast(message, 'error');
    },
  });
};
