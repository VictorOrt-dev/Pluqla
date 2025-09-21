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
      aria-label="Accéder au dashboard financier"
    >
      <div className="absolute inset-2 bg-gradient-to-br from-blue-400 via-cyan-400 to-green-400 rounded-full blur-xl opacity-20 animate-pulse group-hover:opacity-30 transition-opacity"></div>
      
      <svg className="w-48 h-48 transform -rotate-90 relative z-10">
        <circle
          cx="96"
          cy="96"
          r="84"
          stroke={darkMode ? '#1f2937' : '#e5e7eb'}
          strokeWidth="16"
          fill="none"
          className="opacity-30"
        />
        <circle
          cx="96"
          cy="96"
          r="84"
          stroke="url(#gradient-progress)"
          strokeWidth="16"
          fill="none"
          strokeDasharray={`${2 * Math.PI * 84}`}
          strokeDashoffset={`${2 * Math.PI * 84 * (1 - progress / 100)}`}
          strokeLinecap="round"
          className="transition-all duration-1500 ease-out"
        />
        <defs>
          <linearGradient id="gradient-progress" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={`text-4xl font-bold transition-colors group-hover:text-blue-500 ${darkMode ? 'text-white' : 'text-black'}`}>
          {userData.savedAmount}€
        </p>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>économisés</p>
        <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
          {Math.round(progress)}% de {userData.monthlyGoal}€
        </p>
        <p className={`text-[9px] mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${
          darkMode ? 'text-blue-400' : 'text-blue-600'
        }`}>
          📊 Voir le détail
        </p>
      </div>
    </div>
  );
};

export default ProgressCircle;