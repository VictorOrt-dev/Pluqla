import React, { useState, useEffect } from 'react';
import AISuggestions from './AISuggestions';
import StandardDeals from './StandardDeals';
import ClothingAnalyzer from '../features/habits/ClothingAnalyzer';
import ClothingResults from '../features/habits/ClothingResults';
import RecipeList from '../features/food/RecipeList';
import RecipeModal from '../features/food/RecipeModal';
import TransportTracker from '../features/transport/TransportTracker';
import RouteOptimizer from '../features/transport/RouteOptimizer';
import TripHistory from '../features/transport/TripHistory';
import SportTracker from '../features/activity/SportTracker';
import CityActivities from '../features/activity/CityActivities';
import { useImageAnalysis } from '../../hooks/useImageAnalysis';
import { useRecipes } from '../../hooks/useRecipes';

const CategoryScreen = ({
  category,
  icon,
  title,
  setCurrentCategory,
  darkMode,
  setDarkMode,
  getAISuggestions,
  userData,
  setUserData,
  usePlan,
  showNotification,
  addTransaction
}) => {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);

  // Charger les suggestions IA quand la catégorie change
  useEffect(() => {
    const loadAISuggestions = async () => {
      if (!getAISuggestions || !category) return;

      try {
        setIsLoadingSuggestions(true);
        setSuggestionsError(null);

        console.log('🤖 Chargement suggestions IA pour:', category);
        const suggestions = await getAISuggestions(category);

        // Sécuriser le retour pour s'assurer qu'on a un tableau
        const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
        console.log('✅ Suggestions reçues:', safeSuggestions);

        setAiSuggestions(safeSuggestions);
      } catch (error) {
        console.error('❌ Erreur chargement suggestions IA:', error);
        setSuggestionsError(error.message);
        setAiSuggestions([]); // Fallback sûr
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    loadAISuggestions();
  }, [category, getAISuggestions]);

  // Hooks pour les nouvelles fonctionnalités
  const { analysisResult } = useImageAnalysis();
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
    // Suppression de isFavorite qui n'est pas utilisé
  } = useRecipes();

  // Configuration des onglets selon la catégorie avec design adapté
  const getTabsForCategory = () => {
    const baseTabs = [
      { key: 'suggestions', label: 'IA', icon: '🤖', color: 'blue' },
      { key: 'deals', label: 'Plans', icon: '💰', color: 'green' }
    ];

    switch (category) {
      case 'habits':
        return [
          ...baseTabs,
          { key: 'analyze', label: 'Photo', icon: '📸', color: 'purple' },
          { key: 'results', label: 'Prix', icon: '🔍', color: 'orange' }
        ];
      case 'alimentation':
        return [
          ...baseTabs,
          { key: 'recipes', label: 'Recettes', icon: '👨‍🍳', color: 'red' }
        ];
      case 'deplacement':
        return [
          ...baseTabs,
          { key: 'tracker', label: 'Suivi', icon: '📍', color: 'cyan' },
          { key: 'optimizer', label: 'Opti', icon: '🎯', color: 'indigo' },
          { key: 'history', label: 'Log', icon: '📋', color: 'gray' }
        ];
      case 'activite':
        return [
          { key: 'suggestions', label: 'Sorties', icon: '🎭', color: 'blue' },
          { key: 'sport', label: 'Sport', icon: '🏃‍♀️', color: 'emerald' }
        ];
      default:
        return baseTabs;
    }
  };

  const tabs = getTabsForCategory();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'suggestions':
        // Pour la catégorie activité, utiliser le nouveau composant CityActivities
        if (category === 'activite') {
          return (
            <CityActivities
              aiSuggestions={aiSuggestions}
              isLoading={isLoadingSuggestions}
              error={suggestionsError}
              darkMode={darkMode}
              userData={userData}
              setUserData={setUserData}
              onUsePlan={usePlan}
              category={category}
            />
          );
        }
        // Pour les autres catégories, utiliser le composant standard
        return (
          <AISuggestions
            aiSuggestions={aiSuggestions}
            isLoading={isLoadingSuggestions}
            error={suggestionsError}
            darkMode={darkMode}
            userData={userData}
            setUserData={setUserData}
            onUsePlan={usePlan}
            category={category}
          />
        );
      
      case 'deals':
        return (
          <StandardDeals 
            category={category}
            darkMode={darkMode}
            showNotification={showNotification}
            addTransaction={addTransaction}
          />
        );

      // Onglets spécifiques aux habits
      case 'analyze':
        return category === 'habits' ? (
          <ClothingAnalyzer darkMode={darkMode} />
        ) : null;
      
      case 'results':
        return category === 'habits' && analysisResult ? (
          <ClothingResults analysisResult={analysisResult} darkMode={darkMode} />
        ) : (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="text-6xl mb-4">📸</div>
            <p className="text-lg font-medium mb-2">Aucune analyse disponible</p>
            <p className="text-sm">Utilisez l'onglet Photo pour analyser un vêtement</p>
          </div>
        );

      // Onglets spécifiques à l'alimentation
      case 'recipes':
        return category === 'alimentation' ? (
          <div className="space-y-4">
            {/* Filtres de recherche avec design amélioré */}
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="🔍 Rechercher une recette..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-900 text-white border-gray-700 focus:border-blue-500' : 'bg-white text-black border-gray-300 focus:border-blue-500'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                />
              </div>
              
              <div className={`p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-xl`}>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Budget maximum
                  </label>
                  <span className="text-lg font-bold text-blue-500">{maxPrice}€</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0€</span>
                  <span>20€</span>
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
        ) : null;

      // Onglets spécifiques au transport
      case 'tracker':
        return category === 'deplacement' ? (
          <TransportTracker darkMode={darkMode} />
        ) : null;

      case 'optimizer':
        return category === 'deplacement' ? (
          <RouteOptimizer darkMode={darkMode} />
        ) : null;

      case 'history':
        return category === 'deplacement' ? (
          <TripHistory darkMode={darkMode} />
        ) : null;

      // Onglets spécifiques aux activités
      case 'sport':
        return category === 'activite' ? (
          <SportTracker
            darkMode={darkMode}
            aiSuggestions={aiSuggestions}
            isLoading={isLoadingSuggestions}
            error={suggestionsError}
            userData={userData}
            setUserData={setUserData}
            onUsePlan={usePlan}
            category={category}
          />
        ) : null;

      default:
        return null;
    }
  };
  
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <div className={`${darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b sticky top-0 z-10 backdrop-blur-lg`}>
        <div className="px-6 pt-14 pb-4">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setCurrentCategory(null)}
              className="flex items-center text-blue-500 hover:text-blue-600 transition-colors"
            >
              <span className="mr-2 text-lg">←</span>
              <span className="font-medium">Retour</span>
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
            {icon} {title}
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {tabs.length} sections disponibles
          </p>
        </div>

        {/* Navigation par grille - SOLUTION AU PROBLÈME DE SCROLL */}
        <div className="px-6 pb-6">
          <div className={`grid ${tabs.length <= 3 ? 'grid-cols-3' : tabs.length === 4 ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative p-4 rounded-2xl text-center transition-all duration-200 ${
                  activeTab === tab.key
                    ? `bg-gradient-to-br from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg scale-105`
                    : darkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:scale-102'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                }`}
              >
                {activeTab === tab.key && (
                  <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
                )}
                <div className="relative">
                  <div className="text-2xl mb-2">{tab.icon}</div>
                  <div className={`text-sm font-semibold ${
                    activeTab === tab.key ? 'text-white' : ''
                  }`}>
                    {tab.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 pb-24">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default CategoryScreen;