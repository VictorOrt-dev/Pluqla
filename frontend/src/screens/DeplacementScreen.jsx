import React, { useState, useEffect } from 'react';
import TransportTracker from '../components/features/transport/TransportTracker';
import RouteOptimizer from '../components/features/transport/RouteOptimizer';
import TripHistory from '../components/features/transport/TripHistory';
import ActivityRecommendations from '../components/features/activity/ActivityRecommendations';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { useNavigation } from '../contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
import './ActivityScreen.css';

const DeplacementScreen = ({ userData, setUserData, usePlan, showNotification, addTransaction, darkMode }) => {
  const { t } = useTranslation();
  const { navigateToHome } = useNavigation();
  const [activeCategory, setActiveCategory] = useState('suivi');
  const [isVisible, setIsVisible] = useState(false);

  const { getAISuggestions, isLoading: isLoadingAI } = useAISuggestions();
  const [aiSuggestions, setAiSuggestions] = useState([]);

  // Animation d'entrée
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Charger les suggestions IA pour le transport
  useEffect(() => {
    let isMounted = true;

    const loadSuggestions = async () => {
      if (activeCategory === 'optimisation' && isMounted) {
        try {
          const suggestions = await getAISuggestions('deplacement');
          if (isMounted) {
            setAiSuggestions(Array.isArray(suggestions) ? suggestions : []);
          }
        } catch (error) {
          if (isMounted) {
            console.error('Erreur chargement suggestions déplacement:', error);
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

  const categories = [
    {
      id: 'suivi',
      label: 'Suivi',
      shortLabel: 'Suivi',
      icon: '🚗',
      description: 'Trajets en temps réel et optimisations'
    }
  ];

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'suivi':
        return (
          <div className="space-y-8">
            {/* Suivi Transport */}
            <div className="animate-fade-in animation-delay-100">
              <TransportTracker darkMode={darkMode} />
            </div>

            {/* Optimiseur de Routes */}
            <div className="animate-slide-up animation-delay-200">
              <div className={`glass-effect p-6 rounded-2xl ${
                darkMode ? 'glass-effect-dark' : ''
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🗺️ Optimiseur de Routes
                </h3>
                <RouteOptimizer darkMode={darkMode} />
              </div>
            </div>

            {/* Suggestions IA Éco-Mobilité */}
            <div className="animate-slide-up animation-delay-300">
              <ActivityRecommendations
                title="Éco-Mobilité IA"
                subtitle="Conseils personnalisés pour optimiser vos déplacements"
                icon="🎯"
                aiSuggestions={aiSuggestions}
                isLoading={isLoadingAI}
                darkMode={darkMode}
                userData={userData}
                setUserData={setUserData}
                onUsePlan={usePlan}
                category="deplacement"
                showNotification={showNotification}
                addTransaction={addTransaction}
              />
            </div>

            {/* Historique */}
            <div className="animate-slide-up animation-delay-400">
              <div className={`glass-effect p-6 rounded-2xl ${
                darkMode ? 'glass-effect-dark' : ''
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  📋 Historique des Trajets
                </h3>
                <TripHistory darkMode={darkMode} />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="text-4xl mb-4">🔍</div>
            <p>Catégorie non trouvée</p>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen relative ${
      darkMode
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
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
                  🚗 {t('transport.title', 'Déplacement')}
                </h1>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } font-medium`}>
                  {t('transport.subtitle', 'Optimisez vos trajets avec l\'IA')}
                </p>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoadingAI && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse"></div>
                <span className={`text-xs font-medium ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
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
                    ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50'
                    : 'bg-blue-100/80 text-blue-700 border border-blue-200/60'
                }`}>
                  {categories.find(cat => cat.id === activeCategory)?.description}
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
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                            : darkMode
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border border-gray-600/30'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-white/70 border border-gray-200/50'
                        } shadow-md hover:shadow-lg`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-sm">
                          <span className="md:hidden">{category.shortLabel}</span>
                          <span className="hidden md:inline">{category.label}</span>
                        </span>

                        {/* Active Indicator */}
                        {activeCategory === category.id && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-white rounded-full shadow-lg animate-scale-in"></div>
                        )}

                        {/* Hover gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
          darkMode ? 'bg-blue-600/5' : 'bg-blue-600/3'
        } blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-20 left-10 w-40 h-40 rounded-full ${
          darkMode ? 'bg-cyan-600/5' : 'bg-cyan-600/3'
        } blur-3xl animate-pulse delay-1000`}></div>
      </div>
    </div>
  );
};

export default DeplacementScreen;