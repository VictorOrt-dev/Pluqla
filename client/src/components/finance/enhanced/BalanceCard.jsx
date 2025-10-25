/**
 * Phase 2C Enhanced Balance Card - Pluqla Finance
 * Framer Motion animated balance + Premium interactions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import PropTypes from 'prop-types';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';

const BalanceCard = ({ darkMode = false, transactions = [] }) => {
  const [isHidden, setIsHidden] = useState(false);
  const [initialBalance] = useState(() => {
    const saved = localStorage.getItem('pluqla_initial_balance');
    return saved ? parseFloat(saved) : 3000;
  });

  // Calculate current balance from transactions
  const balance = useMemo(() => {
    const transactionBalance = transactions.reduce((total, t) => {
      return total + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
    return initialBalance + transactionBalance;
  }, [transactions, initialBalance]);

  // Calculate month change
  const monthChange = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthBalance = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((total, t) => total + (t.type === 'income' ? t.amount : -t.amount), 0);

    const lastMonthBalance = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((total, t) => total + (t.type === 'income' ? t.amount : -t.amount), 0);

    if (lastMonthBalance === 0) return currentMonthBalance > 0 ? 100 : 0;
    return ((currentMonthBalance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100;
  }, [transactions]);

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

  // Phase 2C: Animated balance counter
  const [displayBalance, setDisplayBalance] = useState(balance);
  const balanceSpring = useSpring(displayBalance, { stiffness: 100, damping: 20 });

  useEffect(() => {
    animate(balanceSpring, balance, {
      duration: 0.8,
      onUpdate: (latest) => setDisplayBalance(latest)
    });
  }, [balance, balanceSpring]);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Premium hover glow overlay - HomeScreen pattern */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
          : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
      }`}></div>

      {/* Main card - matching HomeScreen DA */}
      <motion.div
        className={`relative rounded-2xl p-4 sm:p-6 backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group ${
          darkMode
            ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
            : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
        }`}
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Header with toggle - Phase 2C Enhanced */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
            darkMode ? 'text-white/60' : 'text-gray-500'
          }`}>
            Solde disponible
          </h3>
          <motion.button
            onClick={() => setIsHidden(!isHidden)}
            className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border ${
              darkMode
                ? 'bg-black/40 hover:bg-[#F14545]/50 hover:shadow-[0_0_12px_rgba(241,69,69,0.6)] border-white/10 text-white/80'
                : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 shadow-sm hover:shadow-md text-gray-600 hover:text-white'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isHidden ? 'Afficher le solde' : 'Masquer le solde'}
          >
            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </motion.button>
        </div>

        {/* Balance amount - Phase 2C Animated Counter */}
        <div className="mb-4">
          {isHidden ? (
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className={`w-24 h-12 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-300/50'}`}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className={`w-12 h-12 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-300/50'}`}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </motion.div>
          ) : (
            <motion.h2
              className={`text-4xl sm:text-5xl font-bold transition-all duration-300 ${
                darkMode
                  ? 'text-white group-hover:text-[#FF6B6B]'
                  : 'text-[#121212] group-hover:text-[#F14545] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
              }`}
              key={balance}
              initial={{ scale: 1.1, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {formatCurrency(displayBalance)}
            </motion.h2>
          )}
        </div>

        {/* Month change indicator - Phase 2C Enhanced */}
        <motion.div
          className="flex items-center space-x-2 mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className={`flex items-center space-x-1 px-3 py-1 rounded-full backdrop-blur-sm border ${
              isPositiveChange
                ? darkMode
                  ? 'bg-black/40 border-white/10 text-emerald-400'
                  : 'bg-black/10 border-gray-200/50 text-emerald-600'
                : darkMode
                  ? 'bg-black/40 border-white/10 text-red-400'
                  : 'bg-black/10 border-gray-200/50 text-red-600'
            }`}
            whileHover={{ scale: 1.05 }}
          >
            {isPositiveChange ? (
              <TrendingUp size={14} className="flex-shrink-0" />
            ) : (
              <TrendingDown size={14} className="flex-shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold">
              {isPositiveChange ? '+' : ''}{Math.abs(monthChange).toFixed(1)}%
            </span>
          </motion.div>
          <span className={`text-xs sm:text-sm font-medium ${
            darkMode ? 'text-white/80' : 'text-gray-700'
          }`}>
            ce mois-ci
          </span>
        </motion.div>

        {/* Month progress bar - Phase 2C Enhanced with shimmer */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
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
          <div className={`h-2 rounded-full overflow-hidden relative ${
            darkMode ? 'bg-gray-700/50' : 'bg-gray-200'
          }`}>
            <motion.div
              className="h-full bg-gradient-to-r from-[#F14545] to-[#FF6B6B] relative overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: `${monthProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Shimmer effect Phase 2C */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

BalanceCard.propTypes = {
  darkMode: PropTypes.bool,
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.oneOf(['income', 'expense']),
      amount: PropTypes.number,
      category: PropTypes.string,
      date: PropTypes.string,
    })
  ),
};

export default BalanceCard;
