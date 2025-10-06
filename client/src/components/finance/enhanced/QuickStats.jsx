/**
 * Quick Stats - Pluqla Finance
 * 3-column grid: Expenses, Income, Savings with trends
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, TrendingDown, DollarSign, Minus, PiggyBank } from 'lucide-react';

const QuickStats = ({ transactions = [], darkMode = false }) => {
  // Calculate monthly stats
  const stats = useMemo(() => {
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

    // Calculate totals
    const currentExpenses = currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentIncome = currentMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const previousExpenses = previousMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const previousIncome = previousMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate trends (percentage change)
    const expensesTrend = previousExpenses > 0
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
      : 0;

    const incomeTrend = previousIncome > 0
      ? ((currentIncome - previousIncome) / previousIncome) * 100
      : 0;

    const currentSavings = currentIncome - currentExpenses;
    const previousSavings = previousIncome - previousExpenses;
    const savingsTrend = previousSavings > 0
      ? ((currentSavings - previousSavings) / previousSavings) * 100
      : 0;

    return {
      expenses: {
        amount: currentExpenses,
        trend: expensesTrend,
        isPositive: expensesTrend <= 0, // Lower expenses is positive
      },
      income: {
        amount: currentIncome,
        trend: incomeTrend,
        isPositive: incomeTrend >= 0,
      },
      savings: {
        amount: currentSavings,
        trend: savingsTrend,
        isPositive: savingsTrend >= 0,
      },
    };
  }, [transactions]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const StatCard = ({ icon: Icon, label, amount, trend, isPositive, iconBg, amountColor }) => (
    <div className="relative">
      {/* Glow overlay - HomeScreen pattern */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
          : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
      }`}></div>

      <div
        className={`relative rounded-2xl p-4 sm:p-6 backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-xl group ${
          darkMode
            ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)]'
            : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)]'
        }`}
      >
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3 shadow-lg`}>
          <Icon size={20} className="text-white" />
        </div>

        {/* Label */}
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-white/60' : 'text-gray-500'}`}>
          {label}
        </p>

        {/* Amount */}
        <p className={`text-2xl font-bold mb-2 transition-all duration-300 ${
          darkMode ? 'text-white group-hover:text-[#FF6B6B]' : 'text-[#121212] group-hover:text-[#F14545] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
        }`}>
          {formatCurrency(amount)}
        </p>

        {/* Trend indicator */}
        <div className="flex items-center space-x-1">
          {trend !== 0 && (
            <>
              {isPositive ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : (
                <TrendingDown size={14} className="text-red-500" />
              )}
              <span className={`text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                {Math.abs(trend).toFixed(1)}%
              </span>
            </>
          )}
          {trend === 0 && (
            <>
              <Minus size={14} className={darkMode ? 'text-white/60' : 'text-gray-400'} />
              <span className={`text-xs ${darkMode ? 'text-white/60' : 'text-gray-400'}`}>
                Stable
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Expenses */}
      <StatCard
        icon={DollarSign}
        label="Dépenses"
        amount={stats.expenses.amount}
        trend={stats.expenses.trend}
        isPositive={stats.expenses.isPositive}
        iconBg="bg-gradient-to-br from-[#F14545] to-[#FF6B6B]"
        amountColor={darkMode ? 'text-white' : 'text-gray-900'}
      />

      {/* Income */}
      <StatCard
        icon={TrendingUp}
        label="Revenus"
        amount={stats.income.amount}
        trend={stats.income.trend}
        isPositive={stats.income.isPositive}
        iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
        amountColor="text-emerald-500"
      />

      {/* Savings */}
      <StatCard
        icon={PiggyBank}
        label="Épargne"
        amount={stats.savings.amount}
        trend={stats.savings.trend}
        isPositive={stats.savings.isPositive}
        iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
        amountColor="text-blue-500"
      />
    </div>
  );
};

QuickStats.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.oneOf(['income', 'expense']),
      amount: PropTypes.number,
      date: PropTypes.string,
    })
  ),
  darkMode: PropTypes.bool,
};

export default QuickStats;
