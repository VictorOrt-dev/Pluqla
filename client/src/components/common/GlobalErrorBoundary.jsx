/**
 * Global Error Boundary for Pluqla
 * Comprehensive error handling with recovery options and user feedback
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import React, { Component } from 'react';
import { unifiedApiService } from '../../services/unifiedApiService';
import secureLogger from '../../utils/secureLogger';

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      showDetails: false
    };

    // Generate unique error ID for tracking
    this.errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: this.errorId
    });

    // Log error securely
    secureLogger.error('Global Error Boundary caught error', error, {
      errorId: this.errorId,
      component: this.props.fallbackComponent || 'GlobalErrorBoundary',
      errorBoundary: 'GlobalErrorBoundary',
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Track error analytics (non-blocking)
    this.trackErrorEvent(error, errorInfo);
  }

  /**
   * Track error for analytics (don't let this fail)
   */
  async trackErrorEvent(error, errorInfo) {
    try {
      if (unifiedApiService.isReady()) {
        await unifiedApiService.trackEvent('global_error_boundary_triggered', {
          errorId: this.errorId,
          errorName: error.name,
          errorMessage: error.message.substring(0, 100), // Truncate for privacy
          component: this.props.fallbackComponent || 'Unknown'
        });
      }
    } catch (trackingError) {
      // Ignore tracking errors silently
      console.debug('Error tracking failed:', trackingError);
    }
  }

  /**
   * Handle retry action
   */
  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      showDetails: false
    }));

    // Track retry attempt
    this.trackRetryAttempt();
  };

  /**
   * Track retry attempt
   */
  async trackRetryAttempt() {
    try {
      if (unifiedApiService.isReady()) {
        await unifiedApiService.trackEvent('error_boundary_retry', {
          errorId: this.errorId,
          retryCount: this.state.retryCount + 1
        });
      }
    } catch (error) {
      // Ignore tracking errors
    }
  }

  /**
   * Handle page refresh
   */
  handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Toggle error details
   */
  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  /**
   * Determine error severity and UI
   */
  getErrorSeverity(error) {
    // Critical errors that require immediate attention
    const criticalErrors = [
      'ChunkLoadError',
      'SecurityError',
      'NetworkError'
    ];

    // Warning errors that can be retried
    const warningErrors = [
      'TypeError',
      'ReferenceError',
      'RangeError'
    ];

    if (criticalErrors.includes(error?.name)) {
      return 'critical';
    }

    if (warningErrors.includes(error?.name)) {
      return 'warning';
    }

    return 'error';
  }

  /**
   * Get appropriate error icon
   */
  getErrorIcon(severity) {
    const iconClass = "text-6xl mb-4";

    switch (severity) {
      case 'critical':
        return <div className={`${iconClass} text-red-600`}>🚨</div>;
      case 'warning':
        return <div className={`${iconClass} text-yellow-500`}>⚠️</div>;
      default:
        return <div className={`${iconClass} text-red-500`}>❌</div>;
    }
  }

  /**
   * Get error title based on severity
   */
  getErrorTitle(severity, error) {
    switch (severity) {
      case 'critical':
        return 'Erreur critique';
      case 'warning':
        return 'Problème temporaire';
      default:
        return 'Erreur inattendue';
    }
  }

  /**
   * Get error message based on error type
   */
  getErrorMessage(error, severity) {
    // Specific error messages
    if (error?.name === 'ChunkLoadError') {
      return 'Une mise à jour est disponible. Veuillez actualiser la page.';
    }

    if (error?.name === 'NetworkError') {
      return 'Problème de connexion réseau. Vérifiez votre connexion internet.';
    }

    // Generic messages by severity
    switch (severity) {
      case 'critical':
        return 'Une erreur critique s\'est produite. Veuillez actualiser la page.';
      case 'warning':
        return 'Un problème temporaire est survenu. Vous pouvez réessayer.';
      default:
        return 'Une erreur inattendue s\'est produite dans l\'application.';
    }
  }

  /**
   * Get action buttons based on severity
   */
  getActionButtons(severity, retryCount) {
    const buttonClass = "px-6 py-3 rounded-lg font-medium transition-colors mr-4";
    const primaryButtonClass = `${buttonClass} bg-pluqla-red-cherry text-white hover:bg-pluqla-red-deep`;
    const secondaryButtonClass = `${buttonClass} bg-gray-100 text-gray-700 hover:bg-gray-200`;

    switch (severity) {
      case 'critical':
        return (
          <>
            <button
              onClick={this.handleRefresh}
              className={primaryButtonClass}
            >
              Actualiser la page
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className={secondaryButtonClass}
            >
              Retour à l'accueil
            </button>
          </>
        );

      case 'warning':
        return (
          <>
            <button
              onClick={this.handleRetry}
              className={primaryButtonClass}
              disabled={retryCount >= 3}
            >
              {retryCount >= 3 ? 'Trop de tentatives' : 'Réessayer'}
            </button>
            <button
              onClick={this.handleRefresh}
              className={secondaryButtonClass}
            >
              Actualiser
            </button>
          </>
        );

      default:
        return (
          <>
            <button
              onClick={this.handleRetry}
              className={primaryButtonClass}
              disabled={retryCount >= 2}
            >
              {retryCount >= 2 ? 'Trop de tentatives' : 'Réessayer'}
            </button>
            <button
              onClick={this.handleRefresh}
              className={secondaryButtonClass}
            >
              Actualiser
            </button>
          </>
        );
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, retryCount, showDetails } = this.state;
      const severity = this.getErrorSeverity(error);

      // Custom fallback from props
      if (this.props.fallback) {
        return this.props.fallback(error, this.handleRetry, {
          severity,
          errorId,
          retryCount
        });
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-lg w-full">
            {/* Error Icon */}
            <div className="text-center mb-6">
              {this.getErrorIcon(severity)}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {this.getErrorTitle(severity, error)}
              </h1>
              <p className="text-gray-600 mb-6">
                {this.getErrorMessage(error, severity)}
              </p>
            </div>

            {/* Error ID for support */}
            <div className="text-center mb-6">
              <p className="text-xs text-gray-400">
                ID d'erreur: {errorId}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-gray-400">
                  Tentatives: {retryCount}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center mb-4">
              {this.getActionButtons(severity, retryCount)}
            </div>

            {/* Details Toggle */}
            <div className="text-center">
              <button
                onClick={this.toggleDetails}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
              </button>
            </div>

            {/* Error Details */}
            {showDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Détails techniques:
                </h3>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <strong>Type:</strong> {error?.name || 'Unknown'}
                  </div>
                  <div>
                    <strong>Message:</strong> {error?.message || 'No message'}
                  </div>
                  {process.env.NODE_ENV === 'development' && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {error?.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC wrapper for easier use
 */
export const withGlobalErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const ComponentWithGlobalErrorBoundary = (props) => (
    <GlobalErrorBoundary
      fallbackComponent={WrappedComponent.displayName || WrappedComponent.name}
      {...errorBoundaryProps}
    >
      <WrappedComponent {...props} />
    </GlobalErrorBoundary>
  );

  ComponentWithGlobalErrorBoundary.displayName =
    `withGlobalErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithGlobalErrorBoundary;
};

export default GlobalErrorBoundary;