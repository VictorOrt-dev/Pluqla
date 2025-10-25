/**
 * React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree and displays
 * a fallback UI instead of crashing the entire application.
 *
 * CRITICAL for fintech apps to prevent data loss and maintain user trust.
 *
 * ✨ Phase 8 - Integrated with Sentry for error tracking and monitoring
 */

import React from 'react';
import secureLogger from '../../utils/secureLogger';

// ✨ Phase 8 - Sentry integration (lazy loaded to avoid errors if not installed)
let Sentry = null;
try {
  Sentry = require('@sentry/react');
} catch (error) {
  console.warn('Sentry not installed - error tracking disabled');
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // SECURITY: Use secure logging (no sensitive data)
    secureLogger.error('React Error Boundary caught error', {
      errorId,
      message: error.message,
      stack: error.stack?.substring(0, 500), // Truncate stack trace
      componentStack: errorInfo.componentStack?.substring(0, 300),
      props: this.props.name || 'UnnamedComponent',
      timestamp: new Date().toISOString(),
      url: window.location.pathname
    });

    // ✨ Phase 8 - Report to Sentry if available
    if (Sentry) {
      Sentry.withScope((scope) => {
        scope.setContext('errorBoundary', {
          componentName: this.props.name || 'UnnamedComponent',
          critical: this.props.critical || false,
          errorId,
        });
        scope.setContext('component', {
          stack: errorInfo.componentStack?.substring(0, 500),
        });
        scope.setLevel(this.props.critical ? 'error' : 'warning');
        scope.setTag('errorBoundary', this.props.name || 'UnnamedComponent');
        Sentry.captureException(error);
      });
    }

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Report critical errors to analytics
    if (this.props.critical) {
      this.reportCriticalError(error, errorInfo, errorId);
    }
  }

  reportCriticalError = async (error, errorInfo, errorId) => {
    try {
      // Report critical errors to backend for monitoring
      await fetch('/api/analytics/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'react_error_boundary',
          errorId,
          message: error.message,
          component: this.props.name,
          level: 'critical',
          metadata: {
            pathname: window.location.pathname,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (reportError) {
      secureLogger.error('Failed to report critical error', { reportError: reportError.message });
    }
  };

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    secureLogger.info('User retried after error boundary', {
      component: this.props.name,
      errorId: this.state.errorId
    });
  };

  handleReload = () => {
    secureLogger.info('User reloaded page after error', {
      component: this.props.name,
      errorId: this.state.errorId
    });
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI based on error type
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorId, this.handleRetry);
      }

      // Enhanced default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>

            <h1 className="text-2xl font-bold mb-4 text-red-600">
              {this.props.title || 'Oups, quelque chose s\'est mal passé'}
            </h1>

            <p className="mb-6 text-gray-600 leading-relaxed">
              {this.props.critical
                ? 'Une erreur critique s\'est produite. Vos données sont sécurisées.'
                : 'Une erreur s\'est produite dans cette section de l\'application.'
              }
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left bg-gray-50 p-4 rounded-lg border">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Détails techniques (développement)
                </summary>
                <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-40">
                  <strong>Erreur:</strong> {this.state.error.message}\n
                  {this.state.error.stack && (
                    <><strong>Stack:</strong> {this.state.error.stack.substring(0, 500)}...</>
                  )}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Réessayer
              </button>

              {this.props.critical && (
                <button
                  onClick={this.handleReload}
                  className="px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Recharger la page
                </button>
              )}
            </div>

            {this.state.errorId && (
              <p className="mt-4 text-xs text-gray-400 font-mono">
                ID d'erreur: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized Error Boundaries for different contexts

/**
 * Financial Error Boundary - For finance-related components
 */
export const FinancialErrorBoundary = ({ children, componentName }) => (
  <ErrorBoundary
    name={`Financial_${componentName}`}
    title="Erreur dans le module financier"
    critical={true}
    fallback={(error, errorId, retry) => (
      <div className="min-h-64 flex items-center justify-center bg-red-50 rounded-xl m-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-4xl mb-3">💰</div>
          <h2 className="text-xl font-bold mb-3 text-red-600">Erreur du module financier</h2>
          <p className="mb-4 text-gray-600 text-sm leading-relaxed">
            Une erreur s'est produite lors du chargement de vos données financières.
            Vos informations sont sécurisées et aucune donnée n'a été perdue.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={retry}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Recharger le module
            </button>
            <button
              onClick={() => window.location.href = '/finance'}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
            >
              Retour aux finances
            </button>
          </div>
          {errorId && <p className="mt-3 text-xs text-gray-400 font-mono">ID: {errorId}</p>}
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Auth Error Boundary - For authentication-related components
 */
export const AuthErrorBoundary = ({ children }) => (
  <ErrorBoundary
    name="Authentication"
    title="Erreur d'authentification"
    critical={true}
    fallback={(error, errorId, retry) => (
      <div className="min-h-64 flex items-center justify-center bg-blue-50 rounded-xl m-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-bold mb-3 text-blue-600">Erreur d'authentification</h2>
          <p className="mb-4 text-gray-600 text-sm leading-relaxed">
            Une erreur s'est produite lors de l'authentification.
            Veuillez vous reconnecter pour continuer.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Se reconnecter
            </button>
            <button
              onClick={retry}
              className="px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              Réessayer
            </button>
          </div>
          {errorId && <p className="mt-3 text-xs text-gray-400 font-mono">ID: {errorId}</p>}
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

/**
 * ✨ Phase 8 - Alimentation Error Boundary
 * For food/recipe-related components
 */
export const AlimentationErrorBoundary = ({ children, componentName }) => (
  <ErrorBoundary
    name={`Alimentation_${componentName || 'Component'}`}
    title="Erreur du module alimentation"
    critical={false}
    fallback={(error, errorId, retry) => (
      <div className="min-h-64 flex items-center justify-center bg-green-50 rounded-xl m-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <h2 className="text-xl font-bold mb-3 text-green-600">Erreur du module alimentation</h2>
          <p className="mb-4 text-gray-600 text-sm leading-relaxed">
            Une erreur s'est produite lors du chargement des recettes et suggestions.
            Vos favoris et données sont sauvegardés.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={retry}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
            >
              Recharger les recettes
            </button>
            <button
              onClick={() => window.location.href = '/alimentation'}
              className="px-4 py-2 border border-green-500 text-green-500 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
            >
              Retour à l'alimentation
            </button>
          </div>
          {errorId && <p className="mt-3 text-xs text-gray-400 font-mono">ID: {errorId}</p>}
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;