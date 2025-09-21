import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../contexts/NavigationContext';

const ProgressionDetailScreen = ({ userData, darkMode }) => {
  const { t } = useTranslation();
  const { setCurrentScreen } = useNavigation();

  const currentXP = userData.xp || 0;
  const currentLevel = userData.level || 1;
  const xpForCurrentLevel = currentLevel * 100;
  const xpForNextLevel = (currentLevel + 1) * 100;
  const progressPercentage = (currentXP / xpForCurrentLevel) * 100;
  const xpNeeded = xpForNextLevel - currentXP;

  const achievements = [
    { id: 1, title: 'Premier pas', description: 'Première transaction enregistrée', earned: true, icon: '👶' },
    { id: 2, title: 'Économe', description: '5 jours consécutifs d\'économies', earned: true, icon: '💰' },
    { id: 3, title: 'Défi relevé', description: 'Défi quotidien terminé', earned: true, icon: '🎯' },
    { id: 4, title: 'Régulier', description: '10 transactions enregistrées', earned: currentXP >= 200, icon: '📈' },
    { id: 5, title: 'Expert', description: 'Niveau 5 atteint', earned: currentLevel >= 5, icon: '🏆' },
    { id: 6, title: 'Maître', description: 'Niveau 10 atteint', earned: currentLevel >= 10, icon: '👑' },
  ];

  const earnedAchievements = achievements.filter(a => a.earned);
  const upcomingAchievements = achievements.filter(a => !a.earned);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentScreen('home')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Retour</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ma Progression</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Niveau actuel */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">{currentLevel}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Niveau {currentLevel}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {currentXP} / {xpForCurrentLevel} XP
            </p>
          </div>

          {/* Barre de progression */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Niveau {currentLevel}</span>
              <span>Niveau {currentLevel + 1}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-center mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {xpNeeded > 0 ? `${xpNeeded} XP pour le niveau suivant` : 'Niveau maximum atteint !'}
              </p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-lg text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {earnedAchievements.length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Badges obtenus</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-lg text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              {currentXP}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">XP total</p>
          </div>
        </div>

        {/* Badges obtenus */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Badges obtenus ({earnedAchievements.length})
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {earnedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {achievement.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {achievement.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prochains objectifs */}
        {upcomingAchievements.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Prochains objectifs
            </h3>
            <div className="space-y-3">
              {upcomingAchievements.slice(0, 3).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-60"
                >
                  <div className="text-2xl grayscale">{achievement.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {achievement.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {achievement.description}
                    </p>
                  </div>
                  <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressionDetailScreen;