import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { saveToLocalStorage } from '../utils/storage';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [currentScreen, setCurrentScreenState] = useState(() => {
    // Simplified initial screen logic - check auth status and determine initial screen
    const hasToken = localStorage.getItem('token') || localStorage.getItem('accessToken');

    if (!hasToken) {
      // No authentication - start on landing page for new users
      console.log('🧭 Navigation: Starting on landing page (unauthenticated user)');
      return 'landing';
    } else {
      // User is authenticated - start on home or saved screen
      const savedScreen = localStorage.getItem('currentScreen') || 'home';
      console.log('🧭 Navigation: Starting on saved screen:', savedScreen);
      return savedScreen;
    }
  });

  const [previousScreen, setPreviousScreen] = useState(null);

  // Simplified navigation function
  const setCurrentScreen = useCallback((screen, saveToStorage = true) => {
    if (typeof screen !== 'string') {
      console.error('Invalid screen type:', typeof screen, screen);
      return;
    }

    console.log(`🧭 Navigation: ${currentScreen} → ${screen}`);

    setPreviousScreen(currentScreen);
    setCurrentScreenState(screen);

    // Save to localStorage if requested
    if (saveToStorage) {
      saveToLocalStorage('currentScreen', screen);
    }
  }, [currentScreen]);

  const goBack = useCallback(() => {
    if (previousScreen) {
      setCurrentScreen(previousScreen, false);
    }
  }, [previousScreen, setCurrentScreen]);

  const navigateToHome = useCallback(() => {
    console.log('🧭 Navigate to home');
    setCurrentScreen('home');
  }, [setCurrentScreen]);

  const navigateToOnboarding = useCallback(() => {
    console.log('🧭 Navigate to onboarding');
    setCurrentScreen('onboarding');
  }, [setCurrentScreen]);

  // Generic navigation function
  const navigateTo = useCallback((screen) => {
    console.log('🧭 Navigate to:', screen);
    setCurrentScreen(screen);
  }, [setCurrentScreen]);

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧭 Navigation State:', {
        currentScreen,
        previousScreen
      });
    }
  }, [currentScreen, previousScreen]);

  const value = {
    currentScreen,
    previousScreen,
    setCurrentScreen,
    navigateTo,
    goBack,
    navigateToHome,
    navigateToOnboarding
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext;