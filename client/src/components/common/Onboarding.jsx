import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '../../services/analyticsService';

const Onboarding = ({ darkMode, currentScreen, onComplete }) => {
  const { t } = useTranslation();
  const { trackUserAction } = useAnalytics();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Vérifier si l'onboarding a déjà été complété
  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (completed) {
      setHasCompleted(true);
      return;
    }

    // Afficher l'onboarding après un court délai
    const timer = setTimeout(() => {
      setIsVisible(true);
      trackUserAction('onboarding_started', currentScreen);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentScreen, trackUserAction]);

  // Configuration des étapes selon l'écran
  const getStepsForScreen = (screen) => {
    const baseSteps = {
      home: [
        {
          title: '👋 Bienvenue dans Pluqla !',
          description: 'Votre assistant IA pour économiser intelligemment',
          highlight: '.main-nav',
          position: 'center'
        },
        {
          title: '🎯 Vos Features Principales',
          description: 'Explorez Activités, Habits, Alimentation et Déplacement',
          highlight: '.feature-cards',
          position: 'bottom'
        }
      ],
      activity: [
        {
          title: '💪 Activités & Sport',
          description: 'Découvrez des programmes personnalisés et activités locales',
          highlight: '.category-pills',
          position: 'bottom'
        }
      ],
      habits: [
        {
          title: '✨ Tendances Mode',
          description: 'Likez les styles pour des suggestions personnalisées',
          highlight: '.pinterest-feed',
          position: 'top'
        },
        {
          title: '🔍 Analysez vos Vêtements',
          description: 'Utilisez "Analyser" pour trouver où acheter un style',
          highlight: '.analyze-button',
          position: 'top'
        }
      ],
      alimentation: [
        {
          title: '🛒 Liste de Courses IA',
          description: 'Générez des listes intelligentes depuis vos recettes favorites',
          highlight: '.shopping-list-generator',
          position: 'top'
        }
      ],
      deplacement: [
        {
          title: '🚗 Optimisation Trajets',
          description: 'IA intégrée pour éco-mobilité et économies carburant',
          highlight: '.transport-tracker',
          position: 'bottom'
        }
      ]
    };

    return baseSteps[screen] || [];
  };

  const steps = getStepsForScreen(currentScreen);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      trackUserAction('onboarding_next_step', `${currentScreen}_step_${currentStep + 1}`);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    trackUserAction('onboarding_skipped', `${currentScreen}_step_${currentStep}`);
    completeOnboarding();
  };

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsVisible(false);
    setHasCompleted(true);
    trackUserAction('onboarding_completed', currentScreen);
    if (onComplete) onComplete();
  };

  // Ne pas afficher si déjà complété, pas d'étapes, ou pas visible
  if (hasCompleted || steps.length === 0 || !isVisible) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay léger */}
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-fade-in">

        {/* Tooltip principal */}
        <div className={`fixed z-50 max-w-sm p-6 rounded-2xl shadow-2xl border transition-all duration-300 ${
          darkMode
            ? 'bg-gray-900/95 backdrop-blur-xl border-gray-700/50 text-white'
            : 'bg-white/95 backdrop-blur-xl border-gray-200/50 text-gray-900'
        } ${
          currentStepData.position === 'center'
            ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
            : currentStepData.position === 'top'
            ? 'top-20 left-1/2 transform -translate-x-1/2'
            : 'bottom-20 left-1/2 transform -translate-x-1/2'
        }`}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              {currentStepData.title}
            </h3>
            <button
              onClick={skipOnboarding}
              className={`p-1.5 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Fermer l'onboarding"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className={`text-sm mb-6 leading-relaxed ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {currentStepData.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                Étape {currentStep + 1} sur {steps.length}
              </span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className={`w-full h-2 rounded-full ${
              darkMode ? 'bg-gray-800' : 'bg-gray-200'
            }`}>
              <div
                className="h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    darkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Précédent
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={skipOnboarding}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  darkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Passer
              </button>

              <button
                onClick={nextStep}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg shadow-red-500/25"
              >
                {isLastStep ? 'Terminer' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Element (optionnel) */}
        {currentStepData.highlight && (
          <div className="fixed inset-0 pointer-events-none">
            <div
              className="absolute border-2 border-red-500 rounded-xl animate-pulse shadow-lg shadow-red-500/50"
              style={{
                // Cette partie nécessiterait du JS pour calculer la position de l'élément highlighté
                // Pour simplifier, on garde juste l'overlay pour le moment
              }}
            />
          </div>
        )}
      </div>
    </>
  );
};

// Hook pour gérer l'onboarding facilement
export const useOnboarding = () => {
  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed');
  };

  const isOnboardingCompleted = () => {
    return !!localStorage.getItem('onboarding_completed');
  };

  return {
    resetOnboarding,
    isOnboardingCompleted
  };
};

export default Onboarding;