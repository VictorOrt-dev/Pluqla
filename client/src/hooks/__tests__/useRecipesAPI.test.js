/**
 * Tests unitaires - useRecipesAPI Hook
 *
 * Coverage des fonctionnalités:
 * - fetchRecipes avec filtres et pagination
 * - toggleFavorite avec optimistic update et rollback
 * - fetchSmartSuggestions IA Phase 1A
 * - trackInteraction avec fraud detection Phase 1B
 * - localStorage persistence des favoris
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecipesAPI } from '../useRecipesAPI';
import { apiAdapter } from '../../services/api/apiAdapter';
import secureLogger from '../../utils/secureLogger';

// Mock dependencies
jest.mock('../../services/api/apiAdapter');
jest.mock('../../utils/secureLogger');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useRecipesAPI Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('fetchRecipes', () => {
    it('should fetch recipes successfully with filters', async () => {
      const mockRecipes = [
        { id: '1', title: 'Pasta', price: 8, servings: 4 },
        { id: '2', title: 'Pizza', price: 12, servings: 6 }
      ];

      apiAdapter.get.mockResolvedValueOnce({
        data: {
          recipes: mockRecipes,
          pagination: { total: 2, limit: 50, offset: 0, hasMore: false }
        }
      });

      const { result } = renderHook(() => useRecipesAPI());

      expect(result.current.loading).toBe(false);
      expect(result.current.recipes).toEqual([]);

      await act(async () => {
        await result.current.fetchRecipes();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(apiAdapter.get).toHaveBeenCalledWith(expect.stringContaining('/recipes?'));
      expect(result.current.recipes).toEqual(mockRecipes);
      expect(result.current.pagination.total).toBe(2);
      expect(result.current.error).toBeNull();
    });

    it('should apply search and price filters correctly', async () => {
      apiAdapter.get.mockResolvedValueOnce({
        data: { recipes: [], pagination: { total: 0 } }
      });

      const { result } = renderHook(() => useRecipesAPI());

      act(() => {
        result.current.setSearchQuery('pasta');
        result.current.setMaxPrice(10);
      });

      await act(async () => {
        await result.current.fetchRecipes();
      });

      expect(apiAdapter.get).toHaveBeenCalledWith(
        expect.stringContaining('search=pasta')
      );
      expect(apiAdapter.get).toHaveBeenCalledWith(
        expect.stringContaining('maxPrice=10')
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error');
      apiAdapter.get.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.fetchRecipes();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.recipes).toEqual([]);
      expect(secureLogger.error).toHaveBeenCalledWith(
        'Failed to fetch recipes',
        expect.any(Object)
      );
    });

    it('should support pagination with offset', async () => {
      apiAdapter.get.mockResolvedValueOnce({
        data: {
          recipes: [{ id: '3', title: 'Salad' }],
          pagination: { total: 100, limit: 50, offset: 50, hasMore: false }
        }
      });

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.fetchRecipes({ offset: 50 });
      });

      expect(apiAdapter.get).toHaveBeenCalledWith(
        expect.stringContaining('offset=50')
      );
      expect(result.current.pagination.offset).toBe(50);
    });
  });

  describe('toggleFavorite', () => {
    it('should add recipe to favorites with optimistic update', async () => {
      const recipeId = 'recipe-1';

      apiAdapter.post.mockResolvedValueOnce({
        data: {
          favorite: { id: 'fav-1', recipeId, userId: 'user-1', createdAt: new Date().toISOString() }
        }
      });

      const { result } = renderHook(() => useRecipesAPI());

      expect(result.current.favorites).toEqual([]);

      await act(async () => {
        await result.current.toggleFavorite(recipeId);
      });

      await waitFor(() => {
        expect(result.current.favorites).toContain(recipeId);
      });

      expect(apiAdapter.post).toHaveBeenCalledWith(
        `/recipes/${recipeId}/favorite`
      );
    });

    it('should remove recipe from favorites', async () => {
      const recipeId = 'recipe-1';

      // Pre-populate favorites
      localStorageMock.setItem('alimentation_favorites', JSON.stringify([recipeId]));

      apiAdapter.delete.mockResolvedValueOnce({
        data: { message: 'Removed successfully' }
      });

      const { result } = renderHook(() => useRecipesAPI());

      expect(result.current.favorites).toContain(recipeId);

      await act(async () => {
        await result.current.toggleFavorite(recipeId);
      });

      await waitFor(() => {
        expect(result.current.favorites).not.toContain(recipeId);
      });

      expect(apiAdapter.delete).toHaveBeenCalledWith(
        `/recipes/${recipeId}/favorite`
      );
    });

    it('should rollback on API error', async () => {
      const recipeId = 'recipe-1';
      const mockError = new Error('API Error');
      apiAdapter.post.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useRecipesAPI());

      expect(result.current.favorites).toEqual([]);

      await act(async () => {
        await result.current.toggleFavorite(recipeId);
      });

      await waitFor(() => {
        expect(result.current.favorites).toEqual([]);
      });

      expect(secureLogger.error).toHaveBeenCalledWith(
        'Failed to toggle favorite',
        expect.any(Object)
      );
    });
  });

  describe('fetchSmartSuggestions - Phase 1A', () => {
    it('should fetch smart AI suggestions successfully', async () => {
      const mockSuggestions = [
        { id: '1', title: 'AI Recipe 1', ai_enriched: true },
        { id: '2', title: 'AI Recipe 2', ai_enriched: true }
      ];

      apiAdapter.get.mockResolvedValueOnce({
        data: { suggestions: mockSuggestions }
      });

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.fetchSmartSuggestions();
      });

      await waitFor(() => {
        expect(result.current.smartSuggestions).toEqual(mockSuggestions);
      });

      expect(apiAdapter.get).toHaveBeenCalledWith('/recipes/suggestions/smart');
      expect(result.current.suggestionsLoading).toBe(false);
    });

    it('should handle empty suggestions gracefully', async () => {
      apiAdapter.get.mockResolvedValueOnce({
        data: { suggestions: [] }
      });

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.fetchSmartSuggestions();
      });

      expect(result.current.smartSuggestions).toEqual([]);
    });
  });

  describe('trackInteraction - Phase 1B Fraud Detection', () => {
    it('should track recipe interaction successfully', async () => {
      const recipeId = 'recipe-1';
      const interaction = { type: 'view', duration: 30 };

      apiAdapter.post.mockResolvedValueOnce({
        data: {
          interaction: { id: 'int-1', recipeId, ...interaction },
          fraudCheck: { suspicious: false, score: 0.1 }
        }
      });

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.trackInteraction(recipeId, interaction);
      });

      expect(apiAdapter.post).toHaveBeenCalledWith('/recipe-interactions', {
        recipeId,
        ...interaction
      });
      expect(result.current.lastFraudCheck).toEqual({
        suspicious: false,
        score: 0.1
      });
    });

    it('should handle fraud detection warnings', async () => {
      const recipeId = 'recipe-1';
      const interaction = { type: 'view', duration: 1 };

      apiAdapter.post.mockResolvedValueOnce({
        data: {
          interaction: { id: 'int-2', recipeId, ...interaction },
          fraudCheck: { suspicious: true, score: 0.85, reason: 'Too many rapid interactions' }
        }
      });

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.trackInteraction(recipeId, interaction);
      });

      expect(result.current.lastFraudCheck.suspicious).toBe(true);
      expect(result.current.lastFraudCheck.score).toBeGreaterThan(0.8);
    });
  });

  describe('markAsCooked - Phase 1B', () => {
    it('should mark recipe as cooked and track interaction', async () => {
      const recipeId = 'recipe-1';

      apiAdapter.post.mockResolvedValueOnce({
        data: {
          interaction: { id: 'int-3', recipeId, type: 'cooked' },
          fraudCheck: { suspicious: false }
        }
      });

      const { result } = renderHook(() => useRecipesAPI());

      let success;
      await act(async () => {
        success = await result.current.markAsCooked(recipeId);
      });

      expect(success).toBe(true);
      expect(apiAdapter.post).toHaveBeenCalledWith('/recipe-interactions', {
        recipeId,
        type: 'cooked',
        timestamp: expect.any(String)
      });
    });

    it('should handle error when marking as cooked', async () => {
      const recipeId = 'recipe-1';
      apiAdapter.post.mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useRecipesAPI());

      let success;
      await act(async () => {
        success = await result.current.markAsCooked(recipeId);
      });

      expect(success).toBe(false);
      expect(secureLogger.error).toHaveBeenCalled();
    });
  });

  describe('localStorage Persistence', () => {
    it('should load favorites from localStorage on init', () => {
      const storedFavorites = ['recipe-1', 'recipe-2'];
      localStorageMock.setItem('alimentation_favorites', JSON.stringify(storedFavorites));

      const { result } = renderHook(() => useRecipesAPI());

      expect(result.current.favorites).toEqual(storedFavorites);
    });

    it('should save favorites to localStorage when changed', async () => {
      const recipeId = 'recipe-1';
      apiAdapter.post.mockResolvedValueOnce({ data: { favorite: {} } });

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.toggleFavorite(recipeId);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'alimentation_favorites',
          expect.stringContaining(recipeId)
        );
      });
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useRecipesAPI());

      expect(result.current.favorites).toEqual([]);
      expect(secureLogger.error).toHaveBeenCalledWith(
        'Failed to load favorites from localStorage',
        expect.any(Object)
      );
    });
  });

  describe('selectRecipe and clearSelection', () => {
    it('should select a recipe by ID', async () => {
      const mockRecipe = { id: '1', title: 'Pasta', ingredients: [] };

      apiAdapter.get.mockResolvedValueOnce({
        data: { recipe: mockRecipe }
      });

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.selectRecipe('1');
      });

      expect(apiAdapter.get).toHaveBeenCalledWith('/recipes/1');
      expect(result.current.selectedRecipe).toEqual(mockRecipe);
    });

    it('should clear selected recipe', () => {
      const { result } = renderHook(() => useRecipesAPI());

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedRecipe).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should update search query', () => {
      const { result } = renderHook(() => useRecipesAPI());

      act(() => {
        result.current.setSearchQuery('pizza');
      });

      expect(result.current.searchQuery).toBe('pizza');
    });

    it('should update max price', () => {
      const { result } = renderHook(() => useRecipesAPI());

      act(() => {
        result.current.setMaxPrice(15);
      });

      expect(result.current.maxPrice).toBe(15);
    });

    it('should update sort by', () => {
      const { result } = renderHook(() => useRecipesAPI());

      act(() => {
        result.current.setSortBy('recent');
      });

      expect(result.current.sortBy).toBe('recent');
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state on successful fetch', async () => {
      // First call fails
      apiAdapter.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRecipesAPI());

      await act(async () => {
        await result.current.fetchRecipes();
      });

      expect(result.current.error).toBe('Network error');

      // Second call succeeds
      apiAdapter.get.mockResolvedValueOnce({
        data: { recipes: [], pagination: {} }
      });

      await act(async () => {
        await result.current.fetchRecipes();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
