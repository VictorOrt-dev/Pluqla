/**
 * MealPlanningDashboard Component
 *
 * Main wrapper component integrating:
 * - Onboarding for first-time users
 * - Weekly meal planner calendar
 * - Grocery list manager
 * - Navigation and state management
 */

import React, { useState, useEffect } from 'react';
import MealPreferencesOnboarding from './MealPreferencesOnboarding';
import WeeklyMealPlanner from './WeeklyMealPlanner';
import GroceryListManager from './GroceryListManager';
import { useMealPlanning } from '../../../hooks/useMealPlanning';

const MealPlanningDashboard = ({ darkMode, showNotification }) => {
  const [activeTab, setActiveTab] = useState('calendar'); // calendar, grocery, preferences
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    preferences,
    currentPlan,
    groceryList,
    loading,
    errors,
    statistics,
    hasCompletedOnboarding,
    savePreferences,
    generateWeeklyPlan,
    updateGroceryItem,
    markMealAsCooked
  } = useMealPlanning();

  // Show onboarding if user hasn't completed it
  useEffect(() => {
    if (!hasCompletedOnboarding && !loading.preferences) {
      setShowOnboarding(true);
    }
  }, [hasCompletedOnboarding, loading.preferences]);

  const handleCompleteOnboarding = async (prefs) => {
    try {
      await savePreferences(prefs);
      setShowOnboarding(false);
      showNotification?.('Préférences enregistrées ! Générez votre premier plan 🎉', 'success');
    } catch (error) {
      showNotification?.(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      await generateWeeklyPlan();
      showNotification?.('Plan hebdomadaire généré avec succès ! 🍽️', 'success');
      setActiveTab('calendar');
    } catch (error) {
      showNotification?.(error.message || 'Erreur lors de la génération', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsCooked = async (mealId) => {
    try {
      await markMealAsCooked(mealId);
      showNotification?.('Repas marqué comme cuisiné ! 👨‍🍳', 'success');
    } catch (error) {
      showNotification?.(error.message || 'Erreur', 'error');
    }
  };

  const handleRateMeal = async (mealId, rating, notes) => {
    try {
      await markMealAsCooked(mealId, rating, notes);
      showNotification?.(`Notation enregistrée: ${rating}/5 ⭐`, 'success');
    } catch (error) {
      showNotification?.(error.message || 'Erreur', 'error');
    }
  };

  const handleUpdateGroceryItem = async (itemId, updates) => {
    try {
      await updateGroceryItem(itemId, updates);
      // Silent success for better UX during shopping
    } catch (error) {
      showNotification?.(error.message || 'Erreur lors de la mise à jour', 'error');
    }
  };

  // Onboarding screen
  if (showOnboarding) {
    return (
      <div className="container mx-auto px-4 py-8">
        <MealPreferencesOnboarding
          darkMode={darkMode}
          onComplete={handleCompleteOnboarding}
          showNotification={showNotification}
        />
      </div>
    );
  }

  const tabs = [
    { id: 'calendar', name: 'Calendrier', icon: '📅' },
    { id: 'grocery', name: 'Liste de courses', icon: '🛒' },
    { id: 'preferences', name: 'Préférences', icon: '⚙️' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🍽️ Planification de Repas
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
              Organisez vos repas de la semaine et générez votre liste de courses
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <button
              onClick={() => setShowOnboarding(true)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              ⚙️ Modifier préférences
            </button>

            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating || loading.generatePlan}
              className={`px-6 py-2 rounded-xl font-semibold shadow-lg transition-all ${
                isGenerating || loading.generatePlan
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/50'
              } text-white`}
            >
              {isGenerating || loading.generatePlan ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Génération...</span>
                </div>
              ) : (
                '✨ Générer nouveau plan'
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {statistics.currentPlanProgress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`glass-effect p-4 rounded-xl ${darkMode ? 'glass-effect-dark' : ''}`}>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Repas cuisinés</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {statistics.currentPlanProgress.cookedMeals}/{statistics.currentPlanProgress.totalMeals}
              </div>
            </div>

            <div className={`glass-effect p-4 rounded-xl ${darkMode ? 'glass-effect-dark' : ''}`}>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Courses</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {statistics.currentPlanProgress.groceryProgress}%
              </div>
            </div>

            <div className={`glass-effect p-4 rounded-xl ${darkMode ? 'glass-effect-dark' : ''}`}>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Budget utilisé</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {statistics.currentPlanProgress.budgetUsed.toFixed(0)}€
              </div>
            </div>

            <div className={`glass-effect p-4 rounded-xl ${darkMode ? 'glass-effect-dark' : ''}`}>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Plans créés</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {statistics.totalPlans}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className={`inline-flex rounded-xl p-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-900 text-red-500 shadow-lg'
                  : darkMode
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              <span className="hidden md:inline">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border-2 border-red-500 rounded-xl">
          <div className="font-semibold text-red-700 dark:text-red-400 mb-2">⚠️ Erreurs:</div>
          {Object.entries(errors).map(([key, error]) => (
            <div key={key} className="text-sm text-red-600 dark:text-red-300">
              • {key}: {error}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="min-h-screen">
        {activeTab === 'calendar' && (
          <WeeklyMealPlanner
            weeklyPlan={currentPlan}
            onMealClick={(meal) => console.log('Meal clicked:', meal)}
            onMarkAsCooked={handleMarkAsCooked}
            onRateMeal={handleRateMeal}
            darkMode={darkMode}
            loading={loading.generatePlan}
          />
        )}

        {activeTab === 'grocery' && (
          <GroceryListManager
            groceryList={groceryList}
            onUpdateItem={handleUpdateGroceryItem}
            darkMode={darkMode}
            loading={loading.groceryUpdate}
          />
        )}

        {activeTab === 'preferences' && preferences && (
          <div className={`glass-effect p-8 rounded-2xl ${darkMode ? 'glass-effect-dark' : ''}`}>
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Vos préférences
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Taille du foyer
                </div>
                <div className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  👥 {preferences.householdSize} personne{preferences.householdSize > 1 ? 's' : ''}
                </div>
              </div>

              <div>
                <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Niveau de cuisine
                </div>
                <div className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  👨‍🍳 {preferences.skillLevel}
                </div>
              </div>

              <div>
                <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Budget hebdomadaire
                </div>
                <div className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  💰 {preferences.weeklyBudget ? `${preferences.weeklyBudget}€` : 'Non défini'}
                </div>
              </div>

              <div>
                <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Fréquence de cuisine
                </div>
                <div className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🍳 {preferences.cookingFrequency}
                </div>
              </div>

              {preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0 && (
                <div className="md:col-span-2">
                  <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    Restrictions alimentaires
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferences.dietaryRestrictions.map(restriction => (
                      <span
                        key={restriction}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-semibold"
                      >
                        {restriction}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {preferences.preferredCuisines && preferences.preferredCuisines.length > 0 && (
                <div className="md:col-span-2">
                  <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    Cuisines préférées
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferences.preferredCuisines.map(cuisine => (
                      <span
                        key={cuisine}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-semibold"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowOnboarding(true)}
              className="mt-8 w-full md:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all"
            >
              ✏️ Modifier mes préférences
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPlanningDashboard;
