/**
 * Expense Breakdown - Pluqla Finance
 * Expand/collapse category breakdown with interactive cards
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ExpenseBreakdown = ({ transactions = [], darkMode = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter current month expenses
    const currentMonthExpenses = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        t.type === 'expense' &&
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });

    // Group by category
    const categoryTotals = currentMonthExpenses.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = {
          category: t.category,
          amount: 0,
          count: 0,
        };
      }
      acc[t.category].amount += t.amount;
      acc[t.category].count += 1;
      return acc;
    }, {});

    // Calculate total expenses
    const totalExpenses = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.amount, 0);

    // Convert to array with percentages and sort by amount
    const breakdown = Object.values(categoryTotals)
      .map((cat) => ({
        ...cat,
        percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { breakdown, totalExpenses };
  }, [transactions]);

  const getCategoryIcon = (category) => {
    const icons = {
      alimentation: '🍽️',
      transport: '🚗',
      loisirs: '🎬',
      logement: '🏠',
      sante: '💊',
      shopping: '🛍️',
      other: '📦',
    };
    return icons[category] || '📦';
  };

  const getCategoryName = (category) => {
    const names = {
      alimentation: 'Alimentation',
      transport: 'Transport',
      loisirs: 'Loisirs',
      logement: 'Logement',
      sante: 'Santé',
      shopping: 'Shopping',
      other: 'Autres',
    };
    return names[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      alimentation: 'from-orange-500 to-orange-600',
      transport: 'from-blue-500 to-blue-600',
      loisirs: 'from-purple-500 to-purple-600',
      logement: 'from-green-500 to-green-600',
      sante: 'from-red-500 to-red-600',
      shopping: 'from-pink-500 to-pink-600',
      other: 'from-gray-500 to-gray-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (categoryBreakdown.breakdown.length === 0) {
    return null;
  }

  return (
    <div className="relative pluqla-scale-in">
      {/* Premium hover glow overlay - HomeScreen pattern */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
          : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
      }`}></div>

      <div
        className={`relative rounded-2xl backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group ${
          darkMode
            ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
            : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
        }`}
      >
        {/* Header with expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 sm:p-6 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
              Détail des dépenses
            </h3>
            <span className={`text-sm px-3 py-1 rounded-full backdrop-blur-sm border ${
              darkMode
                ? 'bg-black/40 border-white/10 text-white/80'
                : 'bg-black/10 border-gray-200/50 text-gray-700'
            }`}>
              {formatCurrency(categoryBreakdown.totalExpenses)}
            </span>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
            darkMode
              ? 'bg-black/40 border-white/10 text-white/80'
              : 'bg-black/10 border-gray-200/50 text-gray-600'
          }`}>
            {isExpanded ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </div>
        </button>

        {/* Category cards */}
        {isExpanded && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
            {categoryBreakdown.breakdown.map((cat) => (
              <div key={cat.category} className="relative">
                {/* Hover glow for category cards */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
                    : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
                }`}></div>

                <div
                  className={`relative rounded-2xl p-4 border transition-all duration-300 hover:scale-105 cursor-pointer shadow-md hover:shadow-lg group ${
                    darkMode
                      ? 'bg-gray-800/50 border-white/10 hover:border-[#F14545]/50'
                      : 'bg-white/50 border-gray-200 hover:border-[#F14545]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    {/* Category icon and name */}
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getCategoryColor(cat.category)} flex items-center justify-center shadow-lg`}>
                        <span className="text-xl">{getCategoryIcon(cat.category)}</span>
                      </div>
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
                          {getCategoryName(cat.category)}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
                          {cat.count} transaction{cat.count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Amount and percentage */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-[#121212]'}`}>
                        {formatCurrency(cat.amount)}
                      </p>
                      <p className={`text-sm font-semibold ${darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'}`}>
                        {cat.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700/50' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full bg-gradient-to-r ${getCategoryColor(cat.category)} transition-all duration-500`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

ExpenseBreakdown.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.oneOf(['income', 'expense']),
      amount: PropTypes.number,
      category: PropTypes.string,
      date: PropTypes.string,
    })
  ),
  darkMode: PropTypes.bool,
};

export default ExpenseBreakdown;
