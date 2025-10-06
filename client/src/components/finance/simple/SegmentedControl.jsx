/**
 * SegmentedControl - iOS-style Tab Switcher
 * Expenses ↔ Revenues with smooth animation
 */

import React from 'react';
import PropTypes from 'prop-types';

const SegmentedControl = ({ activeView, onViewChange, darkMode }) => {
  return (
    <div className={`mx-4 mb-4 relative flex p-1 rounded-2xl backdrop-blur-xl border ${
      darkMode
        ? 'bg-slate-800/50 border-slate-700'
        : 'bg-gray-100/80 border-gray-200'
    }`}>
      {/* Sliding Indicator */}
      <div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-br from-[#F14545] to-[#FF6B6B] rounded-xl shadow-lg transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(${activeView === 'expenses' ? '4px' : 'calc(100% + 4px)'})`
        }}
      />

      {/* Expenses Tab */}
      <button
        onClick={() => onViewChange('expenses')}
        className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-colors ${
          activeView === 'expenses'
            ? 'text-white'
            : darkMode
            ? 'text-slate-400'
            : 'text-gray-600'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
        Dépenses
      </button>

      {/* Revenues Tab */}
      <button
        onClick={() => onViewChange('revenues')}
        className={`flex-1 relative z-10 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-colors ${
          activeView === 'revenues'
            ? 'text-white'
            : darkMode
            ? 'text-slate-400'
            : 'text-gray-600'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Revenus
      </button>
    </div>
  );
};

SegmentedControl.propTypes = {
  activeView: PropTypes.oneOf(['expenses', 'revenues']).isRequired,
  onViewChange: PropTypes.func.isRequired,
  darkMode: PropTypes.bool
};

export default SegmentedControl;
