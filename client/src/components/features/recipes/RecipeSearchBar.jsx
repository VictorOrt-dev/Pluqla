/**
 * RecipeSearchBar Component
 *
 * Search bar with filters for recipe search
 * Includes: Query input, Budget slider, Diet dropdown, Time slider
 * Design: Pluqla DA Glassmorphism
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Search, X, SlidersHorizontal, DollarSign, Clock, Leaf } from 'lucide-react';

/**
 * RecipeSearchBar Component
 */
const RecipeSearchBar = ({
  onSearch,
  initialFilters = {},
  className = '',
}) => {
  const [query, setQuery] = useState(initialFilters.query || '');
  const [showFilters, setShowFilters] = useState(false);
  const [budgetMax, setBudgetMax] = useState(initialFilters.budgetMax || 10);
  const [diet, setDiet] = useState(initialFilters.diet || '');
  const [timeMax, setTimeMax] = useState(initialFilters.timeMax || 120);

  /**
   * Diet options
   */
  const dietOptions = [
    { value: '', label: 'Tous régimes' },
    { value: 'vegetarian', label: 'Végétarien' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'gluten-free', label: 'Sans gluten' },
    { value: 'ketogenic', label: 'Keto' },
    { value: 'paleo', label: 'Paleo' },
    { value: 'pescetarian', label: 'Pescétarien' },
  ];

  /**
   * Handle search submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!query || query.trim().length === 0) {
      return;
    }

    const filters = {
      query: query.trim(),
      ...(budgetMax && budgetMax < 10 ? { budgetMax } : {}),
      ...(diet ? { diet } : {}),
      ...(timeMax && timeMax < 120 ? { timeMax } : {}),
    };

    onSearch(filters);
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setQuery('');
    setBudgetMax(10);
    setDiet('');
    setTimeMax(120);
    setShowFilters(false);
  };

  /**
   * Check if any filter is active
   */
  const hasActiveFilters = budgetMax < 10 || diet || timeMax < 120;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Search Bar */}
      <form onSubmit={handleSubmit}>
        <div className="
          relative
          bg-white/80
          backdrop-blur-md
          rounded-2xl
          shadow-lg
          border border-white/20
          overflow-hidden
          transition-all duration-300
          hover:shadow-xl
        ">
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={20} />
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une recette... (ex: poulet, pizza)"
            className="
              w-full
              pl-12
              pr-32
              py-4
              bg-transparent
              text-gray-900
              placeholder-gray-400
              outline-none
              text-base
            "
            aria-label="Rechercher une recette"
          />

          {/* Action Buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`
                p-2
                rounded-lg
                transition-all duration-200
                ${hasActiveFilters
                  ? 'bg-[#E63946] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              aria-label="Filtres de recherche"
            >
              <SlidersHorizontal size={18} />
            </button>

            {/* Search Button */}
            <button
              type="submit"
              disabled={!query || query.trim().length === 0}
              className="
                px-5
                py-2
                rounded-lg
                bg-[#E63946]
                text-white
                font-medium
                transition-all duration-200
                hover:bg-[#d32f3a]
                disabled:opacity-50
                disabled:cursor-not-allowed
                shadow-md
                hover:shadow-lg
              "
            >
              Chercher
            </button>
          </div>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="
            bg-white/80
            backdrop-blur-md
            rounded-2xl
            shadow-lg
            border border-white/20
            p-5
            space-y-5
          "
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal size={20} className="text-[#E63946]" />
              Filtres de recherche
            </h3>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="
                  flex items-center gap-1
                  text-sm
                  text-gray-500
                  hover:text-[#E63946]
                  transition-colors
                "
              >
                <X size={16} />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Budget Max Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <DollarSign size={16} className="text-[#E63946]" />
                Budget max par portion
              </label>
              <div className="space-y-1">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(parseFloat(e.target.value))}
                  className="w-full accent-[#E63946]"
                  aria-label="Budget maximum par portion"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">1 €</span>
                  <span className="text-base font-semibold text-[#E63946]">
                    {budgetMax === 10 ? 'Illimité' : `${budgetMax.toFixed(2)} €`}
                  </span>
                  <span className="text-xs text-gray-500">10 €</span>
                </div>
              </div>
            </div>

            {/* Diet Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Leaf size={16} className="text-[#E63946]" />
                Régime alimentaire
              </label>
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="
                  w-full
                  px-4
                  py-2.5
                  rounded-lg
                  bg-white/60
                  border border-gray-200
                  text-gray-900
                  outline-none
                  focus:border-[#E63946]
                  focus:ring-2
                  focus:ring-[#E63946]/20
                  transition-all
                "
                aria-label="Régime alimentaire"
              >
                {dietOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Max Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock size={16} className="text-[#E63946]" />
                Temps de préparation max
              </label>
              <div className="space-y-1">
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={timeMax}
                  onChange={(e) => setTimeMax(parseInt(e.target.value))}
                  className="w-full accent-[#E63946]"
                  aria-label="Temps de préparation maximum"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">15 min</span>
                  <span className="text-base font-semibold text-[#E63946]">
                    {timeMax === 120 ? 'Illimité' : `${timeMax} min`}
                  </span>
                  <span className="text-xs text-gray-500">120 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Filtres actifs:{' '}
                {budgetMax < 10 && <span className="font-medium">Budget max {budgetMax.toFixed(2)} €</span>}
                {budgetMax < 10 && (diet || timeMax < 120) && ', '}
                {diet && <span className="font-medium">{dietOptions.find(d => d.value === diet)?.label}</span>}
                {diet && timeMax < 120 && ', '}
                {timeMax < 120 && <span className="font-medium">Max {timeMax} min</span>}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Search Suggestions */}
      {!query && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Suggestions :</span>
          {['Poulet', 'Pâtes', 'Salade', 'Végétarien', 'Dessert'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="
                px-3
                py-1
                rounded-full
                bg-white/60
                backdrop-blur-sm
                text-sm
                text-gray-700
                border border-gray-200
                hover:bg-[#E63946]
                hover:text-white
                hover:border-[#E63946]
                transition-all duration-200
              "
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

RecipeSearchBar.propTypes = {
  /** Callback when search is submitted */
  onSearch: PropTypes.func.isRequired,
  /** Initial filter values */
  initialFilters: PropTypes.shape({
    query: PropTypes.string,
    budgetMax: PropTypes.number,
    diet: PropTypes.string,
    timeMax: PropTypes.number,
  }),
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default RecipeSearchBar;
