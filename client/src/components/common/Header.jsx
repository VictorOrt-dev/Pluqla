import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import StreakDisplay from './StreakDisplay';

const Header = ({ userData, darkMode, setDarkMode, todaysSavings, getLevelTitle }) => {
  const { setCurrentScreen } = useNavigation();
  const [showLevelPulse, setShowLevelPulse] = useState(true);

  // Animation pulse au chargement pour attirer l'attention
  useEffect(() => {
    const timer = setTimeout(() => setShowLevelPulse(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      darkMode
        ? 'bg-gradient-to-b from-[#121212] to-[#1a0b0b] border-b-2 border-[#F14545]/30'
        : 'bg-gradient-to-b from-[#FAFAFA]/95 to-[#F5F5F5]/95 border-b-2 border-[#F14545]/20 shadow-sm'
    } backdrop-blur-xl`}>
      <div className="px-4 py-3">
        {/* Single compact row - Mobile-first design */}
        <div className="flex items-center justify-between">
          {/* Left section - Logo + Level Badge */}
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

            {/* Compact Level Badge - Integrated in header with pulse animation */}
            <div className={`relative flex items-center space-x-1.5 px-2 py-1 rounded-full transition-all duration-200 ${
              darkMode
                ? 'bg-gradient-to-r from-[#F14545]/20 to-[#FF6B6B]/20 border border-[#F14545]/30'
                : 'bg-gradient-to-r from-[#F14545]/10 to-[#FF6B6B]/10 border border-[#F14545]/20'
            } ${showLevelPulse ? 'animate-pulse' : ''}`}>
              {/* Effet glow pulsant */}
              {showLevelPulse && (
                <div className="absolute inset-0 rounded-full bg-[#F14545]/30 animate-ping"></div>
              )}
              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-r from-[#F14545] to-[#FF6B6B] shadow-sm relative z-10">
                <span className="text-white font-bold text-[10px]">
                  {userData?.level || 1}
                </span>
              </div>
              <span className={`text-[10px] font-bold relative z-10 ${
                darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
              }`}>
                {getLevelTitle ? getLevelTitle(userData?.level || 1) : 'Débutant'}
              </span>
            </div>
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
            {/* Premium/Free Badge */}
            {userData && (
              <div className={`px-2 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                userData.subscriptionTier === 'PREMIUM' || userData.isPremium
                  ? darkMode
                    ? 'bg-gradient-to-r from-[#F14545] to-[#FF6B6B] text-white shadow-lg shadow-[#F14545]/30'
                    : 'bg-gradient-to-r from-[#F14545] to-[#FF6B6B] text-white shadow-md'
                  : darkMode
                    ? 'bg-gray-800/60 text-gray-400 border border-gray-700/50'
                    : 'bg-gray-200/80 text-gray-600 border border-gray-300/50'
              }`}>
                {userData.subscriptionTier === 'PREMIUM' || userData.isPremium ? '⭐ PREMIUM' : 'FREE'}
              </div>
            )}

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