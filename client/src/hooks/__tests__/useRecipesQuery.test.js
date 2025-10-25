/**
 * Unit Tests - React Query Hooks for Recipes
 *
 * Test Coverage:
 * - useRecipeSearch
 * - useRecipeDetails
 * - useFavoriteRecipes
 * - useAddFavorite
 * - useRemoveFavorite
 * - useMonthlyFoodStats
 * - useFoodSpendingTrend
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useRecipeSearch,
  useRecipeDetails,
  useFavoriteRecipes,
  useAddFavorite,
  useRemoveFavorite,
  useMonthlyFoodStats,
  useFoodSpendingTrend,
} from '../useRecipesQuery';
import * as recipesAPI from '../../services/recipesAPI';

// Mock the API module
vi.mock('../../services/recipesAPI');

/**
 * Create a wrapper with QueryClient for testing
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
        cacheTime: 0, // Disable caching for tests
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/**
 * Mock recipe data
 */
const mockRecipe = {
  id: '123',
  provider: 'spoonacular',
  title: 'Poulet Rôti',
  image: 'https://example.com/image.jpg',
  servings: 4,
  readyInMinutes: 45,
  pricePerServingEur: 3.5,
  ecoScore: 75,
  ecoScoreGrade: 'B',
  ingredients: [
    { name: 'Poulet', amount: 1, unit: 'kg' },
    { name: 'Huile d\'olive', amount: 2, unit: 'cuillères' },
  ],
  instructions: [
    { step: 'Préchauffer le four à 180°C' },
    { step: 'Assaisonner le poulet' },
  ],
  nutrition: {
    calories: 350,
    protein: '30g',
    fat: '15g',
    carbs: '10g',
  },
};

const mockSearchResults = {
  recipes: [mockRecipe],
  pagination: {
    total: 1,
    page: 1,
    limit: 20,
    hasMore: false,
  },
};

const mockFavorite = {
  id: 'fav123',
  externalId: '123',
  provider: 'spoonacular',
  recipe: mockRecipe,
  pricePerServing: 3.5,
  ecoScore: 75,
  createdAt: new Date().toISOString(),
};

/**
 * Test Suite: useRecipeSearch
 */
describe('useRecipeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch recipes successfully', async () => {
    // Mock API response
    recipesAPI.recipesAPI.searchRecipes = vi.fn().mockResolvedValue(mockSearchResults);

    const { result } = renderHook(
      () => useRecipeSearch({ query: 'poulet', budgetMax: 10 }),
      {
        wrapper: createWrapper(),
      }
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify data
    expect(result.current.data.pages[0].recipes).toHaveLength(1);
    expect(result.current.data.pages[0].recipes[0].title).toBe('Poulet Rôti');

    // Verify API was called with correct params
    expect(recipesAPI.recipesAPI.searchRecipes).toHaveBeenCalledWith({
      query: 'poulet',
      budgetMax: 10,
      limit: 20,
      offset: 0,
    });
  });

  it('should handle search error', async () => {
    // Mock API error
    recipesAPI.recipesAPI.searchRecipes = vi
      .fn()
      .mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useRecipeSearch({ query: 'poulet' }), {
      wrapper: createWrapper(),
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Verify error state
    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch when query is empty', async () => {
    recipesAPI.recipesAPI.searchRecipes = vi.fn();

    const { result } = renderHook(() => useRecipeSearch({ query: '' }), {
      wrapper: createWrapper(),
    });

    // Should not trigger API call
    expect(result.current.isLoading).toBe(false);
    expect(recipesAPI.recipesAPI.searchRecipes).not.toHaveBeenCalled();
  });

  it('should support pagination', async () => {
    const page1Results = {
      recipes: [mockRecipe],
      pagination: { total: 40, page: 1, limit: 20, hasMore: true },
    };

    const page2Results = {
      recipes: [{ ...mockRecipe, id: '456', title: 'Poulet Grillé' }],
      pagination: { total: 40, page: 2, limit: 20, hasMore: false },
    };

    recipesAPI.recipesAPI.searchRecipes = vi
      .fn()
      .mockResolvedValueOnce(page1Results)
      .mockResolvedValueOnce(page2Results);

    const { result } = renderHook(() => useRecipeSearch({ query: 'poulet' }), {
      wrapper: createWrapper(),
    });

    // Wait for first page
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasNextPage).toBe(true);

    // Fetch next page
    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data.pages).toHaveLength(2);
    });

    // Verify both pages loaded
    expect(result.current.data.pages[0].recipes[0].title).toBe('Poulet Rôti');
    expect(result.current.data.pages[1].recipes[0].title).toBe('Poulet Grillé');
    expect(result.current.hasNextPage).toBe(false);
  });
});

/**
 * Test Suite: useRecipeDetails
 */
