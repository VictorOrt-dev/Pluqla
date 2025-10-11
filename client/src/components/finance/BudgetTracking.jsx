/**
 * Budget Tracking Component - Interactive Budget Management
 * Visual budget vs actual spending with progress bars and alerts
 * Category-based budgets with intelligent alerts
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { sanitizeText } from '../../utils/sanitize';

const BudgetTracking = ({ budgets, expenses, darkMode, onEditBudget }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const calculateBudgetStatus = (budget, spent) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100) return { status: 'over', color: 'red', label: 'Dépassé' };
    if (percentage >= 90) return { status: 'critical', color: 'orange', label: 'Attention' };
    if (percentage >= 70) return { status: 'warning', color: 'yellow', label: 'Vigilance' };
    return { status: 'good', color: 'green', label: 'OK' };
  };

  // ✅ FIX: Icon mapping for categories (moved from hardcoded data)
  const getCategoryIcon = (categoryId) => {
    const icons = {
      alimentation: '🍽️',
      transport: '🚗',
      loisirs: '🎬',
      logement: '🏠',
      sante: '💊',
      shopping: '🛍️',
    };
    return icons[categoryId] || '📦';
  };

  // ✅ FIX: Use real budgets and expenses from props instead of hardcoded data
  const categories = budgets.map((budgetItem) => {
    const spent = expenses?.[budgetItem.id] || budgetItem.spent || 0;
    return {
      ...budgetItem,
      budget: budgetItem.budget || budgetItem.amount || 0, // Normalize to 'budget' field
      icon: budgetItem.icon || getCategoryIcon(budgetItem.id),
      spent,
    };
  });

  const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Budgets
          </h3>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Suivez vos dépenses par catégorie
          </p>
        </div>
        <div className="flex space-x-2">
          {['week', 'month', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                selectedPeriod === period
                  ? 'bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white shadow-lg'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Budget Summary */}
      <div
        className={`rounded-2xl p-6 ${
          darkMode
            ? 'bg-gradient-to-br from-slate-900/90 to-slate-800/90'
            : 'bg-gradient-to-br from-white/90 to-gray-50/90'
        } backdrop-blur-xl border ${darkMode ? 'border-slate-700' : 'border-gray-200'} shadow-xl`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Budget total
            </p>
            <p className={`text-3xl font-black mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(totalBudget)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Dépensé
            </p>
            <p className={`text-3xl font-black mt-1 ${totalSpent > totalBudget ? 'text-red-500' : 'text-emerald-500'}`}>
              {formatCurrency(totalSpent)}
            </p>
          </div>
        </div>

        <div className="relative h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
              overallPercentage >= 100
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : overallPercentage >= 90
                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                : 'bg-gradient-to-r from-emerald-500 to-green-600'
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            {overallPercentage.toFixed(1)}% utilisé
          </p>
          <p className={`text-sm font-bold ${totalSpent < totalBudget ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalSpent < totalBudget ? formatCurrency(totalBudget - totalSpent) + ' restant' : formatCurrency(totalSpent - totalBudget) + ' dépassé'}
          </p>
        </div>
      </div>

      {/* Category Budgets */}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const percentage = (category.spent / category.budget) * 100;
          const status = calculateBudgetStatus(category.budget, category.spent);

          return (
            <div
              key={category.id}
              className={`rounded-2xl p-4 ${
                darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-gray-200'
              } backdrop-blur-sm border hover:shadow-lg transition-all duration-300 cursor-pointer`}
              onClick={() => onEditBudget && onEditBudget(category.id)}
            >
              {/* Category header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F14545]/10 to-[#FF6B6B]/10 flex items-center justify-center text-2xl">
                    {category.icon}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {sanitizeText(category.name)}
                    </h4>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {formatCurrency(category.budget)} budget
                    </p>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    status.color === 'red'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : status.color === 'orange'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : status.color === 'yellow'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {status.label}
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
                    status.color === 'red'
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : status.color === 'orange'
                      ? 'bg-gradient-to-r from-orange-500 to-red-500'
                      : status.color === 'yellow'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-500 to-green-600'
                  }`}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm">
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(category.spent)}
                </span>
                <span className={`font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  {percentage.toFixed(0)}%
                </span>
              </div>

              {/* Alert message */}
              {percentage >= 90 && (
                <div className={`mt-3 p-2 rounded-lg text-xs ${
                  percentage >= 100
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                }`}>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">
                      {percentage >= 100
                        ? `Budget dépassé de ${formatCurrency(category.spent - category.budget)}`
                        : `Plus que ${formatCurrency(category.budget - category.spent)} disponible`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Budget Button */}
      <button
        className={`w-full py-4 rounded-2xl border-2 border-dashed ${
          darkMode ? 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300' : 'border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700'
        } transition-all duration-300 flex items-center justify-center space-x-2 font-semibold`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Ajouter un budget</span>
      </button>
    </div>
  );
};

BudgetTracking.propTypes = {
  budgets: PropTypes.arrayOf(PropTypes.object),
  expenses: PropTypes.arrayOf(PropTypes.object),
  darkMode: PropTypes.bool,
  onEditBudget: PropTypes.func,
};

BudgetTracking.defaultProps = {
  darkMode: false,
  budgets: [],
  expenses: [],
};

// ⚡ PERFORMANCE: Memoize BudgetTracking to prevent unnecessary re-renders
export default React.memo(BudgetTracking);
