import React from 'react';

/**
 * Unified Financial Card Component
 * Provides consistent card styling for financial data across the app
 *
 * Features:
 * - Consistent Pluqla branding and shadows
 * - Responsive design with mobile optimization
 * - Support for dark/light themes
 * - Trust indicators for security
 * - Loading states with skeleton animation
 * - Hover interactions for better UX
 */

const FinancialCard = ({
  children,
  title,
  subtitle,
  icon,
  value,
  trend,
  trendDirection,
  lastSync,
  trustBadge = false,
  loading = false,
  darkMode = false,
  className = '',
  onClick,
  ...props
}) => {
  // Enhanced base card classes with Pluqla theme
  const baseCardClasses = `
    ${darkMode ? 'pluqla-card-dark' : 'pluqla-card-light'}
    p-6 sm:p-8 transition-all duration-500 rounded-2xl sm:rounded-3xl
    shadow-2xl hover:shadow-3xl pluqla-scale-bounce
    ${onClick ? 'cursor-pointer pluqla-hover-lift group' : ''}
    ${className}
  `;

  // Handle card click
  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };

  // Render trust badge if enabled
  const renderTrustBadge = () => {
    if (!trustBadge) return null;

    return (
      <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-3 text-xs">
          <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>🔒</span>
            <span>SSL</span>
          </div>
          <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>🇪🇺</span>
            <span>GDPR</span>
          </div>
          <div className={`flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>🛡️</span>
            <span>Sécurisé</span>
          </div>
        </div>
      </div>
    );
  };

  // Render last sync timestamp
  const renderLastSync = () => {
    if (!lastSync) return null;

    const now = new Date();
    const syncTime = new Date(lastSync);
    const diffMinutes = Math.floor((now - syncTime) / 1000 / 60);

    let syncText = '';
    if (diffMinutes < 1) {
      syncText = 'Synchronisé à l\'instant';
    } else if (diffMinutes < 60) {
      syncText = `Synchronisé il y a ${diffMinutes}min`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      syncText = `Synchronisé il y a ${diffHours}h`;
    }

    return (
      <div className="flex items-center space-x-2 mt-3">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {syncText}
        </span>
      </div>
    );
  };

  // Render trend indicator
  const renderTrend = () => {
    if (!trend || !trendDirection) return null;

    const isPositive = trendDirection === 'up';
    const trendColor = isPositive ? 'text-green-500' : 'text-red-500';
    const trendIcon = isPositive ? '↗️' : '↘️';

    return (
      <div className={`flex items-center space-x-2 pluqla-body-small ${trendColor} font-bold`}>
        <span className="text-lg pluqla-glow-accent">{trendIcon}</span>
        <span>{trend}</span>
      </div>
    );
  };

  // Render loading skeleton
  if (loading) {
    return (
      <div className={baseCardClasses}>
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={baseCardClasses} onClick={handleClick} {...props}>
      {/* Header with icon, title, and value */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl pluqla-gradient-main text-white shadow-xl pluqla-wiggle border-2 border-white/20">
              <span className="text-xl sm:text-2xl pluqla-glow-accent">{icon}</span>
            </div>
          )}
          <div>
            {title && (
              <h3 className={`pluqla-title-small bg-gradient-to-r ${
                darkMode
                  ? 'from-white via-gray-200 to-gray-300 text-transparent bg-clip-text'
                  : 'from-gray-900 via-red-700 to-gray-800 text-transparent bg-clip-text'
              }`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`pluqla-body-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {value && (
          <div className="text-right">
            <div className={`pluqla-title-medium font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {value}
            </div>
            {renderTrend()}
          </div>
        )}
      </div>

      {/* Custom content */}
      {children}

      {/* Last sync info */}
      {renderLastSync()}

      {/* Trust indicators */}
      {renderTrustBadge()}
    </div>
  );
};

// Pre-configured card variants for common use cases
export const SavingsCard = ({ amount, goal, progress, ...props }) => (
  <FinancialCard
    icon="💰"
    title="Économies"
    value={amount}
    {...props}
  >
    {goal && (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Objectif: {goal}</span>
          <span className="text-sm font-medium text-red-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>
    )}
  </FinancialCard>
);

export const ExpenseCard = ({ category, amount, budget, ...props }) => (
  <FinancialCard
    icon="📊"
    title={category}
    value={amount}
    {...props}
  >
    {budget && (
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">Budget: {budget}</span>
        <span className={`text-sm font-medium ${
          parseFloat(amount.replace(/[^0-9.-]/g, '')) > parseFloat(budget.replace(/[^0-9.-]/g, ''))
            ? 'text-red-500'
            : 'text-green-500'
        }`}>
          {parseFloat(amount.replace(/[^0-9.-]/g, '')) > parseFloat(budget.replace(/[^0-9.-]/g, ''))
            ? 'Dépassé'
            : 'Dans le budget'}
        </span>
      </div>
    )}
  </FinancialCard>
);

export const AccountCard = ({ bankName, accountType, balance, ...props }) => (
  <FinancialCard
    icon="🏦"
    title={bankName}
    subtitle={accountType}
    value={balance}
    trustBadge={true}
    {...props}
  />
);

export default FinancialCard;