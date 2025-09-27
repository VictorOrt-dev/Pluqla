import { useState, useEffect, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/storage';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';

// Fonction simple de tracking qui ne peut pas échouer
const trackOnboardingEvent = (eventName, properties = {}) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Onboarding Event:', eventName, properties);
    }
  } catch (error) {
    // Ignore silencieusement les erreurs de tracking
  }
};

const ONBOARDING_STEPS = [
  { id: 'auth', title: 'Inscription' },
  { id: 'personalization', title: 'Personnalisation' },
  { id: 'goals', title: 'Objectifs' },
  { id: 'quick_wins', title: 'Premières économies' },
  { id: 'email_verification', title: 'Vérification' },
  { id: 'completion', title: 'Félicitations' }
];

export const useOnboarding = (setUserData, showNotification) => {
  const { navigateToHome } = useNavigation();
  const { isAuthenticated, authState, AUTH_STATES } = useAuth();

  const [currentStep, setCurrentStep] = useState(() => {
    // Si c'est un nouvel utilisateur, commencer par la personnalisation (index 1)
    const isNewUser = localStorage.getItem('isNewUser') === 'true';
    return isNewUser ? 1 : 0;
  });
  const [onboardingData, setOnboardingData] = useState(() => {
    const isNewUser = localStorage.getItem('isNewUser') === 'true';
    const defaultStep = isNewUser ? 'personalization' : 'auth';
    const defaultIndex = isNewUser ? 1 : 0;

    return loadFromLocalStorage('onboardingProgress', {
      stepId: defaultStep,
      stepIndex: defaultIndex,
      completedSteps: isNewUser ? ['auth'] : [],
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

  const completeOnboarding = useCallback(async () => {
    try {
      console.log('🎉 Completing onboarding...');
      console.log('🔐 Auth state during completion:', { isAuthenticated, authState });

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

      // 🎯 REDIRECTION OPTIMISÉE APRÈS QUESTIONNAIRE
      console.log('🎯 Onboarding terminé - redirection vers dashboard...');

      // ⏰ ATTENDRE UN PEU POUR LAISSER LE TEMPS À AuthContext DE SE METTRE À JOUR
      await new Promise(resolve => setTimeout(resolve, 500));

      // Vérifier si l'utilisateur est maintenant authentifié
      const token = localStorage.getItem('token');
      console.log('🔍 Vérification token après onboarding:', !!token);

      if (token) {
        // Forcer la navigation vers home immédiatement (suite à fin d'onboarding = action utilisateur)
        if (typeof navigateToHome === 'function') {
          navigateToHome(true); // Marquer comme manuel car c'est suite à l'action utilisateur d'onboarding
          showNotification?.('Bienvenue dans Pluqla ! 🎉', 'success');
          console.log('✅ Navigation vers home déclenchée avec token présent');
        } else {
          console.error('❌ navigateToHome function not available');
          // Fallback: rechargement pour forcer la vérification auth
          showNotification?.('Configuration terminée !', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        console.warn('⚠️ Aucun token trouvé après onboarding - rechargement de sécurité');
        showNotification?.('Configuration terminée ! Redirection...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'onboarding:', error);
      showNotification?.('Erreur lors de la finalisation. Rechargement...', 'error');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [navigateToHome, setUserData, onboardingData, showNotification, isAuthenticated, authState]);

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
      stepId: 'auth',
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