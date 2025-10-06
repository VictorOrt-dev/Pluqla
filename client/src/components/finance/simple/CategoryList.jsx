/**
 * CategoryList - Top 3 Categories with Mini Progress Bars
 * Clean, simple, effective
 */

import React from 'react';
import PropTypes from 'prop-types';

const CategoryList = ({ categories, darkMode, colorScheme = 'red' }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const topCategories = categories.slice(0, 3);

  return (
    <div className="mx-4 mb-4 space-y-3">
      <h3 className={`text-base font-bold mb-3 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Top catégories
      </h3>

      {topCategories.map((category) => (
        <div
          key={category.id}
          className={`p-4 rounded-2xl backdrop-blur-xl border transition-all hover:scale-105 ${
            darkMode
              ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
              : 'bg-white/70 border-gray-200 hover:bg-white'
          } shadow-md hover:shadow-lg`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                darkMode
                  ? 'bg-slate-700'
                  : 'bg-gray-100'
              }`}>
                {category.icon}
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {category.name}
                </h4>
                <p className={`text-sm ${
                  darkMode ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  {category.percentage}% du total
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {formatCurrency(category.amount)}
              </p>
            </div>
          </div>

          {/* Mini Progress Bar */}
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            darkMode ? 'bg-slate-700' : 'bg-gray-200'
          }`}>
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${category.percentage}%`,
                background: category.color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

CategoryList.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    category: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
    percentage: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired
  })).isRequired,
  darkMode: PropTypes.bool,
  colorScheme: PropTypes.oneOf(['red', 'green'])
};

export default CategoryList;
