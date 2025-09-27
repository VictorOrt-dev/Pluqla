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
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('financial.dashboard.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-[#121212] via-black to-[#1a1a1a]'
        : 'bg-gradient-to-br from-[#F9F9F9] via-white to-[#FFF5F5]'
    }`}>
      <Header
        userData={userData}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        title={t('financial.dashboard.title')}
      />

      {/* Enhanced Dashboard Header Actions with Pluqla styling */}
      <div className={`px-6 py-4 border-b transition-colors duration-300 ${
        darkMode
          ? 'border-gray-700 bg-gradient-to-r from-[#1a1a1a] to-black'
          : 'border-gray-200 bg-gradient-to-r from-white to-[#FFFAFA]'
      }`} style={{
        boxShadow: darkMode
          ? '0 4px 12px rgba(241, 69, 69, 0.1)'
          : '0 4px 12px rgba(241, 69, 69, 0.05)'
      }}>
        <div className="flex justify-between items-center">
          <div>
            {/* Title with Pluqla elegant black */}
            <h1 className={`text-2xl font-bold transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {t('financial.dashboard.welcome')}
            </h1>
            {/* Subtitle with cherry-red accent */}
            <p className={`text-sm font-medium ${
              darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
            }`}>
              {t('financial.dashboard.lastUpdate')}: {new Date(dashboardData?.lastUpdate).toLocaleString()}
            </p>
          </div>
          <div className="flex space-x-2">
            {/* Refresh button with Pluqla cherry-red styling */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-all duration-300 disabled:opacity-50 hover:scale-105 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #F14545 0%, #D73030 100%)',
                boxShadow: '0 4px 15px rgba(241, 69, 69, 0.3)'
              }}
            >
              {refreshing ? '⟳' : '↻'} {t('financial.dashboard.refresh')}
            </button>
            {/* Sync button with elegant black styling */}
            <button
              onClick={handleSyncAccounts}
              disabled={refreshing}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 disabled:opacity-50 hover:scale-105 shadow-lg ${
                darkMode
                  ? 'bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:from-gray-600 hover:to-gray-500'
                  : 'bg-gradient-to-r from-[#121212] to-gray-800 text-white hover:from-gray-800 hover:to-[#121212]'
              }`}
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

        {/* Enhanced Charts Section with Pluqla card styling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Asset Allocation with enhanced styling */}
          <div className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border border-[#F14545]/10'
              : 'bg-gradient-to-br from-white to-[#FFFAFA] shadow-lg border border-[#F14545]/5'
          }`} style={{
            boxShadow: darkMode
              ? '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(241, 69, 69, 0.1)'
              : '0 8px 25px rgba(241, 69, 69, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Title with Pluqla elegant black */}
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {t('financial.dashboard.assetAllocation')}
            </h3>
            <AssetAllocationChart
              data={dashboardData?.assetAllocation}
              darkMode={darkMode}
            />
          </div>

          {/* Net Worth Trend with enhanced styling */}
          <div className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border border-[#F14545]/10'
              : 'bg-gradient-to-br from-white to-[#FFFAFA] shadow-lg border border-[#F14545]/5'
          }`} style={{
            boxShadow: darkMode
              ? '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(241, 69, 69, 0.1)'
              : '0 8px 25px rgba(241, 69, 69, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Title with Pluqla elegant black */}
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {t('financial.dashboard.netWorthTrend')}
            </h3>
            <NetWorthTrendChart
              data={dashboardData?.netWorthTrend}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Enhanced Accounts and Goals Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Accounts List with enhanced styling */}
          <div className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border border-[#F14545]/10'
              : 'bg-gradient-to-br from-white to-[#FFFAFA] shadow-lg border border-[#F14545]/5'
          }`} style={{
            boxShadow: darkMode
              ? '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(241, 69, 69, 0.1)'
              : '0 8px 25px rgba(241, 69, 69, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Title with Pluqla elegant black */}
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {t('financial.dashboard.accounts')}
            </h3>
            <AccountsList
              accounts={dashboardData?.accounts}
              darkMode={darkMode}
            />
          </div>

          {/* Financial Goals with enhanced styling */}
          <div className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border border-[#F14545]/10'
              : 'bg-gradient-to-br from-white to-[#FFFAFA] shadow-lg border border-[#F14545]/5'
          }`} style={{
            boxShadow: darkMode
              ? '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(241, 69, 69, 0.1)'
              : '0 8px 25px rgba(241, 69, 69, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Title with Pluqla elegant black */}
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {t('financial.dashboard.goals')}
            </h3>
            <FinancialGoals
              goals={dashboardData?.activeGoals}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Enhanced AI Insights Section */}
        <div className="mt-6">
          <div className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.01] ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border border-[#F14545]/10'
              : 'bg-gradient-to-br from-white to-[#FFFAFA] shadow-lg border border-[#F14545]/5'
          }`} style={{
            boxShadow: darkMode
              ? '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(241, 69, 69, 0.1)'
              : '0 8px 25px rgba(241, 69, 69, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            {/* AI Insights title with cherry-red accent */}
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 flex items-center gap-2 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              <span className="text-[#F14545]">🤖</span>
              {t('financial.dashboard.insights')}
            </h3>
            <FinancialInsights
              insights={dashboardData?.insights}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* Enhanced Top Assets & Liabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Top Assets with enhanced styling */}
          <div className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border border-[#F14545]/10'
              : 'bg-gradient-to-br from-white to-[#FFFAFA] shadow-lg border border-[#F14545]/5'
          }`} style={{
            boxShadow: darkMode
              ? '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(241, 69, 69, 0.1)'
              : '0 8px 25px rgba(241, 69, 69, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Title with Pluqla elegant black */}
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {t('financial.dashboard.topAssets')}
            </h3>
            <div className="space-y-3">
              {dashboardData?.topAssets?.map((asset, index) => (
                <div key={asset.id} className="flex justify-between items-center py-2 hover:bg-opacity-50 rounded-lg transition-colors duration-200">
                  <div>
                    {/* Asset name with Pluqla elegant black */}
                    <p className={`font-medium transition-colors duration-300 ${
                      darkMode ? 'text-white' : 'text-[#121212]'
                    }`}>{asset.name}</p>
                    {/* Asset type with neutral gray */}
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-[#9CA3AF]'
                    }`}>{asset.type}</p>
                  </div>
                  <div className="text-right">
                    {/* Asset value with cherry-red for positive amounts */}
                    <p className="font-semibold text-[#10b981] transition-colors duration-300">
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

          {/* Top Liabilities with enhanced styling */}
          <div className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${
            darkMode
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg border border-[#F14545]/10'
              : 'bg-gradient-to-br from-white to-[#FFFAFA] shadow-lg border border-[#F14545]/5'
          }`} style={{
            boxShadow: darkMode
              ? '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(241, 69, 69, 0.1)'
              : '0 8px 25px rgba(241, 69, 69, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Title with Pluqla elegant black */}
            <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {t('financial.dashboard.topLiabilities')}
            </h3>
            <div className="space-y-3">
              {dashboardData?.topLiabilities?.map((liability, index) => (
                <div key={liability.id} className="flex justify-between items-center py-2 hover:bg-opacity-50 rounded-lg transition-colors duration-200">
                  <div>
                    {/* Liability name with Pluqla elegant black */}
                    <p className={`font-medium transition-colors duration-300 ${
                      darkMode ? 'text-white' : 'text-[#121212]'
                    }`}>{liability.name}</p>
                    {/* Liability type with neutral gray */}
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-[#9CA3AF]'
                    }`}>{liability.type}</p>
                  </div>
                  <div className="text-right">
                    {/* Liability balance with cherry-red for debts */}
                    <p className="font-semibold text-[#F14545] transition-colors duration-300">
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
            {/* Add Account button with Pluqla cherry-red styling */}
            <button
              className="text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #F14545 0%, #D73030 100%)',
                boxShadow: '0 4px 15px rgba(241, 69, 69, 0.3)'
              }}
            >
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