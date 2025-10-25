import React, { Suspense } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import SuspenseFallback from '../common/SuspenseFallback';

// Lazy loading des écrans d'onboarding pour optimiser le bundle principal
const AuthScreen = React.lazy(() => import('./enhanced/AuthScreen'));
const PersonalizationScreen = React.lazy(() => import('./enhanced/PersonalizationScreen'));
const GoalsScreen = React.lazy(() => import('./enhanced/GoalsScreen'));
const QuickWinsScreen = React.lazy(() => import('./enhanced/QuickWinsScreen'));
const EmailVerificationScreen = React.lazy(() => import('./enhanced/EmailVerificationScreen'));
const CompletionScreen = React.lazy(() => import('./enhanced/CompletionScreen'));

const STEP_COMPONENTS = {
  auth: AuthScreen,
  personalization: PersonalizationScreen,
  goals: GoalsScreen,
  quick_wins: QuickWinsScreen,
  email_verification: EmailVerificationScreen,
  completion: CompletionScreen
};

const OnboardingManager = ({
  darkMode,
  setUserData,
  userData,
  showNotification
}) => {
  // Utiliser le hook d'onboarding robuste
  const onboarding = useOnboarding(setUserData, showNotification);

  // Destructurer les valeurs du hook
  const {
    currentStep,
    onboardingData,
    isLoading,
    hasStarted,
    nextStep,
    previousStep,
    skipStep,
    restartOnboarding,
    updateOnboardingData,
    setHasStarted,
    getProgressPercentage,
    ONBOARDING_STEPS,
    totalSteps,
    canGoBack
  } = onboarding;

  const getCurrentStepComponent = () => {
    const currentStepData = ONBOARDING_STEPS[currentStep];
    const StepComponent = STEP_COMPONENTS[currentStepData.id];

    if (!StepComponent) {
      console.error(`Component not found for step: ${currentStepData.id}`);
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500">Erreur: Composant introuvable</p>
        </div>
      );
    }

    return (
      <Suspense fallback={<SuspenseFallback component="l'étape d'onboarding" fullScreen={true} />}>
        <StepComponent
          onNext={nextStep}
          onPrevious={previousStep}
          onSkip={skipStep}
          onRestart={restartOnboarding}
          darkMode={darkMode}
          isLoading={isLoading}
          userData={userData}
          setUserData={setUserData}
          onboardingData={onboardingData}
          updateOnboardingData={updateOnboardingData}
          showNotification={showNotification}
          currentStep={currentStep}
          totalSteps={totalSteps}
          progressPercentage={getProgressPercentage()}
          canGoBack={canGoBack}
          onStartOnboarding={() => setHasStarted(true)}
        />
      </Suspense>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-white'} relative overflow-hidden`}>
      {/* Progress Bar Global */}
      {hasStarted && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className={`h-1 ${darkMode ? 'bg-gray-900' : 'bg-gray-200'}`}>
            <div
              className="h-full pluqla-gradient-main transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Indicators */}
      {hasStarted && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
          <div className="flex space-x-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'pluqla-gradient-main'
                    : darkMode ? 'bg-gray-800' : 'bg-gray-300'
                } ${index === currentStep ? 'scale-125' : ''}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Current Step */}
      <div className="relative z-10">
        {getCurrentStepComponent()}
      </div>

      {/* Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50">
          <div>Step: {currentStep + 1}/{ONBOARDING_STEPS.length}</div>
          <div>ID: {ONBOARDING_STEPS[currentStep].id}</div>
          <div>Progress: {getProgressPercentage()}%</div>
        </div>
      )}
    </div>
  );
};

export default OnboardingManager;