import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import StreakDisplay from './StreakDisplay';

const Header = ({ userData, darkMode, setDarkMode, todaysSavings }) => {
  const { setCurrentScreen } = useNavigation();

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      darkMode
        ? 'bg-gradient-to-b from-[#121212] to-[#1a0b0b] border-b-2 border-[#F14545]/30'
        : 'bg-gradient-to-b from-[#FAFAFA]/95 to-[#F5F5F5]/95 border-b-2 border-[#F14545]/20 shadow-sm'
    } backdrop-blur-xl`}>
      <div className="px-4 py-3">
        {/* Single compact row - Mobile-first design */}
        <div className="flex items-center justify-between">
          {/* Logo section - clean design on black header background */}
          <div className="flex items-center space-x-2">
            {/* Logo container with premium red glow effect */}
            <div className="relative flex items-center justify-center">
              <img
                src="/pluqla-logo.png"
                alt="Pluqla"
                className="w-6 h-6 object-contain transition-all duration-200 hover:scale-105 drop-shadow-[0_0_8px_rgba(241,69,69,0.6)]"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              {/* Fallback icon if image fails to load - matches Pluqla red */}
              <span
                className="text-lg hidden drop-shadow-[0_0_8px_rgba(241,69,69,0.6)]"
                style={{ color: '#F14545' }}
              >
                💬
              </span>
              {/* Optional: Small indicator badge positioned at top-right */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F6E05E] rounded-full flex items-center justify-center shadow-lg">
                <span className="text-[8px] font-bold text-black">€</span>
              </div>
            </div>
            {/* Brand name with enhanced readability in light mode */}
            <p className={`text-sm font-medium transition-colors duration-200 ${
              darkMode
                ? 'text-[#FF6B6B] drop-shadow-[0_0_4px_rgba(241,69,69,0.4)]'
                : 'text-[#F14545] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
            }`}>
              Pluqla
            </p>
          </div>

          {/* Streak center - adaptive background for light/dark mode */}
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-all duration-200 backdrop-blur-sm border ${
            darkMode
              ? 'bg-black/40 hover:bg-black/50 border-white/10'
              : 'bg-black/10 hover:bg-[#F14545]/10 border-gray-200/50 shadow-sm'
          }`}>
            <span className="text-sm">🔥</span>
            <StreakDisplay />
            {!userData?.streak && (
              <span className={`text-sm font-medium ${
                darkMode ? 'text-white/80' : 'text-gray-700'
              }`}>
                0
              </span>
            )}
          </div>

          {/* Control buttons - minimal */}
          <div className="flex items-center space-x-1">
            {/* Dark mode toggle - adaptive styling for light/dark mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
                darkMode
                  ? 'bg-black/40 hover:bg-[#F14545]/50 hover:shadow-[0_0_12px_rgba(241,69,69,0.6)] border-white/10 text-yellow-400'
                  : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 shadow-sm hover:shadow-md text-gray-600 hover:text-white'
              }`}
            >
              <span className="text-xs">
                {darkMode ? '☀️' : '🌙'}
              </span>
            </button>

            {/* Profile button - adaptive styling for light/dark mode */}
            <button
              onClick={() => {
                setCurrentScreen('profile', true, true);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm border ${
                darkMode
                  ? 'bg-black/40 hover:bg-[#F14545]/50 hover:shadow-[0_0_12px_rgba(241,69,69,0.6)] border-white/10 text-white/80'
                  : 'bg-black/10 hover:bg-[#F14545] border-gray-200/50 shadow-sm hover:shadow-md text-gray-600 hover:text-white'
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