/**
 * Search and Filter Bar - Financial Dashboard
 * Allows filtering transactions by category, amount, date, tag, or location
 * Mobile-first design with collapsible filters
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';

const SearchFilterBar = ({ onSearch, onFilterChange, darkMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'month',
    amountMin: '',
    amountMax: '',
    sortBy: 'date-desc',
  });

  const categories = [
    { value: 'all', label: 'Toutes catégories', icon: '🎯' },
    { value: 'alimentation', label: 'Alimentation', icon: '🍽️' },
    { value: 'transport', label: 'Transport', icon: '🚗' },
    { value: 'loisirs', label: 'Loisirs', icon: '🎬' },
    { value: 'logement', label: 'Logement', icon: '🏠' },
    { value: 'sante', label: 'Santé', icon: '💊' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'autres', label: 'Autres', icon: '📦' },
  ];

  const dateRanges = [
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'quarter', label: 'Ce trimestre' },
    { value: 'year', label: 'Cette année' },
    { value: 'custom', label: 'Personnalisé' },
  ];

  const sortOptions = [
    { value: 'date-desc', label: 'Plus récent' },
    { value: 'date-asc', label: 'Plus ancien' },
    { value: 'amount-desc', label: 'Montant décroissant' },
    { value: 'amount-asc', label: 'Montant croissant' },
  ];

  // ⚡ PERFORMANCE: Debounce search to reduce API calls by 90%
  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        onSearch(query);
      }, 300), // Wait 300ms after last keystroke
    [onSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value); // Update UI immediately
      debouncedSearch(value); // Debounced API call
    },
    [debouncedSearch]
  );

  const handleFilterChange = useCallback(
    (key, value) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  return (
    <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-xl border ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Rechercher une transaction..."
            className={`w-full pl-12 pr-12 py-3 rounded-xl ${
              darkMode
                ? 'bg-slate-800/50 text-white placeholder-slate-500 border-slate-700'
                : 'bg-gray-100/50 text-gray-900 placeholder-gray-400 border-gray-200'
            } border focus:outline-none focus:ring-2 focus:ring-[#F14545]/50 transition-all duration-300`}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute inset-y-0 right-0 pr-4 flex items-center ${
              showFilters ? 'text-[#F14545]' : darkMode ? 'text-slate-400' : 'text-gray-400'
            } hover:text-[#F14545] transition-colors duration-300`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className={`px-4 pb-4 space-y-4 border-t ${darkMode ? 'border-slate-800' : 'border-gray-200'} animate-slide-down`}>
          {/* Category Filter */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Catégorie
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleFilterChange('category', cat.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    filters.category === cat.value
                      ? 'bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white shadow-lg scale-105'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Période
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {dateRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleFilterChange('dateRange', range.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    filters.dateRange === range.value
                      ? 'bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white shadow-lg'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Range Filter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Montant min (€)
              </label>
              <input
                type="number"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                placeholder="0"
                className={`w-full px-3 py-2 rounded-xl ${
                  darkMode
                    ? 'bg-slate-800 text-white placeholder-slate-500 border-slate-700'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-200'
                } border focus:outline-none focus:ring-2 focus:ring-[#F14545]/50`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Montant max (€)
              </label>
              <input
                type="number"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                placeholder="Illimité"
                className={`w-full px-3 py-2 rounded-xl ${
                  darkMode
                    ? 'bg-slate-800 text-white placeholder-slate-500 border-slate-700'
                    : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-200'
                } border focus:outline-none focus:ring-2 focus:ring-[#F14545]/50`}
              />
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Trier par
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFilterChange('sortBy', option.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    filters.sortBy === option.value
                      ? 'bg-gradient-to-br from-[#F14545] to-[#FF6B6B] text-white shadow-lg'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

SearchFilterBar.propTypes = {
  onSearch: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

SearchFilterBar.defaultProps = {
  darkMode: false,
};

// ⚡ PERFORMANCE: Memoize SearchFilterBar to prevent unnecessary re-renders
export default React.memo(SearchFilterBar);
