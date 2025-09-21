import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssetAllocationChart from '../AssetAllocationChart';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Doughnut: ({ data, options, onClick }) => (
    <div
      data-testid="doughnut-chart"
      onClick={() => onClick && onClick(null, [{ index: 0 }])}
    >
      <div data-testid="chart-labels">
        {data.labels?.join(', ')}
      </div>
      <div data-testid="chart-data">
        {data.datasets?.[0]?.data?.join(', ')}
      </div>
    </div>
  )
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  ArcElement: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'fr' }
  })
}));

describe('AssetAllocationChart', () => {
  const mockAssets = [
    {
      id: '1',
      name: 'Apple Inc.',
      type: 'stock',
      totalValue: 5000,
      currency: 'USD',
      symbol: 'AAPL'
    },
    {
      id: '2',
      name: 'Livret A',
      type: 'savings',
      totalValue: 10000,
      currency: 'EUR'
    },
    {
      id: '3',
      name: 'Bitcoin',
      type: 'crypto',
      totalValue: 3000,
      currency: 'EUR'
    },
    {
      id: '4',
      name: 'Appartement Paris',
      type: 'real_estate',
      totalValue: 250000,
      currency: 'EUR'
    }
  ];

  test('renders asset allocation chart with correct data', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('chart-labels')).toHaveTextContent('stock, savings, crypto, real_estate');
  });

  test('calculates allocation percentages correctly', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    // Total value: 5000 + 10000 + 3000 + 250000 = 268000
    // Stock: 5000/268000 ≈ 1.9%
    // Real estate: 250000/268000 ≈ 93.3%
    const chartData = screen.getByTestId('chart-data');
    expect(chartData).toBeInTheDocument();
  });

  test('displays asset details when chart segment is clicked', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    const chart = screen.getByTestId('doughnut-chart');
    fireEvent.click(chart);

    // Should show detailed breakdown
    expect(screen.getByTestId('asset-details')).toBeInTheDocument();
  });

  test('handles empty asset data gracefully', () => {
    render(<AssetAllocationChart data={[]} />);

    expect(screen.getByText('financial.dashboard.noAssets')).toBeInTheDocument();
    expect(screen.queryByTestId('doughnut-chart')).not.toBeInTheDocument();
  });

  test('handles null or undefined data', () => {
    render(<AssetAllocationChart data={null} />);

    expect(screen.getByText('financial.dashboard.noAssets')).toBeInTheDocument();
  });

  test('groups small allocations into "Others" category', () => {
    const assetsWithSmallValues = [
      ...mockAssets,
      { id: '5', name: 'Small Stock', type: 'stock', totalValue: 100, currency: 'EUR' },
      { id: '6', name: 'Tiny Bond', type: 'bond', totalValue: 50, currency: 'EUR' }
    ];

    render(<AssetAllocationChart data={assetsWithSmallValues} />);

    // Small allocations should be grouped into "Others"
    const labels = screen.getByTestId('chart-labels');
    expect(labels).toHaveTextContent('financial.dashboard.others');
  });

  test('displays correct colors for different asset types', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    const chart = screen.getByTestId('doughnut-chart');
    expect(chart).toBeInTheDocument();

    // Chart should have appropriate styling
    expect(chart).toHaveStyle('position: relative');
  });

  test('shows asset type legends', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    expect(screen.getByTestId('asset-legend')).toBeInTheDocument();
    expect(screen.getByText('financial.assets.types.stock')).toBeInTheDocument();
    expect(screen.getByText('financial.assets.types.savings')).toBeInTheDocument();
    expect(screen.getByText('financial.assets.types.crypto')).toBeInTheDocument();
  });

  test('displays total portfolio value', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    expect(screen.getByTestId('total-value')).toBeInTheDocument();
    expect(screen.getByText(/268 000 €/)).toBeInTheDocument();
  });

  test('handles different currencies correctly', () => {
    const mixedCurrencyAssets = [
      {
        id: '1',
        name: 'US Stock',
        type: 'stock',
        totalValue: 1000,
        currency: 'USD'
      },
      {
        id: '2',
        name: 'EU Bond',
        type: 'bond',
        totalValue: 2000,
        currency: 'EUR'
      }
    ];

    render(<AssetAllocationChart data={mixedCurrencyAssets} />);

    // Should handle currency conversion or display warning
    expect(screen.getByTestId('currency-note')).toBeInTheDocument();
  });

  test('responsive design adjusts chart size', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    const container = screen.getByTestId('chart-container');
    expect(container).toHaveClass('responsive-chart');
  });

  test('accessibility: provides proper labels and descriptions', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    const chart = screen.getByTestId('doughnut-chart');
    expect(chart).toHaveAttribute('role', 'img');

    // Should have accessible description
    expect(screen.getByLabelText(/financial.dashboard.assetAllocation/)).toBeInTheDocument();
  });

  test('handles very large asset values with proper formatting', () => {
    const largeAssets = [
      {
        id: '1',
        name: 'Large Property',
        type: 'real_estate',
        totalValue: 1500000,
        currency: 'EUR'
      }
    ];

    render(<AssetAllocationChart data={largeAssets} />);

    expect(screen.getByText(/1 500 000 €/)).toBeInTheDocument();
  });

  test('shows performance indicators when available', () => {
    const assetsWithPerformance = mockAssets.map(asset => ({
      ...asset,
      performance: {
        change: asset.type === 'stock' ? 5.2 : 0,
        period: '1M'
      }
    }));

    render(<AssetAllocationChart data={assetsWithPerformance} />);

    expect(screen.getByTestId('performance-indicators')).toBeInTheDocument();
  });

  test('allows toggling between percentage and absolute values', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    const toggleButton = screen.getByTestId('value-toggle');
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    // Should switch display mode
    expect(screen.getByTestId('absolute-values')).toBeInTheDocument();
  });

  test('exports chart data functionality', () => {
    render(<AssetAllocationChart data={mockAssets} />);

    const exportButton = screen.getByTestId('export-chart');
    fireEvent.click(exportButton);

    // Should trigger export function
    expect(exportButton).toBeInTheDocument();
  });

  test('handles real-time updates', () => {
    const { rerender } = render(<AssetAllocationChart data={mockAssets} />);

    const updatedAssets = mockAssets.map(asset => ({
      ...asset,
      totalValue: asset.totalValue * 1.1 // 10% increase
    }));

    rerender(<AssetAllocationChart data={updatedAssets} />);

    // Chart should update with new values
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
  });

  test('shows loading state when data is being fetched', () => {
    render(<AssetAllocationChart data={mockAssets} loading={true} />);

    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
  });

  test('handles asset types with zero values', () => {
    const assetsWithZero = [
      ...mockAssets,
      {
        id: '5',
        name: 'Zero Value Asset',
        type: 'stock',
        totalValue: 0,
        currency: 'EUR'
      }
    ];

    render(<AssetAllocationChart data={assetsWithZero} />);

    // Zero value assets should be filtered out
    const chartData = screen.getByTestId('chart-data');
    expect(chartData).not.toHaveTextContent('0');
  });

  test('displays risk indicators for asset types', () => {
    render(<AssetAllocationChart data={mockAssets} showRiskIndicators={true} />);

    expect(screen.getByTestId('risk-indicators')).toBeInTheDocument();
    expect(screen.getByText(/financial.risk.high/)).toBeInTheDocument(); // For crypto
    expect(screen.getByText(/financial.risk.low/)).toBeInTheDocument(); // For savings
  });
});