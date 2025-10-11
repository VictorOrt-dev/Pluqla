/**
 * Transactions List with Swipe Actions - Mobile-First
 * Swipe left to delete, swipe right to edit
 * Smooth animations and touch-friendly interactions
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { VariableSizeList } from 'react-window';
import { sanitizeText } from '../../utils/sanitize';

// ⚡ PERFORMANCE: Memoize TransactionItem to prevent unnecessary re-renders
const TransactionItem = React.memo(({ transaction, onEdit, onDelete, onConfirmDelete, darkMode }) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const itemRef = useRef(null);

  const minSwipeDistance = 50;

  // ✅ FIX: Memoize touch handlers to prevent recreation and ensure stable references
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    const distance = currentTouch - touchStart;
    // Limit swipe distance
    const limitedDistance = Math.max(-150, Math.min(150, distance));
    setSwipeOffset(limitedDistance);
  }, [touchStart]);

  // ✅ FIX: Replace window.confirm() with custom modal callback + haptic feedback
  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // ✅ FIX: Haptic feedback on action complete (iOS)
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10); // Light tap
      }
      // Delete action - use custom modal instead of window.confirm()
      onConfirmDelete(transaction);
    } else if (isRightSwipe) {
      // ✅ FIX: Haptic feedback on action complete (iOS)
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10); // Light tap
      }
      // Edit action
      onEdit(transaction);
    }

    // Reset swipe state
    setSwipeOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  }, [touchStart, touchEnd, minSwipeDistance, transaction, onEdit, onConfirmDelete]);

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
      other: '📦',
    };
    return icons[category] || '📦';
  };

  const getCategoryColor = (category) => {
    const colors = {
      alimentation: 'from-orange-500 to-orange-600',
      transport: 'from-blue-500 to-blue-600',
      loisirs: 'from-purple-500 to-purple-600',
      logement: 'from-green-500 to-green-600',
      sante: 'from-red-500 to-red-600',
      shopping: 'from-pink-500 to-pink-600',
      salary: 'from-emerald-500 to-emerald-600',
      freelance: 'from-teal-500 to-teal-600',
      investment: 'from-indigo-500 to-indigo-600',
      other: 'from-gray-500 to-gray-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="relative overflow-hidden">
      {/* ✅ FIX: Enhanced swipe action background with gradient reveals */}
      {/* LEFT ACTION BACKGROUND (Edit - Blue) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-l-2xl flex items-center justify-start px-4 transition-opacity duration-200"
        style={{
          opacity: Math.min(Math.abs(swipeOffset) / 100, 1) * (swipeOffset > 0 ? 1 : 0),
        }}
      >
        <div className="flex items-center space-x-2 text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs font-bold">Modifier</span>
        </div>
      </div>

      {/* RIGHT ACTION BACKGROUND (Delete - Red) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-red-500 to-red-600 rounded-r-2xl flex items-center justify-end px-4 transition-opacity duration-200"
        style={{
          opacity: Math.min(Math.abs(swipeOffset) / 100, 1) * (swipeOffset < 0 ? 1 : 0),
        }}
      >
        <div className="flex items-center space-x-2 text-white">
          <span className="text-xs font-bold">Supprimer</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      </div>

      {/* Transaction card */}
      <div
        ref={itemRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative rounded-2xl p-4 transition-all duration-200 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
            : 'bg-white/50 border-gray-200 hover:bg-white'
        } border backdrop-blur-sm`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          /* ✅ FIX: Removed inline background - using background layers instead */
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Icon and details */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(transaction.category)} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
              {getCategoryIcon(transaction.category)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {sanitizeText(transaction.description)}
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {formatDate(transaction.date)}
                </span>
                {transaction.location && (
                  <>
                    <span className={darkMode ? 'text-slate-600' : 'text-gray-300'}>•</span>
                    <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'} truncate`}>
                      {sanitizeText(transaction.location)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Amount */}
          <div className="text-right ml-3 flex-shrink-0">
            <div
              className={`font-bold text-lg ${
                transaction.type === 'income'
                  ? 'text-emerald-500'
                  : 'text-[#F14545]'
              }`}
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(Math.abs(transaction.amount))}
            </div>
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 justify-end">
                {transaction.tags.slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      darkMode
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // ⚡ PERFORMANCE: Custom comparison for better optimization
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.transaction.description === nextProps.transaction.description
  );
});

