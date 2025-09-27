import React from 'react';
import { useTranslation } from 'react-i18next';

const FinancialGoals = ({ goals, darkMode }) => {
  const { t } = useTranslation();

  if (!goals || goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-center text-sm">
          {t('financial.goals.noGoals')}
        </p>
        <button className="mt-3 text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors">
          {t('financial.goals.createFirst')}
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

  const getGoalIcon = (type) => {
    const icons = {
      savings: '💰',
      debt_payoff: '💳',
      investment: '📈',
      emergency_fund: '🛡️'
    };
    return icons[type] || '🎯';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-red-600 bg-blue-100 dark:bg-blue-900/30',
      medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
      high: 'text-red-600 bg-red-100 dark:bg-red-900/30'
    };
    return colors[priority] || colors.medium;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-green-400';
    if (percentage >= 50) return 'bg-yellow-400';
    if (percentage >= 25) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getTimeRemaining = (targetDate) => {
    if (!targetDate) return null;

    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: t('financial.goals.overdue'),
        color: 'text-red-600',
        icon: '⚠️'
      };
    } else if (diffDays === 0) {
      return {
        text: t('financial.goals.today'),
        color: 'text-orange-600',
        icon: '🚨'
      };
    } else if (diffDays <= 7) {
      return {
        text: t('financial.goals.daysLeft', { count: diffDays }),
        color: 'text-orange-600',
        icon: '⏰'
      };
    } else if (diffDays <= 30) {
      return {
        text: t('financial.goals.daysLeft', { count: diffDays }),
        color: 'text-yellow-600',
        icon: '📅'
      };
    } else {
      const months = Math.floor(diffDays / 30);
      return {
        text: t('financial.goals.monthsLeft', { count: months }),
        color: 'text-red-600',
        icon: '📆'
      };
    }
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {goals.map((goal) => {
        const progressPercentage = goal.progressPercentage || 0;
        const timeRemaining = getTimeRemaining(goal.targetDate);
        const isCompleted = progressPercentage >= 100;

        return (
          <div
            key={goal.id}
            className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
              isCompleted
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {/* Goal Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getGoalIcon(goal.type)}</span>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {goal.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(goal.priority)}`}>
                      {t(`financial.goals.priority.${goal.priority}`)}
                    </span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                      {t(`financial.goals.types.${goal.type}`)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Completion Status */}
              {isCompleted && (
                <div className="flex items-center space-x-1 text-green-600">
                  <span className="text-lg">✅</span>
                  <span className="text-xs font-medium">{t('financial.goals.completed')}</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {t('financial.goals.progress')}
                </span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {Math.min(100, progressPercentage).toFixed(1)}%
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatCurrency(goal.currentAmount || 0)}
                </span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {formatCurrency(goal.targetAmount)}
                </span>
              </div>
            </div>

            {/* Goal Details */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('financial.goals.remaining')}: {formatCurrency(goal.remainingAmount || 0)}
                </p>
                {goal.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {goal.description}
                  </p>
                )}
              </div>

              {/* Time Remaining */}
              {timeRemaining && (
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs">{timeRemaining.icon}</span>
                    <span className={`text-xs font-medium ${timeRemaining.color}`}>
                      {timeRemaining.text}
                    </span>
                  </div>
                  {goal.targetDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(goal.targetDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Suggestions */}
            {!isCompleted && progressPercentage < 50 && (
              <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">💡</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {(() => {
                      if (goal.type === 'savings' && timeRemaining) {
                        const dailyNeeded = goal.remainingAmount / (timeRemaining.text.includes('jours') ? parseInt(timeRemaining.text) : parseInt(timeRemaining.text) * 30);
                        return t('financial.goals.suggestion.dailySavings', {
                          amount: formatCurrency(dailyNeeded)
                        });
                      } else if (goal.type === 'debt_payoff') {
                        return t('financial.goals.suggestion.debtPayoff');
                      } else {
                        return t('financial.goals.suggestion.general');
                      }
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Goals Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center text-sm mb-3">
          <span className="text-gray-600 dark:text-gray-400">
            {t('financial.goals.summary')}
          </span>
          <span className="text-gray-900 dark:text-white font-medium">
            {goals.filter(g => (g.progressPercentage || 0) >= 100).length} / {goals.length} {t('financial.goals.completed')}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <button className="flex-1 text-xs bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors">
            {t('financial.goals.createNew')}
          </button>
          <button className="flex-1 text-xs bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
            {t('financial.goals.viewAll')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialGoals;