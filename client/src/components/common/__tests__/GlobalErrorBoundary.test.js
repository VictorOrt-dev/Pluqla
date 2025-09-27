/**
 * Global Error Boundary Tests
 * Tests for comprehensive error handling with recovery options
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalErrorBoundary, { withGlobalErrorBoundary } from '../GlobalErrorBoundary';
import { unifiedApiService } from '../../../services/unifiedApiService';
import secureLogger from '../../../utils/secureLogger';

// Mock dependencies
jest.mock('../../../services/unifiedApiService');
jest.mock('../../../utils/secureLogger');

// Test component that throws an error
const ThrowError = ({ shouldThrow = false, errorType = 'TypeError' }) => {
  if (shouldThrow) {
    const error = new Error('Test error message');
    error.name = errorType;
    throw error;
  }
  return <div>No error</div>;
};

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.debug = jest.fn();
    unifiedApiService.isReady = jest.fn().mockReturnValue(true);
    unifiedApiService.trackEvent = jest.fn().mockResolvedValue(undefined);

    // Mock window.location
    delete window.location;
    window.location = {
      reload: jest.fn(),
      href: ''
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.debug = originalConsoleDebug;
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={false} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should not interfere with normal component operation', () => {
      const TestComponent = () => <div data-testid="test">Working component</div>;

      render(
        <GlobalErrorBoundary>
          <TestComponent />
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('test')).toBeInTheDocument();
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });

  describe('Error Catching and Display', () => {
    it('should catch and display error when component throws', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Problème temporaire')).toBeInTheDocument();
      expect(screen.getByText(/Un problème temporaire est survenu/)).toBeInTheDocument();
      expect(screen.getByText(/ID d'erreur:/)).toBeInTheDocument();
    });

    it('should log error with secure logger', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      expect(secureLogger.error).toHaveBeenCalledWith(
        'Global Error Boundary caught error',
        expect.any(Error),
        expect.objectContaining({
          errorId: expect.stringMatching(/^err_\d+_[a-z0-9]+$/),
          component: 'GlobalErrorBoundary',
          errorBoundary: 'GlobalErrorBoundary',
          stack: expect.any(String),
          componentStack: expect.any(String)
        })
      );
    });

    it('should track error analytics when service is ready', async () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="ChunkLoadError" />
        </GlobalErrorBoundary>
      );

      await waitFor(() => {
        expect(unifiedApiService.trackEvent).toHaveBeenCalledWith(
          'global_error_boundary_triggered',
          expect.objectContaining({
            errorId: expect.stringMatching(/^err_\d+_[a-z0-9]+$/),
            errorName: 'ChunkLoadError',
            errorMessage: 'Test error message',
            component: 'GlobalErrorBoundary'
          })
        );
      });
    });

    it('should not break when analytics tracking fails', async () => {
      unifiedApiService.trackEvent.mockRejectedValue(new Error('Analytics error'));

      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </GlobalErrorBoundary>
      );

      // Should still render error UI
      expect(screen.getByText('Problème temporaire')).toBeInTheDocument();

      await waitFor(() => {
        expect(console.debug).toHaveBeenCalledWith(
          'Error tracking failed:',
          expect.any(Error)
        );
      });
    });
  });

  describe('Error Severity Classification', () => {
    it('should classify ChunkLoadError as critical', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="ChunkLoadError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Erreur critique')).toBeInTheDocument();
      expect(screen.getByText(/Une mise à jour est disponible/)).toBeInTheDocument();
      expect(screen.getByText('🚨')).toBeInTheDocument();
    });

    it('should classify SecurityError as critical', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="SecurityError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Erreur critique')).toBeInTheDocument();
      expect(screen.getByText('🚨')).toBeInTheDocument();
    });

    it('should classify NetworkError as critical', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="NetworkError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Erreur critique')).toBeInTheDocument();
      expect(screen.getByText(/Problème de connexion réseau/)).toBeInTheDocument();
    });

    it('should classify TypeError as warning', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Problème temporaire')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should classify ReferenceError as warning', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="ReferenceError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Problème temporaire')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should classify unknown errors as generic error', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="CustomError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Erreur inattendue')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
    });
  });

  describe('Action Buttons Based on Severity', () => {
    it('should show refresh and home buttons for critical errors', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="ChunkLoadError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Actualiser la page')).toBeInTheDocument();
      expect(screen.getByText("Retour à l'accueil")).toBeInTheDocument();
    });

    it('should show retry and refresh buttons for warning errors', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Réessayer')).toBeInTheDocument();
      expect(screen.getByText('Actualiser')).toBeInTheDocument();
    });

    it('should show retry and refresh buttons for generic errors', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="CustomError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Réessayer')).toBeInTheDocument();
      expect(screen.getByText('Actualiser')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle refresh button click', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="ChunkLoadError" />
        </GlobalErrorBoundary>
      );

      const refreshButton = screen.getByText('Actualiser la page');
      fireEvent.click(refreshButton);

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should handle home navigation', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="ChunkLoadError" />
        </GlobalErrorBoundary>
      );

      const homeButton = screen.getByText("Retour à l'accueil");
      fireEvent.click(homeButton);

      expect(window.location.href).toBe('/dashboard');
    });

    it('should handle retry button click', () => {
      const { rerender } = render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const retryButton = screen.getByText('Réessayer');
      fireEvent.click(retryButton);

      // Component should recover
      rerender(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={false} />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should disable retry button after maximum attempts', () => {
      const { rerender } = render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      // Click retry multiple times
      const retryButton = screen.getByText('Réessayer');
      fireEvent.click(retryButton);

      rerender(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      fireEvent.click(screen.getByText('Réessayer'));

      rerender(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      fireEvent.click(screen.getByText('Réessayer'));

      rerender(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByText('Trop de tentatives')).toBeInTheDocument();
      expect(screen.getByText('Trop de tentatives')).toBeDisabled();
    });

    it('should track retry attempts', async () => {
      const { rerender } = render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const retryButton = screen.getByText('Réessayer');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(unifiedApiService.trackEvent).toHaveBeenCalledWith(
          'error_boundary_retry',
          expect.objectContaining({
            errorId: expect.any(String),
            retryCount: 1
          })
        );
      });
    });

    it('should toggle error details', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      // Initially details should be hidden
      expect(screen.queryByText('Détails techniques:')).not.toBeInTheDocument();

      const toggleButton = screen.getByText('Afficher les détails');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Détails techniques:')).toBeInTheDocument();
      expect(screen.getByText('Masquer les détails')).toBeInTheDocument();
    });

    it('should show error details when expanded', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const toggleButton = screen.getByText('Afficher les détails');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Type:')).toBeInTheDocument();
      expect(screen.getByText('TypeError')).toBeInTheDocument();
      expect(screen.getByText('Message:')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback Support', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = (error, retry, metadata) => (
        <div data-testid="custom-fallback">
          Custom Error: {error.message}
          <button onClick={retry}>Custom Retry</button>
          <span>Severity: {metadata.severity}</span>
        </div>
      );

      render(
        <GlobalErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error: Test error message')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();
      expect(screen.getByText('Severity: warning')).toBeInTheDocument();
    });
  });

  describe('HOC withGlobalErrorBoundary', () => {
    it('should wrap component with error boundary', () => {
      const TestComponent = () => <div>Wrapped Component</div>;
      const WrappedComponent = withGlobalErrorBoundary(TestComponent);

      render(<WrappedComponent />);

      expect(screen.getByText('Wrapped Component')).toBeInTheDocument();
    });

    it('should set correct display name', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';

      const WrappedComponent = withGlobalErrorBoundary(TestComponent);

      expect(WrappedComponent.displayName).toBe('withGlobalErrorBoundary(TestComponent)');
    });

    it('should handle errors in wrapped component', () => {
      const WrappedComponent = withGlobalErrorBoundary(ThrowError);

      render(<WrappedComponent shouldThrow={true} errorType="TypeError" />);

      expect(screen.getByText('Problème temporaire')).toBeInTheDocument();
    });

    it('should pass through props to wrapped component', () => {
      const TestComponent = ({ message }) => <div>{message}</div>;
      const WrappedComponent = withGlobalErrorBoundary(TestComponent);

      render(<WrappedComponent message="Hello World" />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('Error ID Generation', () => {
    it('should generate unique error IDs', () => {
      const { rerender } = render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const firstErrorId = screen.getByText(/ID d'erreur:/).textContent;

      // Retry to get a new error
      fireEvent.click(screen.getByText('Réessayer'));

      rerender(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const secondErrorId = screen.getByText(/ID d'erreur:/).textContent;

      expect(firstErrorId).not.toBe(secondErrorId);
    });

    it('should format error ID correctly', () => {
      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const errorIdElement = screen.getByText(/ID d'erreur:/);
      const errorIdText = errorIdElement.textContent.replace('ID d\'erreur: ', '');

      expect(errorIdText).toMatch(/^err_\d+_[a-z0-9]{9}$/);
    });
  });

  describe('Development vs Production', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const toggleButton = screen.getByText('Afficher les détails');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Stack:')).toBeInTheDocument();
    });

    it('should hide stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <GlobalErrorBoundary>
          <ThrowError shouldThrow={true} errorType="TypeError" />
        </GlobalErrorBoundary>
      );

      const toggleButton = screen.getByText('Afficher les détails');
      fireEvent.click(toggleButton);

      expect(screen.queryByText('Stack:')).not.toBeInTheDocument();
    });
  });
});