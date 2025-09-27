import React from 'react';

const SuspenseFallback = ({ component = 'écran', fullScreen = false }) => {
  return (
    <div className={`flex flex-col items-center justify-center transition-colors duration-300 ${
      fullScreen
        ? 'min-h-screen bg-gray-50 dark:bg-black'
        : 'p-8'
    }`}>
      {/* Skeleton loader moderne avec animation */}
      <div className="relative">
        {/* Cercle principal avec rotation */}
        <div className="w-12 h-12 animate-spin rounded-full border-3 border-gray-200 dark:border-gray-700 border-t-blue-500 dark:border-t-blue-400 shadow-lg" />

        {/* Effet de pulsation interne */}
        <div className="absolute inset-0 w-12 h-12 animate-pulse rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 dark:from-blue-400/20 dark:to-cyan-400/20" />
      </div>

      {/* Message de chargement contextuel */}
      <div className="mt-6 text-center">
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 animate-pulse">
          Chargement de {component}...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Optimisation en cours ⚡
        </p>
      </div>

      {/* Barres de progression simulées pour l'effet visuel */}
      <div className="mt-6 space-y-2 w-full max-w-xs">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 rounded-full animate-pulse"
               style={{ width: '70%' }} />
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 dark:from-orange-400 dark:to-pink-400 rounded-full animate-pulse"
               style={{ width: '45%' }} />
        </div>
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400 rounded-full animate-pulse"
               style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
};

export default SuspenseFallback;