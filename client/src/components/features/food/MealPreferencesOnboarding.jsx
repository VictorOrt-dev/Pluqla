/**
 * Meal Preferences Onboarding Component
 *
 * Multi-step wizard for collecting user meal planning preferences
 * Similar to Jow's onboarding flow
 */

import React, { useState } from 'react';
import { apiRequest } from '../../../services/api/apiAdapter';

const MealPreferencesOnboarding = ({ darkMode, onComplete, showNotification }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    householdSize: 2,
    dietaryRestrictions: [],
    dislikedIngredients: [],
    preferredCuisines: [],
    skillLevel: 'intermediate',
    weeklyBudget: null,
    cookingFrequency: 'daily',
    mealTypes: ['lunch', 'dinner'],
    allergies: [],
    cookingTimeLimit: null
  });

  const dietaryOptions = [
    { value: 'vegetarian', label: 'Végétarien', emoji: '🌱' },
    { value: 'vegan', label: 'Vegan', emoji: '🥬' },
    { value: 'pescatarian', label: 'Pescatarien', emoji: '🐟' },
    { value: 'gluten-free', label: 'Sans gluten', emoji: '🌾' },
    { value: 'dairy-free', label: 'Sans lactose', emoji: '🥛' },
    { value: 'low-carb', label: 'Low-carb', emoji: '🥗' },
    { value: 'keto', label: 'Keto', emoji: '🥓' },
    { value: 'halal', label: 'Halal', emoji: '🕌' }
  ];

  const cuisineOptions = [
    { value: 'french', label: 'Française', emoji: '🇫🇷' },
    { value: 'italian', label: 'Italienne', emoji: '🇮🇹' },
    { value: 'asian', label: 'Asiatique', emoji: '🍜' },
    { value: 'mediterranean', label: 'Méditerranéenne', emoji: '🫒' },
    { value: 'mexican', label: 'Mexicaine', emoji: '🌮' },
    { value: 'indian', label: 'Indienne', emoji: '🍛' },
    { value: 'american', label: 'Américaine', emoji: '🍔' },
    { value: 'japanese', label: 'Japonaise', emoji: '🍱' }
  ];

  const skillLevels = [
    { value: 'beginner', label: 'Débutant', description: 'Recettes simples et rapides' },
    { value: 'intermediate', label: 'Intermédiaire', description: 'Un peu d\'expérience en cuisine' },
    { value: 'advanced', label: 'Avancé', description: 'Prêt pour des recettes complexes' }
  ];

  const toggleArrayItem = (array, item) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiRequest({
        method: 'POST',
        url: '/api/meal-planning/preferences',
        data: preferences
      });

      showNotification?.('Préférences enregistrées avec succès ! 🎉', 'success');
      onComplete?.(preferences);
    } catch (error) {
      showNotification?.(error.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          🏠 Combien êtes-vous à la maison ?
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
          Pour adapter les portions de vos recettes
        </p>
      </div>

      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => setPreferences(prev => ({
            ...prev,
            householdSize: Math.max(1, prev.householdSize - 1)
          }))}
          className={`w-12 h-12 rounded-full font-bold text-xl ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          -
        </button>

        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl">
          <span className="text-5xl font-bold text-white">{preferences.householdSize}</span>
        </div>

        <button
          onClick={() => setPreferences(prev => ({
            ...prev,
            householdSize: Math.min(20, prev.householdSize + 1)
          }))}
          className={`w-12 h-12 rounded-full font-bold text-xl ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          +
        </button>
      </div>

      <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        personne{preferences.householdSize > 1 ? 's' : ''}
      </p>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          🥗 Régime alimentaire
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
          Sélectionnez vos restrictions (optionnel)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {dietaryOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setPreferences(prev => ({
              ...prev,
              dietaryRestrictions: toggleArrayItem(prev.dietaryRestrictions, option.value)
            }))}
            className={`p-4 rounded-xl border-2 transition-all ${
              preferences.dietaryRestrictions.includes(option.value)
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : darkMode
                ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-3xl mb-2">{option.emoji}</div>
            <div className={`text-sm font-semibold ${
              preferences.dietaryRestrictions.includes(option.value)
                ? 'text-red-600 dark:text-red-400'
                : darkMode
                ? 'text-gray-200'
                : 'text-gray-900'
            }`}>
              {option.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          🍝 Cuisines préférées
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
          Quels types de cuisine aimez-vous ?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cuisineOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setPreferences(prev => ({
              ...prev,
              preferredCuisines: toggleArrayItem(prev.preferredCuisines, option.value)
            }))}
            className={`p-4 rounded-xl border-2 transition-all ${
              preferences.preferredCuisines.includes(option.value)
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : darkMode
                ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-3xl mb-2">{option.emoji}</div>
            <div className={`text-sm font-semibold ${
              preferences.preferredCuisines.includes(option.value)
                ? 'text-red-600 dark:text-red-400'
                : darkMode
                ? 'text-gray-200'
                : 'text-gray-900'
            }`}>
              {option.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          👨‍🍳 Niveau en cuisine
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
          Pour adapter la complexité des recettes
        </p>
      </div>

      <div className="space-y-3">
        {skillLevels.map(level => (
          <button
            key={level.value}
            onClick={() => setPreferences(prev => ({ ...prev, skillLevel: level.value }))}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              preferences.skillLevel === level.value
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : darkMode
                ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className={`font-bold ${
              preferences.skillLevel === level.value
                ? 'text-red-600 dark:text-red-400'
                : darkMode
                ? 'text-white'
                : 'text-gray-900'
            }`}>
              {level.label}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              {level.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          💰 Budget hebdomadaire
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
          Budget courses pour la semaine (optionnel)
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Budget
          </span>
          <span className="text-3xl font-bold text-red-500">
            {preferences.weeklyBudget ? `${preferences.weeklyBudget}€` : 'Non défini'}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="300"
          step="10"
          value={preferences.weeklyBudget || 0}
          onChange={(e) => setPreferences(prev => ({
            ...prev,
            weeklyBudget: parseInt(e.target.value) || null
          }))}
          className="w-full accent-red-500"
        />

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0€</span>
          <span>150€</span>
          <span>300€</span>
        </div>
      </div>

      <button
        onClick={() => setPreferences(prev => ({ ...prev, weeklyBudget: null }))}
        className={`w-full py-2 rounded-lg text-sm ${
          darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Pas de budget défini
      </button>
    </div>
  );

  const steps = [
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5
  ];

  return (
    <div className={`max-w-2xl mx-auto p-6 ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl`}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className={`flex justify-between mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
          <span>Étape {step} sur {steps.length}</span>
          <span>{Math.round((step / steps.length) * 100)}%</span>
        </div>
        <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step Content */}
      <div className="mb-8">
        {steps[step - 1]()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-3">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            ← Précédent
          </button>
        )}

        {step < steps.length ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg transition-all"
          >
            Suivant →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg'
            } text-white`}
          >
            {loading ? 'Enregistrement...' : '✅ Terminer'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MealPreferencesOnboarding;
