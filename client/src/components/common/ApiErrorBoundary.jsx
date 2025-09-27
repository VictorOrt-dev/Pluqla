/**
 * API Error Boundary for Pluqla
 * Handles API errors with user-friendly messages and recovery options
 * Version: 2.0.0 - Phase 1 Critical Fixes
 */

import React, { Component } from 'react';
import { ERROR_CATEGORIES } from '../../services/api/apiAdapter';
import secureLogger from '../../utils/secureLogger';

class ApiErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log the error (without sensitive data)
    secureLogger.error('API Error Boundary caught error', error, {
      component: this.props.component || 'Unknown',
      errorBoundary: 'ApiErrorBoundary'
    });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  getErrorUI(error) {
    const category = error?.category || ERROR_CATEGORIES.UNKNOWN;
    const isApiError = error?.name === 'ApiError';

    // Base error UI structure
    const baseUI = (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
          <div className="mb-4">
            {this.getErrorIcon(category)}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {this.getErrorTitle(category)}
          </h2>
          <p className="text-gray-600 mb-4">
            {isApiError ? error.message : 'Une erreur inattendue s\'est produite.'}
          </p>
          <div className="space-y-2">
            {this.getActionButtons(category)}
          </div>
        </div>
      </div>
    );

    return baseUI;
  }

  getErrorIcon(category) {
    const iconClass = "w-12 h-12 mx-auto";

    switch (category) {
      case ERROR_CATEGORIES.AUTHENTICATION:
        return (
          <div className={`${iconClass} text-red-500`}>
            🔒
          </div>
        );
      case ERROR_CATEGORIES.RATE_LIMIT:
        return (
          <div className={`${iconClass} text-yellow-500`}>
            ⏳
          </div>
        );
      case ERROR_CATEGORIES.NETWORK_ERROR:
        return (
          <div className={`${iconClass} text-blue-500`}>
            📡
          </div>
        );
      case ERROR_CATEGORIES.SERVER_ERROR:
        return (
          <div className={`${iconClass} text-red-600`}>
            🔧
          </div>
        );
      default:
        return (
          <div className={`${iconClass} text-gray-500`}>
            ⚠️
          </div>
        );
    }
  }

  getErrorTitle(category) {
    switch (category) {
      case ERROR_CATEGORIES.AUTHENTICATION:
        return 'Session expirée';
      case ERROR_CATEGORIES.RATE_LIMIT:
        return 'Veuillez patienter';
      case ERROR_CATEGORIES.NETWORK_ERROR:
        return 'Problème de connexion';
      case ERROR_CATEGORIES.SERVER_ERROR:
        return 'Maintenance en cours';
      default:
        return 'Erreur inattendue';
    }
  }

  getActionButtons(category) {
    const buttonClass = "px-4 py-2 rounded-lg font-medium transition-colors";
    const primaryButtonClass = `${buttonClass} bg-pluqla-red-cherry text-white hover:bg-pluqla-red-deep`;
    const secondaryButtonClass = `${buttonClass} bg-gray-100 text-gray-700 hover:bg-gray-200`;

    switch (category) {
      case ERROR_CATEGORIES.AUTHENTICATION:
        return (
          <>
            <button
              onClick={() => window.location.reload()}
              className={primaryButtonClass}
            >
              Se reconnecter
            </button>
          </>
        );

      case ERROR_CATEGORIES.RATE_LIMIT:
        return (
          <>
            <button
              onClick={this.handleRetry}
              className={secondaryButtonClass}
            >
              Réessayer dans 30s
            </button>
          </>
        );

      case ERROR_CATEGORIES.NETWORK_ERROR:
        return (
          <>
            <button
              onClick={this.handleRetry}
              className={primaryButtonClass}
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className={secondaryButtonClass}
            >
              Actualiser la page
            </button>
          </>
        );

      case ERROR_CATEGORIES.SERVER_ERROR:
        return (
          <>
            <button
              onClick={this.handleRetry}
              className={primaryButtonClass}
            >
              Réessayer
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Nous travaillons sur le problème
            </p>
          </>
        );

      default:
        return (
          <>
            <button
              onClick={this.handleRetry}
              className={primaryButtonClass}
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
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
      // Custom fallback UI for API errors
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return this.getErrorUI(this.state.error);
    }

    return this.props.children;
  }
}

// HOC wrapper for easier use
export const withApiErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const ComponentWithApiErrorBoundary = (props) => (
    <ApiErrorBoundary
      component={WrappedComponent.displayName || WrappedComponent.name}
      {...errorBoundaryProps}
    >
      <WrappedComponent {...props} />
    </ApiErrorBoundary>
  );

  ComponentWithApiErrorBoundary.displayName = `withApiErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithApiErrorBoundary;
};

export default ApiErrorBoundary;