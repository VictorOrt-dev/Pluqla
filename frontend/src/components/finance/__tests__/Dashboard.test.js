import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import Dashboard from '../Dashboard';

// Mock components
jest.mock('../SavingsSummary', () => {
  return function MockSavingsSummary() {
    return <div data-testid="savings-summary">Savings Summary</div>;
  };
});

jest.mock('../ExpensesChart', () => {
  return function MockExpensesChart() {
    return <div data-testid="expenses-chart">Expenses Chart</div>;
  };
});

jest.mock('../IncomeChart', () => {
  return function MockIncomeChart() {
    return <div data-testid="income-chart">Income Chart</div>;
  };
});

jest.mock('../SuggestionsCard', () => {
  return function MockSuggestionsCard() {
    return <div data-testid="suggestions-card">Suggestions Card</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockUserData = {
  savedAmount: 1200,
  monthlyGoal: 800
};

const mockFinancialData = {
  period: 'month',
  totals: {
    expenses: 2500,
    income: 3500,
    netSavings: 1000,
    savingsRate: 28.57,
    currentSavings: 1200,
    monthlyGoal: 800
  },
  expenses: {
    total: 2500,
    count: 25,
    byCategory: [
      { category: 'alimentation', amount: 800, count: 10 },
      { category: 'transport', amount: 500, count: 8 }
    ]
  },
  income: {
    total: 3500,
    sources: [
      { id: '1', name: 'Salaire', type: 'salary', amount: 3000, frequency: 'monthly' },
      { id: '2', name: 'Freelance', type: 'freelance', amount: 500, frequency: 'monthly' }
    ]
  }
};

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.changeLanguage('fr');
    mockLocalStorage.getItem.mockReturnValue('mock-token');

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockFinancialData
      })
    });
  });

  test('renders loading state initially', () => {
    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    expect(screen.getByRole('status')).toBeInTheDocument(); // LoadingSpinner has role="status"
  });

  test('renders dashboard with financial data after loading', async () => {
    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Vue d\'ensemble')).toBeInTheDocument();
      expect(screen.getByTestId('savings-summary')).toBeInTheDocument();
      expect(screen.getByTestId('expenses-chart')).toBeInTheDocument();
      expect(screen.getByTestId('income-chart')).toBeInTheDocument();
      expect(screen.getByTestId('suggestions-card')).toBeInTheDocument();
    });
  });

  test('renders all tab buttons', async () => {
    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Vue d\'ensemble')).toBeInTheDocument();
      expect(screen.getByText('Dépenses')).toBeInTheDocument();
      expect(screen.getByText('Revenus')).toBeInTheDocument();
      expect(screen.getByText('Suggestions')).toBeInTheDocument();
    });
  });

  test('switches between tabs correctly', async () => {
    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Vue d\'ensemble')).toBeInTheDocument();
    });

    // Click on expenses tab
    fireEvent.click(screen.getByText('Dépenses'));

    // Overview components should not be visible, only expenses
    expect(screen.queryByTestId('savings-summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('expenses-chart')).toBeInTheDocument();

    // Click on income tab
    fireEvent.click(screen.getByText('Revenus'));

    // Only income chart should be visible
    expect(screen.queryByTestId('expenses-chart')).not.toBeInTheDocument();
    expect(screen.getByTestId('income-chart')).toBeInTheDocument();

    // Click on suggestions tab
    fireEvent.click(screen.getByText('Suggestions'));

    // Only suggestions should be visible
    expect(screen.queryByTestId('income-chart')).not.toBeInTheDocument();
    expect(screen.getByTestId('suggestions-card')).toBeInTheDocument();
  });

  test('handles fetch error gracefully', async () => {
    const errorMessage = 'Network error';
    fetch.mockRejectedValue(new Error(errorMessage));

    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Réessayer')).toBeInTheDocument();
    });
  });

  test('handles API error response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        message: 'Server error'
      })
    });

    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('HTTP error! status: 500')).toBeInTheDocument();
    });
  });

  test('displays no data message when financial data is null', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: null
      })
    });

    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Aucune donnée financière disponible')).toBeInTheDocument();
    });
  });

  test('makes API call with correct parameters', async () => {
    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/financial/summary?lang=fr&period=month',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  test('handles missing token gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('No authentication token found')).toBeInTheDocument();
    });
  });

  test('applies dark mode classes correctly', async () => {
    const { container } = renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={true} />
    );

    await waitFor(() => {
      const tabNavigation = container.querySelector('nav');
      expect(tabNavigation).toHaveClass('bg-gray-100', 'dark:bg-gray-800');
    });
  });

  test('refetches data when language changes', async () => {
    const { rerender } = renderWithI18n(
      <Dashboard userData={mockUserData} darkMode={false} />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Change language
    i18n.changeLanguage('en');

    rerender(
      <I18nextProvider i18n={i18n}>
        <Dashboard userData={mockUserData} darkMode={false} />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/financial/summary?lang=en&period=month',
        expect.any(Object)
      );
    });
  });
});