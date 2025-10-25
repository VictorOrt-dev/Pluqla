import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Flame } from 'lucide-react';
import RecipeList from '../components/features/food/RecipeList';
import RecipeModal from '../components/features/food/RecipeModal';
import { useRecipesAPI } from '../hooks/useRecipesAPI'; // ✨ Phase 1C - Backend integration
import { useNavigation } from '../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
import { apiAdapter } from '../services/api/apiAdapter';
import secureLogger from '../utils/secureLogger';
import { useToast } from '../components/common/PluqlaToast';
import PropTypes from 'prop-types';
import './ActivityScreen.css';
import '../styles/recommended-recipes.css'; // ✨ Phase 9A: ML Recommendations styles

// ✨ Phase 2: Lazy load MealSuggestions (only loaded when nutrition tab is active)
const MealSuggestions = lazy(() => import('../components/features/food/MealSuggestions'));

// ✨ Phase 9A: ML-powered Recipe Recommendations
const RecommendedRecipes = lazy(() => import('../components/features/food/RecommendedRecipes'));

const AlimentationScreen = ({ showNotification, darkMode }) => {
  const { t } = useTranslation();
  const { navigateToHome } = useNavigation();
  const [activeCategory, setActiveCategory] = useState('recettes');
  const [shoppingList, setShoppingList] = useState(null);
  const [isGeneratingList, setIsGeneratingList] = useState(false);

  const toast = useToast();

  // ✨ Phase 1C - Hooks pour les recettes avec backend IA-hybride
  const {
    recipes,
    smartSuggestions,
    selectedRecipe,
    searchQuery,
    maxPrice,
    favorites,
    sortBy,
    isLoading: isLoadingRecipes,
    setSearchQuery,
    setMaxPrice,
    setSortBy,
    fetchRecipes,
    fetchSmartSuggestions,
    selectRecipe,
    clearSelection,
    toggleFavorite,
    markAsCooked // ✨ Phase 1B - Mark recipe as cooked with tracking
  } = useRecipesAPI();

  // Local state for tracking loading errors
  const [hasLoadError, setHasLoadError] = useState(false);

  // ✨ Phase 1C - Charger les recettes et suggestions IA au montage
  useEffect(() => {
    let isMounted = true;

    const loadRecipesData = async () => {
      if (isMounted) {
        try {
          setHasLoadError(false);
          await fetchRecipes(); // Charger recettes backend
          await fetchSmartSuggestions(); // Charger suggestions IA Phase 1A

          secureLogger.info('Recipes and smart suggestions loaded', {
            recipesCount: recipes?.length || 0,
            suggestionsCount: smartSuggestions?.length || 0
          });
        } catch (error) {
          setHasLoadError(true);
          secureLogger.error('Failed to load recipes data', {
            error: error.message
          });

          // Defensive: Fallback to showNotification if toast unavailable
          if (toast?.error) {
            toast.error('Erreur de chargement des recettes. Veuillez réessayer.');
          } else if (showNotification) {
            showNotification('Erreur de chargement des recettes. Veuillez réessayer.', 'error');
          }
        }
      }
    };

    loadRecipesData();

    return () => {
      isMounted = false;
    };
  }, [fetchRecipes, fetchSmartSuggestions, recipes?.length, smartSuggestions?.length, toast, showNotification]);

  // Retry function for error recovery
  const handleRetry = async () => {
    setHasLoadError(false);
    try {
      await fetchRecipes();
      await fetchSmartSuggestions();
      if (toast?.success) {
        toast.success('Recettes rechargées avec succès !');
      }
    } catch (error) {
      setHasLoadError(true);
      secureLogger.error('Retry failed', { error: error.message });
    }
  };

  // Fonction pour générer la liste de courses
  const generateShoppingList = async () => {
    if (favorites.length === 0) return;

    setIsGeneratingList(true);
    try {
      const response = await apiAdapter.post('/shopping-list/generate', {
        selectedRecipes: favorites.map(fav => ({
          title: fav.title,
          ingredients: fav.ingredients || []
        })),
        language: 'fr'
      });

      setShoppingList(response.data);
      setActiveCategory('courses');
      showNotification?.('Liste de courses générée avec succès ! 🛒', 'success');
    } catch (error) {
      secureLogger.error('Shopping list generation failed', {
        error: error.message,
        favoritesCount: favorites.length
      });
      showNotification?.(error.message || 'Erreur lors de la génération de la liste', 'error');
    } finally {
      setIsGeneratingList(false);
    }
  };

  const categories = [
    {
      id: 'recettes',
      name: 'Recettes Éco',
      icon: '👨‍🍳',
      description: 'Découvrez des recettes savoureuses'
    },
    {
      id: 'courses',
      name: 'Liste Courses',
      icon: '🛒',
      description: 'Liste de courses intelligente'
    }
  ];

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'recettes':
        return (
          <div className="space-y-6">
            {/* Filtres de recherche & Tri */}
            <div className={`glass-effect p-6 rounded-2xl ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🔍 Recherche & Filtres
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="recipe-search-input" className="sr-only">
                    Rechercher une recette
                  </label>
                  <input
                    id="recipe-search-input"
                    type="text"
                    placeholder="Rechercher une recette..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Rechercher une recette par nom ou ingrédient"
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                        : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                    }`}
                  />
                </div>

                {/* ✨ Phase 1A - Sort Buttons */}
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => setSortBy('popularity')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Trier par popularité"
                    aria-pressed={sortBy === 'popularity'}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      sortBy === 'popularity'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                        : darkMode
                          ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/70'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Flame className="w-4 h-4" aria-hidden="true" />
                    Populaires
                  </motion.button>
                  <motion.button
                    onClick={() => setSortBy('recent')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Trier par date de création"
                    aria-pressed={sortBy === 'recent'}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      sortBy === 'recent'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                        : darkMode
                          ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/70'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" aria-hidden="true" />
                    Récents
                  </motion.button>
                </div>

                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="max-price-slider" className={`text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Budget maximum
                    </label>
                    <span className="text-lg font-bold text-red-500" aria-live="polite" aria-atomic="true">
                      {maxPrice}€
                    </span>
                  </div>
                  <input
                    id="max-price-slider"
                    type="range"
                    min="0"
                    max="20"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    aria-label={`Définir le budget maximum à ${maxPrice} euros`}
                    aria-valuemin={0}
                    aria-valuemax={20}
                    aria-valuenow={maxPrice}
                    aria-valuetext={`${maxPrice} euros`}
                    className="w-full accent-red-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0€</span>
                    <span>20€</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ✨ Phase 1A - Smart Suggestions IA Section */}
            {smartSuggestions && smartSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`glass-effect p-6 rounded-2xl ${
                  darkMode ? 'glass-effect-dark' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Suggestions IA pour vous
                    </h3>
                    <p className={`text-xs ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Recettes personnalisées selon vos préférences
                    </p>
                  </div>
                  <div className="ml-auto">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-semibold text-red-500">IA Active</span>
                    </div>
                  </div>
                </div>

                <RecipeList
                  recipes={smartSuggestions}
                  darkMode={darkMode}
                  onRecipeSelect={selectRecipe}
                  onFavoriteToggle={toggleFavorite}
                  favorites={favorites}
                  showAIBadge={true}
                  showPopularityScore={true}
                />
              </motion.div>
            )}

            {/* ✨ Phase 9A - ML Recommended Recipes Section */}
            <Suspense fallback={
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              </div>
            }>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <RecommendedRecipes
                  budgetMax={maxPrice > 0 ? maxPrice : undefined}
                  excludeRecipeIds={favorites}
                  limit={8}
                />
              </motion.div>
            </Suspense>

            {/* Liste complète des recettes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {searchQuery ? `Résultats de recherche (${recipes?.length || 0})` : 'Toutes les recettes'}
                </h3>
                {isLoadingRecipes && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Chargement...
                    </span>
                  </div>
                )}
              </div>

              {/* Error State with Retry */}
              {hasLoadError && !isLoadingRecipes && (
                <div className={`p-6 rounded-2xl text-center ${
                  darkMode ? 'bg-red-900/20 border border-red-800/30' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="text-5xl mb-4">😕</div>
                  <h4 className={`text-lg font-semibold mb-2 ${
                    darkMode ? 'text-red-400' : 'text-red-800'
                  }`}>
                    Erreur de chargement
                  </h4>
                  <p className={`text-sm mb-4 ${
                    darkMode ? 'text-red-300' : 'text-red-700'
                  }`}>
                    Impossible de charger les recettes. Vérifiez votre connexion internet.
                  </p>
                  <motion.button
                    onClick={handleRetry}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    🔄 Réessayer
                  </motion.button>
                </div>
              )}

              {!hasLoadError && (
                <RecipeList
                  recipes={recipes}
                  darkMode={darkMode}
                  onRecipeSelect={selectRecipe}
                  onFavoriteToggle={toggleFavorite}
                  favorites={favorites}
                  showPopularityScore={true}
                />
              )}
            </div>

            <RecipeModal
              isOpen={!!selectedRecipe}
              recipe={selectedRecipe}
              darkMode={darkMode}
              onClose={clearSelection}
              onMarkAsCooked={async (recipeId) => {
                // ✨ Phase 1B - Mark as cooked with tracking
                const success = await markAsCooked(recipeId);
                if (success) {
                  if (toast?.success) {
                    toast.success('Recette marquée comme cuisinée! 🎉');
                  } else {
                    showNotification?.('Recette marquée comme cuisinée! 🎉', 'success');
                  }
                } else {
                  if (toast?.error) {
                    toast.error('Erreur lors du marquage');
                  } else {
                    showNotification?.('Erreur lors du marquage', 'error');
                  }
                }
              }}
            />
          </div>
        );

      case 'courses':
        return (
          <div className="space-y-6">
            <div className={`glass-effect p-6 rounded-2xl ${
              darkMode ? 'glass-effect-dark' : ''
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🛒 Liste de Courses Intelligente
              </h3>

              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📝 Générer selon vos recettes favorites
                  </h4>
                  <button
                    onClick={generateShoppingList}
                    disabled={favorites.length === 0 || isGeneratingList}
                    aria-label={
                      isGeneratingList
                        ? 'Génération de la liste de courses en cours'
                        : favorites.length === 0
                        ? 'Ajoutez des recettes aux favoris pour générer une liste de courses'
                        : `Générer une liste de courses à partir de ${favorites.length} recettes favorites`
                    }
                    aria-disabled={favorites.length === 0 || isGeneratingList}
                    className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      favorites.length === 0 || isGeneratingList
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:scale-105'
                    }`}
                  >
                    {isGeneratingList
                      ? '🤖 Génération en cours...'
                      : favorites.length === 0
                      ? 'Ajoutez des recettes aux favoris d&apos;abord'
                      : `Créer ma liste (${favorites.length} recettes)`
                    }
                  </button>
                </div>

                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    L&apos;IA analysera vos recettes sélectionnées et générera automatiquement une liste de courses optimisée avec les quantités nécessaires.
                  </p>
                </div>

                {/* Affichage de la liste générée */}
                {shoppingList && (
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                  }`}>
                    <h4 className={`font-semibold mb-4 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      🛒 Votre liste de courses ({shoppingList.items?.length || 0} articles)
                    </h4>

                    <div className="space-y-3 mb-4">
                      {shoppingList.items?.map((item, index) => (
                        <div key={index} className={`p-3 rounded-lg flex justify-between items-center ${
                          darkMode ? 'bg-gray-800/50' : 'bg-white'
                        }`}>
                          <div>
                            <span className={`font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {item.name}
                            </span>
                            <span className={`ml-2 text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                          <span className="text-red-500 font-semibold">
                            {item.estimatedPrice?.toFixed(2) || '0.00'}€
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className={`flex justify-between items-center p-3 rounded-lg font-semibold ${
                      darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
                    }`}>
                      <span>Total estimé :</span>
                      <span>{shoppingList.totalEstimatedCost?.toFixed(2) || '0.00'}€</span>
                    </div>

                    {shoppingList.tips && shoppingList.tips.length > 0 && (
                      <div className="mt-4">
                        <h5 className={`font-medium mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          💡 Conseils d&apos;économie :
                        </h5>
                        <ul className="space-y-1">
                          {shoppingList.tips.map((tip, index) => (
                            <li key={index} className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              • {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'nutrition':
        return (
          <Suspense fallback={
            <div className={`p-6 rounded-2xl text-center ${
              darkMode ? 'bg-gray-900/20' : 'bg-gray-50'
            }`}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-spin mx-auto mb-4" style={{
                borderTopColor: 'transparent',
                border: '3px solid currentColor'
              }}></div>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Chargement des suggestions...
              </p>
            </div>
          }>
            <MealSuggestions
              darkMode={darkMode}
              showNotification={showNotification}
            />
          </Suspense>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen relative ${
      darkMode
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
        : 'bg-gradient-to-br from-gray-50 via-white to-red-50/20'
    } transition-all duration-500`}>

      {/* Glassmorphism Header */}
      <div className={`sticky top-0 z-30 backdrop-blur-xl ${
        darkMode
          ? 'bg-gray-900/80 border-gray-700/50'
          : 'bg-white/80 border-gray-200/50'
      } border-b shadow-lg`}>

        {/* Header Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">

            {/* Back Button & Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={navigateToHome}
                className={`group p-2.5 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                  darkMode
                    ? 'bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white'
                    : 'bg-gray-100/80 hover:bg-gray-200/90 text-gray-600 hover:text-gray-800'
                } shadow-lg hover:shadow-xl`}
              >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="space-y-1">
                <h1 className={`text-xl sm:text-2xl font-bold bg-gradient-to-r ${
                  darkMode
                    ? 'from-white via-gray-200 to-gray-300'
                    : 'from-gray-900 via-gray-800 to-gray-700'
                } bg-clip-text text-transparent`}>
                  🍽️ {t('food.title', 'Alimentation')}
                </h1>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                } font-medium`}>
                  {t('food.subtitle', 'Recettes et nutrition intelligents')}
                </p>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoadingRecipes && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"></div>
                <span className={`text-xs font-medium ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>Chargement...</span>
              </div>
            )}
          </div>

          {/* Category Filter Navigation */}
          <div className="mt-6">
            <div className="space-y-3">
              {/* Categories Header */}
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Catégories
                </h2>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode
                    ? 'bg-red-900/30 text-red-300 border border-red-700/50'
                    : 'bg-red-100/80 text-red-700 border border-red-200/60'
                }`}>
                  {categories.find(cat => cat.id === activeCategory)?.name}
                </div>
              </div>

              {/* Scrollable Category Pills */}
              <div className="relative">
                <div className={`p-2 rounded-2xl ${
                  darkMode
                    ? 'bg-gray-800/60 border border-gray-700/50'
                    : 'bg-gray-100/60 border border-gray-200/50'
                } backdrop-blur-sm shadow-inner`}>
                  <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map((category, index) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`group relative flex items-center space-x-2 px-4 py-3 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-300 min-w-fit transform hover:scale-105 ${
                          activeCategory === category.id
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 scale-105'
                            : darkMode
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border border-gray-600/30'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-white/70 border border-gray-200/50'
                        } shadow-md hover:shadow-lg`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-sm">
                          <span className="whitespace-nowrap">{category.name}</span>
                        </span>

                        {/* Active Indicator */}
                        {activeCategory === category.id && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-white rounded-full shadow-lg animate-scale-in"></div>
                        )}

                        {/* Hover gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-red-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gradient fade edges for scroll indication */}
                <div className={`absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r ${
                  darkMode
                    ? 'from-gray-800/80 to-transparent'
                    : 'from-gray-100/80 to-transparent'
                } pointer-events-none rounded-l-2xl`}></div>
                <div className={`absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l ${
                  darkMode
                    ? 'from-gray-800/80 to-transparent'
                    : 'from-gray-100/80 to-transparent'
                } pointer-events-none rounded-r-2xl`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Category Content */}
        <div className="animate-slide-up">
          {renderCategoryContent()}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-20 right-10 w-32 h-32 rounded-full ${
          darkMode ? 'bg-red-600/5' : 'bg-red-600/3'
        } blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-20 left-10 w-40 h-40 rounded-full ${
          darkMode ? 'bg-red-500/5' : 'bg-red-500/3'
        } blur-3xl animate-pulse delay-1000`}></div>
      </div>
    </div>
  );
};

// PropTypes validation
AlimentationScreen.propTypes = {
  showNotification: PropTypes.func,
  darkMode: PropTypes.bool
};

AlimentationScreen.defaultProps = {
  showNotification: null,
  darkMode: false
};

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(AlimentationScreen);