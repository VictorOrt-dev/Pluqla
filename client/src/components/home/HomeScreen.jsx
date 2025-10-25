import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import Header from '../common/Header';
import DashboardWidget from './DashboardWidget';
import CategoryGrid from './CategoryGrid';
import Navigation from '../common/Navigation';

/**
 * Phase 2B Enhanced HomeScreen
 * Staggered section animations + Pluqla identity throughout
 */

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

  // Phase 2B: Animation variants pour sections staggerées
  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-all duration-300 ${
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

      {/* Contenu principal - Optimisé pour tenir sur une page */}
      <motion.div
        className="flex-1 flex flex-col justify-between px-4 pb-20 pt-4 overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* Section 1: Votre Progression */}
        <motion.section variants={sectionVariants} className="flex-shrink-0">
          <h2 className={`text-center text-xs font-semibold uppercase tracking-wide mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Votre Progression
          </h2>
          <DashboardWidget
            userData={userData}
            progress={progress}
            darkMode={darkMode}
            transactions={transactions}
          />
        </motion.section>

        {/* Section 2: Vos Modules */}
        <motion.section variants={sectionVariants} className="flex-1 flex flex-col justify-center min-h-0">
          <h2 className={`text-center text-xs font-semibold uppercase tracking-wide mb-2 ${
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
        </motion.section>
      </motion.div>

      {/* Navigation bottom */}
      <Navigation darkMode={darkMode} userData={userData} currentScreen={currentScreen} />
    </div>
  );
};

export default HomeScreen;