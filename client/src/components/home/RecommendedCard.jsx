import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '../../contexts/NavigationContext';
import { PluqiMascot } from '../common';
import { ArrowRight } from 'lucide-react';

/**
 * Phase 2B Enhanced RecommendedCard
 * Pluqi mascot + Premium animations + Glassmorphism
 */

const RecommendedCard = ({ darkMode, userData }) => {
  const { setCurrentScreen } = useNavigation();

  // Logique intelligente de recommandation basée sur userData (Phase 2B: avec mood Pluqi)
  const getRecommendation = () => {
    const savedAmount = userData?.savedAmount || 0;
    const monthlyGoal = userData?.monthlyGoal || 1000;
    const progress = monthlyGoal > 0 ? (savedAmount / monthlyGoal) * 100 : 0;
    const isPremium = userData?.isPremium || userData?.subscriptionTier === 'PREMIUM';

    // Recommandations contextuelles selon progression (avec mood Pluqi)
    if (progress >= 80) {
      return {
        mood: 'celebrate',
        title: 'Félicitations !',
        description: 'Vous avez atteint 80% de votre objectif mensuel. Continue comme ça!',
        action: 'Voir mes économies',
        target: 'finance',
        gradient: 'from-green-500 to-emerald-600',
        accentColor: darkMode ? 'text-green-400' : 'text-green-600'
      };
    } else if (progress < 20 && new Date().getDate() > 10) {
      return {
        mood: 'encourage',
        title: 'Boostez vos économies',
        description: 'Découvrez 3 astuces IA personnalisées pour économiser cette semaine',
        action: 'Voir les conseils',
        target: 'finance',
        gradient: 'from-[#F14545] to-[#FF6B6B]',
        accentColor: darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
      };
    } else if (!isPremium) {
      return {
        mood: 'thinking',
        title: 'Passez Premium',
        description: 'Débloquez les analyses IA illimitées et conseils personnalisés pour économiser plus',
        action: 'Découvrir Premium',
        target: 'profile',
        gradient: 'from-purple-500 to-pink-600',
        accentColor: darkMode ? 'text-purple-400' : 'text-purple-600'
      };
    } else {
      return {
        mood: 'neutral',
        title: 'Planifiez vos repas',
        description: 'Économisez jusqu\'à 150€/mois avec des recettes optimisées',
        action: 'Découvrir',
        target: 'alimentation',
        gradient: 'from-orange-500 to-amber-600',
        accentColor: darkMode ? 'text-orange-400' : 'text-orange-600'
      };
    }
  };

  const recommendation = getRecommendation();

  return (
    <div className="w-full max-w-sm mx-auto">
      <motion.button
        onClick={() => setCurrentScreen(recommendation.target)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative w-full p-4 rounded-xl overflow-hidden group text-left
          pluqla-card pluqla-card-glass pluqla-card-highlight
          hover:pluqla-shadow-glow
          transition-all duration-300
        `}
      >
        {/* Animated gradient background */}
        <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${recommendation.gradient}`}></div>

        {/* Content */}
        <div className="relative z-10 flex items-start space-x-4">
          {/* Pluqi Mascot (Phase 2B) */}
          <div className="flex-shrink-0">
            <PluqiMascot mood={recommendation.mood} size="md" />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            {/* Badge "Conseil Pluqi" */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold uppercase tracking-wide ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Conseil Pluqi
              </span>
              <div className="w-2 h-2 rounded-full bg-pluqla-red animate-pulse"></div>
            </div>

            <h4 className={`text-sm font-bold mb-1 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {recommendation.title}
            </h4>
            <p className={`text-xs leading-relaxed mb-3 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {recommendation.description}
            </p>

            {/* CTA avec flèche */}
            <div className={`
              text-xs font-semibold flex items-center gap-1
              ${recommendation.accentColor}
              group-hover:gap-2
              transition-all duration-300
            `}>
              <span>{recommendation.action}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Corner decoration */}
        <div className={`absolute top-0 right-0 w-24 h-24 opacity-10 bg-gradient-to-bl ${recommendation.gradient} rounded-bl-full`}></div>
      </motion.button>
    </div>
  );
};

export default RecommendedCard;
