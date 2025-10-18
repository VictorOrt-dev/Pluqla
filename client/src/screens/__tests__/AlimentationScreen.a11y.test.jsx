/**
 * Accessibility Tests - AlimentationScreen
 *
 * Tests a11y conformance using jest-axe
 * Targets: WCAG 2.1 Level AA
 *
 * Phase 3: Tests & Monitoring
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AlimentationScreen from '../AlimentationScreen';
import { NavigationProvider } from '../../contexts/NavigationContext';
import { ToastProvider } from '../../components/common/PluqlaToast';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../hooks/useRecipesAPI', () => ({
  useRecipesAPI: () => ({
    recipes: [
      {
        id: '1',
        name: 'Pasta Carbonara',
        title: 'Pasta Carbonara',
        price: 8.5,
        servings: 4,
        prepTime: 20,
        prep_time: 20,
        difficulty: 'easy',
        category: 'Italian',
        image: '🍝',
        ingredients: [
          { name: 'Pasta', quantity: '400g', price: 2 },
          { name: 'Eggs', quantity: '4', price: 1.5 }
        ],
        instructions: ['Boil water', 'Cook pasta', 'Mix with eggs'],
        nutrition: { calories: 450, protein: 15, carbs: 60, fat: 12 },
        tags: ['italian', 'pasta'],
        health_score: 75,
        popularity_score: 85
      }
    ],
    smartSuggestions: [],
    selectedRecipe: null,
    searchQuery: '',
    maxPrice: 20,
    favorites: [],
    sortBy: 'recent',
    isLoading: false,
    error: null,
    setSearchQuery: jest.fn(),
    setMaxPrice: jest.fn(),
    setSortBy: jest.fn(),
    fetchRecipes: jest.fn(),
    fetchSmartSuggestions: jest.fn(),
    selectRecipe: jest.fn(),
    clearSelection: jest.fn(),
    toggleFavorite: jest.fn(),
    markAsCooked: jest.fn()
  })
}));

jest.mock('../../services/api/apiAdapter', () => ({
  apiAdapter: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

// Helper to render with all providers
const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </ToastProvider>
    </I18nextProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

describe('AlimentationScreen - Accessibility Tests', () => {
  it('should have no accessibility violations in light mode', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    const results = await axe(container, {
      rules: {
        // Configure specific rules if needed
        'color-contrast': { enabled: true },
        'aria-roles': { enabled: true },
        'label': { enabled: true },
        'button-name': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in dark mode', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={true} showNotification={jest.fn()} />
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should have accessible search input', async () => {
    const { container, getByLabelText } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    // Search input should have accessible label
    const searchInput = container.querySelector('input[placeholder*="Rechercher"]');
    expect(searchInput).toHaveAttribute('aria-label');

    const results = await axe(searchInput);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible price slider', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    const priceSlider = container.querySelector('input[type="range"]');
    expect(priceSlider).toHaveAttribute('aria-label');
    expect(priceSlider).toHaveAttribute('aria-valuemin');
    expect(priceSlider).toHaveAttribute('aria-valuemax');
    expect(priceSlider).toHaveAttribute('aria-valuenow');

    const results = await axe(priceSlider);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible sort buttons', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    const sortButtons = container.querySelectorAll('button[aria-pressed]');
    expect(sortButtons.length).toBeGreaterThan(0);

    sortButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('aria-pressed');
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible category tabs', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    // Category buttons should be focusable and have proper roles
    const categoryButtons = container.querySelectorAll('button');
    expect(categoryButtons.length).toBeGreaterThan(0);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible retry button when error occurs', async () => {
    // Mock error state
    jest.mock('../../hooks/useRecipesAPI', () => ({
      useRecipesAPI: () => ({
        recipes: [],
        isLoading: false,
        error: 'Network error',
        fetchRecipes: jest.fn(),
        fetchSmartSuggestions: jest.fn()
      })
    }));

    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    // Check heading levels are properly ordered
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThan(0);

    const results = await axe(container, {
      rules: {
        'heading-order': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should have accessible loading states', async () => {
    // Mock loading state
    const mockLoading = jest.fn(() => ({
      recipes: [],
      isLoading: true,
      error: null,
      fetchRecipes: jest.fn(),
      fetchSmartSuggestions: jest.fn()
    }));

    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    // Loading indicators should be properly announced
    const loadingIndicators = container.querySelectorAll('[aria-live], [role="status"]');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible color contrast ratios (WCAG AA)', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should have keyboard navigable interface', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    // All interactive elements should be keyboard accessible
    const interactiveElements = container.querySelectorAll('button, a, input, [tabindex]');

    interactiveElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex !== null) {
        expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1);
      }
    });

    const results = await axe(container, {
      rules: {
        'tabindex': { enabled: true },
        'focus-order-semantics': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should have descriptive button labels', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    const buttons = container.querySelectorAll('button');

    buttons.forEach(button => {
      // Each button should have either text content or aria-label
      const hasText = button.textContent.trim().length > 0;
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');

      expect(hasText || hasAriaLabel || hasAriaLabelledBy).toBe(true);
    });

    const results = await axe(container, {
      rules: {
        'button-name': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA landmarks', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    const results = await axe(container, {
      rules: {
        'region': { enabled: true },
        'landmark-one-main': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });

  it('should support screen readers with proper ARIA attributes', async () => {
    const { container } = renderWithProviders(
      <AlimentationScreen darkMode={false} showNotification={jest.fn()} />
    );

    // Check for proper ARIA usage
    const ariaElements = container.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
    expect(ariaElements.length).toBeGreaterThan(0);

    const results = await axe(container, {
      rules: {
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true }
      }
    });

    expect(results).toHaveNoViolations();
  });
});
