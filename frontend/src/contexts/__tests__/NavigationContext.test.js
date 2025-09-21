import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { NavigationProvider, useNavigation } from '../NavigationContext';

// Composant de test qui utilise le NavigationContext
const TestComponent = () => {
  const { currentScreen, setCurrentScreen, previousScreen, navigationHistory } = useNavigation();

  return (
    <div>
      <div data-testid="current-screen">{currentScreen}</div>
      <div data-testid="previous-screen">{previousScreen || 'none'}</div>
      <div data-testid="history-count">{navigationHistory.length}</div>
      <button
        data-testid="navigate-home"
        onClick={() => setCurrentScreen('home')}
      >
        Go Home
      </button>
    </div>
  );
};

describe('NavigationContext', () => {
  beforeEach(() => {
    // Nettoyer localStorage avant chaque test
    localStorage.clear();
  });

  test('devrait initialiser avec onboarding comme écran par défaut', () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    expect(screen.getByTestId('current-screen')).toHaveTextContent('onboarding');
    expect(screen.getByTestId('previous-screen')).toHaveTextContent('none');
  });

  test('devrait permettre la navigation entre écrans', async () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    const navigateButton = screen.getByTestId('navigate-home');

    await act(async () => {
      navigateButton.click();
    });

    expect(screen.getByTestId('current-screen')).toHaveTextContent('home');
    expect(screen.getByTestId('previous-screen')).toHaveTextContent('onboarding');
  });

  test('devrait maintenir un historique de navigation', async () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    const navigateButton = screen.getByTestId('navigate-home');

    await act(async () => {
      navigateButton.click();
    });

    expect(screen.getByTestId('history-count')).toHaveTextContent('1');
  });

  test('devrait gérer les erreurs de type incorrects', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    const { setCurrentScreen } = useNavigation();

    // Tenter de passer un type invalide
    act(() => {
      setCurrentScreen(123); // Devrait être une string
    });

    expect(consoleError).toHaveBeenCalledWith('Invalid screen type:', 'number', 123);

    consoleError.mockRestore();
  });

  test('devrait persister l\'état dans localStorage', async () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    const navigateButton = screen.getByTestId('navigate-home');

    await act(async () => {
      navigateButton.click();
    });

    expect(localStorage.getItem('currentScreen')).toBe('"home"');
  });
});