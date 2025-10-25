/**
 * FavoritesScreen Component
 *
 * Dedicated screen for managing favorite recipes
 * Features: Grid view, sorting, bulk actions, statistics
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import {
  Heart,
  TrendingUp,
  DollarSign,
  Clock,
  Grid3x3,
  List,
  SortAsc,
  Trash2,
  Download,
  ShoppingCart,
  Calendar,
} from 'lucide-react';
import RecipeList from '../components/features/recipes/RecipeList';
import RecipeDetailsModal from '../components/features/recipes/RecipeDetailsModal';
import ShoppingListGenerator from '../components/features/recipes/ShoppingListGenerator';
import MealPlannerCalendar from '../components/features/recipes/MealPlannerCalendar';
import {
  useFavoriteRecipes,
  useRemoveFavorite,
} from '../hooks/useRecipesQuery';
import { useNavigation } from '../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';

/**
 * FavoritesScreen Component
 */
const FavoritesScreen = ({ darkMode = false }) => {
  const { t } = useTranslation();
  const { navigateToHome } = useNavigation();

  // UI State
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [sortBy, setSortBy] = useState('recent'); // recent, name, price, ecoScore
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showMealPlanner, setShowMealPlanner] = useState(false);

  // Favorites Query
  const {
    data: favoritesData,
    isLoading,
    error,
    refetch,
  } = useFavoriteRecipes();

  // Remove Favorite Mutation
  const removeFavorite = useRemoveFavorite();

  /**
   * Get favorites array
   */
  const favorites = useMemo(() => {
    if (!favoritesData?.favorites) return [];
    return favoritesData.favorites.map((fav) => ({
      favoriteId: fav.id,
      id: fav.externalId,
      provider: fav.provider,
      ...fav.recipe,
      pricePerServingEur: fav.pricePerServing,
      ecoScore: fav.ecoScore,
      createdAt: fav.createdAt,
    }));
  }, [favoritesData]);

  /**
   * Sort favorites
   */
  const sortedFavorites = useMemo(() => {
    const sorted = [...favorites];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'price':
        return sorted.sort(
          (a, b) => (a.pricePerServingEur || 0) - (b.pricePerServingEur || 0)
        );
      case 'ecoScore':
        return sorted.sort((a, b) => (b.ecoScore || 0) - (a.ecoScore || 0));
      case 'recent':
      default:
        return sorted.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
    }
  }, [favorites, sortBy]);

  /**
   * Calculate statistics
   */
  const stats = useMemo(() => {
    const total = favorites.length;
    const avgPrice =
      favorites.reduce((sum, fav) => sum + (fav.pricePerServingEur || 0), 0) /
      (total || 1);
    const avgEcoScore =
      favorites.reduce((sum, fav) => sum + (fav.ecoScore || 0), 0) / (total || 1);
    const avgTime =
      favorites.reduce((sum, fav) => sum + (fav.readyInMinutes || 0), 0) /
      (total || 1);

    return {
      total,
      avgPrice: avgPrice.toFixed(2),
      avgEcoScore: Math.round(avgEcoScore),
      avgTime: Math.round(avgTime),
    };
  }, [favorites]);

  /**
   * Handle recipe click
   */
  const handleRecipeClick = (recipe) => {
    setSelectedRecipe({
      provider: recipe.provider,
      id: recipe.id,
    });
  };

  /**
   * Handle favorite toggle (remove)
   */
  const handleToggleFavorite = async (recipe) => {
    try {
      await removeFavorite.mutateAsync({ favoriteId: recipe.favoriteId });
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = async () => {
    if (selectedForDelete.length === 0) return;

    try {
      await Promise.all(
        selectedForDelete.map((favoriteId) =>
          removeFavorite.mutateAsync({ favoriteId })
        )
      );
      setSelectedForDelete([]);
    } catch (error) {
      console.error('Failed to bulk delete:', error);
    }
  };

  /**
   * Get favorite recipe IDs
   */
  const favoriteRecipeIds = useMemo(() => {
    return favorites.map((fav) => `${fav.provider}-${fav.id}`);
  }, [favorites]);

  /**
   * Sort options
   */
  const sortOptions = [
    { value: 'recent', label: 'Plus récent', icon: TrendingUp },
    { value: 'name', label: 'Nom A-Z', icon: SortAsc },
    { value: 'price', label: 'Prix croissant', icon: DollarSign },
    { value: 'ecoScore', label: 'EcoScore décroissant', icon: Heart },
  ];

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
          : 'bg-gradient-to-br from-gray-50 via-white to-red-50/20'
      }`}
    >
      {/* Header */}
      <div
        className={`sticky top-0 z-30 backdrop-blur-xl border-b shadow-lg ${
          darkMode
            ? 'bg-gray-900/80 border-gray-700/50'
            : 'bg-white/80 border-gray-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-6">
            {/* Back Button & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={navigateToHome}
                className={`p-2.5 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                  darkMode
                    ? 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white'
                    : 'bg-gray-100/80 hover:bg-gray-200/90 text-gray-600 hover:text-gray-800'
                }`}
                aria-label="Retour à l'accueil"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div>
                <h1
                  className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                    darkMode
                      ? 'from-white via-gray-200 to-gray-300'
                      : 'from-gray-900 via-gray-800 to-gray-700'
                  }`}
                >
                  ❤️ {t('food.favorites', 'Mes Favoris')}
                </h1>
                <p
                  className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {stats.total} recette{stats.total > 1 ? 's' : ''} sauvegardée
                  {stats.total > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div
                className={`flex gap-1 p-1 rounded-lg ${
                  darkMode
                    ? 'bg-gray-800/60 border border-gray-700/50'
                    : 'bg-gray-100 border border-gray-200/50'
                }`}
              >
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[#E63946] text-white'
                      : darkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Vue grille"
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'list'
                      ? 'bg-[#E63946] text-white'
                      : darkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Vue liste"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div
              className={`p-4 rounded-xl backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/40 border border-gray-700/50'
                  : 'bg-white/60 border border-gray-200/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Heart size={16} className="text-[#E63946]" />
                <span
                  className={`text-xs font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Total
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {stats.total}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/40 border border-gray-700/50'
                  : 'bg-white/60 border border-gray-200/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-[#E63946]" />
                <span
                  className={`text-xs font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Prix moy.
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {stats.avgPrice}€
              </p>
            </div>

            <div
              className={`p-4 rounded-xl backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/40 border border-gray-700/50'
                  : 'bg-white/60 border border-gray-200/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-[#E63946]" />
                <span
                  className={`text-xs font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Temps moy.
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {stats.avgTime}m
              </p>
            </div>

            <div
              className={`p-4 rounded-xl backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/40 border border-gray-700/50'
                  : 'bg-white/60 border border-gray-200/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-[#E63946]" />
                <span
                  className={`text-xs font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  EcoScore
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {stats.avgEcoScore}/100
              </p>
            </div>
          </div>

          {/* Sort & Actions Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Trier par:
              </span>
              <div className="flex gap-2 flex-wrap">
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sortBy === option.value
                          ? 'bg-[#E63946] text-white shadow-md'
                          : darkMode
                          ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/70'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            {favorites.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Meal Planner Button */}
                <button
                  onClick={() => setShowMealPlanner(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg ${
                    darkMode
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  <Calendar size={16} />
                  <span className="hidden sm:inline">Planifier mes Repas</span>
                  <span className="sm:hidden">Planning</span>
                </button>

                {/* Shopping List Button */}
                <button
                  onClick={() => setShowShoppingList(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg ${
                    darkMode
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <ShoppingCart size={16} />
                  <span className="hidden sm:inline">Liste de Courses</span>
                  <span className="sm:hidden">Liste</span>
                </button>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedForDelete.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <span
                  className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {selectedForDelete.length} sélectionné
                  {selectedForDelete.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <RecipeList
          recipes={sortedFavorites}
          isLoading={isLoading}
          error={error}
          favoriteRecipeIds={favoriteRecipeIds}
          onRecipeClick={handleRecipeClick}
          onToggleFavorite={handleToggleFavorite}
          onRetry={refetch}
          emptyMessage="Vous n'avez pas encore de recettes favorites. Commencez à en ajouter depuis la recherche !"
        />
      </div>

      {/* Recipe Details Modal */}
      <RecipeDetailsModal
        provider={selectedRecipe?.provider}
        recipeId={selectedRecipe?.id}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        initialIsFavorite={true}
      />

      {/* Shopping List Generator */}
      <ShoppingListGenerator
        recipes={favorites}
        isOpen={showShoppingList}
        onClose={() => setShowShoppingList(false)}
      />

      {/* Meal Planner Calendar */}
      <MealPlannerCalendar
        recipes={favorites}
        isOpen={showMealPlanner}
        onClose={() => setShowMealPlanner(false)}
      />

      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className={`absolute top-20 right-10 w-32 h-32 rounded-full blur-3xl animate-pulse ${
            darkMode ? 'bg-red-600/5' : 'bg-red-600/3'
          }`}
        />
        <div
          className={`absolute bottom-20 left-10 w-40 h-40 rounded-full blur-3xl animate-pulse ${
            darkMode ? 'bg-red-500/5' : 'bg-red-500/3'
          }`}
          style={{ animationDelay: '1s' }}
        />
      </div>
    </div>
  );
};

FavoritesScreen.propTypes = {
  /** Dark mode enabled */
  darkMode: PropTypes.bool,
};

export default React.memo(FavoritesScreen);
