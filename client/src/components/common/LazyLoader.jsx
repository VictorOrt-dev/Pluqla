/**
 * 🚀 Pluqla Lazy Loader Component
 * Performance-optimized lazy loading with premium loading states
 */

import React, { Suspense } from 'react';

const PremiumSpinner = () => (
  <div className="flex items-center justify-center min-h-64 pluqla-font-family">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 pluqla-spinner border-4 border-pluqla-red-primary/20 border-t-pluqla-red-primary rounded-full"></div>
      <p className="pluqla-caption pluqla-text-muted">Chargement...</p>
    </div>
  </div>
);

const PremiumErrorBoundary = ({ children, fallback }) => {
  return (
    <Suspense fallback={fallback || <PremiumSpinner />}>
      {children}
    </Suspense>
  );
};

// Lazy loaded components with performance optimizations
export const LazyFinancialDashboard = React.lazy(() =>
  import('../features/FinancialDashboard').then(module => ({
    default: module.default
  }))
);

export const LazyProfileScreen = React.lazy(() =>
  import('../../screens/ProfileScreen').then(module => ({
    default: module.default
  }))
);

export const LazyActivityScreen = React.lazy(() =>
  import('../../screens/ActivityScreen').then(module => ({
    default: module.default
  }))
);

// HOC for wrapping components with premium loading
export const withPremiumLazy = (Component, customFallback) => {
  return (props) => (
    <PremiumErrorBoundary fallback={customFallback}>
      <Component {...props} />
    </PremiumErrorBoundary>
  );
};

export default PremiumErrorBoundary;