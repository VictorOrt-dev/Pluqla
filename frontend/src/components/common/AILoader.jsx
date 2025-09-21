import React, { useState, useEffect } from 'react';

const AILoader = ({
  isLoading = false,
  category = 'suggestions',
  stage = 'fetching',
  showProgress = true,
  estimatedTime = 5000
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(stage);
  const [dots, setDots] = useState('');

  // Stages d'une requête IA
  const stages = {
    fetching: { label: 'Recherche des suggestions', icon: '🔍', color: 'blue' },
    analyzing: { label: 'Analyse de votre profil', icon: '🧠', color: 'purple' },
    generating: { label: 'Génération personnalisée', icon: '✨', color: 'cyan' },
    finalizing: { label: 'Finalisation des recommandations', icon: '🎯', color: 'green' }
  };

  // Messages selon la catégorie
  const categoryMessages = {
    alimentation: {
      title: 'Suggestions culinaires en cours...',
      subtitle: 'Analyse de vos préférences alimentaires',
      tips: ['💡 Astuce : Les repas maison coûtent 3x moins cher', '🥗 Pensez aux légumes de saison pour économiser']
    },
    habits: {
      title: 'Conseils mode en préparation...',
      subtitle: 'Optimisation de votre garde-robe',
      tips: ['👗 Astuce : Achetez en fin de saison', '♻️ Pensez à la seconde main pour économiser']
    },
    activite: {
      title: 'Activités personnalisées en cours...',
      subtitle: 'Découverte d\'expériences économiques',
      tips: ['🎭 Astuce : Beaucoup d\'événements sont gratuits', '🌳 Profitez des parcs et espaces verts']
    },
    deplacement: {
      title: 'Solutions transport en calcul...',
      subtitle: 'Optimisation de vos trajets',
      tips: ['🚲 Astuce : Le vélo économise 150€/mois', '🚌 Comparez avec les abonnements transport']
    },
    general: {
      title: 'IA en réflexion...',
      subtitle: 'Personnalisation en cours',
      tips: ['💰 Économisez intelligemment', '📱 +Clair optimise votre budget']
    }
  };

  const messages = categoryMessages[category] || categoryMessages.general;
  const stageConfig = stages[currentStage] || stages.fetching;

  // Animation des points
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Simulation de progression
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const increment = Math.random() * 15 + 5; // 5-20% par étape
        const newProgress = Math.min(prev + increment, 95); // Max 95% avant completion

        // Changer de stage selon le progrès
        if (newProgress > 75) setCurrentStage('finalizing');
        else if (newProgress > 50) setCurrentStage('generating');
        else if (newProgress > 25) setCurrentStage('analyzing');
        else setCurrentStage('fetching');

        return newProgress;
      });
    }, estimatedTime / 20); // 20 étapes sur la durée estimée

    return () => clearInterval(progressInterval);
  }, [isLoading, estimatedTime]);

  // Rotation des tips
  const [currentTip, setCurrentTip] = useState(0);
  useEffect(() => {
    if (!isLoading || messages.tips.length <= 1) return;

    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % messages.tips.length);
    }, 3000);

    return () => clearInterval(tipInterval);
  }, [isLoading, messages.tips.length]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all duration-300">
        {/* En-tête avec icône animée */}
        <div className="text-center mb-6">
          <div className="relative">
            {/* Cercle pulsant en arrière-plan */}
            <div className={`absolute inset-0 rounded-full bg-${stageConfig.color}-500/20 dark:bg-${stageConfig.color}-400/20 animate-ping`}
                 style={{ animationDuration: '2s' }} />

            {/* Icône centrale */}
            <div className={`relative w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-${stageConfig.color}-500 to-${stageConfig.color}-600 dark:from-${stageConfig.color}-400 dark:to-${stageConfig.color}-500 flex items-center justify-center shadow-lg`}>
              <span className="text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>
                {stageConfig.icon}
              </span>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
            {messages.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {messages.subtitle}
          </p>
        </div>

        {/* Étape actuelle */}
        <div className="mb-6">
          <div className={`flex items-center text-${stageConfig.color}-600 dark:text-${stageConfig.color}-400 mb-2`}>
            <span className="text-sm font-medium">
              {stageConfig.label}{dots}
            </span>
          </div>

          {/* Barre de progression */}
          {showProgress && (
            <div className="relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-${stageConfig.color}-500 to-${stageConfig.color}-600 dark:from-${stageConfig.color}-400 dark:to-${stageConfig.color}-500 rounded-full transition-all duration-500 ease-out relative`}
                  style={{ width: `${progress}%` }}
                >
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {Math.round(progress)}%
              </div>
            </div>
          )}
        </div>

        {/* Tips rotatifs */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 min-h-[3rem] flex items-center">
          <div className="transition-all duration-500 ease-in-out">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {messages.tips[currentTip]}
            </p>
          </div>
        </div>

        {/* Indicateur de charges multiples */}
        <div className="flex justify-center mt-4 space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full bg-${stageConfig.color}-500/50 dark:bg-${stageConfig.color}-400/50 animate-pulse`}
              style={{ animationDelay: `${i * 0.2}s`, animationDuration: '1.5s' }}
            />
          ))}
        </div>

        {/* Message d'annulation (optionnel) */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ⏱️ Cela prend généralement quelques secondes
          </p>
        </div>
      </div>
    </div>
  );
};

export default AILoader;