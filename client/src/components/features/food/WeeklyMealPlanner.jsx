/**
 * WeeklyMealPlanner Component
 *
 * Interactive 7-day calendar view for weekly meal plans
 * Features: meal details, cooking status, ratings, budget tracking
 */

import React, { useState } from 'react';

const WeeklyMealPlanner = ({
  weeklyPlan,
  onMealClick,
  onMarkAsCooked,
  onRateMeal,
  darkMode,
  loading = false
}) => {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [ratingMealId, setRatingMealId] = useState(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  if (!weeklyPlan) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-6xl mb-4">📅</div>
        <p className="text-lg font-semibold">Aucun plan de repas actif</p>
        <p className="text-sm mt-2">Générez votre premier plan hebdomadaire !</p>
      </div>
    );
  }

  const daysOfWeek = [
    { day: 0, name: 'Lundi', short: 'Lun' },
    { day: 1, name: 'Mardi', short: 'Mar' },
    { day: 2, name: 'Mercredi', short: 'Mer' },
    { day: 3, name: 'Jeudi', short: 'Jeu' },
    { day: 4, name: 'Vendredi', short: 'Ven' },
    { day: 5, name: 'Samedi', short: 'Sam' },
    { day: 6, name: 'Dimanche', short: 'Dim' }
  ];

  const mealTypeIcons = {
    breakfast: '🥐',
    lunch: '🍽️',
    dinner: '🍷',
    snack: '🍪',
    dessert: '🍰'
  };

  const difficultyColors = {
    beginner: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    easy: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
    medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    hard: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
  };

  // Group meals by day
  const mealsByDay = daysOfWeek.map(({ day }) => ({
    day,
    meals: weeklyPlan.meals?.filter(meal => meal.dayOfWeek === day) || []
  }));

  // Calculate daily budgets
  const dailyBudgets = mealsByDay.map(({ meals }) =>
    meals.reduce((sum, meal) => sum + (meal.totalCostEur || 0), 0)
  );

  const totalBudget = dailyBudgets.reduce((sum, budget) => sum + budget, 0);
  const weekStartDate = new Date(weeklyPlan.weekStartDate);

  const handleMealClick = (meal) => {
    setSelectedMeal(selectedMeal?.id === meal.id ? null : meal);
    if (onMealClick) onMealClick(meal);
  };

  const handleMarkAsCooked = async (meal) => {
    if (onMarkAsCooked) {
      await onMarkAsCooked(meal.id);
    }
  };

  const handleRating = async (meal) => {
    setRatingMealId(meal.id);
    setRating(meal.rating || 0);
    setNotes(meal.notes || '');
  };

  const submitRating = async () => {
    if (onRateMeal && ratingMealId) {
      await onRateMeal(ratingMealId, rating, notes);
      setRatingMealId(null);
      setRating(0);
      setNotes('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className={`glass-effect p-6 rounded-2xl ${darkMode ? 'glass-effect-dark' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📅 Semaine du {weekStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              {weeklyPlan.mealsCount} repas planifiés
            </p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-red-500">{totalBudget.toFixed(2)}€</div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Budget total
              {weeklyPlan.totalBudget && (
                <span className="ml-1">/ {weeklyPlan.totalBudget.toFixed(2)}€</span>
              )}
            </div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        {weeklyPlan.totalBudget && (
          <div className="mt-4">
            <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div
                className={`h-full rounded-full transition-all ${
                  (totalBudget / weeklyPlan.totalBudget) * 100 > 100
                    ? 'bg-red-500'
                    : (totalBudget / weeklyPlan.totalBudget) * 100 > 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((totalBudget / weeklyPlan.totalBudget) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {Math.round((totalBudget / weeklyPlan.totalBudget) * 100)}% utilisé
              </span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Reste: {(weeklyPlan.totalBudget - totalBudget).toFixed(2)}€
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mealsByDay.map(({ day, meals }, index) => {
          const dayDate = new Date(weekStartDate);
          dayDate.setDate(dayDate.getDate() + day);
          const dayBudget = dailyBudgets[index];

          return (
            <div
              key={day}
              className={`glass-effect rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                darkMode ? 'glass-effect-dark' : ''
              }`}
            >
              {/* Day Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-bold">{daysOfWeek[day].name}</div>
                    <div className="text-xs opacity-90">
                      {dayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{dayBudget.toFixed(2)}€</div>
                    <div className="text-xs opacity-90">{meals.length} repas</div>
                  </div>
                </div>
              </div>

              {/* Meals List */}
              <div className="p-3 space-y-2">
                {meals.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <div className="text-3xl mb-2">🍴</div>
                    <div className="text-sm">Aucun repas</div>
                  </div>
                ) : (
                  meals.map(meal => (
                    <div
                      key={meal.id}
                      className={`rounded-lg p-3 cursor-pointer transition-all border-2 ${
                        meal.isCooked
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : selectedMeal?.id === meal.id
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : darkMode
                          ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => handleMealClick(meal)}
                    >
                      {/* Meal Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{mealTypeIcons[meal.mealType] || '🍽️'}</span>
                          <div>
                            <div className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {meal.name}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              ⏱️ {meal.cookingTimeMin} min
                            </div>
                          </div>
                        </div>
                        {meal.isCooked && <div className="text-green-500 text-xl">✓</div>}
                      </div>

                      {/* Meal Details */}
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            difficultyColors[meal.difficulty] || difficultyColors.intermediate
                          }`}
                        >
                          {meal.difficulty}
                        </span>
                        <span className="font-bold text-red-500">{meal.totalCostEur.toFixed(2)}€</span>
                      </div>

                      {/* Rating */}
                      {meal.rating && (
                        <div className="mt-2 flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={star <= meal.rating ? 'text-yellow-400' : 'text-gray-300'}>
                              ★
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expanded Details */}
                      {selectedMeal?.id === meal.id && (
                        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
                          {/* Ingredients */}
                          <div>
                            <div className={`text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Ingrédients ({meal.ingredients.length}):
                            </div>
                            <div className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                              {meal.ingredients.slice(0, 5).map((ing, i) => (
                                <div key={i} className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                                  • {ing.item} ({ing.quantity})
                                </div>
                              ))}
                              {meal.ingredients.length > 5 && (
                                <div className="text-gray-500 italic">+{meal.ingredients.length - 5} de plus...</div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {!meal.isCooked ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsCooked(meal);
                                }}
                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                ✓ Cuisiner
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRating(meal);
                                }}
                                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                ★ Noter
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMeal(null);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                darkMode
                                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              }`}
                            >
                              Fermer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating Modal */}
      {ratingMealId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setRatingMealId(null)}
        >
          <div
            className={`max-w-md w-full p-6 rounded-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Noter ce repas
            </h3>

            {/* Star Rating */}
            <div className="flex space-x-2 mb-4 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-all ${
                    star <= rating ? 'text-yellow-400 scale-110' : 'text-gray-300 hover:text-yellow-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optionnel)..."
              rows={3}
              className={`w-full px-4 py-2 rounded-xl border transition-all ${
                darkMode
                  ? 'bg-gray-800 text-white border-gray-700 focus:border-red-500'
                  : 'bg-white text-black border-gray-300 focus:border-red-500'
              } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
            />

            {/* Buttons */}
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setRatingMealId(null)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={submitRating}
                className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyMealPlanner;
