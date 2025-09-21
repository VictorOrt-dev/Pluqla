// Composant d'affichage de la gamification
// Impact: Affichage non-intrusif des informations de gamification
// Intégré dans: Header existant (conserve exactement le rendu actuel)

import React, { memo } from 'react';
import { useGamification } from '../../hooks/useGamification';

const GamificationDisplay = memo(({ darkMode, className = "" }) => {
  const { gamificationStats } = useGamification();

  // Affichage discret des informations de niveau dans le header existant
  // Ne change PAS le rendu actuel, ajoute juste des infos pour les développeurs
  if (process.env.NODE_ENV === 'development') {
    console.log('Gamification Stats:', gamificationStats);
  }

  // Retourner null pour ne pas modifier le rendu actuel
  // Les données sont disponibles via le hook pour les futures intégrations
  return null;

  // TODO: Future intégration dans l'UI existante sans modification du rendu
  // Exemple de ce qui pourrait être affiché plus tard :
  /*
  return (
    <div className={`${className} flex items-center space-x-2`}>
      <span className="text-xs opacity-75">
        {gamificationStats.currentLevelData?.icon} Niv. {gamificationStats.currentLevel}
      </span>
      <span className="text-xs opacity-50">
        {gamificationStats.totalPoints} pts
      </span>
    </div>
  );
  */
});

GamificationDisplay.displayName = 'GamificationDisplay';

export default GamificationDisplay;