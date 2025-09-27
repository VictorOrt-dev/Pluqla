import React from 'react';
import { useTranslation } from 'react-i18next';

const SavingsSummary = ({ data, userData, darkMode }) => {
  const { t } = useTranslation();

  const getSampleSummaryData = () => {
    return {
      totals: {
        income: 4750,
        expenses: 1210,
        savingsRate: 25.3,
        netSavings: 3540
      },
      period: 'month'
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getSavingsRateColor = (rate) => {
    if (rate >= 20) return 'text-green-500';
    if (rate >= 10) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (current, goal) => {
    const percentage = goal > 0 ? (current / goal) * 100 : 0;
    if (percentage >= 100) return 'from-green-400 to-green-600';
    if (percentage >= 75) return 'from-yellow-400 to-yellow-600';
    return 'from-blue-400 to-blue-600';
  };

  const displayData = data?.totals ? data : getSampleSummaryData();
  const currentSavings = userData?.savedAmount || 2100;
  const monthlyGoal = userData?.monthlyGoal || 2500;
  const progressPercentage = monthlyGoal > 0 ? Math.min((currentSavings / monthlyGoal) * 100, 100) : 0;

  return (
    <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700'
        : 'bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200'
    } shadow-xl`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h2 className={`text-xl sm:text-2xl font-bold truncate ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {t('finance.summary.title')}
          </h2>
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('finance.summary.subtitle')}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('finance.period')}
          </p>
          <p className={`font-semibold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {displayData?.period === 'month' ? t('finance.thisMonth') : t('finance.thisWeek')}
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Current Savings */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-2 sm:mb-3 ${
            darkMode
              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
              : 'bg-gradient-to-br from-blue-400 to-blue-500'
          }`}>
            <span className="text-xl sm:text-2xl">💰</span>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {formatCurrency(currentSavings)}
          </p>
          <p className={`pluqla-caption font-bold uppercase tracking-wide ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('finance.summary.totalSavings')}
          </p>
        </div>

        {/* Monthly Income */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-2 sm:mb-3 ${
            darkMode
              ? 'bg-gradient-to-br from-green-500 to-green-600'
              : 'bg-gradient-to-br from-green-400 to-green-500'
          }`}>
            <span className="text-xl sm:text-2xl">📈</span>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {formatCurrency(displayData?.totals?.income)}
          </p>
          <p className={`text-xs sm:text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('finance.summary.monthlyIncome')}
          </p>
        </div>

        {/* Expenses */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-2 sm:mb-3 ${
            darkMode
              ? 'bg-gradient-to-br from-red-500 to-red-600'
              : 'bg-gradient-to-br from-red-400 to-red-500'
          }`}>
            <span className="text-xl sm:text-2xl">💳</span>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {formatCurrency(displayData?.totals?.expenses)}
          </p>
          <p className={`text-xs sm:text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('finance.summary.totalExpenses')}
          </p>
        </div>
      </div>

      {/* Progress Toward Goal */}
      <div className={`rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 ${
        darkMode
          ? 'bg-gray-800/50 border border-gray-700'
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-1 sm:space-y-0">
          <h3 className={`font-semibold text-sm sm:text-base ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {t('finance.summary.goalProgress')}
          </h3>
          <span className={`text-xs sm:text-sm font-medium ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {formatCurrency(currentSavings)} / {formatCurrency(monthlyGoal)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getProgressColor(currentSavings, monthlyGoal)} transition-all duration-1000 ease-out`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {formatPercentage(progressPercentage)} {t('finance.summary.completed')}
          </span>
          {progressPercentage >= 100 && (
            <span className="text-xs text-green-500 font-medium">
              🎉 {t('finance.summary.goalReached')}
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className={`text-center p-3 sm:p-4 rounded-lg ${
          darkMode
            ? 'bg-gray-800/30 border border-gray-700'
            : 'bg-white/50 border border-gray-200'
        }`}>
          <p className={`text-xl sm:text-2xl font-bold ${getSavingsRateColor(displayData?.totals?.savingsRate)} ${
            darkMode ? '' : ''
          }`}>
            {formatPercentage(displayData?.totals?.savingsRate)}
          </p>
          <p className={`text-xs sm:text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('finance.summary.savingsRate')}
          </p>
        </div>

        <div className={`text-center p-3 sm:p-4 rounded-lg ${
          darkMode
            ? 'bg-gray-800/30 border border-gray-700'
            : 'bg-white/50 border border-gray-200'
        }`}>
          <p className={`text-xl sm:text-2xl font-bold ${
            displayData?.totals?.netSavings >= 0
              ? 'text-green-500'
              : 'text-red-500'
          }`}>
            {formatCurrency(displayData?.totals?.netSavings)}
          </p>
          <p className={`text-xs sm:text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {t('finance.summary.netSavings')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavingsSummary;