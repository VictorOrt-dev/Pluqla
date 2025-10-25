/**
 * FoodBudgetWidget Component
 *
 * Finance Dashboard widget displaying food spending vs budget
 * Integrates with Alimentation feature (recipes, spending logs)
 *
 * Features:
 * - Monthly budget vs actual spending
 * - Spending trend chart (last 6 months)
 * - Quick add spending from recipe
 * - Budget alerts
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from '../../utils/lazyFramerMotion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChefHat,
  Calendar,
  Plus,
  Target,
} from 'lucide-react';
import {
  useMonthlyFoodStats,
  useFoodSpendingTrend,
  useUpdateFoodBudget,
} from '../../hooks/useRecipesQuery';
import ForecastVsRealityPanel from './ForecastVsRealityPanel';

/**
 * FoodBudgetWidget Component
 */
const FoodBudgetWidget = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'forecast-reality'

  // Current month/year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Fetch monthly stats
  const {
    data: monthlyStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useMonthlyFoodStats(currentYear, currentMonth);

  // Fetch spending trend
  const {
    data: spendingTrend,
    isLoading: isLoadingTrend,
  } = useFoodSpendingTrend(6); // Last 6 months

  // Update budget mutation
  const updateBudget = useUpdateFoodBudget();

  /**
   * Handle budget update
   */
  const handleUpdateBudget = async () => {
    const budgetValue = parseFloat(newBudget);
    if (isNaN(budgetValue) || budgetValue <= 0) return;

    try {
      await updateBudget.mutateAsync({ budgetEur: budgetValue });
      setShowBudgetEditor(false);
      setNewBudget('');
    } catch (error) {
      console.error('Failed to update budget:', error);
    }
  };

  /**
   * Format price
   */
  const formatPrice = (price) => {
    if (!price && price !== 0) return '—';
    return `${price.toFixed(2).replace('.', ',')} €`;
  };

  /**
   * Get budget status color
   */
  const getBudgetStatusColor = () => {
    if (!monthlyStats?.budget?.usedPercent) return 'text-gray-500';
    const percent = monthlyStats.budget.usedPercent;
    if (percent >= 100) return 'text-red-500';
    if (percent >= 80) return 'text-orange-500';
    if (percent >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  /**
   * Get budget progress bar color
   */
  const getBudgetProgressColor = () => {
    if (!monthlyStats?.budget?.usedPercent) return 'bg-gray-300';
    const percent = monthlyStats.budget.usedPercent;
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-orange-500';
    if (percent >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoadingStats) {
    return (
      <div
        className={`
        bg-white/80
        backdrop-blur-md
        rounded-2xl
        shadow-lg
        border border-white/20
        p-6
        ${className}
      `}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div
        className={`
        bg-white/80
        backdrop-blur-md
        rounded-2xl
        shadow-lg
        border border-white/20
        p-6
        ${className}
      `}
      >
        <div className="text-center text-red-500">
          <AlertCircle size={32} className="mx-auto mb-2" />
          <p className="text-sm">Erreur de chargement</p>
        </div>
      </div>
    );
  }

  const stats = monthlyStats?.spending || {};
  const budget = monthlyStats?.budget || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-white/80
        backdrop-blur-md
        rounded-2xl
        shadow-lg
        hover:shadow-xl
        border border-white/20
        overflow-hidden
        transition-all duration-300
        ${className}
      `}
    >
      {/* Header */}
      <div className="p-6 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E63946] to-[#d32f3a] flex items-center justify-center shadow-lg">
              <ChefHat size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Budget Alimentation
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar size={12} />
                {new Date().toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            aria-label={isExpanded ? 'Réduire' : 'Développer'}
          >
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 pt-4 border-b border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all
              ${
                activeTab === 'overview'
                  ? 'bg-[#E63946] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            aria-label="Vue d'ensemble du budget"
          >
            <div className="flex items-center justify-center gap-2">
              <DollarSign size={16} />
              Budget rapide
            </div>
          </button>
          <button
            onClick={() => setActiveTab('forecast-reality')}
            className={`
              flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all
              ${
                activeTab === 'forecast-reality'
                  ? 'bg-[#E63946] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            aria-label="Prévision vs Réalité"
          >
            <div className="flex items-center justify-center gap-2">
              <Target size={16} />
              Prévu vs Réel
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Budget Overview */}
            <div className="space-y-3">
          {/* Spent vs Budget */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Dépensé ce mois</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(stats.total)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Budget</p>
              {budget.monthlyBudget ? (
                <div>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatPrice(budget.monthlyBudget)}
                  </p>
                  <button
                    onClick={() => setShowBudgetEditor(true)}
                    className="text-xs text-[#E63946] hover:underline"
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowBudgetEditor(true)}
                  className="flex items-center gap-1 text-sm text-[#E63946] hover:underline"
                >
                  <Plus size={14} />
                  Définir budget
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {budget.monthlyBudget && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">
                  {stats.totalMeals || 0} repas cuisinés
                </span>
                <span className={`text-xs font-semibold ${getBudgetStatusColor()}`}>
                  {budget.usedPercent?.toFixed(0) || 0}% utilisé
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(budget.usedPercent || 0, 100)}%`,
                  }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full ${getBudgetProgressColor()} transition-all duration-300`}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-600">
                  Reste: {formatPrice(budget.remaining)}
                </span>
                {budget.isOverBudget && (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                    <AlertCircle size={12} />
                    Budget dépassé !
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Average Cost per Meal */}
          {stats.avgCostPerMeal > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Coût moyen/repas</span>
              <span className="text-lg font-bold text-[#E63946]">
                {formatPrice(stats.avgCostPerMeal)}
              </span>
            </div>
          )}
        </div>

        {/* Budget Editor Modal */}
        {showBudgetEditor && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-xl"
          >
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Définir le budget mensuel
            </h4>
            <div className="flex gap-2">
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                placeholder="Ex: 300"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              />
              <button
                onClick={handleUpdateBudget}
                disabled={updateBudget.isLoading}
                className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#d32f3a] transition-all disabled:opacity-50"
              >
                {updateBudget.isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => {
                  setShowBudgetEditor(false);
                  setNewBudget('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}

        {/* Expanded Content */}
        {isExpanded && spendingTrend && !isLoadingTrend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 pt-4 border-t border-gray-100"
          >
            <h4 className="text-sm font-semibold text-gray-900">
              Tendance (6 derniers mois)
            </h4>

            {/* Simple Bar Chart */}
            <div className="space-y-2">
              {spendingTrend.map((month, index) => {
                const maxSpent = Math.max(...spendingTrend.map((m) => m.totalSpent));
                const barWidth = maxSpent > 0 ? (month.totalSpent / maxSpent) * 100 : 0;
                const isCurrentMonth =
                  month.year === currentYear && month.month === currentMonth;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">
                        {month.monthName}
                      </span>
                      <span className="text-gray-900 font-semibold">
                        {formatPrice(month.totalSpent)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCurrentMonth ? 'bg-[#E63946]' : 'bg-gray-400'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trend Indicator */}
            {spendingTrend.length >= 2 && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                {spendingTrend[spendingTrend.length - 1].totalSpent >
                spendingTrend[spendingTrend.length - 2].totalSpent ? (
                  <>
                    <TrendingUp size={16} className="text-red-500" />
                    <span className="text-sm text-gray-700">
                      Dépenses en hausse par rapport au mois dernier
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={16} className="text-green-500" />
                    <span className="text-sm text-gray-700">
                      Dépenses en baisse par rapport au mois dernier
                    </span>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
          </>
        )}

        {/* Forecast vs Reality Tab */}
        {activeTab === 'forecast-reality' && (
          <ForecastVsRealityPanel />
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={() => {
            /* Navigate to Alimentation screen */
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#E63946] hover:text-[#d32f3a] transition-all"
        >
          <ChefHat size={16} />
          Voir toutes les recettes
        </button>
      </div>
    </motion.div>
  );
};

FoodBudgetWidget.propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default FoodBudgetWidget;
