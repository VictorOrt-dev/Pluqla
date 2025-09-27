/**
 * Navigation Utilities Tests
 * Tests for React Router v6 navigation helpers
 * Version: 2.0.0 - Phase 2 Stabilization
 */

import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAppNavigation, ROUTES, ROUTE_META, useRouteMetadata, usePageTitle } from '../navigation';

// Mock React Router hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
  useParams: jest.fn()
}));

const mockNavigate = jest.fn();
const mockLocation = {
  pathname: '/dashboard',
  search: '?tab=overview',
  hash: '',
  state: null,
  key: 'default'
};
const mockParams = { categoryName: 'finance' };

describe('Navigation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
    require('react-router-dom').useLocation.mockReturnValue(mockLocation);
    require('react-router-dom').useParams.mockReturnValue(mockParams);

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: { length: 3 },
      writable: true
    });
  });

  describe('useAppNavigation Hook', () => {
    let result;

    beforeEach(() => {
      const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;
      const { result: hookResult } = renderHook(() => useAppNavigation(), { wrapper });
      result = hookResult;
    });

    it('should provide core navigation objects', () => {
      expect(result.current.navigate).toBe(mockNavigate);
      expect(result.current.location).toBe(mockLocation);
      expect(result.current.params).toBe(mockParams);
    });

    describe('Helper Navigation Methods', () => {
      it('should navigate to dashboard', () => {
        act(() => {
          result.current.goToDashboard();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });

      it('should navigate to profile', () => {
        act(() => {
          result.current.goToProfile();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
      });

      it('should navigate to login', () => {
        act(() => {
          result.current.goToLogin();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      it('should navigate to onboarding', () => {
        act(() => {
          result.current.goToOnboarding();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
      });

      it('should navigate to category with parameter', () => {
        act(() => {
          result.current.goToCategory('finance');
        });
        expect(mockNavigate).toHaveBeenCalledWith('/category/finance');
      });

      it('should navigate to feature screens', () => {
        act(() => {
          result.current.goToFinance();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/finance');

        act(() => {
          result.current.goToActivity();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/activity');

        act(() => {
          result.current.goToHabits();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/habits');
      });

      it('should navigate to detail screens', () => {
        act(() => {
          result.current.goToExpenses();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/finance/expenses');

        act(() => {
          result.current.goToIncome();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/finance/income');

        act(() => {
          result.current.goToSuggestions();
        });
        expect(mockNavigate).toHaveBeenCalledWith('/finance/suggestions');
      });
    });

    describe('Navigation State Methods', () => {
      it('should check if can go back', () => {
        expect(result.current.canGoBack()).toBe(true);

        // Mock history with length 1
        Object.defineProperty(window, 'history', {
          value: { length: 1 },
          writable: true
        });

        expect(result.current.canGoBack()).toBe(false);
      });

      it('should go back', () => {
        act(() => {
          result.current.goBack();
        });
        expect(mockNavigate).toHaveBeenCalledWith(-1);
      });

      it('should go forward', () => {
        act(() => {
          result.current.goForward();
        });
        expect(mockNavigate).toHaveBeenCalledWith(1);
      });
    });

    describe('Route Helper Methods', () => {
      it('should get current route', () => {
        expect(result.current.getCurrentRoute()).toBe('/dashboard');
      });

      it('should check if on specific route', () => {
        expect(result.current.isOnRoute('/dashboard')).toBe(true);
        expect(result.current.isOnRoute('/profile')).toBe(false);
      });

      it('should check route patterns', () => {
        expect(result.current.isOnRoutePattern('/dash')).toBe(true);
        expect(result.current.isOnRoutePattern('/profile')).toBe(false);
      });
    });

    describe('Query Parameters', () => {
      it('should get query parameter', () => {
        expect(result.current.getQueryParam('tab')).toBe('overview');
        expect(result.current.getQueryParam('missing')).toBeNull();
      });

      it('should set query parameters', () => {
        act(() => {
          result.current.setQueryParams({ filter: 'active', sort: 'date' });
        });

        expect(mockNavigate).toHaveBeenCalledWith({
          pathname: '/dashboard',
          search: 'tab=overview&filter=active&sort=date'
        });
      });

      it('should remove query parameters when value is null', () => {
        act(() => {
          result.current.setQueryParams({ tab: null, new: 'value' });
        });

        expect(mockNavigate).toHaveBeenCalledWith({
          pathname: '/dashboard',
          search: 'new=value'
        });
      });
    });

    describe('Advanced Navigation', () => {
      it('should navigate with state', () => {
        const state = { from: '/profile' };

        act(() => {
          result.current.navigateWithState('/dashboard', state);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { state });
      });

      it('should replace route', () => {
        act(() => {
          result.current.replaceRoute('/login');
        });

        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    describe('Route Validation', () => {
      it('should validate exact routes', () => {
        expect(result.current.isValidRoute('/')).toBe(true);
        expect(result.current.isValidRoute('/login')).toBe(true);
        expect(result.current.isValidRoute('/dashboard')).toBe(true);
        expect(result.current.isValidRoute('/invalid')).toBe(false);
      });

      it('should validate category routes', () => {
        expect(result.current.isValidRoute('/category/finance')).toBe(true);
        expect(result.current.isValidRoute('/category/activity')).toBe(true);
        expect(result.current.isValidRoute('/category/')).toBe(false);
      });

      it('should validate development routes in development', () => {
        const originalEnv = process.env.NODE_ENV;

        process.env.NODE_ENV = 'development';
        expect(result.current.isValidRoute('/dev/flags')).toBe(true);

        process.env.NODE_ENV = 'production';
        expect(result.current.isValidRoute('/dev/flags')).toBe(false);

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('ROUTES Constants', () => {
    it('should have all required route constants', () => {
      expect(ROUTES.HOME).toBe('/');
      expect(ROUTES.LOGIN).toBe('/login');
      expect(ROUTES.DASHBOARD).toBe('/dashboard');
      expect(ROUTES.PROFILE).toBe('/profile');
      expect(ROUTES.FINANCE).toBe('/finance');
      expect(ROUTES.ACTIVITY).toBe('/activity');
      expect(ROUTES.HABITS).toBe('/habits');
      expect(ROUTES.ALIMENTATION).toBe('/alimentation');
      expect(ROUTES.TRANSPORT).toBe('/transport');
    });

    it('should have dynamic route functions', () => {
      expect(ROUTES.CATEGORY('finance')).toBe('/category/finance');
      expect(ROUTES.CATEGORY('activity')).toBe('/category/activity');
    });

    it('should have detail routes', () => {
      expect(ROUTES.EXPENSES).toBe('/finance/expenses');
      expect(ROUTES.INCOME).toBe('/finance/income');
      expect(ROUTES.SUGGESTIONS).toBe('/finance/suggestions');
      expect(ROUTES.PROGRESSION).toBe('/progression');
    });
  });

  describe('ROUTE_META', () => {
    it('should have metadata for all routes', () => {
      expect(ROUTE_META[ROUTES.HOME]).toEqual({
        title: 'Pluqla - Économies Intelligentes',
        breadcrumb: 'Accueil',
        requiresAuth: false
      });

      expect(ROUTE_META[ROUTES.DASHBOARD]).toEqual({
        title: 'Tableau de bord - Pluqla',
        breadcrumb: 'Tableau de bord',
        requiresAuth: true
      });

      expect(ROUTE_META[ROUTES.FINANCE]).toEqual({
        title: 'Finance - Pluqla',
        breadcrumb: 'Finance',
        requiresAuth: true
      });
    });

    it('should have auth requirements correctly set', () => {
      expect(ROUTE_META[ROUTES.HOME].requiresAuth).toBe(false);
      expect(ROUTE_META[ROUTES.LOGIN].requiresAuth).toBe(false);
      expect(ROUTE_META[ROUTES.DASHBOARD].requiresAuth).toBe(true);
      expect(ROUTE_META[ROUTES.PROFILE].requiresAuth).toBe(true);
    });
  });

  describe('useRouteMetadata Hook', () => {
    it('should return metadata for current route', () => {
      const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;
      const { result } = renderHook(() => useRouteMetadata(), { wrapper });

      expect(result.current).toEqual({
        title: 'Tableau de bord - Pluqla',
        breadcrumb: 'Tableau de bord',
        requiresAuth: true
      });
    });

    it('should return default metadata for unknown routes', () => {
      require('react-router-dom').useLocation.mockReturnValue({
        pathname: '/unknown-route'
      });

      const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;
      const { result } = renderHook(() => useRouteMetadata(), { wrapper });

      expect(result.current).toEqual({
        title: 'Pluqla',
        breadcrumb: 'Page',
        requiresAuth: true
      });
    });
  });

  describe('usePageTitle Hook', () => {
    const originalTitle = document.title;

    afterEach(() => {
      document.title = originalTitle;
    });

    it('should set document title based on route metadata', () => {
      const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;
      const { result } = renderHook(() => usePageTitle(), { wrapper });

      expect(document.title).toBe('Tableau de bord - Pluqla');
      expect(result.current).toEqual({
        title: 'Tableau de bord - Pluqla',
        breadcrumb: 'Tableau de bord',
        requiresAuth: true
      });
    });

    it('should update title when route changes', () => {
      require('react-router-dom').useLocation.mockReturnValue({
        pathname: '/profile'
      });

      const wrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;
      renderHook(() => usePageTitle(), { wrapper });

      expect(document.title).toBe('Profil - Pluqla');
    });
  });
});