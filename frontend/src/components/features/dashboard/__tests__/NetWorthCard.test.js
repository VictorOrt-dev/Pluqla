import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NetWorthCard from '../NetWorthCard';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && options.value !== undefined) {
        return `${key}: ${options.value}`;
      }
      return key;
    },
    i18n: { language: 'fr' }
  })
}));

describe('NetWorthCard', () => {
  const mockData = {
    netWorth: 50000,
    totalAssets: 75000,
    totalLiabilities: 25000,
    monthlyIncome: 3500,
    monthlyExpenses: 2800,
    savingsRate: 20
  };

  test('renders net worth data correctly', () => {
    render(<NetWorthCard data={mockData} />);

    expect(screen.getByText('financial.dashboard.netWorth')).toBeInTheDocument();
    expect(screen.getByText('50 000 €')).toBeInTheDocument();
    expect(screen.getByText('75 000 €')).toBeInTheDocument(); // Total assets
    expect(screen.getByText('25 000 €')).toBeInTheDocument(); // Total liabilities
  });

  test('calculates and displays financial health score', () => {
    render(<NetWorthCard data={mockData} />);

    // Health score should be calculated based on various factors
    const healthIndicator = screen.getByTestId('health-score');
    expect(healthIndicator).toBeInTheDocument();

    // With 20% savings rate and positive net worth, should show good health
    expect(screen.getByText(/financial.dashboard.healthScore.good/)).toBeInTheDocument();
  });

  test('displays savings rate correctly', () => {
    render(<NetWorthCard data={mockData} />);

    expect(screen.getByText('financial.dashboard.savingsRate: 20')).toBeInTheDocument();
  });

  test('handles zero or negative net worth', () => {
    const negativeData = {
      ...mockData,
      netWorth: -5000,
      totalAssets: 20000,
      totalLiabilities: 25000
    };

    render(<NetWorthCard data={negativeData} />);

    expect(screen.getByText('-5 000 €')).toBeInTheDocument();
    expect(screen.getByTestId('negative-net-worth')).toBeInTheDocument();
  });

  test('handles missing or undefined data', () => {
    render(<NetWorthCard data={null} />);

    expect(screen.getByText('financial.dashboard.loading')).toBeInTheDocument();
  });

  test('handles partial data gracefully', () => {
    const partialData = {
      netWorth: 30000,
      totalAssets: 40000
      // Missing other fields
    };

    render(<NetWorthCard data={partialData} />);

    expect(screen.getByText('30 000 €')).toBeInTheDocument();
    expect(screen.getByText('40 000 €')).toBeInTheDocument();
  });

  test('displays correct currency formatting', () => {
    const usdData = {
      ...mockData,
      currency: 'USD'
    };

    render(<NetWorthCard data={usdData} currency="USD" />);

    // Should format in USD when currency prop is provided
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });

  test('shows appropriate health indicators', () => {
    // Test excellent health (high savings rate, high net worth)
    const excellentData = {
      netWorth: 100000,
      totalAssets: 120000,
      totalLiabilities: 20000,
      monthlyIncome: 5000,
      monthlyExpenses: 3000,
      savingsRate: 40
    };

    render(<NetWorthCard data={excellentData} />);
    expect(screen.getByTestId('health-excellent')).toBeInTheDocument();
  });

  test('shows warning indicators for poor financial health', () => {
    const poorData = {
      netWorth: 1000,
      totalAssets: 5000,
      totalLiabilities: 4000,
      monthlyIncome: 2000,
      monthlyExpenses: 2100,
      savingsRate: -5 // Negative savings rate
    };

    render(<NetWorthCard data={poorData} />);
    expect(screen.getByTestId('health-poor')).toBeInTheDocument();
  });

  test('calculates debt-to-asset ratio correctly', () => {
    render(<NetWorthCard data={mockData} />);

    // Debt to asset ratio should be 25000/75000 = 33.33%
    expect(screen.getByText(/33\.3%/)).toBeInTheDocument();
  });

  test('handles very large numbers correctly', () => {
    const largeData = {
      netWorth: 1500000,
      totalAssets: 2000000,
      totalLiabilities: 500000,
      monthlyIncome: 15000,
      monthlyExpenses: 8000,
      savingsRate: 47
    };

    render(<NetWorthCard data={largeData} />);

    expect(screen.getByText('1 500 000 €')).toBeInTheDocument();
  });

  test('shows trend indicators when available', () => {
    const dataWithTrend = {
      ...mockData,
      trend: {
        direction: 'up',
        percentage: 5.2,
        period: '30d'
      }
    };

    render(<NetWorthCard data={dataWithTrend} />);

    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
    expect(screen.getByText(/\+5\.2%/)).toBeInTheDocument();
  });

  test('applies correct CSS classes for styling', () => {
    render(<NetWorthCard data={mockData} />);

    const card = screen.getByTestId('net-worth-card');
    expect(card).toHaveClass('net-worth-card');
    expect(card).toHaveClass('bg-white');
  });

  test('displays income and expense data', () => {
    render(<NetWorthCard data={mockData} />);

    expect(screen.getByText(/3 500 €/)).toBeInTheDocument(); // Monthly income
    expect(screen.getByText(/2 800 €/)).toBeInTheDocument(); // Monthly expenses
  });

  test('calculates monthly surplus correctly', () => {
    render(<NetWorthCard data={mockData} />);

    // Monthly surplus should be 3500 - 2800 = 700
    expect(screen.getByText(/700 €/)).toBeInTheDocument();
  });

  test('handles edge case of zero income', () => {
    const zeroIncomeData = {
      ...mockData,
      monthlyIncome: 0,
      savingsRate: 0
    };

    render(<NetWorthCard data={zeroIncomeData} />);

    expect(screen.getByText('financial.dashboard.income: 0')).toBeInTheDocument();
  });

  test('shows loading skeleton when data is loading', () => {
    render(<NetWorthCard data={undefined} loading={true} />);

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  test('accessibility: has proper ARIA labels', () => {
    render(<NetWorthCard data={mockData} />);

    const card = screen.getByTestId('net-worth-card');
    expect(card).toHaveAttribute('role', 'region');
    expect(card).toHaveAttribute('aria-label');
  });

  test('responsive behavior with different screen sizes', () => {
    render(<NetWorthCard data={mockData} />);

    const card = screen.getByTestId('net-worth-card');
    expect(card).toHaveClass('responsive-card');
  });
});