const TransactionsList = ({ transactions, onEdit, onDelete, onConfirmDelete, darkMode }) => {
  // ⚡ PERFORMANCE: Use virtualization for 50+ transactions
  const useVirtualization = transactions.length >= 50;

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
        month: 'long',
      });
    }
  };

  // ⚡ PERFORMANCE: Memoize grouped and flattened data
  const { flattenedItems, groupedTransactions } = useMemo(() => {
    const grouped = transactions.reduce((groups, transaction) => {
      const date = new Date(transaction.date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    }, {});

    // Flatten for virtualization: [header, item, item, header, item, ...]
    const flattened = [];
    Object.entries(grouped).forEach(([date, groupTransactions]) => {
      flattened.push({ type: 'header', date });
      groupTransactions.forEach(transaction => {
        flattened.push({ type: 'item', transaction });
      });
    });

    return { flattenedItems: flattened, groupedTransactions: grouped };
  }, [transactions]);

  // ⚡ PERFORMANCE: Calculate item size for virtualization
  const getItemSize = useCallback((index) => {
    const item = flattenedItems[index];
    if (item.type === 'header') return 40; // Header height
    return 120; // Transaction item height (includes spacing)
  }, [flattenedItems]);

  // Virtualized row renderer
  const VirtualizedRow = useCallback(({ index, style }) => {
    const item = flattenedItems[index];

    if (item.type === 'header') {
      return (
        <div style={style} className="pt-6">
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {formatGroupDate(item.date)}
          </h3>
        </div>
      );
    }

    return (
      <div style={style} className="px-0 pb-3">
        <TransactionItem
          transaction={item.transaction}
          onEdit={onEdit}
          onDelete={onDelete}
          onConfirmDelete={onConfirmDelete}
          darkMode={darkMode}
        />
      </div>
    );
  }, [flattenedItems, darkMode, onEdit, onDelete, onConfirmDelete]);

  // Empty state
  if (transactions.length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}>
        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-lg font-medium">Aucune transaction trouvée</p>
        <p className="text-sm mt-1">Ajoutez votre première transaction avec le bouton +</p>
      </div>
    );
  }

  // ⚡ VIRTUALIZED LIST for 50+ transactions
  if (useVirtualization) {
    return (
      <div className="space-y-6">
        <VariableSizeList
          height={600} // Fixed height for virtualization
          itemCount={flattenedItems.length}
          itemSize={getItemSize}
          width="100%"
          overscanCount={5}
        >
          {VirtualizedRow}
        </VariableSizeList>
      </div>
    );
  }

  // Regular rendering for small lists (< 50 items)
  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([date, groupTransactions]) => (
        <div key={date}>
          {/* Date header */}
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {formatGroupDate(date)}
          </h3>

          {/* Transactions for this date */}
          <div className="space-y-3">
            {groupTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onEdit={onEdit}
                onDelete={onDelete}
                onConfirmDelete={onConfirmDelete}
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
    description: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    category: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['income', 'expense']).isRequired,
    location: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onConfirmDelete: PropTypes.func.isRequired, // ✅ FIX: Added for custom modal
  darkMode: PropTypes.bool,
};

TransactionsList.propTypes = {
  transactions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onConfirmDelete: PropTypes.func.isRequired, // ✅ FIX: Added for custom modal
  darkMode: PropTypes.bool,
};

TransactionsList.defaultProps = {
  darkMode: false,
};

// ⚡ PERFORMANCE: Memoize TransactionsList component
export default React.memo(TransactionsList);
