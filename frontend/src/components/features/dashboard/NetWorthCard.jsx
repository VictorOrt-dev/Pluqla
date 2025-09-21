import React from 'react';
import { useTranslation } from 'react-i18next';

const NetWorthCard = ({ data, darkMode }) => {
  const { t } = useTranslation();

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const {
    netWorth = 0,
    totalAssets = 0,
    totalLiabilities = 0,
    liquidAssets = 0,
    monthlyIncome = 0,
    accountsCount = 0,
    assetsCount = 0,
    goalsCount = 0
  } = data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getNetWorthColor = () => {
    if (netWorth > 0) return 'text-green-600';
    if (netWorth < 0) return 'text-red-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getNetWorthIcon = () => {
    if (netWorth > 0) return '📈';
    if (netWorth < 0) return '📉';
    return '📊';
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 rounded-xl p-6 text-white shadow-lg">
      {/* Main Net Worth Display */}
      <div className="text-center mb-6">
        <p className="text-blue-100 text-sm font-medium mb-2">
          {t('financial.netWorth.title')}
        </p>
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl">{getNetWorthIcon()}</span>
          <h2 className={`text-4xl font-bold ${getNetWorthColor()}`}>
            {formatCurrency(netWorth)}
          </h2>
        </div>
        <p className="text-blue-100 text-sm mt-2">
          {t('financial.netWorth.subtitle')}
        </p>
      </div>

      {/* Financial Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-500/20 rounded-lg p-4 text-center">
          <p className="text-blue-100 text-xs font-medium mb-1">
            {t('financial.totalAssets')}
          </p>
          <p className="text-white font-semibold text-lg">
            {formatCurrency(totalAssets)}
          </p>
        </div>

        <div className="bg-blue-500/20 rounded-lg p-4 text-center">
          <p className="text-blue-100 text-xs font-medium mb-1">
            {t('financial.totalLiabilities')}
          </p>
          <p className="text-white font-semibold text-lg">
            {formatCurrency(totalLiabilities)}
          </p>
        </div>

        <div className="bg-blue-500/20 rounded-lg p-4 text-center">
          <p className="text-blue-100 text-xs font-medium mb-1">
            {t('financial.liquidAssets')}
          </p>
          <p className="text-white font-semibold text-lg">
            {formatCurrency(liquidAssets)}
          </p>
        </div>

        <div className="bg-blue-500/20 rounded-lg p-4 text-center">
          <p className="text-blue-100 text-xs font-medium mb-1">
            {t('financial.monthlyIncome')}
          </p>
          <p className="text-white font-semibold text-lg">
            {formatCurrency(monthlyIncome)}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex justify-between items-center border-t border-blue-400/30 pt-4">
        <div className="flex space-x-6 text-sm">
          <div className="flex items-center space-x-1">
            <span>🏦</span>
            <span className="text-blue-100">
              {accountsCount} {t('financial.accounts')}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span>💎</span>
            <span className="text-blue-100">
              {assetsCount} {t('financial.assets')}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🎯</span>
            <span className="text-blue-100">
              {goalsCount} {t('financial.activeGoals')}
            </span>
          </div>
        </div>

        {/* Financial Health Indicator */}
        <div className="flex items-center space-x-2">
          <div className="text-xs text-blue-100">
            {t('financial.healthScore')}
          </div>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i <= Math.min(5, Math.max(1, Math.floor((netWorth / totalAssets) * 5) + 2))
                    ? 'bg-green-400'
                    : 'bg-blue-300/50'
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      {totalAssets > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-400/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-100">
                {t('financial.debtToAssetRatio')}
              </p>
              <p className="text-white font-semibold">
                {((totalLiabilities / totalAssets) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-blue-100">
                {t('financial.liquidityRatio')}
              </p>
              <p className="text-white font-semibold">
                {((liquidAssets / totalAssets) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetWorthCard;