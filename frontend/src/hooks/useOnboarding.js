import { useState, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/storage';
import { trackOnboardingEvent } from '../utils/analytics';
import { useNavigation } from '../contexts/NavigationContext';

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Bienvenue' },
  { id: 'auth', title: 'Inscription' },
  { id: 'personalization', title: 'Personnalisation' },
  { id: 'goals', title: 'Objectifs' },
  { id: 'quick_wins', title: 'Premières économies' },
  { id: 'email_verification', title: 'Vérification' },
  { id: 'completion', title: 'Félicitations' }
];

export const useOnboarding = (setUserData, showNotification) => {
  const { navigateToHome } = useNavigation();

  const [currentStep, setCurrentStep] = useState(() => {
    // Si c'est un nouvel utilisateur, commencer par la personnalisation (index 2)
    const isNewUser = localStorage.getItem('isNewUser') === 'true';
    return isNewUser ? 2 : 0;
  });
  const [onboardingData, setOnboardingData] = useState(() => {
    const isNewUser = localStorage.getItem('isNewUser') === 'true';
    const defaultStep = isNewUser ? 'personalization' : 'welcome';
    const defaultIndex = isNewUser ? 2 : 0;

    return loadFromLocalStorage('onboardingProgress', {
      stepId: defaultStep,
      stepIndex: defaultIndex,
      completedSteps: isNewUser ? ['welcome', 'auth'] : [],
      userData: {},
      preferences: {},
      timestamp: Date.now()
    });
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Sauvegarder le progrès
  useEffect(() => {
    saveToLocalStorage('onboardingProgress', onboardingData);
  }, [onboardingData]);

  // Tracking analytique
  useEffect(() => {
    if (hasStarted && ONBOARDING_STEPS[currentStep]) {
      trackOnboardingEvent('step_view', {
        step: ONBOARDING_STEPS[currentStep].id,
        stepIndex: currentStep,
        totalSteps: ONBOARDING_STEPS.length
      });
    }
  }, [currentStep, hasStarted]);

  const updateOnboardingData = useCallback((newData) => {
    setOnboardingData(prev => ({
      ...prev,
      ...newData,
      timestamp: Date.now()
    }));
  }, []);

  const nextStep = useCallback(async (stepData = {}) => {
    setIsLoading(true);

    try {
      // Marquer l'étape actuelle comme complétée
      const completedSteps = [...onboardingData.completedSteps, ONBOARDING_STEPS[currentStep].id];

      updateOnboardingData({
        stepIndex: currentStep + 1,
        stepId: ONBOARDING_STEPS[currentStep + 1]?.id || 'completed',
        completedSteps,
        ...stepData
      });

      // Analytics
      trackOnboardingEvent('step_complete', {
        step: ONBOARDING_STEPS[currentStep].id,
        stepIndex: currentStep,
        data: stepData
      });

      if (currentStep < ONBOARDING_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Onboarding terminé
        completeOnboarding();
      }
    } catch (error) {
      console.error('Erreur lors du passage à l\'étape suivante:', error);
      showNotification?.('Une erreur est survenue', 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, onboardingData.completedSteps, updateOnboardingData, showNotification]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      updateOnboardingData({
        stepIndex: currentStep - 1,
        stepId: ONBOARDING_STEPS[currentStep - 1].id
      });

      trackOnboardingEvent('step_back', {
        fromStep: ONBOARDING_STEPS[currentStep].id,
        toStep: ONBOARDING_STEPS[currentStep - 1].id
      });
    }
  }, [currentStep, updateOnboardingData]);

  const completeOnboarding = useCallback(() => {
    try {
      console.log('🎉 Completing onboarding...');

      // Nettoyer le localStorage de l'onboarding
      localStorage.removeItem('onboardingProgress');
      localStorage.removeItem('isNewUser');

      // Définir l'utilisateur comme onboardé
      if (typeof setUserData === 'function') {
        setUserData(prev => ({
          ...prev,
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
          ...onboardingData.userData
        }));
      }

      // Analytics final
      trackOnboardingEvent('onboarding_complete', {
        totalSteps: ONBOARDING_STEPS.length,
        completedSteps: onboardingData.completedSteps.length,
        skippedSteps: ONBOARDING_STEPS.length - onboardingData.completedSteps.length,
        duration: Date.now() - onboardingData.timestamp
      });

      // Navigation robuste vers l'écran principal
      if (typeof navigateToHome === 'function') {
        console.log('✅ Navigating to home via NavigationContext');
        navigateToHome();
        showNotification?.('Bienvenue dans +Clair ! 🎉', 'success');
      } else {
        console.error('❌ navigateToHome is not available');
        // Fallback: rechargement de page
        showNotification?.('Onboarding terminé ! Rechargement...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }

    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'onboarding:', error);
      showNotification?.('Erreur lors de la finalisation. Rechargement...', 'error');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [navigateToHome, setUserData, onboardingData, showNotification]);

  const skipStep = useCallback(() => {
    trackOnboardingEvent('step_skip', {
      step: ONBOARDING_STEPS[currentStep].id,
      stepIndex: currentStep
    });
    nextStep({ skipped: true });
  }, [currentStep, nextStep]);

  const restartOnboarding = useCallback(() => {
    setCurrentStep(0);
    setOnboardingData({
      stepId: 'welcome',
      stepIndex: 0,
      completedSteps: [],
      userData: {},
      preferences: {},
      timestamp: Date.now()
    });
    setHasStarted(false);

    trackOnboardingEvent('onboarding_restart', {
      fromStep: currentStep
    });
  }, [currentStep]);

  const getProgressPercentage = useCallback(() => {
    return Math.round(((currentStep + 1) / ONBOARDING_STEPS.length) * 100);
  }, [currentStep]);

  return {
    // État
    currentStep,
    onboardingData,
    isLoading,
    hasStarted,

    // Actions
    nextStep,
    previousStep,
    skipStep,
    completeOnboarding,
    restartOnboarding,
    updateOnboardingData,
    setHasStarted,

    // Helpers
    getProgressPercentage,

    // Constantes
    ONBOARDING_STEPS,
    totalSteps: ONBOARDING_STEPS.length,
    canGoBack: currentStep > 0,
    isLastStep: currentStep === ONBOARDING_STEPS.length - 1
  };
};