// Composant de debug pour les feature flags (développement uniquement)
// Impact: Facilite le test et debug des fonctionnalités en développement
// Visible: Uniquement en mode développement avec le flag dev.debug_mode

import React, { useState, useEffect } from 'react';
import { featureFlags, useFeatureFlag } from '../../utils/featureFlags';

const FeatureFlagsDebug = ({ userData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [flags, setFlags] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const isDebugEnabled = useFeatureFlag('dev.debug_mode');

  useEffect(() => {
    if (isDebugEnabled) {
      setFlags(featureFlags.getAllFlags());
    }
  }, [isDebugEnabled]);

  // Ne pas afficher en production ou si debug désactivé
  if (!isDebugEnabled || process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleToggleFlag = (flagName) => {
    const newValue = !flags[flagName];
    featureFlags.setFlag(flagName, newValue);
    setFlags(prev => ({ ...prev, [flagName]: newValue }));
  };

  const handleReset = () => {
    featureFlags.resetToDefaults();
    setFlags(featureFlags.getAllFlags());
  };

  const getFilteredFlags = () => {
    let filteredFlags = Object.entries(flags);

    // Filtrer par recherche
    if (search) {
      filteredFlags = filteredFlags.filter(([name]) =>
        name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtrer par catégorie
    if (category !== 'all') {
      filteredFlags = filteredFlags.filter(([name]) => {
        if (category === 'active') return flags[name];
        if (category === 'inactive') return !flags[name];
        return name.startsWith(category);
      });
    }

    return filteredFlags.sort(([a], [b]) => a.localeCompare(b));
  };

  const getCategories = () => {
    const categories = new Set(['all', 'active', 'inactive']);
    Object.keys(flags).forEach(flag => {
      const prefix = flag.split('.')[0];
      categories.add(prefix);
    });
    return Array.from(categories).sort();
  };

  const exportFlags = () => {
    const data = featureFlags.exportFlags();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feature-flags-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-red-800 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
          title="Feature Flags Debug"
        >
          🚩
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              🚩 Feature Flags Debug
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Environment: {featureFlags.environment} •
              Active: {featureFlags.getActiveFlags().length}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Rechercher un flag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {getCategories().map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Tous' :
                   cat === 'active' ? 'Actifs' :
                   cat === 'inactive' ? 'Inactifs' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={exportFlags}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Export
            </button>
          </div>
        </div>

        {/* Flags List */}
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="grid gap-2">
            {getFilteredFlags().map(([flagName, isEnabled]) => (
              <div
                key={flagName}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
              >
                <div className="flex-1">
                  <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {flagName}
                  </code>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggleFlag(flagName)}
                    className="sr-only"
                  />
                  <div className={`relative w-8 h-4 rounded-full transition-colors ${
                    isEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                      isEnabled ? 'transform translate-x-4' : ''
                    }`} />
                  </div>
                  <span className={`ml-2 text-xs ${
                    isEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                  }`}>
                    {isEnabled ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
            ))}
          </div>

          {getFilteredFlags().length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Aucun flag trouvé
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          💡 Les modifications sont sauvegardées automatiquement • Mode développement uniquement
        </div>
      </div>
    </div>
  );
};

export default FeatureFlagsDebug;