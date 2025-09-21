import React, { useState, useEffect, useCallback } from 'react';
import { trackOnboardingEvent, trackConversionEvent } from '../../../utils/analytics';
import { useNavigation } from '../../../contexts/NavigationContext';

const CompletionScreen = ({
  onNext,
  darkMode,
  onboardingData,
  updateOnboardingData,
  showNotification
}) => {
  const { setCurrentScreen } = useNavigation();
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userStats, setUserStats] = useState({});

  const calculateUserStats = useCallback(() => {
    const personalizationScore = onboardingData.personalizationScore || 0;
    const quickWinsData = onboardingData.quickWinsData || {};
    const goalsData = onboardingData.goalsData || {};

    // Calculer le niveau initial basé sur l'engagement
    let initialLevel = 1;
    let initialPoints = 0;

    // Points pour complétion onboarding
    initialPoints += 100;

    // Points pour personnalisation
    initialPoints += Math.round(personalizationScore / 100 * 50);

    // Points pour objectifs définis
    initialPoints += (goalsData.selectedGoals?.length || 0) * 20;

    // Points pour quick wins révélées
    initialPoints += (quickWinsData.viewedTips || 0) * 15;

    // Email vérifié
    if (onboardingData.emailVerified) {
      initialPoints += 50;
    }

    // Déterminer le niveau
    if (initialPoints >= 200) initialLevel = 3;
    else if (initialPoints >= 150) initialLevel = 2;

    // Badges gagnés
    const badges = [];
    if (personalizationScore >= 80) badges.push('personnalisation_expert');
    if (quickWinsData.viewedTips >= 3) badges.push('chasseur_astuces');
    if (onboardingData.emailVerified) badges.push('compte_securise');
    if (goalsData.selectedGoals?.length >= 3) badges.push('planificateur');

    setUserStats({
      level: initialLevel,
      points: initialPoints,
      badges,
      potentialSavings: quickWinsData.potentialMonthlySavings || 0,
      personalizedScore: personalizationScore
    });
  }, [onboardingData]);

  useEffect(() => {
    // Animation sequence
    const timers = [
      setTimeout(() => setAnimationPhase(1), 500),
      setTimeout(() => setAnimationPhase(2), 1500),
      setTimeout(() => setAnimationPhase(3), 2500),
      setTimeout(() => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }, 3000)
    ];

    // Calculer les stats utilisateur
    calculateUserStats();

    // Tracking final
    trackOnboardingEvent('completion_view', {
      totalTime: Date.now() - onboardingData.timestamp,
      completedSteps: onboardingData.completedSteps?.length || 0
    });

    return () => timers.forEach(clearTimeout);
  }, [onboardingData, calculateUserStats]);

  const completeOnboarding = () => {
    // Mise à jour finale des données
    updateOnboardingData({
      completedAt: new Date().toISOString(),
      initialStats: userStats,
      onboardingCompleted: true
    });

    // Tracking de conversion finale
    trackConversionEvent('onboarding_complete', {
      totalTime: Date.now() - onboardingData.timestamp,
      completedSteps: onboardingData.completedSteps?.length || 0,
      personalizationScore: onboardingData.personalizationScore,
      potentialSavings: userStats.potentialSavings,
      emailVerified: onboardingData.emailVerified,
      goalsSet: onboardingData.goalsData?.selectedGoals?.length || 0
    });

    showNotification('Bienvenue dans +Clair ! 🎉', 'success');

    // Redirection vers l'app principale
    setCurrentScreen('home');
  };

  const getBadgeInfo = (badgeId) => {
    const badges = {
      personnalisation_expert: {
        title: 'Expert Personnalisation',
        description: 'Profil 100% personnalisé',
        icon: '🎯',
        color: 'from-purple-500 to-pink-500'
      },
      chasseur_astuces: {
        title: 'Chasseur d\'Astuces',
        description: 'A découvert plein d\'économies',
        icon: '🔍',
        color: 'from-green-500 to-emerald-500'
      },
      compte_securise: {
        title: 'Compte Sécurisé',
        description: 'Email vérifié avec succès',
        icon: '🛡️',
        color: 'from-blue-500 to-cyan-500'
      },
      planificateur: {
        title: 'Planificateur Pro',
        description: 'Objectifs clairement définis',
        icon: '📋',
        color: 'from-orange-500 to-red-500'
      }
    };

    return badges[badgeId] || { title: 'Badge', description: '', icon: '🏆', color: 'from-gray-500 to-gray-600' };
  };

  const getLevelInfo = (level) => {
    const levels = {
      1: { title: 'Économiseur Débutant', color: 'from-green-500 to-emerald-500', icon: '🌱' },
      2: { title: 'Économiseur Confirmé', color: 'from-blue-500 to-purple-500', icon: '⭐' },
      3: { title: 'Expert Économies', color: 'from-purple-500 to-pink-500', icon: '💎' }
    };

    return levels[level] || levels[1];
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} flex flex-col justify-center items-center px-6 py-8 relative overflow-hidden`}>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-500 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-20 w-full max-w-sm">
        {/* Celebration Header */}
        <div className={`text-center mb-8 transition-all duration-1000 ${
          animationPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}>
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-2`}>
            Félicitations !
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ton profil d'économies est prêt
          </p>
        </div>

        {/* User Level & Points */}
        <div className={`mb-6 transition-all duration-1000 delay-500 ${
          animationPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'} border-2 border-transparent bg-gradient-to-br ${getLevelInfo(userStats.level).color}/10 shadow-lg`}>
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${getLevelInfo(userStats.level).color} flex items-center justify-center`}>
                <span className="text-2xl text-white">{getLevelInfo(userStats.level).icon}</span>
              </div>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'} mb-1`}>
                Niveau {userStats.level}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                {getLevelInfo(userStats.level).title}
              </p>
              <div className={`text-2xl font-bold bg-gradient-to-r ${getLevelInfo(userStats.level).color} bg-clip-text text-transparent`}>
                {userStats.points} points
              </div>
            </div>
          </div>
        </div>

        {/* Badges Earned */}
        {userStats.badges?.length > 0 && (
          <div className={`mb-6 transition-all duration-1000 delay-700 ${
            animationPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'} mb-3 text-center`}>
              Badges débloqués
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {userStats.badges.map((badgeId, index) => {
                const badge = getBadgeInfo(badgeId);
                return (
                  <div
                    key={badgeId}
                    className={`p-3 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-white'} border border-gray-200 dark:border-gray-700 transition-all hover:scale-105`}
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="text-center">
                      <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${badge.color} flex items-center justify-center`}>
                        <span className="text-lg text-white">{badge.icon}</span>
                      </div>
                      <h4 className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-black'} mb-1`}>
                        {badge.title}
                      </h4>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {badge.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Savings Potential Summary */}
        <div className={`mb-6 transition-all duration-1000 delay-1000 ${
          animationPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-green-900/20' : 'bg-green-50'} border border-green-500/20`}>
            <div className="text-center">
              <h3 className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-700'} mb-2`}>
                Potentiel d'économies identifié
              </h3>
              <div className="space-y-2">
                <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {userStats.potentialSavings}€/mois
                </p>
                <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Soit {userStats.potentialSavings * 12}€ par an !
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Preview */}
        <div className={`mb-8 transition-all duration-1000 delay-1200 ${
          animationPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'} mb-4 text-center`}>
            Prochaines étapes
          </h3>
          <div className="space-y-3">
            <div className={`flex items-center p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-xl`}>
              <span className="text-2xl mr-3">🎯</span>
              <div className="flex-1">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                  Suggestions IA personnalisées activées
                </span>
              </div>
              <span className="text-green-500 text-xl">✅</span>
            </div>
            <div className={`flex items-center p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-xl`}>
              <span className="text-2xl mr-3">💡</span>
              <div className="flex-1">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                  Conseils quotidiens disponibles
                </span>
              </div>
              <span className="text-green-500 text-xl">✅</span>
            </div>
            <div className={`flex items-center p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-xl`}>
              <span className="text-2xl mr-3">🏆</span>
              <div className="flex-1">
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                  Système de gamification activé
                </span>
              </div>
              <span className="text-green-500 text-xl">✅</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={completeOnboarding}
          className={`w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${
            animationPhase >= 3 ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
          }`}
          disabled={animationPhase < 3}
        >
          🚀 Commencer à économiser
        </button>

        {/* Welcome Message */}
        <div className={`text-center mt-6 transition-all duration-1000 delay-1500 ${
          animationPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Bienvenue dans ta nouvelle vie d'économiseur intelligent ! 🎉
          </p>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`absolute text-4xl animate-pulse ${
              i % 3 === 0 ? 'text-blue-500' : i % 3 === 1 ? 'text-purple-500' : 'text-green-500'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            {['💰', '⚡', '🎯', '🏆', '💎'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompletionScreen;