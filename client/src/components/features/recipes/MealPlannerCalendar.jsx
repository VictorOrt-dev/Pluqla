/**
 * MealPlannerCalendar Component
 *
 * Weekly meal planning calendar with drag-and-drop
 * Features:
 * - 7-day week view
 * - Drag-and-drop recipes (native HTML5 DnD)
 * - localStorage persistence
 * - Breakfast/Lunch/Dinner slots
 * - Quick actions (duplicate, clear, share)
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  X,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  Sun,
  CloudSun,
  Moon,
} from 'lucide-react';

/**
 * Days of the week
 */
const DAYS_OF_WEEK = [
  { id: 'monday', name: 'Lundi', short: 'Lun' },
  { id: 'tuesday', name: 'Mardi', short: 'Mar' },
  { id: 'wednesday', name: 'Mercredi', short: 'Mer' },
  { id: 'thursday', name: 'Jeudi', short: 'Jeu' },
  { id: 'friday', name: 'Vendredi', short: 'Ven' },
  { id: 'saturday', name: 'Samedi', short: 'Sam' },
  { id: 'sunday', name: 'Dimanche', short: 'Dim' },
];

/**
 * Meal types
 */
const MEAL_TYPES = [
  { id: 'breakfast', name: 'Petit-déjeuner', icon: Sun, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'lunch', name: 'Déjeuner', icon: CloudSun, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'dinner', name: 'Dîner', icon: Moon, color: 'bg-blue-100 text-blue-700 border-blue-200' },
];

/**
 * Get current week number
 */
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};

/**
 * Get start of week (Monday)
 */
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(d.setDate(diff));
};

/**
 * MealPlannerCalendar Component
 */
const MealPlannerCalendar = ({
  availableRecipes = [],
  isOpen = false,
  onClose,
  className = '',
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [mealPlan, setMealPlan] = useState({});
  const [draggedRecipe, setDraggedRecipe] = useState(null);
  const [showRecipeSelector, setShowRecipeSelector] = useState(null); // { day, mealType }

  /**
   * Load meal plan from localStorage
   */
  useEffect(() => {
    const weekKey = `mealPlan_week_${getWeekNumber(currentWeek)}_${currentWeek.getFullYear()}`;
    const saved = localStorage.getItem(weekKey);

    if (saved) {
      try {
        setMealPlan(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load meal plan:', error);
      }
    }
  }, [currentWeek]);

  /**
   * Save meal plan to localStorage
   */
  useEffect(() => {
    const weekKey = `mealPlan_week_${getWeekNumber(currentWeek)}_${currentWeek.getFullYear()}`;
    localStorage.setItem(weekKey, JSON.stringify(mealPlan));
  }, [mealPlan, currentWeek]);

  /**
   * Go to previous week
   */
  const previousWeek = () => {
    setCurrentWeek((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  /**
   * Go to next week
   */
  const nextWeek = () => {
    setCurrentWeek((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  /**
   * Reset to current week
   */
  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e, recipe) => {
    setDraggedRecipe(recipe);
    e.dataTransfer.effectAllowed = 'copy';
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  /**
   * Handle drop
   */
  const handleDrop = (e, day, mealType) => {
    e.preventDefault();

    if (!draggedRecipe) return;

    const key = `${day}_${mealType}`;
    setMealPlan((prev) => ({
      ...prev,
      [key]: draggedRecipe,
    }));

    setDraggedRecipe(null);
  };

  /**
   * Remove meal
   */
  const removeMeal = (day, mealType) => {
    const key = `${day}_${mealType}`;
    setMealPlan((prev) => {
      const newPlan = { ...prev };
      delete newPlan[key];
      return newPlan;
    });
  };

  /**
   * Duplicate meal to another slot
   */
  const duplicateMeal = (fromKey, toDay, toMealType) => {
    const recipe = mealPlan[fromKey];
    if (!recipe) return;

    const toKey = `${toDay}_${toMealType}`;
    setMealPlan((prev) => ({
      ...prev,
      [toKey]: recipe,
    }));
  };

  /**
   * Clear entire week
   */
  const clearWeek = () => {
    if (window.confirm('Êtes-vous sûr de vouloir effacer toute la planification de cette semaine ?')) {
      setMealPlan({});
    }
  };

  /**
   * Export meal plan
   */
  const exportMealPlan = () => {
    const weekStart = getStartOfWeek(currentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let content = `📅 PLANNING REPAS PLUQLA\n\n`;
    content += `Semaine du ${weekStart.toLocaleDateString('fr-FR')} au ${weekEnd.toLocaleDateString('fr-FR')}\n\n`;

    DAYS_OF_WEEK.forEach((day) => {
      content += `\n${day.name.toUpperCase()}\n`;
      content += '─'.repeat(40) + '\n';

      MEAL_TYPES.forEach((mealType) => {
        const key = `${day.id}_${mealType.id}`;
        const meal = mealPlan[key];

        content += `${mealType.name}: ${meal ? meal.title : '—'}\n`;
      });
    });

    // Create download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pluqla-meal-plan-week-${getWeekNumber(currentWeek)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Calculate stats
   */
  const stats = React.useMemo(() => {
    const planned = Object.keys(mealPlan).length;
    const total = DAYS_OF_WEEK.length * MEAL_TYPES.length;
    const percentage = Math.round((planned / total) * 100);

    return { planned, total, percentage };
  }, [mealPlan]);

  if (!isOpen) return null;

  const weekStart = getStartOfWeek(currentWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              fixed inset-4 md:inset-8
              bg-white/95 backdrop-blur-xl
              rounded-3xl shadow-2xl border border-white/20
              z-50 overflow-hidden flex flex-col
              ${className}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Calendar size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Planning Repas
                  </h2>
                  <p className="text-sm text-gray-500">
                    {weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={previousWeek}
                  className="p-2 rounded-lg hover:bg-white border border-gray-200 transition-colors"
                  aria-label="Semaine précédente"
                >
                  <ChevronLeft size={20} />
                </button>

                <button
                  onClick={goToCurrentWeek}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Aujourd'hui
                </button>

                <button
                  onClick={nextWeek}
                  className="p-2 rounded-lg hover:bg-white border border-gray-200 transition-colors"
                  aria-label="Semaine suivante"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600">
                  {stats.planned}/{stats.total} repas planifiés ({stats.percentage}%)
                </div>

                <button
                  onClick={exportMealPlan}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Exporter</span>
                </button>

                <button
                  onClick={clearWeek}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Effacer</span>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.id} className="space-y-3">
                    {/* Day Header */}
                    <div className="text-center p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                      <div className="font-bold text-sm">{day.short}</div>
                    </div>

                    {/* Meal Slots */}
                    {MEAL_TYPES.map((mealType) => {
                      const key = `${day.id}_${mealType.id}`;
                      const meal = mealPlan[key];
                      const Icon = mealType.icon;

                      return (
                        <div
                          key={mealType.id}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day.id, mealType.id)}
                          className={`
                            relative min-h-[120px] p-3 rounded-lg border-2 border-dashed
                            transition-all duration-200
                            ${meal
                              ? 'border-purple-300 bg-white shadow-md'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                            }
                          `}
                        >
                          {/* Meal Type Icon */}
                          <div className={`absolute top-2 right-2 p-1 rounded ${mealType.color}`}>
                            <Icon size={14} />
                          </div>

                          {meal ? (
                            /* Planned Meal */
                            <div className="relative">
                              <button
                                onClick={() => removeMeal(day.id, mealType.id)}
                                className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                aria-label="Retirer"
                              >
                                <X size={12} />
                              </button>

                              <div className="pr-6">
                                {meal.image && (
                                  <img
                                    src={meal.image}
                                    alt={meal.title}
                                    className="w-full h-20 object-cover rounded-lg mb-2"
                                  />
                                )}
                                <p className="text-xs font-semibold text-gray-900 line-clamp-2">
                                  {meal.title}
                                </p>
                                {meal.readyInMinutes && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    ⏱️ {meal.readyInMinutes} min
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Empty Slot */
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                              <Plus size={24} className="mb-1" />
                              <p className="text-xs text-center">
                                Glisser une recette
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Recipes Drawer */}
            <div className="flex-shrink-0 p-4 bg-gray-50 border-t border-gray-200 max-h-48 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                📚 Recettes disponibles ({availableRecipes.length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {availableRecipes.map((recipe) => (
                  <div
                    key={`${recipe.provider}-${recipe.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, recipe)}
                    className="
                      flex-shrink-0 w-32 p-2 rounded-lg bg-white border border-gray-200
                      cursor-grab active:cursor-grabbing
                      hover:shadow-md transition-shadow
                    "
                  >
                    {recipe.image && (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-20 object-cover rounded-lg mb-2"
                      />
                    )}
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">
                      {recipe.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

MealPlannerCalendar.propTypes = {
  /** Array of available recipes to choose from */
  availableRecipes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      provider: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      image: PropTypes.string,
      readyInMinutes: PropTypes.number,
    })
  ),
  /** Is modal open */
  isOpen: PropTypes.bool,
  /** Callback when modal is closed */
  onClose: PropTypes.func.isRequired,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default MealPlannerCalendar;
