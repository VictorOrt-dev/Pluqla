// Contexte de thème dynamique et persistant
// Impact UI: Améliore l'expérience utilisateur avec toggle fluide et préférences système
// Compatible: Avec le darkMode existant (migration automatique)

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { SecureStorage } from '../utils/secureStorage';

// Configuration des thèmes
export const THEME_CONFIG = {
  themes: {
    light: {
      name: 'Pluqla Clair',
      primary: 'bg-white',
      secondary: 'bg-gray-50',
      accent: 'bg-red-50',
      text: 'text-black',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-500',
      border: 'border-gray-200',
      card: 'bg-white',
      input: 'bg-white border-gray-300',
      button: 'bg-red-500 hover:bg-red-600',
      buttonSecondary: 'bg-green-500 hover:bg-green-600',
      danger: 'bg-red-500 hover:bg-red-600',
      success: 'bg-green-500 hover:bg-green-600',
      warning: 'bg-orange-500 hover:bg-orange-600',
      gradient: 'from-red-50 to-orange-50',
      gradientPrimary: 'from-red-500 to-orange-500',
      shadow: 'shadow-sm'
    },
    dark: {
      name: 'Pluqla Sombre',
      primary: 'bg-black',
      secondary: 'bg-gray-900',
      accent: 'bg-red-900/20',
      text: 'text-white',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-400',
      border: 'border-gray-800',
      card: 'bg-gray-900',
      input: 'bg-gray-800 border-gray-700',
      button: 'bg-red-600 hover:bg-red-700',
      buttonSecondary: 'bg-green-600 hover:bg-green-700',
      danger: 'bg-red-600 hover:bg-red-700',
      success: 'bg-green-600 hover:bg-green-700',
      warning: 'bg-orange-600 hover:bg-orange-700',
      gradient: 'from-gray-900 to-black',
      gradientPrimary: 'from-red-600 to-orange-600',
      shadow: 'shadow-lg shadow-black/50'
    }
  },
  modes: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  },
  animations: {
    transition: 'transition-all duration-300 ease-in-out',
    fadeIn: 'animate-fadeIn',
    slideIn: 'animate-slideIn'
  }
};

const ThemeContext = createContext();

// État initial du thème
const getInitialState = () => {
  // Récupérer les préférences sauvegardées
  const savedTheme = SecureStorage.load('themePreferences', {
    mode: 'system',
    customizations: {}
  });

  // Détecter la préférence système
  const systemPrefersDark = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  // Déterminer le thème actuel
  let currentTheme;
  if (savedTheme.mode === 'system') {
    currentTheme = systemPrefersDark ? 'dark' : 'light';
  } else {
    currentTheme = savedTheme.mode;
  }

  return {
    mode: savedTheme.mode, // 'light', 'dark', 'system'
    currentTheme, // thème réellement appliqué
    systemPrefersDark,
    customizations: savedTheme.customizations,
    isTransitioning: false
  };
};

// Reducer pour la gestion du thème
const themeReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MODE':
      const newCurrentTheme = action.payload === 'system'
        ? (state.systemPrefersDark ? 'dark' : 'light')
        : action.payload;

      return {
        ...state,
        mode: action.payload,
        currentTheme: newCurrentTheme,
        isTransitioning: true
      };

    case 'UPDATE_SYSTEM_PREFERENCE':
      const systemCurrentTheme = state.mode === 'system'
        ? (action.payload ? 'dark' : 'light')
        : state.currentTheme;

      return {
        ...state,
        systemPrefersDark: action.payload,
        currentTheme: systemCurrentTheme
      };

    case 'SET_CUSTOMIZATIONS':
      return {
        ...state,
        customizations: { ...state.customizations, ...action.payload }
      };

    case 'FINISH_TRANSITION':
      return {
        ...state,
        isTransitioning: false
      };

    case 'TOGGLE_THEME':
      const nextTheme = state.currentTheme === 'light' ? 'dark' : 'light';
      return {
        ...state,
        mode: nextTheme,
        currentTheme: nextTheme,
        isTransitioning: true
      };

    default:
      return state;
  }
};

export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, getInitialState());

  // Sauvegarder les préférences
  useEffect(() => {
    const preferences = {
      mode: state.mode,
      customizations: state.customizations
    };
    SecureStorage.save('themePreferences', preferences);
  }, [state.mode, state.customizations]);

  // Écouter les changements de préférence système
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      dispatch({ type: 'UPDATE_SYSTEM_PREFERENCE', payload: e.matches });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Appliquer le thème au document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // CORRECTION CRITIQUE: Appliquer la classe 'dark' au HTML root pour Tailwind
    if (state.currentTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Ajouter la classe de transition
    root.classList.add('transition-colors', 'duration-300', 'ease-in-out');

    // Ajouter aussi au body pour compatibilité
    document.body.className = `theme-${state.currentTheme} transition-colors duration-300`;

    // Définir les variables CSS personnalisées
    const theme = THEME_CONFIG.themes[state.currentTheme];
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-text', theme.text);

    // Mettre à jour le meta theme-color pour mobile
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = state.currentTheme === 'dark' ? '#000000' : '#ffffff';

    // Debug log en développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎨 Theme applied: ${state.currentTheme} (mode: ${state.mode})`);
    }

    // Finir la transition après animation
    if (state.isTransitioning) {
      const timeout = setTimeout(() => {
        dispatch({ type: 'FINISH_TRANSITION' });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [state.currentTheme, state.isTransitioning, state.mode, dispatch]);

  // Actions du thème
  const setThemeMode = (mode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  };

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const customizeTheme = (customizations) => {
    dispatch({ type: 'SET_CUSTOMIZATIONS', payload: customizations });
  };

  // Utilitaires pour obtenir les classes CSS
  const getThemeClasses = () => {
    return THEME_CONFIG.themes[state.currentTheme];
  };

  const cx = (...classes) => {
    return classes.filter(Boolean).join(' ');
  };

  const themed = (lightClass, darkClass) => {
    return state.currentTheme === 'dark' ? darkClass : lightClass;
  };

  // Legacy support - pour compatibilité avec l'existant
  const darkMode = state.currentTheme === 'dark';
  const setDarkMode = (isDark) => {
    setThemeMode(isDark ? 'dark' : 'light');
  };

  const value = {
    // État actuel
    mode: state.mode,
    currentTheme: state.currentTheme,
    systemPrefersDark: state.systemPrefersDark,
    isTransitioning: state.isTransitioning,
    customizations: state.customizations,

    // Actions
    setThemeMode,
    toggleTheme,
    customizeTheme,

    // Utilitaires
    getThemeClasses,
    themed,
    cx,

    // Legacy support
    darkMode,
    setDarkMode,

    // Configuration
    config: THEME_CONFIG
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook pour les classes conditionnelles basées sur le thème
export const useThemedClasses = () => {
  const { themed, getThemeClasses, cx } = useTheme();

  return {
    themed,
    classes: getThemeClasses(),
    cx,
    // Classes courantes Pluqla
    bg: themed('bg-white', 'bg-black'),
    bgSecondary: themed('bg-gray-50', 'bg-gray-900'),
    bgCard: themed('bg-white', 'bg-gray-900'),
    bgAccent: themed('bg-red-50', 'bg-red-900/20'),
    text: themed('text-black', 'text-white'),
    textSecondary: themed('text-gray-600', 'text-gray-300'),
    textMuted: themed('text-gray-500', 'text-gray-400'),
    border: themed('border-gray-200', 'border-gray-800'),
    input: themed('bg-white border-gray-300', 'bg-gray-800 border-gray-700'),
    button: themed('bg-red-500 hover:bg-red-600', 'bg-red-600 hover:bg-red-700'),
    buttonSecondary: themed('bg-green-500 hover:bg-green-600', 'bg-green-600 hover:bg-green-700'),
    gradient: themed('from-red-50 to-orange-50', 'from-gray-900 to-black'),
    gradientPrimary: themed('from-red-500 to-orange-500', 'from-red-600 to-orange-600')
  };
};