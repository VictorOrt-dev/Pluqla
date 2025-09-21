import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/storage';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [currentScreen, setCurrentScreenState] = useState(() =>
    loadFromLocalStorage('currentScreen', 'home')
  );
  const [previousScreen, setPreviousScreen] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);

  // Fonction stable avec useCallback pour éviter les re-renders
  const setCurrentScreen = useCallback((screen, saveToStorage = true) => {
    if (typeof screen !== 'string') {
      console.error('Invalid screen type:', typeof screen, screen);
      return;
    }

    console.log(`🔄 Navigation: ${currentScreen} → ${screen}`);

    setPreviousScreen(currentScreen);
    setCurrentScreenState(screen);

    // Historique de navigation
    setNavigationHistory(prev => [...prev.slice(-9), {
      from: currentScreen,
      to: screen,
      timestamp: Date.now()
    }]);

    // Sauvegarder dans localStorage
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
    setCurrentScreen('home');
  }, [setCurrentScreen]);

  const navigateToOnboarding = useCallback(() => {
    setCurrentScreen('onboarding');
  }, [setCurrentScreen]);

  // Debug logging en développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧭 Navigation State:', {
        currentScreen,
        previousScreen,
        historyLength: navigationHistory.length
      });
    }
  }, [currentScreen, previousScreen, navigationHistory]);

  const value = {
    currentScreen,
    previousScreen,
    navigationHistory,
    setCurrentScreen,
    goBack,
    navigateToHome,
    navigateToOnboarding,
    // État pour débugger
    isNavigating: false
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext;