import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinancialDashboard from '../FinancialDashboard';

// Mock the chart components
jest.mock('../dashboard/NetWorthCard', () => {
  return function MockNetWorthCard({ data }) {
    return <div data-testid="net-worth-card">Net Worth: {data?.netWorth || 'Loading...'}</div>;
  };
});

jest.mock('../dashboard/AssetAllocationChart', () => {
  return function MockAssetAllocationChart({ data }) {
    return (
      <div data-testid="asset-allocation-chart">
        Assets: {data?.length || 0} items
      </div>
    );
  };
});

jest.mock('../dashboard/NetWorthTrendChart', () => {
  return function MockNetWorthTrendChart({ data }) {
    return (
      <div data-testid="net-worth-trend-chart">
        Trend data: {data?.length || 0} points
      </div>
    );
  };
});

jest.mock('../dashboard/AccountsList', () => {
  return function MockAccountsList({ accounts, onRefresh }) {
    return (
      <div data-testid="accounts-list">
        <div>Accounts: {accounts?.length || 0}</div>
        <button onClick={onRefresh} data-testid="refresh-accounts">
          Refresh
        </button>
      </div>
    );
  };
});

jest.mock('../dashboard/FinancialGoals', () => {
  return function MockFinancialGoals({ goals }) {
    return (
      <div data-testid="financial-goals">
        Goals: {goals?.length || 0}
      </div>
    );
  };
});

jest.mock('../dashboard/FinancialInsights', () => {
  return function MockFinancialInsights({ insights, recommendations }) {
    return (
      <div data-testid="financial-insights">
        <div>Insights: {insights?.length || 0}</div>
        <div>Recommendations: {recommendations?.length || 0}</div>
      </div>
    );
  };
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'fr' }
  })
}));

// Mock navigation context
const mockSetCurrentScreen = jest.fn();
jest.mock('../../../contexts/NavigationContext', () => ({
  useNavigation: () => ({
    setCurrentScreen: mockSetCurrentScreen
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('FinancialDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();

    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(() => 'mock-jwt-token'),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage
    });
  });

  const mockDashboardData = {
    summary: {
      netWorth: 50000,
      totalAssets: 75000,
      totalLiabilities: 25000,
      monthlyIncome: 3500,
      monthlyExpenses: 2800,
      savingsRate: 20
    },
    accounts: [
      {
        id: '1',
        name: 'Compte Courant',
        type: 'checking',
        balance: 1500,
        currency: 'EUR',
        lastSyncAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        name: 'Livret A',
        type: 'savings',
        balance: 10000,
        currency: 'EUR',
        lastSyncAt: '2024-01-15T09:00:00Z'
      }
    ],
    assets: [
      {
        id: '1',
        name: 'Apple Inc.',
        type: 'stock',
        totalValue: 5000,
        currency: 'USD'
      }
    ],
    goals: [
      {
        id: '1',
        name: 'Emergency Fund',
        type: 'emergency_fund',
        targetAmount: 15000,
        currentAmount: 8000,
        progressPercentage: 53.33
      }
    ],
    insights: [
      {
        type: 'spending_analysis',
        title: 'Optimisation des dépenses',
        content: 'Vos dépenses alimentaires sont élevées ce mois-ci.',
        confidence: 0.85,
        priority: 'medium'
      }
    ],
    recommendations: [
      {
        type: 'savings_optimization',
        title: 'Augmentez votre épargne',
        description: 'Considérez augmenter votre épargne mensuelle.',
        impact: 'high',
        effort: 'low'
      }
    ],
    netWorthHistory: [
      { date: '2024-01-01', netWorth: 48000 },
      { date: '2024-01-15', netWorth: 50000 }
    ]
  };

  test('renders loading state initially', () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<FinancialDashboard />);

    expect(screen.getByText('financial.dashboard.loading')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('renders dashboard data successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('net-worth-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('net-worth-card')).toHaveTextContent('Net Worth: 50000');
    expect(screen.getByTestId('asset-allocation-chart')).toHaveTextContent('Assets: 1 items');
    expect(screen.getByTestId('accounts-list')).toHaveTextContent('Accounts: 2');
    expect(screen.getByTestId('financial-goals')).toHaveTextContent('Goals: 1');
    expect(screen.getByTestId('financial-insights')).toHaveTextContent('Insights: 1');
    expect(screen.getByTestId('financial-insights')).toHaveTextContent('Recommendations: 1');
  });

  test('handles API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByText('financial.dashboard.error')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  test('retries loading data when retry button is clicked', async () => {
    // First call fails
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    // Second call succeeds
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    fireEvent.click(screen.getByTestId('retry-button'));

    await waitFor(() => {
      expect(screen.getByTestId('net-worth-card')).toBeInTheDocument();
    });
  });

  test('handles refresh accounts functionality', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('refresh-accounts')).toBeInTheDocument();
    });

    // Mock the refresh API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          ...mockDashboardData,
          accounts: [
            ...mockDashboardData.accounts,
            {
              id: '3',
              name: 'New Account',
              type: 'investment',
              balance: 5000,
              currency: 'EUR'
            }
          ]
        }
      })
    });

    fireEvent.click(screen.getByTestId('refresh-accounts'));

    await waitFor(() => {
      expect(screen.getByTestId('accounts-list')).toHaveTextContent('Accounts: 3');
    });
  });

  test('displays correct language-specific content', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByText('financial.dashboard.title')).toBeInTheDocument();
    });

    // Check that translation keys are being used
    expect(screen.getByText('financial.dashboard.overview')).toBeInTheDocument();
    expect(screen.getByText('financial.dashboard.accounts')).toBeInTheDocument();
    expect(screen.getByText('financial.dashboard.goals')).toBeInTheDocument();
  });

  test('handles unauthorized error by redirecting to login', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: 'UNAUTHORIZED'
      })
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(mockSetCurrentScreen).toHaveBeenCalledWith('login');
    });
  });

  test('handles empty dashboard data', async () => {
    const emptyData = {
      summary: {
        netWorth: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0
      },
      accounts: [],
      assets: [],
      goals: [],
      insights: [],
      recommendations: [],
      netWorthHistory: []
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: emptyData
      })
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('accounts-list')).toHaveTextContent('Accounts: 0');
    });

    expect(screen.getByTestId('financial-goals')).toHaveTextContent('Goals: 0');
    expect(screen.getByTestId('financial-insights')).toHaveTextContent('Insights: 0');
  });

  test('applies correct CSS classes and styling', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('financial-dashboard')).toBeInTheDocument();
    });

    const dashboard = screen.getByTestId('financial-dashboard');
    expect(dashboard).toHaveClass('financial-dashboard');
  });

  test('makes API call with correct parameters', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/financial/dashboard?lang=fr', {
        headers: {
          'Authorization': 'Bearer mock-jwt-token',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  test('handles missing authentication token', async () => {
    // Mock localStorage to return null for token
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }
    });

    render(<FinancialDashboard />);

    await waitFor(() => {
      expect(mockSetCurrentScreen).toHaveBeenCalledWith('login');
    });
  });

  test('updates data when component receives new props', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    const { rerender } = render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('net-worth-card')).toBeInTheDocument();
    });

    // Simulate prop change that would trigger re-fetch
    rerender(<FinancialDashboard key="new-key" />);

    // Should make another API call
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('cleans up resources on unmount', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockDashboardData
      })
    });

    const { unmount } = render(<FinancialDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('net-worth-card')).toBeInTheDocument();
    });

    // Should not throw any errors on unmount
    expect(() => unmount()).not.toThrow();
  });
});