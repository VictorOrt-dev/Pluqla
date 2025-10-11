import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import Header from '../common/Header';
import DashboardWidget from './DashboardWidget';
import CategoryGrid from './CategoryGrid';
import QuickActions from './QuickActions';
import RecommendedCard from './RecommendedCard';
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

      {/* Contenu principal - Transformation Premium avec sections */}
      <div className="flex-1 flex flex-col px-4 pb-20 pt-6 space-y-6">

        {/* Section 1: Votre Progression */}
        <section>
          <h2 className={`text-center text-xs font-semibold uppercase tracking-wide mb-3 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Votre Progression
          </h2>
          <DashboardWidget
            userData={userData}
            progress={progress}
            darkMode={darkMode}
          />
        </section>

        {/* Section 2: Actions Rapides */}
        <section>
          <h2 className={`text-center text-xs font-semibold uppercase tracking-wide mb-3 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Actions Rapides
          </h2>
          <QuickActions darkMode={darkMode} />
        </section>

        {/* Section 3: Vos Modules */}
        <section>
          <h2 className={`text-center text-xs font-semibold uppercase tracking-wide mb-3 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Vos Modules
          </h2>
          <div className="max-w-lg mx-auto w-full">
            <CategoryGrid
              darkMode={darkMode}
              userData={userData}
              todaysSavings={todaysSavings}
              getLevelTitle={getLevelTitle}
            />
          </div>
        </section>

        {/* Section 4: Conseillé pour vous */}
        <section>
          <h2 className={`text-center text-xs font-semibold uppercase tracking-wide mb-3 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Conseillé pour vous
          </h2>
          <RecommendedCard darkMode={darkMode} userData={userData} />
        </section>
      </div>

      {/* Navigation bottom */}
      <Navigation darkMode={darkMode} userData={userData} currentScreen={currentScreen} />
    </div>
  );
};

export default HomeScreen;