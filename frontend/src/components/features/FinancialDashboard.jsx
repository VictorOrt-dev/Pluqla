import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import NetWorthCard from './dashboard/NetWorthCard';
import AssetAllocationChart from './dashboard/AssetAllocationChart';
import AccountsList from './dashboard/AccountsList';
import FinancialGoals from './dashboard/FinancialGoals';
import NetWorthTrendChart from './dashboard/NetWorthTrendChart';
import FinancialInsights from './dashboard/FinancialInsights';
import Header from '../common/Header';
import Navigation from '../common/Navigation';

const FinancialDashboard = ({
  userData,
  setUserData,
  darkMode,
  setDarkMode
}) => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/financial/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleSyncAccounts = async () => {
    try {
      setRefreshing(true);

      const response = await fetch('/api/financial/sync-accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        // Show success message and reload data
        await loadDashboardData();
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (err) {
      console.error('Account sync error:', err);
      setError(err.message || 'Account synchronization failed');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col transition-colors duration-300">
        <Header
          userData={userData}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          title={t('financial.dashboard.title')}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('financial.dashboard.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col transition-colors duration-300">
        <Header
          userData={userData}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          title={t('financial.dashboard.title')}
        />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('financial.dashboard.error.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('financial.dashboard.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col transition-colors duration-300">
      <Header
        userData={userData}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        title={t('financial.dashboard.title')}
      />

      {/* Dashboard Header Actions */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('financial.dashboard.welcome')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('financial.dashboard.lastUpdate')}: {new Date(dashboardData?.lastUpdate).toLocaleString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              {refreshing ? '⟳' : '↻'} {t('financial.dashboard.refresh')}
            </button>
            <button
              onClick={handleSyncAccounts}
              disabled={refreshing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
            >
              {refreshing ? '⟳' : '🔄'} {t('financial.dashboard.sync')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-20 overflow-y-auto">
        {/* Net Worth Overview */}
        <div className="mt-6">
          <NetWorthCard
            data={dashboardData?.summary}
            darkMode={darkMode}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Asset Allocation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financial.dashboard.assetAllocation')}
            </h3>
            <AssetAllocationChart
              data={dashboardData?.assetAllocation}
              darkMode={darkMode}
            />
          </div>

          {/* Net Worth Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financial.dashboard.netWorthTrend')}
            </h3>
            <NetWorthTrendChart
              data={dashboardData?.netWorthTrend}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Accounts and Goals Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Accounts List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financial.dashboard.accounts')}
            </h3>
            <AccountsList
              accounts={dashboardData?.accounts}
              darkMode={darkMode}
            />
          </div>

          {/* Financial Goals */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financial.dashboard.goals')}
            </h3>
            <FinancialGoals
              goals={dashboardData?.activeGoals}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financial.dashboard.insights')}
            </h3>
            <FinancialInsights
              insights={dashboardData?.insights}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Top Assets & Liabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Top Assets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financial.dashboard.topAssets')}
            </h3>
            <div className="space-y-3">
              {dashboardData?.topAssets?.map((asset, index) => (
                <div key={asset.id} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{asset.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: asset.currency || 'EUR'
                      }).format(asset.totalValue)}
                    </p>
                    {asset.quantity && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {asset.quantity} × {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: asset.currency || 'EUR'
                        }).format(asset.unitValue)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Liabilities */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financial.dashboard.topLiabilities')}
            </h3>
            <div className="space-y-3">
              {dashboardData?.topLiabilities?.map((liability, index) => (
                <div key={liability.id} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{liability.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{liability.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: liability.currency || 'EUR'
                      }).format(liability.balance)}
                    </p>
                    {liability.monthlyPayment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: liability.currency || 'EUR'
                        }).format(liability.monthlyPayment)}/mois
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state for no data */}
        {!dashboardData?.accounts?.length && (
          <div className="mt-12 text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('financial.dashboard.noData.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {t('financial.dashboard.noData.description')}
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              {t('financial.dashboard.addAccount')}
            </button>
          </div>
        )}
      </div>

      <Navigation darkMode={darkMode} userData={userData} />
    </div>
  );
};

export default FinancialDashboard;