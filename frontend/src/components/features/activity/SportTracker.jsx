import React, { useState } from 'react';
import ActivityTracker from './ActivityTracker';
import ActivityStats from './ActivityStats';
import SportPrograms from './SportPrograms';

const SportTracker = ({
  darkMode,
  aiSuggestions = [],
  isLoading = false,
  error = null,
  userData,
  setUserData,
  onUsePlan,
  category
}) => {
  const [activeView, setActiveView] = useState('tracker');

  return (
    <div className="space-y-4">
      {/* Navigation interne pour Sport - Responsive avec 3 onglets */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setActiveView('tracker')}
          className={`px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
            activeView === 'tracker'
              ? 'bg-emerald-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex flex-col items-center space-y-1">
            <span>🏃‍♀️</span>
            <span>Suivi</span>
          </span>
        </button>
        <button
          onClick={() => setActiveView('stats')}
          className={`px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
            activeView === 'stats'
              ? 'bg-emerald-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex flex-col items-center space-y-1">
            <span>📊</span>
            <span>Stats</span>
          </span>
        </button>
        <button
          onClick={() => setActiveView('programs')}
          className={`px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
            activeView === 'programs'
              ? 'bg-emerald-500 text-white shadow-lg'
              : darkMode
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex flex-col items-center space-y-1">
            <span>🤖</span>
            <span className="hidden sm:inline">Programmes</span>
            <span className="sm:hidden">IA</span>
          </span>
        </button>
      </div>

      {/* Contenu selon la vue active */}
      {activeView === 'tracker' && (
        <ActivityTracker darkMode={darkMode} />
      )}
      {activeView === 'stats' && (
        <ActivityStats darkMode={darkMode} />
      )}
      {activeView === 'programs' && (
        <SportPrograms
          darkMode={darkMode}
          aiSuggestions={aiSuggestions}
          isLoading={isLoading}
          error={error}
          userData={userData}
          setUserData={setUserData}
          onUsePlan={onUsePlan}
          category={category}
        />
      )}
    </div>
  );
};

export default SportTracker;