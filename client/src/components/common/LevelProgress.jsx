// Composant de progression de niveau gamification
// Impact: Affiche le niveau et la progression de manière visuelle
// Utilisé dans: Header, HomeScreen pour encourager l'engagement

import React, { memo } from 'react';
import { useGamification } from '../../hooks/useGamification';

const LevelProgress = memo(({ userData, showDetails = false }) => {
  const { gamificationStats, LEVELS } = useGamification();

  if (!gamificationStats) return null;

  const { currentLevel, progressToNextLevel, totalPoints, nextLevel } = gamificationStats;
  const levelData = LEVELS[currentLevel];

  if (showDetails) {
    // Version détaillée pour la page principale
    return (
      <div className="bg-gradient-to-r from-red-50 to-blue-50 dark:from-red-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-orange-200 dark:border-red-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">{levelData.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Niveau {currentLevel}
              </h3>
              <p className="text-sm text-red-800 dark:text-orange-400">
                {levelData.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-red-800 dark:text-orange-400">
              {totalPoints}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
          </div>
        </div>

        {nextLevel && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                Vers {nextLevel.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {Math.round(progressToNextLevel)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-red-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(progressToNextLevel, 5)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {nextLevel.minPoints - totalPoints} points restants
            </p>
          </div>
        )}
      </div>
    );
  }

  // Version compacte pour le header
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-blue-600 flex items-center justify-center shadow-sm"
        title={`Niveau ${currentLevel} - ${levelData.name} (${totalPoints} points)`}
      >
        <span className="text-white text-xs">{levelData.icon}</span>
      </div>
      {nextLevel && (
        <div className="w-8 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-red-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(progressToNextLevel, 10)}%` }}
          />
        </div>
      )}
    </div>
  );
});

LevelProgress.displayName = 'LevelProgress';

export default LevelProgress;