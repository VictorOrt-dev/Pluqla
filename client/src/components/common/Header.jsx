import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import StreakDisplay from './StreakDisplay';

const Header = ({ userData, darkMode, setDarkMode, todaysSavings }) => {
  const { setCurrentScreen } = useNavigation();

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      darkMode
        ? 'bg-black/95 border-b border-white/5'
        : 'bg-white/95 border-b border-black/5'
    } backdrop-blur-xl`}>
      <div className="px-4 py-3">
        {/* Single compact row - Mobile-first design */}
        <div className="flex items-center justify-between">
          {/* Logo section - clean design on black header background */}
          <div className="flex items-center space-x-2">
            {/* Logo container without red square background - directly on black header */}
            <div className="relative flex items-center justify-center">
              <img
                src="/pluqla-logo.png"
                alt="Pluqla"
                className="w-6 h-6 object-contain transition-all duration-200 hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              {/* Fallback icon if image fails to load - matches Pluqla red */}
              <span
                className="text-lg hidden"
                style={{ color: '#F14545' }}
              >
                💬
              </span>
              {/* Optional: Small indicator badge positioned at top-right */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F6E05E] rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold text-black">€</span>
              </div>
            </div>
            {/* Brand name with Pluqla cherry-red color */}
            <p className={`text-sm font-medium transition-colors duration-200 ${
              darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
            }`}>
              Pluqla
            </p>
          </div>

          {/* Streak center - discrete flame icon */}
          <div className="flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-200" style={{
            background: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
          }}>
            <span className="text-sm">🔥</span>
            <StreakDisplay />
            {!userData?.streak && (
              <span className={`text-sm font-medium ${
                darkMode ? 'text-white/80' : 'text-black/80'
              }`}>
                0
              </span>
            )}
          </div>

          {/* Control buttons - minimal */}
          <div className="flex items-center space-x-1">
            {/* Dark mode toggle - smaller */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                darkMode
                  ? 'hover:bg-white/10 text-yellow-400'
                  : 'hover:bg-black/5 text-gray-600'
              }`}
            >
              <span className="text-xs">
                {darkMode ? '☀️' : '🌙'}
              </span>
            </button>

            {/* Profile button - smaller */}
            <button
              onClick={() => {
                setCurrentScreen('profile', true, true);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                darkMode
                  ? 'hover:bg-white/10 text-white/80'
                  : 'hover:bg-black/5 text-gray-600'
              }`}
            >
              <span className="text-xs">👤</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;