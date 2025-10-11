/**
 * Projections and What-If Scenarios - AI-Powered Financial Forecasting
 * Predicts month-end balance, simulates spending changes
 * Premium feature with interactive scenario modeling
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';

const Projections = ({ financialData, isPremium, darkMode }) => {
  const [selectedScenario, setSelectedScenario] = useState('current');
  const [customAdjustment, setCustomAdjustment] = useState(0);

  // Mock projection calculations (would be AI-powered in production)
  const calculateProjections = () => {
    const currentBalance = financialData?.balance || 3540;
    const monthlyIncome = financialData?.income?.total || 4750;
    const monthlyExpenses = financialData?.expenses?.total || 1210;

    // ⚡ SAFETY: Prevent division by zero
    const savingsRate = monthlyIncome > 0
      ? (monthlyIncome - monthlyExpenses) / monthlyIncome
      : 0;

    const daysInMonth = 30;
    const daysRemaining = 15; // Mock: assume mid-month

    // Current trajectory
    // ⚡ SAFETY: Safe division (daysInMonth is always 30, but being defensive)
    const dailyExpenses = daysInMonth > 0 ? monthlyExpenses / daysInMonth : 0;
    const projectedExpenses = dailyExpenses * daysRemaining;
    const projectedEndBalance = currentBalance + monthlyIncome - projectedExpenses;

    // Scenarios
    const scenarios = {
      current: {
        name: 'Tendance actuelle',
        icon: '📊',
        description: 'Si vous continuez comme maintenant',
        endBalance: projectedEndBalance,
        savings: projectedEndBalance - currentBalance,
        confidence: 0.85,
      },
      optimistic: {
        name: 'Scénario optimiste',
        icon: '🚀',
        description: 'Réduction des dépenses de 20%',
        endBalance: currentBalance + monthlyIncome - (projectedExpenses * 0.8),
        savings: (currentBalance + monthlyIncome - (projectedExpenses * 0.8)) - currentBalance,
        confidence: 0.65,
      },
      pessimistic: {
        name: 'Scénario prudent',
        icon: '🛡️',
        description: 'Augmentation des dépenses de 10%',
        endBalance: currentBalance + monthlyIncome - (projectedExpenses * 1.1),
        savings: (currentBalance + monthlyIncome - (projectedExpenses * 1.1)) - currentBalance,
        confidence: 0.75,
      },
      custom: {
        name: 'Simulation personnalisée',
        icon: '🎯',
        description: `Ajustement de ${customAdjustment}€`,
        endBalance: projectedEndBalance + customAdjustment,
        savings: (projectedEndBalance + customAdjustment) - currentBalance,
        confidence: 0.70,
      },
    };

    return scenarios;
  };

  const scenarios = calculateProjections();
  const selectedData = scenarios[selectedScenario];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  if (!isPremium) {
    return (
      <div className={`rounded-3xl p-8 text-center ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700'
          : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200'
      } backdrop-blur-xl border shadow-2xl`}>
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Projections Premium
        </h3>
        <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
          Débloquez les projections IA et simulations what-if
        </p>
        <ul className={`text-left max-w-md mx-auto space-y-3 mb-6 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
          {[
            'Prévisions de fin de mois avec IA',
            'Simulations what-if interactives',
            'Scénarios optimistes/pessimistes',
            'Alertes de balance négative',
            'Recommandations personnalisées',
          ].map((feature, index) => (
            <li key={index} className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <button className="px-8 py-3 rounded-xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
          Passer Premium - 5€/mois
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Projections IA
        </h3>
        <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Prévoyez votre situation financière
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(scenarios).map(([key, scenario]) => (
          <button
            key={key}
            onClick={() => setSelectedScenario(key)}
            className={`p-4 rounded-2xl text-left transition-all duration-300 ${
              selectedScenario === key
                ? 'bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white shadow-2xl scale-105'
                : darkMode
                ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-white'
                : 'bg-white/50 border-gray-200 hover:bg-white text-gray-900'
            } border backdrop-blur-sm`}
          >
            <div className="text-3xl mb-2">{scenario.icon}</div>
            <h4 className="font-bold text-sm mb-1">{scenario.name}</h4>
            <p className={`text-xs ${selectedScenario === key ? 'text-white/90' : darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              {scenario.description}
            </p>
          </button>
        ))}
      </div>

      {/* Custom Adjustment */}
      {selectedScenario === 'custom' && (
        <div className={`p-4 rounded-2xl ${
          darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-gray-200'
        } border backdrop-blur-sm animate-slide-down`}>
          <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Ajustement personnalisé (€)
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="-1000"
              max="1000"
              step="50"
              value={customAdjustment}
              onChange={(e) => setCustomAdjustment(parseInt(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={customAdjustment}
              onChange={(e) => setCustomAdjustment(parseInt(e.target.value) || 0)}
              className={`w-24 px-3 py-2 rounded-lg ${
                darkMode
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'bg-gray-100 text-gray-900 border-gray-300'
              } border focus:outline-none focus:ring-2 focus:ring-[#F14545]/50`}
            />
          </div>
        </div>
      )}

      {/* Projection Visualization */}
      <div className={`rounded-3xl p-6 ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900/90 to-slate-800/90'
          : 'bg-gradient-to-br from-white/90 to-gray-50/90'
      } backdrop-blur-xl border ${darkMode ? 'border-slate-700' : 'border-gray-200'} shadow-2xl`}>

        {/* Main projection */}
        <div className="text-center mb-6">
          <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Balance prévue fin de mois
          </p>
          <div className={`text-5xl font-black mb-2 ${
            selectedData.endBalance > financialData?.balance
              ? 'bg-gradient-to-br from-emerald-500 to-green-600'
              : 'bg-gradient-to-br from-orange-500 to-red-500'
          } bg-clip-text text-transparent`}>
            {formatCurrency(selectedData.endBalance)}
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className={`text-lg font-bold ${
              selectedData.savings > 0 ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {selectedData.savings > 0 ? '+' : ''}{formatCurrency(selectedData.savings)}
            </span>
            <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              vs. aujourd'hui
            </span>
          </div>
        </div>

        {/* Confidence meter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Niveau de confiance
            </span>
            <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatPercentage(selectedData.confidence)}
            </span>
          </div>
          <div className="relative h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-1000 ease-out"
              style={{ width: formatPercentage(selectedData.confidence) }}
            />
          </div>
        </div>

        {/* Timeline visualization */}
        <div className="space-y-4">
          <h4 className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Évolution prévue
          </h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#F14545] to-emerald-500" />

            {/* Timeline points */}
            <div className="space-y-4">
              {[
                { label: "Aujourd'hui", amount: financialData?.balance || 3540, date: 'Maintenant' },
                { label: 'Semaine prochaine', amount: financialData?.balance + (selectedData.savings / 2), date: '+7 jours' },
                { label: 'Fin du mois', amount: selectedData.endBalance, date: '+15 jours' },
              ].map((point, index) => (
                <div key={index} className="relative pl-12">
                  <div className={`absolute left-0 w-8 h-8 rounded-full ${
                    index === 2
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                      : darkMode
                      ? 'bg-slate-700'
                      : 'bg-gray-200'
                  } border-4 ${darkMode ? 'border-slate-900' : 'border-white'} flex items-center justify-center`}>
                    {index === 2 && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {point.label}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                          {point.date}
                        </p>
                      </div>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(point.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className={`mt-6 p-4 rounded-2xl ${
          darkMode ? 'bg-slate-800/50' : 'bg-blue-50'
        } border ${darkMode ? 'border-slate-700' : 'border-blue-200'}`}>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Conseil IA
              </p>
              <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {selectedData.savings > 0
                  ? `Vous êtes sur la bonne voie ! En maintenant cette trajectoire, vous économiserez ${formatCurrency(selectedData.savings)} ce mois.`
                  : `Attention, votre balance pourrait diminuer de ${formatCurrency(Math.abs(selectedData.savings))}. Envisagez de réduire vos dépenses.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

Projections.propTypes = {
  financialData: PropTypes.shape({
    balance: PropTypes.number,
    income: PropTypes.shape({
      total: PropTypes.number,
    }),
    expenses: PropTypes.shape({
      total: PropTypes.number,
    }),
  }),
  isPremium: PropTypes.bool,
  darkMode: PropTypes.bool,
};

Projections.defaultProps = {
  isPremium: false,
  darkMode: false,
  financialData: null,
};

// ⚡ PERFORMANCE: Memoize Projections to prevent unnecessary re-renders
export default React.memo(Projections);
