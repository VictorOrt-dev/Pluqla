import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NavigationProvider } from '../../../contexts/NavigationContext';
import OnboardingManager from '../OnboardingManager';

// Mock des composants d'onboarding
jest.mock('../enhanced/AuthScreen', () => {
  return function MockAuthScreen({ onNext, onStartOnboarding }) {
    return (
      <div data-testid="auth-screen">
        <button onClick={() => onStartOnboarding()}>Start</button>
        <button onClick={() => onNext({ authData: { test: true } })}>Next</button>
      </div>
    );
  };
});

jest.mock('../enhanced/PersonalizationScreen', () => {
  return function MockPersonalizationScreen({ onNext, onPrevious }) {
    return (
      <div data-testid="personalization-screen">
        <button onClick={() => onPrevious()}>Previous</button>
        <button onClick={() => onNext()}>Next</button>
      </div>
    );
  };
});

jest.mock('../enhanced/GoalsScreen', () => {
  return function MockGoalsScreen({ onNext, onPrevious }) {
    return (
      <div data-testid="goals-screen">
        <button onClick={() => onPrevious()}>Previous</button>
        <button onClick={() => onNext()}>Next</button>
      </div>
    );
  };
});

jest.mock('../enhanced/QuickWinsScreen', () => {
  return function MockQuickWinsScreen({ onNext, onPrevious }) {
    return (
      <div data-testid="quick-wins-screen">
        <button onClick={() => onPrevious()}>Previous</button>
        <button onClick={() => onNext()}>Next</button>
      </div>
    );
  };
});

jest.mock('../enhanced/EmailVerificationScreen', () => {
  return function MockEmailVerificationScreen({ onNext, onPrevious }) {
    return (
      <div data-testid="email-verification-screen">
        <button onClick={() => onPrevious()}>Previous</button>
        <button onClick={() => onNext()}>Next</button>
      </div>
    );
  };
});

jest.mock('../enhanced/CompletionScreen', () => {
  return function MockCompletionScreen({ onNext, onPrevious }) {
    return (
      <div data-testid="completion-screen">
        <button onClick={() => onPrevious()}>Previous</button>
        <button onClick={() => onNext()}>Finish</button>
      </div>
    );
  };
});

// Mock des utilitaires
jest.mock('../../../utils/storage', () => ({
  loadFromLocalStorage: jest.fn(() => ({
    stepId: 'auth',
    stepIndex: 0,
    completedSteps: [],
    userData: {},
    preferences: {},
    timestamp: Date.now()
  })),
  saveToLocalStorage: jest.fn()
}));

jest.mock('../../../utils/analytics', () => ({
  trackOnboardingEvent: jest.fn()
}));

const renderWithProvider = (component) => {
  return render(
    <NavigationProvider>
      {component}
    </NavigationProvider>
  );
};

describe('OnboardingManager', () => {
  const defaultProps = {
    darkMode: false,
    setUserData: jest.fn(),
    userData: { name: 'Test User' },
    showNotification: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('devrait afficher l\'écran d\'authentification par défaut', () => {
    renderWithProvider(<OnboardingManager {...defaultProps} />);

    expect(screen.getByTestId('auth-screen')).toBeInTheDocument();
  });

  test('devrait permettre de naviguer entre les étapes', async () => {
    renderWithProvider(<OnboardingManager {...defaultProps} />);

    // Démarrer l'onboarding
    fireEvent.click(screen.getByText('Start'));

    // Passer à l'étape suivante
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByTestId('personalization-screen')).toBeInTheDocument();
    });
  });

  test('devrait permettre de naviguer vers la personnalisation puis revenir', async () => {
    renderWithProvider(<OnboardingManager {...defaultProps} />);

    // Démarrer l'onboarding et aller à l'étape personnalisation
    fireEvent.click(screen.getByText('Start'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByTestId('personalization-screen')).toBeInTheDocument();
    });

    // Revenir en arrière vers auth
    fireEvent.click(screen.getByText('Previous'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-screen')).toBeInTheDocument();
    });
  });

  test('devrait afficher la barre de progression', () => {
    renderWithProvider(<OnboardingManager {...defaultProps} />);

    // Démarrer l'onboarding pour afficher la progression
    fireEvent.click(screen.getByText('Start'));

    // Vérifier que les indicateurs d'étapes sont présents
    const stepIndicators = document.querySelectorAll('[class*="w-2 h-2 rounded-full"]');
    expect(stepIndicators).toHaveLength(6); // 6 étapes au total (sans welcome)
  });

  test('devrait compléter l\'onboarding et naviguer vers home', async () => {
    const mockSetUserData = jest.fn();
    const mockShowNotification = jest.fn();

    renderWithProvider(
      <OnboardingManager
        {...defaultProps}
        setUserData={mockSetUserData}
        showNotification={mockShowNotification}
      />
    );

    // Naviguer à travers toutes les étapes
    fireEvent.click(screen.getByText('Start'));

    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText(i === 5 ? 'Finish' : 'Next'));
      await waitFor(() => {}, { timeout: 100 });
    }

    // Vérifier que setUserData a été appelé
    await waitFor(() => {
      expect(mockSetUserData).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  test('devrait gérer les erreurs gracieusement', async () => {
    const mockSetUserData = jest.fn(() => {
      throw new Error('Test error');
    });
    const mockShowNotification = jest.fn();

    renderWithProvider(
      <OnboardingManager
        {...defaultProps}
        setUserData={mockSetUserData}
        showNotification={mockShowNotification}
      />
    );

    // Déclencher une erreur en complétant l'onboarding
    fireEvent.click(screen.getByText('Start'));

    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText(i === 5 ? 'Finish' : 'Next'));
      await waitFor(() => {}, { timeout: 100 });
    }

    // Vérifier que l'erreur est gérée
    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining('Erreur'),
        'error'
      );
    });
  });

  test('devrait afficher les informations de debug en développement', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderWithProvider(<OnboardingManager {...defaultProps} />);

    // Vérifier que les infos de debug sont affichées
    expect(screen.getByText(/Step:/)).toBeInTheDocument();
    expect(screen.getByText(/Progress:/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});