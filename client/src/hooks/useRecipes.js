import { useState, useCallback, useMemo } from 'react';
import { getRecipes, getRecipeById, searchRecipes, filterRecipesByPrice } from '../utils/recipeData';

export const useRecipes = () => {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState(15);
  const [favorites, setFavorites] = useState([]);
  
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