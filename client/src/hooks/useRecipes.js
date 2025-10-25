import { useState, useCallback, useMemo, useEffect } from 'react';
import { getRecipes, getRecipeById, searchRecipes, filterRecipesByPrice } from '../utils/recipeData';

const STORAGE_KEY = 'alimentation_favorites';

export const useRecipes = () => {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState(15);

  // Load favorites from localStorage on mount
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return [];
    }
  });

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }, [favorites]);
  
  const allRecipes = useMemo(() => getRecipes(), []);
  
  const filteredRecipes = useMemo(() => {
    let recipes = allRecipes;
    
    if (searchQuery) {
      recipes = searchRecipes(searchQuery);
    }
    
    if (maxPrice) {
      recipes = filterRecipesByPrice(maxPrice);
    }
    
    return recipes;
  }, [allRecipes, searchQuery, maxPrice]);

  const selectRecipe = useCallback((recipeId) => {
    const recipe = getRecipeById(recipeId);
    setSelectedRecipe(recipe);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const toggleFavorite = useCallback((recipeId) => {
    setFavorites(prev => {
      const isAlreadyFavorite = prev.includes(recipeId);
      if (isAlreadyFavorite) {
        return prev.filter(id => id !== recipeId);
      } else {
        return [...prev, recipeId];
      }
    });
  }, []);

  const isFavorite = useCallback((recipeId) => {
    return favorites.includes(recipeId);
  }, [favorites]);

  return {
    allRecipes,
    filteredRecipes,
    selectedRecipe,
    searchQuery,
    maxPrice,
    favorites,
    setSearchQuery,
    setMaxPrice,
    selectRecipe,
    clearSelection,
    toggleFavorite,
    isFavorite
  };
};