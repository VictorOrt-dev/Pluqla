/**
 * Meal Suggestions Component
 *
 * AI-powered meal suggestions with ingredients, recipes, costs, and cooking times
 * Integrated into AlimentationScreen "Nutrition IA" category
 */

import React, { useState } from 'react';
import { useMealSuggestions } from '../../../hooks/useMealSuggestions';

const MealSuggestions = ({ darkMode, showNotification }) => {
  const {
    loading,
    meals,
    error,
    progress,
    quota,
    requestMeals,
    clearError
  } = useMealSuggestions();

  const [selectedMeal, setSelectedMeal] = useState(null);
  const [formData, setFormData] = useState({
    mealType: 'any',
    servings: 2,
    budget: 15,
    cuisineType: '',
    maxCookingTime: '',
    skillLevel: 'intermediate',
    dietaryRestrictions: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    try {
      const params = {
        ...formData,
        dietaryRestrictions: formData.dietaryRestrictions.filter(r => r),
        cuisineType: formData.cuisineType || undefined,
        maxCookingTime: formData.maxCookingTime ? parseInt(formData.maxCookingTime) : undefined
      };

      await requestMeals(params);
      showNotification?.('Suggestions générées avec succès ! 🍽️', 'success');
    } catch (err) {
      showNotification?.(err.message || 'Erreur lors de la génération', 'error');
    }
  };

  const toggleDietaryRestriction = (restriction) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const dietaryOptions = [
    { value: 'vegetarian', label: '🌱 Végétarien', emoji: '🌱' },
    { value: 'vegan', label: '🥬 Vegan', emoji: '🥬' },
    { value: 'gluten-free', label: '🌾 Sans gluten', emoji: '🌾' },
    { value: 'dairy-free', label: '🥛 Sans lactose', emoji: '🥛' },
    { value: 'low-carb', label: '🥗 Low-carb', emoji: '🥗' },
    { value: 'halal', label: '🕌 Halal', emoji: '🕌' }
  ];

  return (
    <div className="space-y-6">
      {/* Request Form */}
      <div className={`glass-effect p-6 rounded-2xl ${darkMode ? 'glass-effect-dark' : ''}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🤖 Suggestions de Repas IA
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Recettes personnalisées avec ingrédients et coûts
            </p>
          </div>

          {/* Quota Display */}
          {quota && (
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              quota.remaining > quota.limit * 0.5
                ? 'bg-green-100 text-green-700'
                : quota.remaining > 0
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {quota.remaining}/{quota.limit} restants
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meal Type & Servings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Type de repas
              </label>
              <select
                value={formData.mealType}
                onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                  darkMode
                    ? 'bg-gray-900/50 text-white border-gray-700'
                    : 'bg-white text-black border-gray-300'
                }`}
              >
                <option value="any">🍴 Tous types</option>
                <option value="breakfast">🥐 Petit-déjeuner</option>
                <option value="lunch">🍽️ Déjeuner</option>
                <option value="dinner">🍷 Dîner</option>
                <option value="snack">🍪 Encas</option>
                <option value="dessert">🍰 Dessert</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Nombre de personnes
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                  darkMode
                    ? 'bg-gray-900/50 text-white border-gray-700'
                    : 'bg-white text-black border-gray-300'
                }`}
              />
            </div>
          </div>

          {/* Budget Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Budget maximum
              </label>
              <span className="text-lg font-bold text-red-500">{formData.budget}€</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5€</span>
              <span>50€</span>
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Restrictions alimentaires
            </label>
            <div className="grid grid-cols-3 gap-2">
              {dietaryOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleDietaryRestriction(option.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.dietaryRestrictions.includes(option.value)
                      ? 'bg-red-500 text-white'
                      : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Génération en cours... {Math.round(progress)}%</span>
              </div>
            ) : (
              '🍽️ Générer des suggestions'
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl">
            <p className="text-sm font-medium">❌ {error}</p>
          </div>
        )}
      </div>

      {/* Results Display */}
      {meals && meals.meals && meals.meals.length > 0 && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              ✨ {meals.totalMeals} suggestions • Coût moyen: {meals.avgCostEur}€ • Temps moyen: {meals.avgCookingTimeMin} min
              {meals.cacheHit && ' • ⚡ Résultat en cache'}
            </p>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              title="Générer de nouvelles suggestions"
            >
              🔄 Rafraîchir
            </button>
          </div>

          {meals.meals.map((meal, index) => (
            <div
              key={index}
              className={`glass-effect p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${
                darkMode ? 'glass-effect-dark' : ''
              }`}
              onClick={() => setSelectedMeal(selectedMeal === index ? null : index)}
            >
              {/* Meal Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {meal.name}
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                    {meal.description}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  meal.difficulty === 'easy' || meal.difficulty === 'beginner'
                    ? 'bg-green-100 text-green-700'
                    : meal.difficulty === 'intermediate'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {meal.difficulty}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="text-2xl mb-1">💰</div>
                  <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {meal.totalCostEur}€
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Coût total
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="text-2xl mb-1">⏱️</div>
                  <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {meal.cookingTimeMin} min
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Préparation
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="text-2xl mb-1">🍽️</div>
                  <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {meal.servings}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Personnes
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedMeal === index && (
                <div className="space-y-4 pt-4 border-t border-gray-300 dark:border-gray-700">
                  {/* Ingredients */}
                  <div>
                    <h5 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      📝 Ingrédients:
                    </h5>
                    <div className="space-y-1">
                      {meal.ingredients.map((ingredient, i) => (
                        <div key={i} className={`flex justify-between items-center text-sm ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <span>• {ingredient.item} ({ingredient.quantity})</span>
                          <span className="font-semibold">{ingredient.estimatedCostEur}€</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recipe Steps */}
                  <div>
                    <h5 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      👨‍🍳 Préparation:
                    </h5>
                    <ol className="space-y-2">
                      {meal.recipe.map((step, i) => (
                        <li key={i} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className="font-semibold text-red-500">{i + 1}.</span> {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Nutrition Info */}
                  {meal.nutritionInfo && (
                    <div>
                      <h5 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        🥗 Informations nutritionnelles:
                      </h5>
                      <div className="grid grid-cols-4 gap-2">
                        <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Calories</div>
                          <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {meal.nutritionInfo.calories}
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Protéines</div>
                          <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {meal.nutritionInfo.protein}g
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Glucides</div>
                          <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {meal.nutritionInfo.carbs}g
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg text-center ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Lipides</div>
                          <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {meal.nutritionInfo.fat}g
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MealSuggestions;
