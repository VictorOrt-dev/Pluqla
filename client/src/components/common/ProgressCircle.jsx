import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const ProgressCircle = ({ userData, progress, darkMode }) => {
  const { setCurrentScreen } = useNavigation();

  const handleClick = () => {
    setCurrentScreen('finance');
  };

  return (
    <div
      className="relative w-48 h-48 mx-auto mb-6 cursor-pointer transform transition-all duration-300 hover:scale-105 group"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label="Accéder à Finance"
    >
      {/* Enhanced Pluqla cherry-red glow background - perfectly centered */}
      <div className="absolute inset-3 bg-gradient-to-br from-[#F14545] via-[#FF6B6B] to-[#D73030] rounded-full blur-xl opacity-20 animate-pulse group-hover:opacity-30 transition-opacity"></div>

      {/* Additional subtle shadow for depth - matches circle boundary */}
      <div className="absolute inset-1 rounded-full shadow-lg" style={{ boxShadow: '0 8px 25px rgba(241, 69, 69, 0.15)' }}></div>

      {/* Invisible circle boundary for perfect alignment reference */}
      <div className="absolute inset-4 border border-transparent rounded-full"></div>

      {/* Fixed SVG with proper viewBox and perfectly centered circles */}
      <svg
        className="w-48 h-48 transform -rotate-90 relative z-10"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle with precise centering - radius adjusted for stroke width */}
        <circle
          cx="100"
          cy="100"
          r="88"
          stroke={darkMode ? '#1f2937' : '#e5e7eb'}
          strokeWidth="16"
          fill="none"
          className="opacity-30"
        />
        {/* Progress circle with perfect alignment - same center and radius */}
        <circle
          cx="100"
          cy="100"
          r="88"
          stroke="url(#pluqla-gradient-progress)"
          strokeWidth="16"
          fill="none"
          strokeDasharray={`${2 * Math.PI * 88}`}
          strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
          strokeLinecap="round"
          className="transition-all duration-1500 ease-out drop-shadow-lg"
          style={{
            /* Ensure smooth animation with proper timing */
            transitionProperty: 'stroke-dashoffset',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        <defs>
          {/* Enhanced Pluqla branded gradient for perfect stroke alignment */}
          <linearGradient id="pluqla-gradient-progress" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#F14545" stopOpacity="1" />
            <stop offset="50%" stopColor="#FF6B6B" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D73030" stopOpacity="1" />
          </linearGradient>
          {/* Optional: Radial gradient for enhanced depth effect */}
          <filter id="pluqla-stroke-glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Main amount with Pluqla elegant black for emphasis */}
        <p className={`text-4xl font-bold transition-colors duration-300 ${
          darkMode ? 'text-white group-hover:text-[#FF6B6B]' : 'text-[#121212] group-hover:text-[#F14545]'
        }`}>
          {userData.savedAmount}€
        </p>
        {/* Secondary text with cherry-red accent */}
        <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-[#9CA3AF]'}`}>économisés</p>
        {/* Progress percentage with cherry-red highlight */}
        <p className={`text-[10px] font-semibold mt-1 ${
          darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
        }`}>
          {Math.round(progress)}% de {userData.monthlyGoal}€
        </p>
        {/* Call-to-action with enhanced Pluqla styling */}
        <p className={`text-[9px] font-medium mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${
          darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
        }`}>
          📊 Voir le détail
        </p>
      </div>
    </div>
  );
};

export default ProgressCircle;