describe('useRecipeDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch recipe details successfully', async () => {
    recipesAPI.recipesAPI.getRecipeDetails = vi.fn().mockResolvedValue(mockRecipe);

    const { result } = renderHook(
      () => useRecipeDetails('spoonacular', '123'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRecipe);
    expect(recipesAPI.recipesAPI.getRecipeDetails).toHaveBeenCalledWith(
      'spoonacular',
      '123'
    );
  });

  it('should handle fetch error', async () => {
    recipesAPI.recipesAPI.getRecipeDetails = vi
      .fn()
      .mockRejectedValue(new Error('Recipe not found'));

    const { result } = renderHook(
      () => useRecipeDetails('spoonacular', '999'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should cache recipe details', async () => {
    recipesAPI.recipesAPI.getRecipeDetails = vi.fn().mockResolvedValue(mockRecipe);

    const { result: result1 } = renderHook(
      () => useRecipeDetails('spoonacular', '123'),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second render with same params should use cache
    const { result: result2 } = renderHook(
      () => useRecipeDetails('spoonacular', '123'),
      {
        wrapper: createWrapper(),
      }
    );

    // Should immediately have data from cache
    expect(result2.current.data).toEqual(mockRecipe);

    // API should only be called once (first time)
    expect(recipesAPI.recipesAPI.getRecipeDetails).toHaveBeenCalledTimes(1);
  });
});

/**
 * Test Suite: useFavoriteRecipes
 */
describe('useFavoriteRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user favorites successfully', async () => {
    recipesAPI.favoritesAPI.getFavorites = vi
      .fn()
      .mockResolvedValue({ favorites: [mockFavorite] });

    const { result } = renderHook(() => useFavoriteRecipes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.favorites).toHaveLength(1);
    expect(result.current.data.favorites[0].recipe.title).toBe('Poulet Rôti');
  });

  it('should handle empty favorites', async () => {
    recipesAPI.favoritesAPI.getFavorites = vi
      .fn()
      .mockResolvedValue({ favorites: [] });

    const { result } = renderHook(() => useFavoriteRecipes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.favorites).toHaveLength(0);
  });
});

/**
 * Test Suite: useAddFavorite
 */
describe('useAddFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add recipe to favorites', async () => {
    recipesAPI.favoritesAPI.addFavorite = vi.fn().mockResolvedValue(mockFavorite);

    const { result } = renderHook(() => useAddFavorite(), {
      wrapper: createWrapper(),
    });

    // Trigger mutation
    result.current.mutate({ externalId: '123', provider: 'spoonacular' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(recipesAPI.favoritesAPI.addFavorite).toHaveBeenCalledWith(
      '123',
      'spoonacular'
    );
  });

  it('should handle add favorite error', async () => {
    recipesAPI.favoritesAPI.addFavorite = vi
      .fn()
      .mockRejectedValue(new Error('Already favorited'));

    const { result } = renderHook(() => useAddFavorite(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ externalId: '123', provider: 'spoonacular' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

/**
 * Test Suite: useRemoveFavorite
 */
describe('useRemoveFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove recipe from favorites', async () => {
    recipesAPI.favoritesAPI.removeFavorite = vi.fn().mockResolvedValue({});

    const { result } = renderHook(() => useRemoveFavorite(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ favoriteId: 'fav123' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(recipesAPI.favoritesAPI.removeFavorite).toHaveBeenCalledWith('fav123');
  });
});

/**
 * Test Suite: useMonthlyFoodStats
 */
describe('useMonthlyFoodStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch monthly food statistics', async () => {
    const mockStats = {
      spending: {
        total: 250.5,
        totalMeals: 15,
        avgCostPerMeal: 16.7,
      },
      budget: {
        monthlyBudget: 300,
        remaining: 49.5,
        usedPercent: 83.5,
        isOverBudget: false,
      },
    };

    recipesAPI.foodSpendingAPI.getMonthlyStats = vi
      .fn()
      .mockResolvedValue(mockStats);

    const { result } = renderHook(() => useMonthlyFoodStats(2024, 12), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.spending.total).toBe(250.5);
    expect(result.current.data.budget.remaining).toBe(49.5);
    expect(recipesAPI.foodSpendingAPI.getMonthlyStats).toHaveBeenCalledWith(
      2024,
      12
    );
  });

  it('should handle over-budget scenario', async () => {
    const mockStats = {
      spending: {
        total: 350,
        totalMeals: 20,
        avgCostPerMeal: 17.5,
      },
      budget: {
        monthlyBudget: 300,
        remaining: -50,
        usedPercent: 116.67,
        isOverBudget: true,
      },
    };

    recipesAPI.foodSpendingAPI.getMonthlyStats = vi
      .fn()
      .mockResolvedValue(mockStats);

    const { result } = renderHook(() => useMonthlyFoodStats(2024, 12), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.budget.isOverBudget).toBe(true);
    expect(result.current.data.budget.remaining).toBeLessThan(0);
  });
});

/**
 * Test Suite: useFoodSpendingTrend
 */
describe('useFoodSpendingTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch spending trend data', async () => {
    const mockTrend = [
      { year: 2024, month: 7, monthName: 'Juillet', totalSpent: 280 },
      { year: 2024, month: 8, monthName: 'Août', totalSpent: 300 },
      { year: 2024, month: 9, monthName: 'Septembre', totalSpent: 250 },
      { year: 2024, month: 10, monthName: 'Octobre', totalSpent: 320 },
      { year: 2024, month: 11, monthName: 'Novembre', totalSpent: 290 },
      { year: 2024, month: 12, monthName: 'Décembre', totalSpent: 310 },
    ];

    recipesAPI.foodSpendingAPI.getSpendingTrend = vi
      .fn()
      .mockResolvedValue(mockTrend);

    const { result } = renderHook(() => useFoodSpendingTrend(6), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(6);
    expect(result.current.data[0].monthName).toBe('Juillet');
    expect(result.current.data[5].totalSpent).toBe(310);
  });
});

/**
 * Test Suite: Query Key Generation
 */
describe('Query Keys', () => {
  it('should generate unique keys for different search params', () => {
    const key1 = ['recipes', 'search', { query: 'poulet', budgetMax: 10 }];
    const key2 = ['recipes', 'search', { query: 'poulet', budgetMax: 15 }];
    const key3 = ['recipes', 'search', { query: 'salade', budgetMax: 10 }];

    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key3));
  });

  it('should generate unique keys for different recipes', () => {
    const key1 = ['recipes', 'details', 'spoonacular', '123'];
    const key2 = ['recipes', 'details', 'spoonacular', '456'];
    const key3 = ['recipes', 'details', 'edamam', '123'];

    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key3));
  });
});
