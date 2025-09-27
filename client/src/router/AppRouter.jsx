/**
 * React Router v6 Configuration for Pluqla
 * Centralized routing with protected routes and clean navigation
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AUTH_STATES } from '../contexts/AuthContext';
import ApiErrorBoundary from '../components/common/ApiErrorBoundary';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SuspenseFallback from '../components/common/SuspenseFallback';

// Lazy-loaded components for code splitting
const LandingPage = React.lazy(() => import('../components/landing/LandingPage'));
const LoginScreen = React.lazy(() => import('../components/auth/LoginScreen'));
const OnboardingManager = React.lazy(() => import('../components/onboarding/OnboardingManager'));
const HomeScreen = React.lazy(() => import('../components/home/HomeScreen'));
const CategoryScreen = React.lazy(() => import('../components/category/CategoryScreen'));
const Profile = React.lazy(() => import('../components/profile/Profile'));

// Feature screens
const FinancePage = React.lazy(() => import('../pages/FinancePage'));
const ActivityScreen = React.lazy(() => import('../screens/ActivityScreen'));
const HabitsScreen = React.lazy(() => import('../screens/HabitsScreen'));
const AlimentationScreen = React.lazy(() => import('../screens/AlimentationScreen'));
const DeplacementScreen = React.lazy(() => import('../screens/DeplacementScreen'));

// Detail screens
const ExpensesDetailScreen = React.lazy(() => import('../components/finance/ExpensesDetailScreen'));
const IncomeDetailScreen = React.lazy(() => import('../components/finance/IncomeDetailScreen'));
const SuggestionsDetailScreen = React.lazy(() => import('../components/finance/SuggestionsDetailScreen'));
const ProgressionDetailScreen = React.lazy(() => import('../components/progression/ProgressionDetailScreen'));

// Development components
const FeatureFlagsDebug = React.lazy(() => import('../components/dev/FeatureFlagsDebug'));

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authState, user } = useAuth();

  // Show loading while authentication is being determined
  if (authState === AUTH_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user needs onboarding
  if (user && !user.completedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

/**
 * Public Route Component
 * Redirects authenticated users to dashboard
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, authState, user } = useAuth();

  // Show loading while authentication is being determined
  if (authState === AUTH_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // Redirect authenticated users
  if (isAuthenticated) {
    // If user needs onboarding, redirect there
    if (user && !user.completedOnboarding) {
      return <Navigate to="/onboarding" replace />;
    }
    // Otherwise redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/**
 * Onboarding Route Component
 * Only accessible for users who need onboarding
 */
const OnboardingRoute = ({ children }) => {
  const { isAuthenticated, authState, user } = useAuth();

  // Show loading while authentication is being determined
  if (authState === AUTH_STATES.LOADING) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if onboarding is complete
  if (user && user.completedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/**
 * Route Error Fallback Component
 */
const RouteErrorFallback = (error, retry) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
      <div className="text-4xl mb-4">🚫</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Erreur de navigation
      </h2>
      <p className="text-gray-600 mb-4">
        Impossible de charger cette page.
      </p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-pluqla-red-cherry text-white rounded-lg hover:bg-pluqla-red-deep transition-colors"
      >
        Réessayer
      </button>
    </div>
  </div>
);

/**
 * Main Router Component
 */
const AppRouter = () => {
  return (
    <BrowserRouter>
      <ApiErrorBoundary fallback={RouteErrorFallback}>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginScreen />
                </PublicRoute>
              }
            />

            {/* Onboarding Route */}
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <OnboardingManager />
                </OnboardingRoute>
              }
            />

            {/* Protected Main Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <HomeScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Category Routes */}
            <Route
              path="/category/:categoryName"
              element={
                <ProtectedRoute>
                  <CategoryScreen />
                </ProtectedRoute>
              }
            />

            {/* Feature Routes */}
            <Route
              path="/finance"
              element={
                <ProtectedRoute>
                  <FinancePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ActivityScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/habits"
              element={
                <ProtectedRoute>
                  <HabitsScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/alimentation"
              element={
                <ProtectedRoute>
                  <AlimentationScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transport"
              element={
                <ProtectedRoute>
                  <DeplacementScreen />
                </ProtectedRoute>
              }
            />

            {/* Detail Routes */}
            <Route
              path="/finance/expenses"
              element={
                <ProtectedRoute>
                  <ExpensesDetailScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/finance/income"
              element={
                <ProtectedRoute>
                  <IncomeDetailScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/finance/suggestions"
              element={
                <ProtectedRoute>
                  <SuggestionsDetailScreen />
                </ProtectedRoute>
              }
            />

            <Route
              path="/progression"
              element={
                <ProtectedRoute>
                  <ProgressionDetailScreen />
                </ProtectedRoute>
              }
            />

            {/* Development Routes (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <Route
                path="/dev/flags"
                element={
                  <ProtectedRoute>
                    <FeatureFlagsDebug />
                  </ProtectedRoute>
                }
              />
            )}

            {/* 404 Route */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
                    <div className="text-4xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Page introuvable
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Cette page n'existe pas.
                    </p>
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="px-4 py-2 bg-pluqla-red-cherry text-white rounded-lg hover:bg-pluqla-red-deep transition-colors"
                    >
                      Retour à l'accueil
                    </button>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </ApiErrorBoundary>
    </BrowserRouter>
  );
};

export default AppRouter;