/**
 * Navigation Utilities for Pluqla
 * Clean programmatic navigation helpers using React Router v6
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

/**
 * Enhanced navigation hook with Pluqla-specific helpers
 */
export const useAppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  return {
    // Core navigation
    navigate,
    location,
    params,

    // Helper methods
    goToDashboard: () => navigate('/dashboard'),
    goToProfile: () => navigate('/profile'),
    goToLogin: () => navigate('/login'),
    goToOnboarding: () => navigate('/onboarding'),

    // Category navigation
    goToCategory: (categoryName) => navigate(`/category/${categoryName}`),
    goToFinance: () => navigate('/finance'),
    goToActivity: () => navigate('/activity'),
    goToHabits: () => navigate('/habits'),
    goToAlimentation: () => navigate('/alimentation'),
    goToTransport: () => navigate('/transport'),

    // Detail screens
    goToExpenses: () => navigate('/finance/expenses'),
    goToIncome: () => navigate('/finance/income'),
    goToSuggestions: () => navigate('/finance/suggestions'),
    goToProgression: () => navigate('/progression'),

    // Navigation state
    canGoBack: () => window.history.length > 1,
    goBack: () => navigate(-1),
    goForward: () => navigate(1),

    // Current route helpers
    getCurrentRoute: () => location.pathname,
    isOnRoute: (route) => location.pathname === route,
    isOnRoutePattern: (pattern) => location.pathname.includes(pattern),

    // Query parameters
    getQueryParam: (key) => new URLSearchParams(location.search).get(key),
    setQueryParams: (params) => {
      const searchParams = new URLSearchParams(location.search);
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          searchParams.delete(key);
        } else {
          searchParams.set(key, value);
        }
      });
      navigate({
        pathname: location.pathname,
        search: searchParams.toString()
      });
    },

    // Advanced navigation with state
    navigateWithState: (to, state) => navigate(to, { state }),
    replaceRoute: (to) => navigate(to, { replace: true }),

    // Route validation
    isValidRoute: (route) => {
      const validRoutes = [
        '/',
        '/login',
        '/onboarding',
        '/dashboard',
        '/profile',
        '/finance',
        '/activity',
        '/habits',
        '/alimentation',
        '/transport',
        '/finance/expenses',
        '/finance/income',
        '/finance/suggestions',
        '/progression'
      ];

      // Check exact matches
      if (validRoutes.includes(route)) return true;

      // Check patterns
      if (route.startsWith('/category/')) return true;
      if (route.startsWith('/dev/') && process.env.NODE_ENV === 'development') return true;

      return false;
    }
  };
};

/**
 * Route configuration for centralized management
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',

  // Protected routes
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',

  // Feature routes
  FINANCE: '/finance',
  ACTIVITY: '/activity',
  HABITS: '/habits',
  ALIMENTATION: '/alimentation',
  TRANSPORT: '/transport',

  // Detail routes
  EXPENSES: '/finance/expenses',
  INCOME: '/finance/income',
  SUGGESTIONS: '/finance/suggestions',
  PROGRESSION: '/progression',

  // Dynamic routes
  CATEGORY: (name) => `/category/${name}`,

  // Development routes
  DEV_FLAGS: '/dev/flags'
};

/**
 * Route metadata for breadcrumbs, titles, etc.
 */
export const ROUTE_META = {
  [ROUTES.HOME]: {
    title: 'Pluqla - Économies Intelligentes',
    breadcrumb: 'Accueil',
    requiresAuth: false
  },
  [ROUTES.LOGIN]: {
    title: 'Connexion - Pluqla',
    breadcrumb: 'Connexion',
    requiresAuth: false
  },
  [ROUTES.ONBOARDING]: {
    title: 'Configuration - Pluqla',
    breadcrumb: 'Configuration',
    requiresAuth: true
  },
  [ROUTES.DASHBOARD]: {
    title: 'Tableau de bord - Pluqla',
    breadcrumb: 'Tableau de bord',
    requiresAuth: true
  },
  [ROUTES.PROFILE]: {
    title: 'Profil - Pluqla',
    breadcrumb: 'Profil',
    requiresAuth: true
  },
  [ROUTES.FINANCE]: {
    title: 'Finance - Pluqla',
    breadcrumb: 'Finance',
    requiresAuth: true
  },
  [ROUTES.ACTIVITY]: {
    title: 'Activité - Pluqla',
    breadcrumb: 'Activité',
    requiresAuth: true
  },
  [ROUTES.HABITS]: {
    title: 'Mode - Pluqla',
    breadcrumb: 'Mode',
    requiresAuth: true
  },
  [ROUTES.ALIMENTATION]: {
    title: 'Alimentation - Pluqla',
    breadcrumb: 'Alimentation',
    requiresAuth: true
  },
  [ROUTES.TRANSPORT]: {
    title: 'Transport - Pluqla',
    breadcrumb: 'Transport',
    requiresAuth: true
  }
};

/**
 * Get route metadata for current route
 */
export const useRouteMetadata = () => {
  const { location } = useAppNavigation();
  const currentRoute = location.pathname;

  return ROUTE_META[currentRoute] || {
    title: 'Pluqla',
    breadcrumb: 'Page',
    requiresAuth: true
  };
};

/**
 * Hook to update document title based on current route
 */
export const usePageTitle = () => {
  const metadata = useRouteMetadata();

  React.useEffect(() => {
    document.title = metadata.title;
  }, [metadata.title]);

  return metadata;
};