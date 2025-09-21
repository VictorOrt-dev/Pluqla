import React, { memo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import LevelProgress from './LevelProgress';
import GamificationBadges from './GamificationBadges';
import StreakDisplay from './StreakDisplay';

const Header = memo(({ userData, darkMode, setDarkMode, todaysSavings }) => {
  // Nouveau système de thème (avec fallback vers legacy)
  const theme = useTheme();

  // Utiliser le nouveau système de thème si disponible, sinon fallback
  const isDark = theme?.darkMode ?? darkMode;

  // SIMPLIFICATION: Toggle direct sans sélecteur système
  const handleThemeToggle = () => {
    if (theme?.toggleTheme) {
      theme.toggleTheme();
    } else {
      setDarkMode(!darkMode);
    }
  };

  return (
    <div className="px-6 pt-12 pb-6 bg-white dark:bg-black transition-colors duration-300 relative">
      {/* Message de bienvenue centré */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white transition-colors duration-300">
          Bonjour {userData.name}
        </h1>
        <StreakDisplay className="mt-2" />
      </div>

      {/* Toggle de thème en position absolue */}
      <div className="absolute top-12 right-6">
        <button
          onClick={handleThemeToggle}
          className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 hover:bg-gray-200 dark:hover:bg-gray-800"
          title={`Basculer vers le mode ${isDark ? 'clair' : 'sombre'}`}
        >
          <span className="text-lg transition-transform duration-300 hover:rotate-12">
            {isDark ? '☀️' : '🌙'}
          </span>
        </button>
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;