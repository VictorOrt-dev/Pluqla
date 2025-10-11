/**
 * Smart Notifications - Intelligent Financial Alerts
 * Budget threshold alerts, predicted negative balance alerts
 * Real-time notifications with actionable recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { sanitizeText } from '../../utils/sanitize';

const SmartNotifications = ({ financialData, budgets, darkMode, onDismiss }) => {
  const [notifications, setNotifications] = useState([]);
  const [showAll, setShowAll] = useState(false);

  // ✅ FIX: Memoize generateNotifications to prevent recreation
  const generateNotifications = useCallback(() => {
    const alerts = [];
    const now = new Date();

    // Budget threshold alerts
    if (budgets) {
      budgets.forEach((budget) => {
        const percentage = (budget.spent / budget.amount) * 100;

        if (percentage >= 100) {
          alerts.push({
            id: `budget-exceeded-${budget.category}`,
            type: 'critical',
            icon: '🚨',
            title: `Budget ${budget.category} dépassé`,
            message: `Vous avez dépensé ${percentage.toFixed(0)}% de votre budget ${budget.category} (${budget.spent}€/${budget.amount}€)`,
            timestamp: now,
            actionable: true,
            action: 'Ajuster le budget',
            priority: 'high',
          });
        } else if (percentage >= 90) {
          alerts.push({
            id: `budget-warning-${budget.category}`,
            type: 'warning',
            icon: '⚠️',
            title: `Budget ${budget.category} presque atteint`,
            message: `Attention, vous avez utilisé ${percentage.toFixed(0)}% de votre budget ${budget.category}`,
            timestamp: now,
            actionable: true,
            action: 'Voir détails',
            priority: 'medium',
          });
        } else if (percentage >= 70) {
          alerts.push({
            id: `budget-info-${budget.category}`,
            type: 'info',
            icon: 'ℹ️',
            title: `Budget ${budget.category}`,
            message: `Vous avez utilisé ${percentage.toFixed(0)}% de votre budget ${budget.category}`,
            timestamp: now,
            actionable: false,
            priority: 'low',
          });
        }
      });
    }

    // Predicted negative balance
    if (financialData) {
      const projectedBalance = financialData.balance + (financialData.income?.total || 0) - (financialData.expenses?.total || 0);

      if (projectedBalance < 0) {
        alerts.push({
          id: 'negative-balance-prediction',
          type: 'critical',
          icon: '❌',
          title: 'Alerte: Balance négative prévue',
          message: `Votre balance pourrait devenir négative (${projectedBalance.toFixed(2)}€) d'ici la fin du mois si les dépenses continuent`,
          timestamp: now,
          actionable: true,
          action: 'Voir projections',
          priority: 'high',
        });
      } else if (projectedBalance < 200) {
        alerts.push({
          id: 'low-balance-prediction',
          type: 'warning',
          icon: '⚠️',
          title: 'Balance faible prévue',
          message: `Votre balance pourrait descendre à ${projectedBalance.toFixed(2)}€ d'ici la fin du mois`,
          timestamp: now,
          actionable: true,
          action: 'Réduire les dépenses',
          priority: 'medium',
        });
      }
    }

    // Unusual spending detected
    if (financialData?.expenses?.total > (financialData?.income?.total || 0) * 0.5) {
      alerts.push({
        id: 'unusual-spending',
        type: 'info',
        icon: '📊',
        title: 'Dépenses inhabituelles',
        message: 'Vos dépenses ce mois sont plus élevées que la moyenne',
        timestamp: now,
        actionable: true,
        action: 'Analyser',
        priority: 'medium',
      });
    }

    // Savings milestone
    if (financialData?.savings >= 10000) {
      alerts.push({
        id: 'savings-milestone',
        type: 'success',
        icon: '🎉',
        title: 'Félicitations !',
        message: `Vous avez atteint ${financialData.savings}€ d'épargne !`,
        timestamp: now,
        actionable: false,
        priority: 'low',
      });
    }

    // Smart recommendations
    const savingsRate = financialData?.savingsRate || 0;
    if (savingsRate < 10) {
      alerts.push({
        id: 'low-savings-rate',
        type: 'info',
        icon: '💡',
        title: 'Conseil: Augmentez votre épargne',
        message: `Votre taux d'épargne (${savingsRate.toFixed(1)}%) est faible. Visez au moins 10% pour une meilleure sécurité financière`,
        timestamp: now,
        actionable: true,
        action: 'Voir conseils',
        priority: 'medium',
      });
    }

    // Sort by priority and timestamp
    return alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.timestamp - a.timestamp;
    });
  }, [financialData, budgets]); // ✅ FIX: Added dependencies to useCallback

  useEffect(() => {
    setNotifications(generateNotifications());
  }, [generateNotifications]); // ✅ FIX: Now correctly depends on memoized function

  const handleDismiss = (notificationId) => {
    setNotifications(notifications.filter((n) => n.id !== notificationId));
    if (onDismiss) {
      onDismiss(notificationId);
    }
  };

  const handleAction = (notification) => {
    // ✅ FIX: Removed console.log for production
    // TODO: Implement action handlers based on notification.action
    // Example: navigate to budget details, projections, etc.
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'critical':
        return darkMode
          ? 'border-l-red-500 bg-red-900/20'
          : 'border-l-red-500 bg-red-50';
      case 'warning':
        return darkMode
          ? 'border-l-orange-500 bg-orange-900/20'
          : 'border-l-orange-500 bg-orange-50';
      case 'success':
        return darkMode
          ? 'border-l-emerald-500 bg-emerald-900/20'
          : 'border-l-emerald-500 bg-emerald-50';
      default:
        return darkMode
          ? 'border-l-blue-500 bg-blue-900/20'
          : 'border-l-blue-500 bg-blue-50';
    }
  };

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 3);

  if (notifications.length === 0) {
    return (
      <div className={`rounded-2xl p-6 text-center ${darkMode ? 'bg-slate-800/50' : 'bg-white/50'} backdrop-blur-xl border ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
          Aucune notification
        </p>
        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
          Tout va bien !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Notifications
          </h3>
          <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {notifications.length} alerte(s) active(s)
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F14545] to-[#FF6B6B] flex items-center justify-center relative">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {displayedNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-2xl p-4 border-l-4 ${getNotificationStyle(notification.type)} backdrop-blur-sm transition-all duration-300 hover:scale-102 animate-slide-in`}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl flex-shrink-0">{notification.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {sanitizeText(notification.title)}
                  </h4>
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className={`ml-2 flex-shrink-0 ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className={`text-xs mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {sanitizeText(notification.message)}
                </p>
                <div className="flex items-center justify-between">
                  {notification.actionable && (
                    <button
                      onClick={() => handleAction(notification)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F14545] to-[#FF6B6B] text-white text-xs font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      {notification.action}
                    </button>
                  )}
                  <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                    {notification.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less */}
      {notifications.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
            darkMode
              ? 'bg-slate-800 text-white hover:bg-slate-700'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          {showAll ? 'Voir moins' : `Voir ${notifications.length - 3} notification(s) supplémentaire(s)`}
        </button>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

SmartNotifications.propTypes = {
  financialData: PropTypes.object,
  budgets: PropTypes.arrayOf(PropTypes.object),
  darkMode: PropTypes.bool,
  onDismiss: PropTypes.func,
};

SmartNotifications.defaultProps = {
  darkMode: false,
  financialData: null,
  budgets: [],
};

// ⚡ PERFORMANCE: Memoize SmartNotifications to prevent unnecessary re-renders
export default React.memo(SmartNotifications);
