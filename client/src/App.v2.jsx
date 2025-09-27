/**
 * Main App Component for Pluqla
 * React Router v6 + Clean Architecture
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import React, { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AppRouter from './router/AppRouter';
import ApiErrorBoundary from './components/common/ApiErrorBoundary';
import PWAManager from './components/common/PWAManager';
import Notifications from './components/common/Notifications';
import { useNotifications } from './hooks/useNotifications';

// Styles
import './styles/animations.css';
import './styles/pluqla-theme.css';

/**
 * App Content with Providers
 */
function AppContent() {
  const { notifications, removeNotification } = useNotifications();

  // Set up global error handling
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      // Prevent the default behavior (logging to console)
      event.preventDefault();
    };

    const handleError = (event) => {
      console.error('Global Error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="App">
      {/* PWA Management */}
      <PWAManager />

      {/* Global Notifications */}
      <Notifications
        notifications={notifications}
        onRemove={removeNotification}
      />

      {/* Main Router */}
      <AppRouter />
    </div>
  );
}

/**
 * Main App Component with All Providers
 */
function App() {
  return (
    <ApiErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ApiErrorBoundary>
  );
}

export default App;