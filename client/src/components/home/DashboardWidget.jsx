import React from 'react';
import { motion } from 'framer-motion';
import CircularProgress from '../common/CircularProgress';
import { TrendingUp, Calendar, Flame } from 'lucide-react';
import { PluqlaStatCard } from '../common';

/**
 * Phase 2B Enhanced DashboardWidget
 * CircularProgress + Stats Grid avec animations staggerées
 */

const DashboardWidget = ({
  userData,
  progress,
  darkMode,
  transactions = []
}) => {
  // Calcul des statistiques
  const todaysSavings = transactions
    .filter(t => new Date(t.date).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  // Économies de la semaine
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklySavings = transactions
    .filter(t => new Date(t.date) >= weekStart)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  // Série de jours consécutifs (mock pour l'instant)
  const streak = Math.floor((userData.savedAmount || 0) / 50); // Simplifié

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* CircularProgress - Élément central avec glow Phase 2B */}
      <motion.div variants={itemVariants}>
        <CircularProgress
          amount={userData.savedAmount || 0}
          percentage={progress}
          size={165}
          goal={userData.monthlyGoal || 1000}
          darkMode={darkMode}
          animated={true}
          clickable={false}
        />
      </motion.div>

      {/* Phase 2B: Stats Grid - 3 mini cards */}
      <motion.div
        className="w-full max-w-sm grid grid-cols-3 gap-3"
        variants={itemVariants}
      >
        {/* Aujourd'hui */}
        <motion.div
          className={`
            pluqla-card
            pluqla-card-glass
            p-3
            flex flex-col items-center gap-2
            hover:scale-105
            transition-transform
          `}
          whileHover={{ y: -2 }}
        >
          <div className="w-8 h-8 rounded-lg pluqla-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className={`text-[10px] uppercase tracking-wide font-medium ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Aujourd'hui
            </p>
            <p className={`text-sm font-bold ${
              todaysSavings >= 0 ? 'text-pluqla-green' : 'text-pluqla-red'
            }`}>
              {todaysSavings >= 0 ? '+' : ''}{todaysSavings.toFixed(0)}€
            </p>
          </div>
        </motion.div>

        {/* Semaine */}
        <motion.div
          className={`
            pluqla-card
            pluqla-card-glass
            p-3
            flex flex-col items-center gap-2
            hover:scale-105
            transition-transform
          `}
          whileHover={{ y: -2 }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className={`text-[10px] uppercase tracking-wide font-medium ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Semaine
            </p>
            <p className={`text-sm font-bold ${
              weeklySavings >= 0 ? 'text-pluqla-green' : 'text-pluqla-red'
            }`}>
              {weeklySavings >= 0 ? '+' : ''}{weeklySavings.toFixed(0)}€
            </p>
          </div>
        </motion.div>

        {/* Série */}
        <motion.div
          className={`
            pluqla-card
            pluqla-card-glass
            p-3
            flex flex-col items-center gap-2
            hover:scale-105
            transition-transform
            border-2
            border-pluqla-red/30
          `}
          whileHover={{ y: -2 }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className={`text-[10px] uppercase tracking-wide font-medium ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Série
            </p>
            <p className="text-sm font-bold text-pluqla-red">
              {streak} jours
            </p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardWidget;
