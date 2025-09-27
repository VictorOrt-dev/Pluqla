import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FinancialInsights = ({ insights, darkMode }) => {
  const { t } = useTranslation();
  const [expandedInsight, setExpandedInsight] = useState(null);

  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-3">🤖</div>
        <p className="text-center text-sm">
          {t('financial.insights.noInsights')}
        </p>
        <p className="text-center text-xs mt-1">
          {t('financial.insights.addMoreData')}
        </p>
      </div>
    );
  }

  const getInsightIcon = (type) => {
    const icons = {
      warning: '⚠️',
      success: '✅',
      suggestion: '💡',
      alert: '🚨',
      optimization: '⚡',
      goal: '🎯',
      trend: '📈',
      risk: '⚠️'
    };
    return icons[type] || '💡';
  };

  const getInsightColor = (priority) => {
    const colors = {
      low: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
      medium: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
      high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
      success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: {
        text: t('financial.insights.priority.low'),
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      },
      medium: {
        text: t('financial.insights.priority.medium'),
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      },
      high: {
        text: t('financial.insights.priority.high'),
        class: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
      },
      success: {
        text: t('financial.insights.priority.success'),
        class: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      }
    };
    return badges[priority] || badges.medium;
  };

  const toggleExpanded = (index) => {
    setExpandedInsight(expandedInsight === index ? null : index);
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {insights.map((insight, index) => {
        const isExpanded = expandedInsight === index;
        const priorityBadge = getPriorityBadge(insight.priority);

        return (
          <div
            key={index}
            className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${getInsightColor(insight.priority)}`}
            onClick={() => toggleExpanded(index)}
          >
            {/* Insight Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <span className="text-lg mt-0.5">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {insight.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityBadge.class}`}>
                      {priorityBadge.text}
                    </span>
                  </div>

                  <p className={`text-sm text-gray-700 dark:text-gray-300 ${
                    isExpanded ? '' : 'line-clamp-2'
                  }`}>
                    {insight.description}
                  </p>
                </div>
              </div>

              {/* Expand/Collapse Icon */}
              <button className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
                {/* Action Items */}
                {insight.actions && insight.actions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                      {t('financial.insights.recommendedActions')}
                    </h5>
                    <ul className="space-y-1">
                      {insight.actions.map((action, actionIndex) => (
                        <li
                          key={actionIndex}
                          className="flex items-start space-x-2 text-xs text-gray-600 dark:text-gray-400"
                        >
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related Metrics */}
                {insight.metrics && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                      {t('financial.insights.relatedMetrics')}
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(insight.metrics).map(([key, value]) => (
                        <div
                          key={key}
                          className="bg-white dark:bg-gray-800 p-2 rounded text-center"
                        >
                          <p className="text-xs text-gray-600 dark:text-gray-400">{key}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {typeof value === 'number' && key.includes('amount')
                              ? new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR',
                                  minimumFractionDigits: 0
                                }).format(value)
                              : value
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons */}
                {insight.quickActions && insight.quickActions.length > 0 && (
                  <div className="flex space-x-2">
                    {insight.quickActions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle quick action
                          console.log('Quick action:', action);
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Insight Score */}
                {insight.confidence && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('financial.insights.confidence')}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div
                          className="bg-red-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${insight.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {Math.round(insight.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Insights Summary */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center text-sm mb-3">
          <span className="text-gray-600 dark:text-gray-400">
            {t('financial.insights.summary')}
          </span>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {insights.filter(i => i.priority === 'high').length} {t('financial.insights.high')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {insights.filter(i => i.priority === 'medium').length} {t('financial.insights.medium')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {insights.filter(i => i.priority === 'success').length} {t('financial.insights.positive')}
              </span>
            </div>
          </div>
        </div>

        {/* AI Attribution */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
            <span>🤖</span>
            <span>{t('financial.insights.poweredByAI')}</span>
            <span className="text-red-600">Claude</span>
          </div>

          <button className="text-xs bg-gradient-to-r from-blue-600 to-red-600 text-white px-3 py-1 rounded-lg hover:from-blue-700 hover:to-red-700 transition-all">
            {t('financial.insights.getMoreInsights')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialInsights;