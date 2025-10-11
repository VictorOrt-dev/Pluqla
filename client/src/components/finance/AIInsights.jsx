/**
 * AI Insights - Enhanced Habit Analysis and Recommendations
 * Detects overspending patterns, suggests savings, analyzes spending habits
 * Premium AI-powered insights with actionable recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { sanitizeText } from '../../utils/sanitize';

const AIInsights = ({ transactions, financialData, isPremium, darkMode }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Memoize analyzeHabits to prevent recreation and ensure correct dependencies
  const analyzeHabits = useCallback(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const insights = [];

    // Analyze spending by category
    const categorySpending = {};
    transactions.forEach((t) => {
      if (t.type === 'expense') {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      }
    });

    // Find overspending categories (>30% of expenses)
    const totalExpenses = Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
    Object.entries(categorySpending).forEach(([category, amount]) => {
      const percentage = (amount / totalExpenses) * 100;
      if (percentage > 30) {
        insights.push({
          type: 'warning',
          category: 'overspending',
          icon: '⚠️',
          title: 'Dépenses élevées détectées',
          description: `Vous dépensez ${percentage.toFixed(0)}% de votre budget en ${category}. Réduire cette catégorie de 15% pourrait vous faire économiser ${(amount * 0.15).toFixed(0)}€/mois.`,
          actionable: true,
          impact: 'high',
          savings: amount * 0.15,
        });
      }
    });

    // Analyze spending patterns
    const weekendSpending = transactions
      .filter((t) => {
        const day = new Date(t.date).getDay();
        return t.type === 'expense' && (day === 0 || day === 6);
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const weekdaySpending = transactions
      .filter((t) => {
        const day = new Date(t.date).getDay();
        return t.type === 'expense' && day !== 0 && day !== 6;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    if (weekendSpending > weekdaySpending * 0.4) {
      insights.push({
        type: 'info',
        category: 'pattern',
        icon: '📊',
        title: 'Dépenses de week-end',
        description: `Vous dépensez beaucoup plus le week-end (${weekendSpending.toFixed(0)}€). Planifier vos activités pourrait réduire ces dépenses de 20%.`,
        actionable: true,
        impact: 'medium',
        savings: weekendSpending * 0.2,
      });
    }

    // Detect recurring subscriptions
    const subscriptionCategories = ['loisirs', 'autres'];
    const potentialSubscriptions = transactions.filter((t) =>
      subscriptionCategories.includes(t.category) && t.amount < 50 && t.amount > 5
    );

    if (potentialSubscriptions.length > 3) {
      insights.push({
        type: 'tip',
        category: 'optimization',
        icon: '💡',
        title: 'Optimisez vos abonnements',
        description: `${potentialSubscriptions.length} abonnements potentiels détectés. Revoyez vos abonnements pour économiser jusqu'à 30€/mois.`,
        actionable: true,
        impact: 'medium',
        savings: 30,
      });
    }

    // Positive reinforcement
    const savingsRate = financialData?.savingsRate || 0;
    if (savingsRate > 20) {
      insights.push({
        type: 'success',
        category: 'achievement',
        icon: '🎉',
        title: 'Excellente épargne !',
        description: `Votre taux d'épargne de ${savingsRate.toFixed(0)}% est excellent. Continuez comme ça et vous atteindrez vos objectifs financiers rapidement.`,
        actionable: false,
        impact: 'positive',
      });
    }

    // Premium insights
    if (isPremium) {
      insights.push({
        type: 'premium',
        category: 'ai-recommendation',
        icon: '🤖',
        title: 'Recommandation IA Premium',
        description: `Basé sur vos habitudes, investir 15% de votre épargne dans un fonds indexé pourrait générer +${(financialData?.savings * 0.15 * 0.07).toFixed(0)}€/an.`,
        actionable: true,
        impact: 'high',
        premium: true,
      });
    }

    return insights;
  }, [transactions, financialData, isPremium]); // ✅ FIX: Added all dependencies

  useEffect(() => {
    setLoading(true);
    // Remove artificial delay for better UX
    const insights = analyzeHabits();
    setInsights(insights);
    setLoading(false);
  }, [analyzeHabits]); // ✅ FIX: Now correctly depends on memoized function

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high':
        return darkMode ? 'border-red-500/50 bg-red-900/20' : 'border-red-300 bg-red-50';
      case 'medium':
        return darkMode ? 'border-orange-500/50 bg-orange-900/20' : 'border-orange-300 bg-orange-50';
      case 'positive':
        return darkMode ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-emerald-300 bg-emerald-50';
      default:
        return darkMode ? 'border-blue-500/50 bg-blue-900/20' : 'border-blue-300 bg-blue-50';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={`rounded-2xl p-6 text-center ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} backdrop-blur-xl border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-[#F14545] border-t-transparent animate-spin"></div>
        <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
          Analyse IA en cours...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Insights IA
          </h3>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Analyse personnalisée de vos habitudes
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`rounded-2xl p-4 border-l-4 ${getImpactColor(insight.impact)} backdrop-blur-sm transition-all duration-300 hover:scale-102 cursor-pointer`}
          >
            <div className="flex items-start space-x-3">
              <div className="text-3xl flex-shrink-0">{insight.icon}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {sanitizeText(insight.title)}
                    {insight.premium && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                        Premium
                      </span>
                    )}
                  </h4>
                  {insight.savings && (
                    <span className="text-sm font-bold text-emerald-500">
                      +{formatCurrency(insight.savings)}/mois
                    </span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {sanitizeText(insight.description)}
                </p>
                {insight.actionable && (
                  <button className="mt-3 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#F14545] to-[#FF6B6B] text-white text-xs font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                    Agir maintenant
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {insights.length === 0 && (
          <div className={`rounded-2xl p-8 text-center ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} backdrop-blur-xl border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              Ajoutez plus de transactions pour obtenir des insights personnalisés
            </p>
          </div>
        )}
      </div>

      {/* Premium CTA for free users */}
      {!isPremium && (
        <div className={`mt-4 p-4 rounded-2xl border-2 border-dashed ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-300 bg-gray-50'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="flex-1">
              <h5 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Débloquez plus d'insights IA
              </h5>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Recommandations avancées, détection de fraude, optimisation automatique
              </p>
            </div>
            <button className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white text-xs font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Premium
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

AIInsights.propTypes = {
  transactions: PropTypes.arrayOf(PropTypes.object),
  financialData: PropTypes.object,
  isPremium: PropTypes.bool,
  darkMode: PropTypes.bool,
};

AIInsights.defaultProps = {
  transactions: [],
  financialData: null,
  isPremium: false,
  darkMode: false,
};

// ⚡ PERFORMANCE: Memoize AIInsights to prevent unnecessary re-renders
export default React.memo(AIInsights);
