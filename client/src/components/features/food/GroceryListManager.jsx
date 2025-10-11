/**
 * GroceryListManager Component
 *
 * Interactive grocery list with category grouping, check/uncheck, cost tracking
 * Features: progress tracking, budget comparison, print-friendly view
 */

import React, { useState } from 'react';

const GroceryListManager = ({
  groceryList,
  onUpdateItem,
  darkMode,
  loading = false
}) => {
  const [editingItemId, setEditingItemId] = useState(null);
  const [actualCost, setActualCost] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['produce', 'dairy', 'meat', 'pantry']));

  if (!groceryList) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-lg font-semibold">Aucune liste de courses</p>
        <p className="text-sm mt-2">Générez un plan hebdomadaire pour créer votre liste</p>
      </div>
    );
  }

  const categoryIcons = {
    produce: '🥬',
    dairy: '🥛',
    meat: '🥩',
    pantry: '🏺',
    spices: '🧂',
    other: '📦'
  };

  const categoryNames = {
    produce: 'Fruits & Légumes',
    dairy: 'Produits Laitiers',
    meat: 'Viandes & Poissons',
    pantry: 'Épicerie',
    spices: 'Épices & Condiments',
    other: 'Autres'
  };

  // Group items by category
  const itemsByCategory = (groceryList.items || []).reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Sort categories
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const order = ['produce', 'dairy', 'meat', 'pantry', 'spices', 'other'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleItem = async (item) => {
    if (onUpdateItem) {
      await onUpdateItem(item.id, {
        isChecked: !item.isChecked
      });
    }
  };

  const handleEditCost = (item) => {
    setEditingItemId(item.id);
    setActualCost(item.actualCostEur?.toString() || item.estimatedCostEur?.toString() || '');
  };

  const handleSaveCost = async (item) => {
    if (onUpdateItem && actualCost) {
      await onUpdateItem(item.id, {
        actualCostEur: parseFloat(actualCost)
      });
    }
    setEditingItemId(null);
    setActualCost('');
  };

  const progress = groceryList.totalItems > 0
    ? Math.round((groceryList.checkedItems / groceryList.totalItems) * 100)
    : 0;

  const totalActualCost = (groceryList.items || [])
    .filter(item => item.actualCostEur)
    .reduce((sum, item) => sum + (item.actualCostEur || 0), 0);

  const budgetDiff = totalActualCost - groceryList.estimatedCost;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className={`glass-effect p-6 rounded-2xl ${darkMode ? 'glass-effect-dark' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🛒 Liste de courses
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              {groceryList.checkedItems} / {groceryList.totalItems} articles cochés
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-red-500">
                {totalActualCost > 0 ? totalActualCost.toFixed(2) : groceryList.estimatedCost.toFixed(2)}€
              </span>
              {totalActualCost > 0 && (
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  / {groceryList.estimatedCost.toFixed(2)}€
                </span>
              )}
            </div>
            {totalActualCost > 0 && (
              <div className={`text-xs mt-1 ${budgetDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {budgetDiff > 0 ? '+' : ''}{budgetDiff.toFixed(2)}€ vs estimation
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className={`w-full h-4 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Progression: {progress}%
            </span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Reste: {groceryList.totalItems - groceryList.checkedItems} articles
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => setExpandedCategories(new Set(sortedCategories))}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            📂 Tout développer
          </button>
          <button
            onClick={() => setExpandedCategories(new Set())}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            📁 Tout réduire
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {sortedCategories.map(category => {
          const items = itemsByCategory[category];
          const categoryChecked = items.filter(item => item.isChecked).length;
          const categoryTotal = items.length;
          const categoryProgress = Math.round((categoryChecked / categoryTotal) * 100);
          const isExpanded = expandedCategories.has(category);

          return (
            <div
              key={category}
              className={`glass-effect rounded-xl overflow-hidden transition-all ${
                darkMode ? 'glass-effect-dark' : ''
              }`}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={`w-full p-4 flex items-center justify-between transition-all ${
                  darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{categoryIcons[category] || '📦'}</span>
                  <div className="text-left">
                    <div className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {categoryNames[category] || category}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {categoryChecked}/{categoryTotal} articles
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Category Progress */}
                  <div className="w-24">
                    <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${categoryProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div
                    className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''} ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    ▼
                  </div>
                </div>
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-2">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        item.isChecked
                          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                          : darkMode
                          ? 'bg-gray-800 border-2 border-gray-700 hover:border-gray-600'
                          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Checkbox & Name */}
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => handleToggleItem(item)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            item.isChecked
                              ? 'bg-green-500 border-green-500'
                              : darkMode
                              ? 'border-gray-600 hover:border-green-500'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {item.isChecked && <span className="text-white text-sm">✓</span>}
                        </button>

                        <div className="flex-1">
                          <div
                            className={`font-semibold ${
                              item.isChecked
                                ? 'line-through text-gray-500'
                                : darkMode
                                ? 'text-white'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.name}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.quantity} {item.unit || ''}
                          </div>
                        </div>
                      </div>

                      {/* Cost */}
                      <div className="flex items-center space-x-2">
                        {editingItemId === item.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.01"
                              value={actualCost}
                              onChange={(e) => setActualCost(e.target.value)}
                              className={`w-20 px-2 py-1 rounded border text-sm ${
                                darkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-black border-gray-300'
                              }`}
                              placeholder="Prix"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveCost(item)}
                              className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditCost(item)}
                            className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                              item.actualCostEur
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {item.actualCostEur
                              ? `${item.actualCostEur.toFixed(2)}€`
                              : `~${item.estimatedCostEur.toFixed(2)}€`}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className={`glass-effect p-6 rounded-2xl ${darkMode ? 'glass-effect-dark' : ''}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {groceryList.totalItems}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Articles total</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {groceryList.checkedItems}
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cochés</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {groceryList.estimatedCost.toFixed(2)}€
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Estimation</div>
          </div>

          <div className="text-center">
            <div
              className={`text-2xl font-bold ${
                totalActualCost > groceryList.estimatedCost ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {totalActualCost > 0 ? totalActualCost.toFixed(2) : '—'}€
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Réel</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroceryListManager;
