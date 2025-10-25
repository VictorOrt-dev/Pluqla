/**
 * AlimentationScreen (Refactored for API-based Architecture)
 *
 * Main screen for recipe search and management using external APIs
 * Replaces local DB with Spoonacular, Edamam, TheMealDB integration
 *
 * Features:
 * - Real-time recipe search with filters
 * - Multi-provider fallback (99.5%+ uptime)
 * - Price EUR conversion + EcoScore display
 * - Infinite scroll pagination
 * - Favorites management
 * - Food budget tracking integration
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from '../utils/lazyFramerMotion';
import { ChefHat, Heart, TrendingUp, DollarSign } from 'lucide-react';
import RecipeSearchBar from '../components/features/recipes/RecipeSearchBar';
import RecipeList from '../components/features/recipes/RecipeList';
import RecipeDetailsModal from '../components/features/recipes/RecipeDetailsModal';
import { useRecipeSearch, useFavoriteRecipes, useAddFavorite, useRemoveFavorite } from '../hooks/useRecipesQuery';
import { useNavigation } from '../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';

/**
 * AlimentationScreen Component
 */
const AlimentationScreen = ({ darkMode = false }) => {
  const { t } = useTranslation();
  const { navigateToHome } = useNavigation();

  // UI State
  const [activeTab, setActiveTab] = useState('search'); // search, favorites
  const [searchFilters, setSearchFilters] = useState({
    query: '',
    budgetMax: undefined,
    diet: undefined,
    timeMax: undefined,
  });
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Recipe Search Query (only enabled when user searches)
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: retrySearch,
  } = useRecipeSearch(searchFilters, {
    enabled: !!searchFilters.query,
  });

  // Favorites Query
  const {
    data: favoritesData,
    isLoading: isLoadingFavorites,
    error: favoritesError,
    refetch: retryFavorites,
  } = useFavoriteRecipes({
    enabled: activeTab === 'favorites',
  });

  // Favorite Mutations
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  /**
   * Handle search submission
   */
  const handleSearch = (filters) => {
    setSearchFilters(filters);
    setActiveTab('search');
  };

  /**
   * Handle recipe card click
   */
  const handleRecipeClick = (recipe) => {
    setSelectedRecipe({
      provider: recipe.provider,
      id: recipe.id,
    });
  };

  /**
   * Handle favorite toggle
   */
  const handleToggleFavorite = async (recipe) => {
    const favoriteId = `${recipe.provider}-${recipe.id}`;

    // Check if already favorited
    const isFavorited = favoriteRecipeIds.includes(favoriteId);

    try {
      if (isFavorited) {
        // Find the favorite record ID
        const favoriteRecord = favoritesData?.favorites?.find(
          (fav) => `${fav.provider}-${fav.externalId}` === favoriteId
        );

        if (favoriteRecord) {
          await removeFavorite.mutateAsync({ favoriteId: favoriteRecord.id });
        }
      } else {
        await addFavorite.mutateAsync({
          externalId: recipe.id,
          provider: recipe.provider,
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  /**
   * Load more recipes (infinite scroll)
   */
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  /**
   * Get flat array of recipes from paginated data
   */
  const recipes = React.useMemo(() => {
    if (!searchResults?.pages) return [];
    return searchResults.pages.flatMap((page) => page.recipes || []);
  }, [searchResults]);

  /**
   * Get flat array of favorites
   */
  const favorites = React.useMemo(() => {
    if (!favoritesData?.favorites) return [];
    return favoritesData.favorites.map((fav) => ({
      id: fav.externalId,
      provider: fav.provider,
      ...fav.recipe, // Cached recipe data
      pricePerServingEur: fav.pricePerServing,
      ecoScore: fav.ecoScore,
    }));
  }, [favoritesData]);

  /**
   * Get favorite recipe IDs for quick lookup
   */
  const favoriteRecipeIds = React.useMemo(() => {
    return favorites.map((fav) => `${fav.provider}-${fav.id}`);
  }, [favorites]);

  /**
   * Tabs configuration
   */
  const tabs = [
    {
      id: 'search',
      label: 'Recherche',
      icon: ChefHat,
      count: recipes.length,
    },
    {
      id: 'favorites',
      label: 'Favoris',
      icon: Heart,
      count: favorites.length,
    },
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
          <div className="flex items-center justify-between mb-4">
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
                  className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5"
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
                  🍽️ {t('food.title', 'Alimentation')}
                </h1>
                <p
                  className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Recettes intelligentes & éco-responsables
                </p>
              </div>
            </div>

            {/* Stats Badge */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                darkMode
                  ? 'bg-gray-800/60 border border-gray-700/50'
                  : 'bg-white/60 border border-gray-200/50'
              } backdrop-blur-sm`}
            >
              <DollarSign size={16} className="text-[#E63946]" />
              <div className="text-sm">
                <span
                  className={`font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  EUR
                </span>
                <span
                  className={`ml-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  • EcoScore
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4" role="tablist" aria-label="Navigation recettes">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-[#E63946] text-white shadow-lg'
                      : darkMode
                      ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/70'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === tab.id
                          ? 'bg-white/20'
                          : darkMode
                          ? 'bg-gray-700'
                          : 'bg-gray-200'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Bar (always visible) */}
          <RecipeSearchBar
            onSearch={handleSearch}
            initialFilters={searchFilters}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6" role="tabpanel" id="search-panel" aria-labelledby="search-tab">
            {/* Search Results */}
            {searchFilters.query ? (
              <>
                <div className="flex items-center justify-between">
                  <h2
                    className={`text-lg font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Résultats de recherche
                    {recipes.length > 0 && ` (${recipes.length})`}
                  </h2>
                  {(isSearching || isFetchingNextPage) && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#E63946] animate-pulse" />
                      <span
                        className={`text-sm ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {isFetchingNextPage
                          ? 'Chargement...'
                          : 'Recherche...'}
                      </span>
                    </div>
                  )}
                </div>

                <RecipeList
                  recipes={recipes}
                  isLoading={isSearching && recipes.length === 0}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                  error={searchError}
                  favoriteRecipeIds={favoriteRecipeIds}
                  onRecipeClick={handleRecipeClick}
                  onToggleFavorite={handleToggleFavorite}
                  onLoadMore={handleLoadMore}
                  onRetry={retrySearch}
                  emptyMessage="Aucune recette trouvée. Essayez de modifier vos critères de recherche."
                />
              </>
            ) : (
              /* Empty Search State */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`
                  text-center py-20 px-4
                  bg-white/60
                  backdrop-blur-sm
                  rounded-2xl
                  border
                  ${
                    darkMode
                      ? 'border-gray-700/50'
                      : 'border-gray-200/50'
                  }
                `}
              >
                <div
                  className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-800/60' : 'bg-gray-100'
                  }`}
                >
                  <ChefHat size={48} className="text-gray-400" />
                </div>
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Recherchez des recettes
                </h3>
                <p
                  className={`text-base mb-6 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  Utilisez la barre de recherche ci-dessus pour découvrir des
                  milliers de recettes avec prix EUR et EcoScore
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span
                    className={`text-sm ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}
                  >
                    Exemples :
                  </span>
                  {['Poulet', 'Pâtes', 'Végétarien', 'Dessert'].map(
                    (example) => (
                      <button
                        key={example}
                        onClick={() =>
                          handleSearch({ query: example })
                        }
                        aria-label={`Rechercher des recettes ${example}`}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                          darkMode
                            ? 'bg-gray-800 text-gray-300 hover:bg-[#E63946] hover:text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-[#E63946] hover:text-white'
                        }`}
                      >
                        {example}
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-6" role="tabpanel" id="favorites-panel" aria-labelledby="favorites-tab">
            <div className="flex items-center justify-between">
              <h2
                className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Mes recettes favorites
                {favorites.length > 0 && ` (${favorites.length})`}
              </h2>
              {isLoadingFavorites && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#E63946] animate-pulse" />
                  <span
                    className={`text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Chargement...
                  </span>
                </div>
              )}
            </div>

            <RecipeList
              recipes={favorites}
              isLoading={isLoadingFavorites}
              error={favoritesError}
              favoriteRecipeIds={favoriteRecipeIds}
              onRecipeClick={handleRecipeClick}
              onToggleFavorite={handleToggleFavorite}
              onRetry={retryFavorites}
              emptyMessage="Vous n'avez pas encore de recettes favorites. Ajoutez-en depuis la recherche !"
            />
          </div>
        )}
      </div>

      {/* Recipe Details Modal */}
      <RecipeDetailsModal
        provider={selectedRecipe?.provider}
        recipeId={selectedRecipe?.id}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        initialIsFavorite={
          selectedRecipe
            ? favoriteRecipeIds.includes(
                `${selectedRecipe.provider}-${selectedRecipe.id}`
              )
            : false
        }
      />

      {/* Decorative Background Elements */}
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

AlimentationScreen.propTypes = {
  /** Dark mode enabled */
  darkMode: PropTypes.bool,
};

export default React.memo(AlimentationScreen);
