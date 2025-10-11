import React, { useState, useEffect } from 'react';
import RecipeList from '../components/features/food/RecipeList';
import RecipeModal from '../components/features/food/RecipeModal';
import MealSuggestions from '../components/features/food/MealSuggestions';
import ActivityRecommendations from '../components/features/activity/ActivityRecommendations';
import { useRecipes } from '../hooks/useRecipes';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useNavigation } from '../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
import './ActivityScreen.css';

const AlimentationScreen = ({ userData, setUserData, usePlan, showNotification, addTransaction, darkMode }) => {
  const { t } = useTranslation();
  const { navigateToHome } = useNavigation();
  const [activeCategory, setActiveCategory] = useState('recettes');
  const [isVisible, setIsVisible] = useState(false);
  const [shoppingList, setShoppingList] = useState(null);
  const [isGeneratingList, setIsGeneratingList] = useState(false);

  const { getAISuggestions, isLoading: isLoadingAI } = useAISuggestions();
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // Hooks pour les recettes
  const {
    filteredRecipes,
    selectedRecipe,
    searchQuery,
    maxPrice,
    favorites,
    setSearchQuery,
    setMaxPrice,
    selectRecipe,
    clearSelection,
    toggleFavorite
  } = useRecipes();

  // Animation d'entrée
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Charger les suggestions IA pour l'alimentation
  useEffect(() => {
    let isMounted = true;

    const loadSuggestions = async () => {
      if (activeCategory === 'nutrition' && isMounted) {
        try {
          const suggestions = await getAISuggestions('alimentation');
          if (isMounted) {
            setAiSuggestions(Array.isArray(suggestions) ? suggestions : []);
          }
        } catch (error) {
          if (isMounted) {
            console.error('Erreur chargement suggestions alimentation:', error);
            setAiSuggestions([]);
          }
        }
      }
    };

    loadSuggestions();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]); // getAISuggestions supprimé volontairement pour éviter les boucles infinies

  // Fonction pour générer la liste de courses
  const generateShoppingList = async () => {
    if (favorites.length === 0) return;

    setIsGeneratingList(true);
    try {
      const token = localStorage.getItem('token');
      const selectedRecipes = favorites.map(fav => ({
        title: fav.title,
        ingredients: fav.ingredients || []
      }));

      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/shopping-list/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedRecipes,
          language: 'fr'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShoppingList(data.data);
        setActiveCategory('courses');
        showNotification?.('Liste de courses générée avec succès ! 🛒', 'success');
      } else {
        throw new Error('Erreur lors de la génération');
      }
    } catch (error) {
      console.error('Erreur génération liste:', error);
      showNotification?.('Erreur lors de la génération de la liste', 'error');
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
    },
    {
      id: 'nutrition',
      name: 'Nutrition IA',
      icon: '🥗',
      description: 'Conseils nutrition et régimes IA'
    }
  ];

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'recettes':
        return (
          <div className="space-y-6">
            {/* Filtres de recherche */}
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
                  <input
                    type="text"
                    placeholder="Rechercher une recette..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-gray-900/50 text-white border-gray-700 focus:border-red-500 focus:ring-red-500/20'
                        : 'bg-white text-black border-gray-300 focus:border-red-500 focus:ring-red-500/20'
                    }`}
                  />
                </div>

                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Budget maximum
                    </label>
                    <span className="text-lg font-bold text-red-500">{maxPrice}€</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="w-full accent-red-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0€</span>
                    <span>20€</span>
                  </div>
                </div>
              </div>
            </div>

            <RecipeList
              recipes={filteredRecipes}
              darkMode={darkMode}
              onRecipeSelect={selectRecipe}
              onFavoriteToggle={toggleFavorite}
              favorites={favorites}
            />

            <RecipeModal
              isOpen={!!selectedRecipe}
              recipe={selectedRecipe}
              darkMode={darkMode}
              onClose={clearSelection}
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
                    className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 ${
                      favorites.length === 0 || isGeneratingList
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:scale-105'
                    }`}
                  >
                    {isGeneratingList
                      ? '🤖 Génération en cours...'
                      : favorites.length === 0
                      ? 'Ajoutez des recettes aux favoris d\'abord'
                      : `Créer ma liste (${favorites.length} recettes)`
                    }
                  </button>
                </div>

                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-900/30' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    L'IA analysera vos recettes sélectionnées et générera automatiquement une liste de courses optimisée avec les quantités nécessaires.
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
                              darkMode ? 'text-gray-400' : 'text-gray-600'
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
                          💡 Conseils d'économie :
                        </h5>
                        <ul className="space-y-1">
                          {shoppingList.tips.map((tip, index) => (
                            <li key={index} className={`text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
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
          <MealSuggestions
            darkMode={darkMode}
            showNotification={showNotification}
          />
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
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } font-medium`}>
                  {t('food.subtitle', 'Recettes et nutrition intelligents')}
                </p>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoadingAI && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse"></div>
                <span className={`text-xs font-medium ${
                  darkMode ? 'text-red-400' : 'text-red-600'
                }`}>IA en cours...</span>
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

export default AlimentationScreen;