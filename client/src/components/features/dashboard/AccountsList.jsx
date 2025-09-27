import React from 'react';
import { useTranslation } from 'react-i18next';

const AccountsList = ({ accounts, darkMode }) => {
  const { t } = useTranslation();

  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-3">🏦</div>
        <p className="text-center text-sm">
          {t('financial.accounts.noAccounts')}
        </p>
        <button className="mt-3 text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors">
          {t('financial.accounts.addFirst')}
        </button>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getAccountIcon = (type) => {
    const icons = {
      checking: '💳',
      savings: '🏛️',
      investment: '📈',
      crypto: '₿',
      loan: '🏠'
    };
    return icons[type] || '🏦';
  };

  const getProviderIcon = (provider) => {
    if (provider === 'manual') return '✏️';
    if (provider.includes('bnp')) return '🏦';
    if (provider.includes('credit')) return '🏛️';
    return '🔗';
  };

  const getBalanceColor = (balance, type) => {
    if (type === 'loan') {
      return 'text-red-600'; // Loans are always shown in red
    }
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getSyncStatus = (account) => {
    if (account.provider === 'manual') {
      return {
        icon: '✏️',
        text: t('financial.accounts.manual'),
        color: 'text-gray-500'
      };
    }

    if (account.lastSyncAt) {
      const lastSync = new Date(account.lastSyncAt);
      const hoursAgo = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60));

      if (hoursAgo < 1) {
        return {
          icon: '🟢',
          text: t('financial.accounts.syncRecent'),
          color: 'text-green-600'
        };
      } else if (hoursAgo < 24) {
        return {
          icon: '🟡',
          text: t('financial.accounts.syncHours', { hours: hoursAgo }),
          color: 'text-yellow-600'
        };
      } else {
        return {
          icon: '🔴',
          text: t('financial.accounts.syncDays', { days: Math.floor(hoursAgo / 24) }),
          color: 'text-red-600'
        };
      }
    } else {
      return {
        icon: '⚠️',
        text: t('financial.accounts.neverSynced'),
        color: 'text-orange-600'
      };
    }
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {accounts.map((account) => {
        const syncStatus = getSyncStatus(account);

        return (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3 flex-1">
              {/* Account Icon */}
              <div className="flex items-center space-x-1">
                <span className="text-lg">{getAccountIcon(account.type)}</span>
                <span className="text-xs">{getProviderIcon(account.provider)}</span>
              </div>

              {/* Account Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {account.name}
                  </h4>
                  <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    {t(`financial.accountTypes.${account.type}`)}
                  </span>
                </div>

                <div className="flex items-center space-x-3 mt-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {account.provider === 'manual'
                      ? t('financial.accounts.manualEntry')
                      : account.provider.replace('_', ' ').toUpperCase()
                    }
                  </p>

                  {/* Sync Status */}
                  <div className="flex items-center space-x-1">
                    <span className="text-xs">{syncStatus.icon}</span>
                    <span className={`text-xs ${syncStatus.color}`}>
                      {syncStatus.text}
                    </span>
                  </div>

                  {/* Transaction Count */}
                  {account.transactionCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {account.transactionCount} {t('financial.transactions')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="text-right">
              <p className={`text-sm font-semibold ${getBalanceColor(account.balance, account.type)}`}>
                {formatCurrency(account.balance)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {account.currency}
              </p>
            </div>
          </div>
        );
      })}

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {t('financial.accounts.total')}
          </span>
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(
                accounts
                  .filter(acc => acc.type !== 'loan')
                  .reduce((sum, acc) => sum + acc.balance, 0)
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {accounts.length} {t('financial.accounts.accountsCount')}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 mt-3">
          <button className="flex-1 text-xs bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
            {t('financial.accounts.addAccount')}
          </button>
          <button className="flex-1 text-xs bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors">
            {t('financial.accounts.syncAll')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountsList;