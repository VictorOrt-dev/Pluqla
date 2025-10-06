/**
 * AI Insight Card - Pluqla Finance
 * Pluqi giving personalized financial advice with CTA
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Sparkles, X } from 'lucide-react';
import PluqiCat from './PluqiCat';

const AIInsightCard = ({ transactions = [], darkMode = false, onDismiss }) => {
  // Generate AI insight based on transactions
  const insight = useMemo(() => {
    if (transactions.length === 0) {
      return {
        expression: 'thinking',
        message: "Je n'ai pas encore assez de données pour t'aider. Ajoute quelques transactions ! 💭",
        action: null,
        severity: 'info',
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current month transactions
    const currentMonthTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });

    // Previous month transactions
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const previousMonthTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === lastMonth &&
        transactionDate.getFullYear() === lastMonthYear
      );
    });

    // Analyze spending by category
    const currentExpensesByCategory = currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const previousExpensesByCategory = previousMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    // Find category with biggest increase
    let maxIncrease = 0;
    let categoryWithMaxIncrease = null;

    Object.keys(currentExpensesByCategory).forEach((category) => {
      const currentAmount = currentExpensesByCategory[category];
      const previousAmount = previousExpensesByCategory[category] || 0;

      if (previousAmount > 0) {
        const increase = ((currentAmount - previousAmount) / previousAmount) * 100;
        if (increase > maxIncrease) {
          maxIncrease = increase;
          categoryWithMaxIncrease = category;
        }
      }
    });

    // Calculate savings rate
    const currentIncome = currentMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentExpenses = currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;

    // Category names in French
    const categoryNames = {
      alimentation: 'restaurants',
      transport: 'transports',
      loisirs: 'loisirs',
      logement: 'logement',
      sante: 'santé',
      shopping: 'shopping',
      other: 'autres dépenses',
    };

    // Generate insight based on analysis
    if (savingsRate >= 30) {
      return {
        expression: 'celebrate',
        message: `Bravo ! Tu épargnes ${Math.round(savingsRate)}% de tes revenus ce mois-ci ! Continue comme ça ! 🎉`,
        action: 'Voir mes objectifs',
        severity: 'success',
      };
    } else if (maxIncrease >= 20 && categoryWithMaxIncrease) {
      return {
        expression: 'careful',
        message: `Tu dépenses ${Math.round(maxIncrease)}% de plus en ${categoryNames[categoryWithMaxIncrease] || categoryWithMaxIncrease} ce mois-ci 🍝`,
        action: 'Analyser mes dépenses',
        severity: 'warning',
      };
    } else if (savingsRate < 10 && currentIncome > 0) {
      return {
        expression: 'thinking',
        message: `Ton taux d'épargne est de ${Math.round(savingsRate)}%. Je peux t'aider à optimiser tes dépenses ! 💡`,
        action: 'Voir les conseils',
        severity: 'info',
      };
    } else if (currentExpenses > currentIncome) {
      return {
        expression: 'careful',
        message: "Attention ! Tes dépenses dépassent tes revenus ce mois-ci. Fais attention ! ⚠️",
        action: 'Créer un budget',
        severity: 'warning',
      };
    } else {
      return {
        expression: 'happy',
        message: 'Tes finances sont équilibrées ! Continue de suivre tes dépenses régulièrement. 👍',
        action: 'Voir le détail',
        severity: 'success',
      };
    }
  }, [transactions]);

  const handleAction = () => {
    // TODO: Implement action routing based on insight.action
    console.log('Action clicked:', insight.action);
  };

  const severityColors = {
    success: 'from-emerald-500/20 to-emerald-600/20',
    warning: 'from-amber-500/20 to-amber-600/20',
    info: 'from-blue-500/20 to-blue-600/20',
  };

  return (
    <div className="relative pluqla-scale-in">
      {/* Premium hover glow overlay - HomeScreen pattern */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
          : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
      }`}></div>

      {/* Card - HomeScreen DA */}
      <div
        className={`relative rounded-2xl p-4 sm:p-6 backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group ${
          darkMode
            ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
            : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
        }`}
      >
        {/* Header with badge and close button */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full backdrop-blur-sm border transition-all duration-200 ${
            darkMode
              ? 'bg-black/40 border-white/10'
              : 'bg-black/10 border-gray-200/50 shadow-sm'
          }`}>
            <Sparkles size={16} className={darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'} />
            <span className={`text-xs font-bold ${darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'}`}>Conseil IA</span>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
                darkMode
                  ? 'bg-black/40 hover:bg-[#F14545]/50 hover:shadow-[0_0_12px_rgba(241,69,69,0.6)] border-white/10 text-white/80'
                  : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 shadow-sm hover:shadow-md text-gray-600 hover:text-white'
              }`}
              aria-label="Fermer le conseil"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Pluqi with message */}
        <PluqiCat
          expression={insight.expression}
          message={insight.message}
          darkMode={darkMode}
        />

        {/* Action button */}
        {insight.action && (
          <div className="mt-4 flex items-center space-x-3">
            <button
              onClick={handleAction}
              className="flex-1 px-4 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#F14545] to-[#FF6B6B] hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
            >
              {insight.action}
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`px-4 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                  darkMode
                    ? 'bg-gray-700/50 text-white hover:bg-gray-600/50 border border-white/10'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                Plus tard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

AIInsightCard.propTypes = {
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
  onDismiss: PropTypes.func,
};

export default AIInsightCard;
