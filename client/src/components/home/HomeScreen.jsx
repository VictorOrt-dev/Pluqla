import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import Header from '../common/Header';
import CircularProgress from '../common/CircularProgress';
import CategoryGrid from './CategoryGrid';
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
  const { currentScreen } = useNavigation();
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
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${
      darkMode
        ? 'pluqla-bg-dark'
        : 'bg-gradient-to-b from-[#FAFAFA] via-[#F9F9F9] to-[#F5F5F5]'
    }`}
    style={!darkMode ? {
      backgroundImage: `
        linear-gradient(135deg, rgba(241, 69, 69, 0.02) 0%, transparent 50%),
        radial-gradient(ellipse at 25% 25%, rgba(241, 69, 69, 0.03) 0%, transparent 60%),
        radial-gradient(ellipse at 75% 75%, rgba(241, 69, 69, 0.02) 0%, transparent 60%)
      `
    } : {}}>
      {/* Header simplifié */}
      <Header
        userData={userData}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        todaysSavings={todaysSavings}
      />

      {/* Contenu principal avec rond central */}
      <div className="flex-1 flex flex-col px-4 pb-20 pt-6">


        {/* ⭐ ROND DES ÉCONOMIES - Élément central iconique */}
        <div className="flex justify-center mb-8">
          <CircularProgress
            amount={userData.savedAmount || 0}
            percentage={progress}
            size={192}
            goal={userData.monthlyGoal || 1000}
            darkMode={darkMode}
            animated={true}
            clickable={false}
          />
        </div>

        {/* Grid des 4 features principales sous le rond */}
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
          <CategoryGrid
            darkMode={darkMode}
          />
        </div>

        {/* Enhanced level indicator with premium light mode styling */}
        <div className="mt-8 text-center">
          <div className={`inline-flex items-center space-x-3 px-5 py-3 rounded-2xl shadow-lg border transition-all duration-300 hover:scale-105 ${
            darkMode
              ? 'bg-gradient-to-r from-gray-800 to-gray-700 border-[#F14545]/20 shadow-[0_8px_24px_rgba(241,69,69,0.2)] hover:shadow-[0_12px_32px_rgba(241,69,69,0.3)]'
              : 'bg-gradient-to-r from-white/95 to-[#FAFAFA]/90 border-[#F14545]/15 shadow-[0_4px_16px_rgba(241,69,69,0.12)] hover:shadow-[0_8px_24px_rgba(241,69,69,0.18)] backdrop-blur-sm'
          }`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg relative" style={{ background: 'var(--pluqla-gradient-main)' }}>
              {/* Effet de glow sur le badge niveau */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#F14545] opacity-50 animate-pulse" style={{ animationDuration: '2s' }}></div>
              <span className="text-white font-bold text-sm relative z-10">
                {userData.level || 1}
              </span>
            </div>
            <div className="text-left">
              <p className={`text-sm font-bold transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-[#121212]'
              }`}>
                Niveau {userData.level || 1} - {getLevelTitle(userData.level || 1)}
              </p>
              <p className={`text-xs font-semibold ${
                darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
              }`}>
                {todaysSavings}€ économisés aujourd'hui
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation bottom */}
      <Navigation darkMode={darkMode} userData={userData} currentScreen={currentScreen} />
    </div>
  );
};

export default HomeScreen;