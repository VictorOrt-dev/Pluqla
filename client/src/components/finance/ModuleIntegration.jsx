/**
 * Module Integration - Transport and Food Costs
 * Shows monthly costs from Transport and Alimentation modules
 * Links to detailed module views and provides insights
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigation } from '../../contexts/NavigationContext';
import { sanitizeText } from '../../utils/sanitize';

const ModuleIntegration = ({ modules, totalExpenses, darkMode }) => {
  const { setCurrentScreen } = useNavigation();

  // ✅ FIX: Default module configuration (styling only)
  const defaultModuleConfig = {
    transport: {
      name: 'Transport',
      icon: '🚗',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-500/10 to-blue-600/10',
      screen: 'deplacement',
    },
    alimentation: {
      name: 'Alimentation',
      icon: '🍽️',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-500/10 to-orange-600/10',
      screen: 'alimentation',
    },
  };

  // ✅ FIX: Use real modules data from props, merge with default styling
  const enhancedModules = modules.map((module) => ({
    ...defaultModuleConfig[module.id],
    ...module,
  }));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalModuleCosts = enhancedModules.reduce((sum, module) => sum + module.monthlyTotal, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Dépenses par Module
        </h3>
        <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Total: {formatCurrency(totalModuleCosts)} ce mois
        </p>
      </div>

      {/* Module Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {enhancedModules.map((module) => (
          <div
            key={module.id}
            onClick={() => setCurrentScreen(module.screen)}
            className={`rounded-2xl p-5 ${
              darkMode
                ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                : 'bg-white/50 border-gray-200 hover:bg-white'
            } border backdrop-blur-xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.bgColor} backdrop-blur-sm flex items-center justify-center text-2xl transform group-hover:scale-110 transition-transform duration-300`}>
                  {module.icon}
                </div>
                <div>
                  <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {sanitizeText(module.name)}
                  </h4>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {module.transactions} transactions
                  </p>
                </div>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold ${
                module.trendUp
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                <svg
                  className={`w-3 h-3 ${module.trendUp ? '' : 'transform rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>{module.trend}</span>
              </div>
            </div>

            {/* Monthly Total */}
            <div className="mb-3">
              <p className={`text-sm font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Total ce mois
              </p>
              <p className={`text-3xl font-black bg-gradient-to-br ${module.color} bg-clip-text text-transparent`}>
                {formatCurrency(module.monthlyTotal)}
              </p>
            </div>

            {/* Top Item */}
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-slate-900/50' : 'bg-gray-50'} mb-3`}>
              <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Dernière transaction
              </p>
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {sanitizeText(module.topItem)}
              </p>
            </div>

            {/* Action Button */}
            <button
              className={`w-full py-2 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
                darkMode
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              } group-hover:bg-gradient-to-r group-hover:from-[#F14545] group-hover:to-[#FF6B6B] group-hover:text-white group-hover:shadow-lg`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>Voir détails</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Combined Insights */}
      <div className={`rounded-2xl p-5 ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700'
          : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200'
      } border backdrop-blur-xl`}>
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className={`font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Conseil combiné
            </h4>
            <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Vos dépenses Transport et Alimentation représentent {totalExpenses > 0 ? ((totalModuleCosts / totalExpenses) * 100).toFixed(0) : 0}% de vos dépenses totales.
              En optimisant ces catégories (covoiturage, courses groupées), vous pourriez économiser jusqu'à {formatCurrency(totalModuleCosts * 0.15)}/mois.
            </p>
            <div className="flex space-x-2 mt-3">
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#F14545] to-[#FF6B6B] text-white text-xs font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                Optimiser maintenant
              </button>
              <button className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                darkMode
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              } transition-all duration-300`}>
                Plus d'infos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} backdrop-blur-sm border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Économies possibles
          </p>
          <p className={`text-2xl font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {formatCurrency(totalModuleCosts * 0.15)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} backdrop-blur-sm border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Budget optimal
          </p>
          <p className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {formatCurrency(totalModuleCosts * 0.85)}
          </p>
        </div>
      </div>
    </div>
  );
};

ModuleIntegration.propTypes = {
  modules: PropTypes.arrayOf(PropTypes.object), // ✅ FIX: Added modules prop
  totalExpenses: PropTypes.number, // ✅ FIX: Added totalExpenses prop
  darkMode: PropTypes.bool,
};

ModuleIntegration.defaultProps = {
  modules: [], // ✅ FIX: Default to empty array
  totalExpenses: 0, // ✅ FIX: Default to 0
  darkMode: false,
};

// ⚡ PERFORMANCE: Memoize ModuleIntegration to prevent unnecessary re-renders
export default React.memo(ModuleIntegration);
