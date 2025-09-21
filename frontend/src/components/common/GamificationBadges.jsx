// Composant d'affichage des badges de gamification
// Impact: Rendre la gamification visible et engageante dans l'UI
// Utilisé dans: Header, HomeScreen pour afficher les accomplissements

import React, { useState, memo } from 'react';
import { useGamification } from '../../hooks/useGamification';

const GamificationBadges = memo(({ userData, compact = false }) => {
  const { gamificationStats } = useGamification();
  const [showAllBadges, setShowAllBadges] = useState(false);

  if (!gamificationStats || gamificationStats.unlockedBadges.length === 0) {
    return null;
  }

  const recentBadges = gamificationStats.unlockedBadges.slice(-3);
  const hasMoreBadges = gamificationStats.unlockedBadges.length > 3;

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 dark:text-gray-400';
      case 'uncommon': return 'text-green-600 dark:text-green-400';
      case 'rare': return 'text-blue-600 dark:text-blue-400';
      case 'epic': return 'text-purple-600 dark:text-purple-400';
      case 'legendary': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (compact) {
    // Version compacte pour le header
    return (
      <div className="flex items-center gap-1">
        {recentBadges.map((badge, index) => (
          <div
            key={badge.id}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
            title={`${badge.name}: ${badge.description}`}
          >
            <span className="text-xs">{badge.icon}</span>
          </div>
        ))}
        {hasMoreBadges && (
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">+{gamificationStats.unlockedBadges.length - 3}</span>
          </div>
        )}
      </div>
    );
  }

  // Version complète pour l'affichage principal
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🏆 Badges débloqués
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
            {gamificationStats.unlockedBadges.length}
          </span>
        </h3>
        {hasMoreBadges && (
          <button
            onClick={() => setShowAllBadges(!showAllBadges)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAllBadges ? 'Moins' : 'Voir tout'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(showAllBadges ? gamificationStats.unlockedBadges : recentBadges).map((badge, index) => (
          <div
            key={badge.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col items-center text-center transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <div className="text-2xl mb-1">{badge.icon}</div>
            <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-1 leading-tight">
              {badge.name}
            </h4>
            <p className={`text-[10px] ${getRarityColor(badge.rarity)} capitalize`}>
              {badge.rarity}
            </p>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
              +{badge.points} pts
            </div>
          </div>
        ))}
      </div>

      {/* Progress vers le prochain badge */}
      {gamificationStats.totalSaved < 500 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Prochain badge: Épargnant Or
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round((gamificationStats.totalSaved / 500) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((gamificationStats.totalSaved / 500) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {500 - gamificationStats.totalSaved}€ restants
          </p>
        </div>
      )}
    </div>
  );
});

GamificationBadges.displayName = 'GamificationBadges';

export default GamificationBadges;