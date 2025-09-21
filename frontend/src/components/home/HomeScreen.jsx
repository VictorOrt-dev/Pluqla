import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import Header from '../common/Header';
import ProgressCircle from '../common/ProgressCircle';
import PremiumBanner from './PremiumBanner';
import CategoryGrid from './CategoryGrid';
import DailyChallenge from './DailyChallenge';
import Navigation from '../common/Navigation';

const HomeScreen = ({
  userData,
  setUserData,
  darkMode,
  setDarkMode,
  transactions,
  addTransaction,
  progress
}) => {
  const { setCurrentScreen } = useNavigation();
  const todaysSavings = transactions
    .filter(t => new Date(t.date).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + t.amount, 0);

  // Fonction pour déterminer le titre du niveau
  const getLevelTitle = (level) => {
    if (level <= 2) return "Débutant";
    if (level <= 5) return "Apprenti";
    if (level <= 10) return "Avancé";
    if (level <= 20) return "Expert";
    return "Maître";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col transition-colors duration-300">
      <Header 
        userData={userData}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        todaysSavings={todaysSavings}
      />

      <PremiumBanner 
        userData={userData}
        setUserData={setUserData}
        darkMode={darkMode}
      />

      <div className="flex-1 px-6 pb-20">
        <ProgressCircle
          userData={userData}
          progress={progress}
          darkMode={darkMode}
        />

        {/* Encart niveau/badge simplifié et cliquable */}
        <div
          onClick={() => setCurrentScreen('progression-detail')}
          className="mt-8 mb-8 p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {userData.level}
                </span>
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900 dark:text-white">
                  {getLevelTitle(userData.level)}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${(userData.xp % 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {userData.xp % 100}/100
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex -space-x-1">
                {userData.badges?.slice(0, 3).map((badge, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900"
                  >
                    <span className="text-white text-xs">🏆</span>
                  </div>
                ))}
                {userData.badges?.length > 3 && (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                    <span className="text-gray-600 dark:text-gray-300 text-xs">
                      +{userData.badges.length - 3}
                    </span>
                  </div>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <CategoryGrid
          darkMode={darkMode}
        />

        <DailyChallenge 
          addTransaction={addTransaction}
          setUserData={setUserData}
          darkMode={darkMode}
        />
      </div>

      <Navigation darkMode={darkMode} userData={userData} />
    </div>
  );
};

export default HomeScreen;