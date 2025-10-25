/**
 * React Query Configuration
 *
 * Centralized query client setup for recipe API integration
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time: 5 minutes (server has 24h cache)
      staleTime: 5 * 60 * 1000,

      // Keep unused data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,

      // Retry failed requests 2 times
      retry: 2,

      // Retry delay: exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus in production
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Don't refetch on mount by default (use cache)
      refetchOnMount: false,

      // Suspense mode disabled by default
      suspense: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,

      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  // Recipes
  recipes: {
    all: ['recipes'],
    search: (params) => ['recipes', 'search', params],
    details: (provider, id) => ['recipes', 'details', provider, id],
    random: ['recipes', 'random'],
    providers: ['recipes', 'providers'],
  },

  // Favorites
  favorites: {
    all: ['favorites'],
    list: ['favorites', 'list'],
    check: (provider, externalId) => ['favorites', 'check', provider, externalId],
  },

  // Food Spending
  foodSpending: {
    all: ['foodSpending'],
    list: (startDate, endDate) => ['foodSpending', 'list', startDate, endDate],
    monthly: (year, month) => ['foodSpending', 'monthly', year, month],
    trend: (months) => ['foodSpending', 'trend', months],
    budget: ['foodSpending', 'budget'],
    // Phase 5: Prévision vs Réalité
    forecastVsReality: (startDate, endDate) => [
      'foodSpending',
      'forecastVsReality',
      startDate,
      endDate,
    ],
  },
};

/**
 * Invalidate specific query keys after mutations
 */
export const invalidateQueries = {
  favorites: () => {
    queryClient.invalidateQueries(queryKeys.favorites.all);
  },

  foodSpending: () => {
    queryClient.invalidateQueries(queryKeys.foodSpending.all);
  },

  all: () => {
    queryClient.invalidateQueries();
  },
};

export default queryClient;
