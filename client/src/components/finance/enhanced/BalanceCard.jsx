/**
 * Enhanced Balance Card - Pluqla Finance
 * Adapted to match HomeScreen DA
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';

const BalanceCard = ({ darkMode = false }) => {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('pluqla_balance');
    return saved ? parseFloat(saved) : 3540;
  });

  const [monthChange, setMonthChange] = useState(() => {
    const saved = localStorage.getItem('pluqla_month_change');
    return saved ? parseFloat(saved) : 12.5;
  });

  const [isHidden, setIsHidden] = useState(false);

  // Persist balance changes
  useEffect(() => {
    localStorage.setItem('pluqla_balance', balance.toString());
  }, [balance]);

  // Calculate month progress (1-31 days)
  const today = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthProgress = (today / daysInMonth) * 100;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const isPositiveChange = monthChange >= 0;

  return (
    <div className="relative pluqla-scale-in">
      {/* Premium hover glow overlay - HomeScreen pattern */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
          : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
      }`}></div>

      {/* Main card - matching HomeScreen DA */}
      <div
        className={`relative rounded-2xl p-4 sm:p-6 backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group ${
          darkMode
            ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
            : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
        }`}
      >
        {/* Header with toggle */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
            darkMode ? 'text-white/60' : 'text-gray-500'
          }`}>
            Solde disponible
          </h3>
          <button
            onClick={() => setIsHidden(!isHidden)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
              darkMode
                ? 'bg-black/40 hover:bg-[#F14545]/50 hover:shadow-[0_0_12px_rgba(241,69,69,0.6)] border-white/10 text-white/80'
                : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 shadow-sm hover:shadow-md text-gray-600 hover:text-white'
            }`}
            aria-label={isHidden ? 'Afficher le solde' : 'Masquer le solde'}
          >
            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Balance amount */}
        <div className="mb-4">
          {isHidden ? (
            <div className="flex items-center space-x-2">
              <div className={`w-24 h-12 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-300/50'
              }`} />
              <div className={`w-12 h-12 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-300/50'
              }`} />
            </div>
          ) : (
            <h2 className={`text-4xl sm:text-5xl font-bold transition-all duration-300 ${
              darkMode
                ? 'text-white group-hover:text-[#FF6B6B]'
                : 'text-[#121212] group-hover:text-[#F14545] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
            }`}>
              {formatCurrency(balance)}
            </h2>
          )}
        </div>

        {/* Month change indicator */}
        <div className="flex items-center space-x-2 mb-4">
          <div
            className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-200 backdrop-blur-sm border ${
              isPositiveChange
                ? darkMode
                  ? 'bg-black/40 border-white/10 text-emerald-400'
                  : 'bg-black/10 border-gray-200/50 text-emerald-600'
                : darkMode
                  ? 'bg-black/40 border-white/10 text-red-400'
                  : 'bg-black/10 border-gray-200/50 text-red-600'
            }`}
          >
            {isPositiveChange ? (
              <TrendingUp size={14} className="flex-shrink-0" />
            ) : (
              <TrendingDown size={14} className="flex-shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold">
              {isPositiveChange ? '+' : ''}{monthChange}%
            </span>
          </div>
          <span className={`text-xs sm:text-sm font-medium ${
            darkMode ? 'text-white/80' : 'text-gray-700'
          }`}>
            ce mois-ci
          </span>
        </div>

        {/* Month progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${
              darkMode ? 'text-white/60' : 'text-gray-500'
            }`}>
              Progression du mois
            </span>
            <span className={`font-bold ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {Math.round(monthProgress)}%
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${
            darkMode ? 'bg-gray-700/50' : 'bg-gray-200'
          }`}>
            <div
              className="h-full bg-gradient-to-r from-[#F14545] to-[#FF6B6B] transition-all duration-500 ease-out"
              style={{ width: `${monthProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

BalanceCard.propTypes = {
  darkMode: PropTypes.bool,
};

export default BalanceCard;
