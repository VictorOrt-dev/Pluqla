import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { useOnboarding } from '../useOnboarding';
import { NavigationProvider } from '../../contexts/NavigationContext';

// Mock des utilitaires
jest.mock('../../utils/storage', () => ({
  loadFromLocalStorage: jest.fn(() => ({
    stepId: 'welcome',
    stepIndex: 0,
    completedSteps: [],
    userData: {},
    preferences: {},
    timestamp: Date.now()
  })),
  saveToLocalStorage: jest.fn()
}));

jest.mock('../../utils/analytics', () => ({
  trackOnboardingEvent: jest.fn()
}));

const wrapper = ({ children }) => (
  <NavigationProvider>
    {children}
  </NavigationProvider>
);

describe('useOnboarding', () => {
  const mockSetUserData = jest.fn();
  const mockShowNotification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('devrait initialiser avec les valeurs par défaut', () => {
    const { result } = renderHook(
      () => useOnboarding(mockSetUserData, mockShowNotification),
      { wrapper }
    );

    expect(result.current.currentStep).toBe(0);
    expect(result.current.hasStarted).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.totalSteps).toBe(7);
    expect(result.current.canGoBack).toBe(false);
  });

  test('devrait calculer correctement le pourcentage de progression', () => {
    const { result } = renderHook(
      () => useOnboarding(mockSetUserData, mockShowNotification),
      { wrapper }
    );

    expect(result.current.getProgressPercentage()).toBe(14); // (0+1)/7 * 100 ≈ 14
  });

  test('devrait permettre de passer à l\'étape suivante', async () => {
    const { result } = renderHook(
      () => useOnboarding(mockSetUserData, mockShowNotification),
      { wrapper }
    );

    await act(async () => {
      await result.current.nextStep({ testData: 'test' });
    });

    expect(result.current.currentStep).toBe(1);
  });

  test('devrait permettre de revenir en arrière', () => {
    const { result } = renderHook(
      () => useOnboarding(mockSetUserData, mockShowNotification),
      { wrapper }
    );

    // D'abord avancer d'une étape
    act(() => {
      result.current.nextStep();
    });

    // Puis revenir en arrière
    act(() => {
      result.current.previousStep();
    });

    expect(result.current.currentStep).toBe(0);
  });

  test('devrait compléter l\'onboarding à la dernière étape', async () => {
    const { result } = renderHook(
      () => useOnboarding(mockSetUserData, mockShowNotification),
      { wrapper }
    );

    // Naviguer jusqu'à la dernière étape
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        await result.current.nextStep();
      });
    }

    // La dernière étape devrait déclencher la completion
    await act(async () => {
      await result.current.nextStep();
    });

    expect(mockSetUserData).toHaveBeenCalledWith(expect.any(Function));
  });

  test('devrait gérer les erreurs gracieusement', async () => {
    const mockSetUserDataError = jest.fn(() => {
      throw new Error('Test error');
    });

    const { result } = renderHook(
      () => useOnboarding(mockSetUserDataError, mockShowNotification),
      { wrapper }
    );

    // Naviguer jusqu'à la completion pour déclencher l'erreur
    for (let i = 0; i < 7; i++) {
      await act(async () => {
        await result.current.nextStep();
      });
    }

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.stringContaining('Erreur'),
      'error'
    );
  });

  test('devrait permettre de redémarrer l\'onboarding', () => {
    const { result } = renderHook(
      () => useOnboarding(mockSetUserData, mockShowNotification),
      { wrapper }
    );

    // Avancer quelques étapes
    act(() => {
      result.current.nextStep();
      result.current.nextStep();
    });

    // Redémarrer
    act(() => {
      result.current.restartOnboarding();
    });

    expect(result.current.currentStep).toBe(0);
    expect(result.current.hasStarted).toBe(false);
  });
});