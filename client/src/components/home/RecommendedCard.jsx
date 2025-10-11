import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const RecommendedCard = ({ darkMode, userData }) => {
  const { setCurrentScreen } = useNavigation();

  // Logique intelligente de recommandation basée sur userData
  const getRecommendation = () => {
    const savedAmount = userData?.savedAmount || 0;
    const monthlyGoal = userData?.monthlyGoal || 1000;
    const progress = monthlyGoal > 0 ? (savedAmount / monthlyGoal) * 100 : 0;
    const isPremium = userData?.isPremium || userData?.subscriptionTier === 'PREMIUM';

    // Recommandations contextuelles selon progression
    if (progress >= 80) {
      return {
        icon: '🎉',
        title: 'Félicitations !',
        description: 'Vous avez atteint 80% de votre objectif mensuel',
        action: 'Voir mes économies',
        target: 'finance',
        gradient: 'from-green-500 to-emerald-600',
        accentColor: darkMode ? 'text-green-400' : 'text-green-600'
      };
    } else if (progress < 20 && new Date().getDate() > 10) {
      return {
        icon: '💡',
        title: 'Boostez vos économies',
        description: 'Découvrez 3 astuces IA pour économiser cette semaine',
        action: 'Voir les conseils',
        target: 'finance',
        gradient: 'from-[#F14545] to-[#FF6B6B]',
        accentColor: darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
      };
    } else if (!isPremium) {
      return {
        icon: '⭐',
        title: 'Passez Premium',
        description: 'Débloquez les analyses IA illimitées et conseils personnalisés',
        action: 'Découvrir Premium',
        target: 'profile',
        gradient: 'from-purple-500 to-pink-600',
        accentColor: darkMode ? 'text-purple-400' : 'text-purple-600'
      };
    } else {
      return {
        icon: '🍽️',
        title: 'Planifiez vos repas',
        description: 'Économisez jusqu\'à 150€/mois avec des repas optimisés',
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
      <button
        onClick={() => setCurrentScreen(recommendation.target)}
        className={`relative w-full p-4 rounded-xl transition-all duration-300 overflow-hidden group text-left ${
          darkMode
            ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-white/10 hover:border-white/20'
            : 'bg-gradient-to-br from-white/95 to-gray-50/95 border border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
        } backdrop-blur-sm`}
      >
        {/* Animated gradient background */}
        <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${recommendation.gradient}`}></div>

        {/* Content */}
        <div className="relative z-10 flex items-center space-x-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${recommendation.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
            <span className="text-2xl">{recommendation.icon}</span>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold mb-0.5 ${
              darkMode ? 'text-white' : 'text-[#121212]'
            }`}>
              {recommendation.title}
            </h4>
            <p className={`text-xs leading-relaxed mb-1.5 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {recommendation.description}
            </p>
            <div className={`text-xs font-semibold flex items-center space-x-1 ${recommendation.accentColor}`}>
              <span>{recommendation.action}</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </div>
          </div>
        </div>

        {/* Corner decoration */}
        <div className={`absolute top-0 right-0 w-20 h-20 opacity-10 bg-gradient-to-bl ${recommendation.gradient} rounded-bl-full`}></div>
      </button>
    </div>
  );
};

export default RecommendedCard;
