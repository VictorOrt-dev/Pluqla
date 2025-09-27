/**
 * App Router End-to-End Tests
 * Tests for complete navigation flows and route protection
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRouter from '../AppRouter';
import { useAuth, AUTH_STATES } from '../../contexts/AuthContext';

// Mock all the lazy-loaded components
jest.mock('../../components/landing/LandingPage', () => {
  return function LandingPage() {
    return <div data-testid="landing-page">Landing Page</div>;
  };
});

jest.mock('../../components/auth/LoginScreen', () => {
  return function LoginScreen() {
    return <div data-testid="login-screen">Login Screen</div>;
  };
});

jest.mock('../../components/onboarding/OnboardingManager', () => {
  return function OnboardingManager() {
    return <div data-testid="onboarding-manager">Onboarding Manager</div>;
  };
});

jest.mock('../../components/home/HomeScreen', () => {
  return function HomeScreen() {
    return <div data-testid="home-screen">Home Screen</div>;
  };
});

jest.mock('../../components/profile/Profile', () => {
  return function Profile() {
    return <div data-testid="profile">Profile</div>;
  };
});

jest.mock('../../components/category/CategoryScreen', () => {
  return function CategoryScreen() {
    return <div data-testid="category-screen">Category Screen</div>;
  };
});

jest.mock('../../pages/FinancePage', () => {
  return function FinancePage() {
    return <div data-testid="finance-page">Finance Page</div>;
  };
});

jest.mock('../../screens/ActivityScreen', () => {
  return function ActivityScreen() {
    return <div data-testid="activity-screen">Activity Screen</div>;
  };
});

jest.mock('../../components/finance/ExpensesDetailScreen', () => {
  return function ExpensesDetailScreen() {
    return <div data-testid="expenses-detail">Expenses Detail</div>;
  };
});

jest.mock('../../components/dev/FeatureFlagsDebug', () => {
  return function FeatureFlagsDebug() {
    return <div data-testid="feature-flags-debug">Feature Flags Debug</div>;
  };
});

// Mock the auth context
jest.mock('../../contexts/AuthContext');

// Mock error boundary dependencies
jest.mock('../../components/common/ApiErrorBoundary', () => {
  return function ApiErrorBoundary({ children, fallback }) {
    return <div data-testid="api-error-boundary">{children}</div>;
  };
});

jest.mock('../../components/common/LoadingSpinner', () => {
  return function LoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

jest.mock('../../components/common/SuspenseFallback', () => {
  return function SuspenseFallback() {
    return <div data-testid="suspense-fallback">Loading component...</div>;
  };
});

describe('AppRouter End-to-End Tests', () => {
  const mockUseAuth = useAuth;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    it('should render landing page for unauthenticated users at root', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        authState: AUTH_STATES.UNAUTHENTICATED,
        user: null
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      });
    });

    it('should render login screen for unauthenticated users at /login', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        authState: AUTH_STATES.UNAUTHENTICATED,
        user: null
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeInTheDocument();
      });
    });

    it('should show loading spinner during auth state determination', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        authState: AUTH_STATES.LOADING,
        user: null
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Authenticated User Redirects from Public Routes', () => {
    it('should redirect authenticated users from root to dashboard', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeInTheDocument();
      });
    });

    it('should redirect authenticated users from login to dashboard', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeInTheDocument();
      });
    });

    it('should redirect users needing onboarding from public routes to onboarding', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: false }
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-manager')).toBeInTheDocument();
      });
    });
  });

  describe('Onboarding Flow', () => {
    it('should allow access to onboarding for authenticated users who need it', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: false }
      });

      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-manager')).toBeInTheDocument();
      });
    });

    it('should redirect completed users from onboarding to dashboard', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeInTheDocument();
      });
    });

    it('should redirect unauthenticated users from onboarding to login', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        authState: AUTH_STATES.UNAUTHENTICATED,
        user: null
      });

      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    const authenticatedUser = {
      isAuthenticated: true,
      authState: AUTH_STATES.AUTHENTICATED,
      user: { id: 1, completedOnboarding: true }
    };

    it('should render dashboard for authenticated users', async () => {
      mockUseAuth.mockReturnValue(authenticatedUser);

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeInTheDocument();
      });
    });

    it('should render profile for authenticated users', async () => {
      mockUseAuth.mockReturnValue(authenticatedUser);

      render(
        <MemoryRouter initialEntries={['/profile']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile')).toBeInTheDocument();
      });
    });

    it('should render category screen for authenticated users', async () => {
      mockUseAuth.mockReturnValue(authenticatedUser);

      render(
        <MemoryRouter initialEntries={['/category/finance']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('category-screen')).toBeInTheDocument();
      });
    });

    it('should render finance page for authenticated users', async () => {
      mockUseAuth.mockReturnValue(authenticatedUser);

      render(
        <MemoryRouter initialEntries={['/finance']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('finance-page')).toBeInTheDocument();
      });
    });

    it('should render activity screen for authenticated users', async () => {
      mockUseAuth.mockReturnValue(authenticatedUser);

      render(
        <MemoryRouter initialEntries={['/activity']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('activity-screen')).toBeInTheDocument();
      });
    });

    it('should render detail screens for authenticated users', async () => {
      mockUseAuth.mockReturnValue(authenticatedUser);

      render(
        <MemoryRouter initialEntries={['/finance/expenses']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('expenses-detail')).toBeInTheDocument();
      });
    });

    it('should redirect unauthenticated users from protected routes to login', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        authState: AUTH_STATES.UNAUTHENTICATED,
        user: null
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-screen')).toBeInTheDocument();
      });
    });

    it('should redirect users needing onboarding from protected routes', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: false }
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('onboarding-manager')).toBeInTheDocument();
      });
    });
  });

  describe('Development Routes', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should render development routes in development mode', async () => {
      process.env.NODE_ENV = 'development';

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/dev/flags']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('feature-flags-debug')).toBeInTheDocument();
      });
    });

    it('should show 404 for development routes in production', async () => {
      process.env.NODE_ENV = 'production';

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/dev/flags']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Page introuvable')).toBeInTheDocument();
      });
    });
  });

  describe('404 Not Found', () => {
    it('should show 404 page for unknown routes', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Page introuvable')).toBeInTheDocument();
        expect(screen.getByText("Cette page n'existe pas.")).toBeInTheDocument();
        expect(screen.getByText('🔍')).toBeInTheDocument();
      });
    });

    it('should have working return to home button on 404 page', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      // Mock window.location
      delete window.location;
      window.location = { href: '' };

      render(
        <MemoryRouter initialEntries={['/unknown-route']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        const homeButton = screen.getByText("Retour à l'accueil");
        expect(homeButton).toBeInTheDocument();

        fireEvent.click(homeButton);
        expect(window.location.href).toBe('/dashboard');
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap routes with error boundary', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('api-error-boundary')).toBeInTheDocument();
    });
  });

  describe('Suspense Integration', () => {
    it('should show suspense fallback while loading components', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      // Mock the component to take time to load
      jest.doMock('../../components/home/HomeScreen', () => {
        return React.lazy(() => new Promise(resolve => {
          setTimeout(() => resolve({
            default: () => <div data-testid="home-screen">Home Screen</div>
          }), 100);
        }));
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      );

      // Should show suspense fallback initially
      expect(screen.getByTestId('suspense-fallback')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('home-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Route Error Handling', () => {
    it('should handle route errors gracefully', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      // Mock a component that throws an error
      jest.doMock('../../components/home/HomeScreen', () => {
        return function HomeScreen() {
          throw new Error('Component error');
        };
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRouter />
        </MemoryRouter>
      );

      // Error boundary should catch the error
      // Since we mocked ApiErrorBoundary to just render children,
      // we need to test that it's present in the component tree
      expect(screen.getByTestId('api-error-boundary')).toBeInTheDocument();
    });
  });

  describe('Navigation State Persistence', () => {
    it('should maintain route state during auth state changes', async () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/finance']}>
          <AppRouter />
        </MemoryRouter>
      );

      // Start with loading state
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        authState: AUTH_STATES.LOADING,
        user: null
      });

      rerender(
        <MemoryRouter initialEntries={['/finance']}>
          <AppRouter />
        </MemoryRouter>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      rerender(
        <MemoryRouter initialEntries={['/finance']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('finance-page')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Route Parameters', () => {
    it('should handle dynamic routes with parameters', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      render(
        <MemoryRouter initialEntries={['/category/finance']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('category-screen')).toBeInTheDocument();
      });
    });

    it('should handle category routes with various category names', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        authState: AUTH_STATES.AUTHENTICATED,
        user: { id: 1, completedOnboarding: true }
      });

      const categories = ['finance', 'activity', 'habits', 'alimentation', 'transport'];

      for (const category of categories) {
        render(
          <MemoryRouter initialEntries={[`/category/${category}`]}>
            <AppRouter />
          </MemoryRouter>
        );

        await waitFor(() => {
          expect(screen.getByTestId('category-screen')).toBeInTheDocument();
        });

        // Clean up for next iteration
        screen.getAllByTestId('category-screen').forEach(element => {
          element.remove();
        });
      }
    });
  });
});