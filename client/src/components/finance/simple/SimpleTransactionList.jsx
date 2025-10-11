/**
 * SimpleTransactionList - Clean Transaction List with Swipe to Delete
 * Money Manager style: simple, effective, no clutter
 */

import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

const TransactionItem = ({ transaction, onDelete, darkMode }) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    const distance = currentTouch - touchStart;
    const limitedDistance = Math.max(-150, Math.min(0, distance));
    setSwipeOffset(limitedDistance);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe) {
      // Haptic feedback
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
      // Confirm delete
      if (window.confirm(`Supprimer "${transaction.description}" ?`)) {
        onDelete(transaction.id);
      }
    }

    setSwipeOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      alimentation: '🍽️',
      transport: '🚗',
      loisirs: '🎬',
      logement: '🏠',
      sante: '💊',
      shopping: '🛍️',
      salary: '💼',
      freelance: '💻',
      investment: '📈',
      other: '💰',
      autres: '📦'
    };
    return icons[category] || '📦';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-red-500 to-red-600 rounded-r-2xl flex items-center justify-end px-4 transition-opacity duration-200"
        style={{
          opacity: Math.min(Math.abs(swipeOffset) / 100, 1)
        }}
      >
        <div className="flex items-center space-x-2 text-white">
          <span className="text-xs font-bold">Suppr.</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      </div>

      {/* Transaction card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative p-4 rounded-2xl backdrop-blur-xl border transition-all ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white/70 border-gray-200'
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">
              {getCategoryIcon(transaction.category)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold truncate ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {transaction.description}
              </h4>
              <p className={`text-sm ${
                darkMode ? 'text-slate-400' : 'text-gray-600'
              }`}>
                {formatDate(transaction.date)}
              </p>
            </div>
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            <div className={`font-bold text-lg ${
              transaction.type === 'income'
                ? 'text-emerald-500'
                : 'text-[#F14545]'
            }`}>
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(Math.abs(transaction.amount))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SimpleTransactionList = ({ transactions, onDelete, darkMode }) => {
  if (transactions.length === 0) {
    return (
      <div className={`mx-4 mb-4 p-8 rounded-2xl text-center ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700'
          : 'bg-white/70 border-gray-200'
      } border backdrop-blur-xl`}>
        <div className="text-6xl mb-4">📋</div>
        <p className={`text-lg font-medium mb-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Aucune transaction
        </p>
        <p className={`text-sm ${
          darkMode ? 'text-slate-400' : 'text-gray-600'
        }`}>
          Ajoutez votre première transaction avec le bouton +
        </p>
      </div>
    );
  }

  // Group by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});

  const formatGroupDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  };

  return (
    <div className="mx-4 mb-4 space-y-6">
      <h3 className={`text-base font-bold ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Transactions récentes
      </h3>

      {Object.entries(groupedTransactions).map(([date, groupTransactions]) => (
        <div key={date}>
          <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 ${
            darkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            {formatGroupDate(date)}
          </h4>
          <div className="space-y-2">
            {groupTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onDelete={onDelete}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

TransactionItem.propTypes = {
  transaction: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['expense', 'income']).isRequired,
    amount: PropTypes.number.isRequired,
    description: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  darkMode: PropTypes.bool
};

SimpleTransactionList.propTypes = {
  transactions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onDelete: PropTypes.func.isRequired,
  darkMode: PropTypes.bool
};

export default SimpleTransactionList;
