import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinancialInsights from '../FinancialInsights';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && options.count !== undefined) {
        return `${key}_${options.count}`;
      }
      return key;
    },
    i18n: { language: 'fr' }
  })
}));

describe('FinancialInsights', () => {
  const mockInsights = [
    {
      id: '1',
      type: 'spending_analysis',
      title: 'Optimisation des dépenses alimentaires',
      content: 'Vos dépenses alimentaires représentent 25% de vos revenus, ce qui est au-dessus de la recommandation de 15-20%.',
      confidence: 0.85,
      priority: 'high',
      actionable: true,
      category: 'spending',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      type: 'investment_opportunity',
      title: 'Diversification du portefeuille',
      content: 'Votre portefeuille est concentré à 80% sur les actions. Considérez diversifier avec des obligations.',
      confidence: 0.72,
      priority: 'medium',
      actionable: true,
      category: 'investment',
      createdAt: '2024-01-14T15:30:00Z'
    },
    {
      id: '3',
      type: 'risk_assessment',
      title: 'Fonds d\'urgence insuffisant',
      content: 'Votre fonds d\'urgence ne couvre que 2 mois d\'expenses. Recommandé: 3-6 mois.',
      confidence: 0.95,
      priority: 'high',
      actionable: true,
      category: 'emergency_fund',
      createdAt: '2024-01-13T09:00:00Z'
    }
  ];

  const mockRecommendations = [
    {
      id: '1',
      type: 'savings_optimization',
      title: 'Augmentez votre épargne automatique',
      description: 'Mettez en place un virement automatique de 200€ par mois vers votre livret d\'épargne.',
      impact: 'high',
      effort: 'low',
      confidence: 0.88,
      estimatedSavings: 2400,
      category: 'savings'
    },
    {
      id: '2',
      type: 'debt_optimization',
      title: 'Remboursement anticipé du crédit',
      description: 'Avec votre capacité d\'épargne actuelle, vous pourriez rembourser votre crédit 2 ans plus tôt.',
      impact: 'medium',
      effort: 'medium',
      confidence: 0.76,
      estimatedSavings: 3500,
      category: 'debt'
    }
  ];

  test('renders insights and recommendations correctly', () => {
    render(
      <FinancialInsights
        insights={mockInsights}
        recommendations={mockRecommendations}
      />
    );

    expect(screen.getByText('financial.insights.title')).toBeInTheDocument();
    expect(screen.getByText('financial.recommendations.title')).toBeInTheDocument();

    // Check that insights are rendered
    expect(screen.getByText('Optimisation des dépenses alimentaires')).toBeInTheDocument();
    expect(screen.getByText('Diversification du portefeuille')).toBeInTheDocument();

    // Check that recommendations are rendered
    expect(screen.getByText('Augmentez votre épargne automatique')).toBeInTheDocument();
  });

  test('displays confidence scores correctly', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    // Should show confidence indicators
    expect(screen.getByTestId('confidence-85')).toBeInTheDocument();
    expect(screen.getByTestId('confidence-72')).toBeInTheDocument();
    expect(screen.getByTestId('confidence-95')).toBeInTheDocument();
  });

  test('shows priority indicators', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    expect(screen.getAllByTestId('priority-high')).toHaveLength(2);
    expect(screen.getByTestId('priority-medium')).toBeInTheDocument();
  });

  test('filters insights by category', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    const categoryFilter = screen.getByTestId('category-filter');
    fireEvent.change(categoryFilter, { target: { value: 'spending' } });

    expect(screen.getByText('Optimisation des dépenses alimentaires')).toBeInTheDocument();
    expect(screen.queryByText('Diversification du portefeuille')).not.toBeInTheDocument();
  });

  test('sorts insights by priority and confidence', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    const sortButton = screen.getByTestId('sort-priority');
    fireEvent.click(sortButton);

    const insights = screen.getAllByTestId(/insight-item/);

    // High priority insights should be first
    expect(insights[0]).toHaveTextContent('Fonds d\'urgence insuffisant');
    expect(insights[1]).toHaveTextContent('Optimisation des dépenses alimentaires');
  });

  test('expands and collapses insight details', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    const expandButton = screen.getAllByTestId('expand-insight')[0];
    fireEvent.click(expandButton);

    expect(screen.getByTestId('insight-details-1')).toBeInTheDocument();
    expect(screen.getByText(/Vos dépenses alimentaires représentent 25%/)).toBeInTheDocument();

    // Collapse
    fireEvent.click(expandButton);
    expect(screen.queryByTestId('insight-details-1')).not.toBeInTheDocument();
  });

  test('marks insights as read', async () => {
    const onMarkAsRead = jest.fn();
    render(
      <FinancialInsights
        insights={mockInsights}
        recommendations={[]}
        onMarkAsRead={onMarkAsRead}
      />
    );

    const markReadButton = screen.getAllByTestId('mark-as-read')[0];
    fireEvent.click(markReadButton);

    await waitFor(() => {
      expect(onMarkAsRead).toHaveBeenCalledWith('1');
    });
  });

  test('handles empty insights gracefully', () => {
    render(<FinancialInsights insights={[]} recommendations={[]} />);

    expect(screen.getByText('financial.insights.empty')).toBeInTheDocument();
    expect(screen.getByText('financial.recommendations.empty')).toBeInTheDocument();
  });

  test('displays impact and effort indicators for recommendations', () => {
    render(<FinancialInsights insights={[]} recommendations={mockRecommendations} />);

    expect(screen.getByTestId('impact-high')).toBeInTheDocument();
    expect(screen.getByTestId('effort-low')).toBeInTheDocument();
    expect(screen.getByTestId('impact-medium')).toBeInTheDocument();
    expect(screen.getByTestId('effort-medium')).toBeInTheDocument();
  });

  test('shows estimated savings for recommendations', () => {
    render(<FinancialInsights insights={[]} recommendations={mockRecommendations} />);

    expect(screen.getByText(/2 400 €/)).toBeInTheDocument();
    expect(screen.getByText(/3 500 €/)).toBeInTheDocument();
  });

  test('implements recommendation actions', () => {
    const onImplementRecommendation = jest.fn();
    render(
      <FinancialInsights
        insights={[]}
        recommendations={mockRecommendations}
        onImplementRecommendation={onImplementRecommendation}
      />
    );

    const implementButton = screen.getAllByTestId('implement-recommendation')[0];
    fireEvent.click(implementButton);

    expect(onImplementRecommendation).toHaveBeenCalledWith('1');
  });

  test('dismisses recommendations', () => {
    const onDismissRecommendation = jest.fn();
    render(
      <FinancialInsights
        insights={[]}
        recommendations={mockRecommendations}
        onDismissRecommendation={onDismissRecommendation}
      />
    );

    const dismissButton = screen.getAllByTestId('dismiss-recommendation')[0];
    fireEvent.click(dismissButton);

    expect(onDismissRecommendation).toHaveBeenCalledWith('1');
  });

  test('searches through insights and recommendations', () => {
    render(
      <FinancialInsights
        insights={mockInsights}
        recommendations={mockRecommendations}
      />
    );

    const searchInput = screen.getByTestId('search-insights');
    fireEvent.change(searchInput, { target: { value: 'épargne' } });

    expect(screen.getByText('Fonds d\'urgence insuffisant')).toBeInTheDocument();
    expect(screen.getByText('Augmentez votre épargne automatique')).toBeInTheDocument();
    expect(screen.queryByText('Diversification du portefeuille')).not.toBeInTheDocument();
  });

  test('displays insight timestamps', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
    expect(screen.getByText(/2024-01-14/)).toBeInTheDocument();
  });

  test('shows actionable vs non-actionable insights differently', () => {
    const insightsWithNonActionable = [
      ...mockInsights,
      {
        id: '4',
        type: 'market_update',
        title: 'Information marché',
        content: 'Les marchés sont volatils cette semaine.',
        confidence: 0.80,
        priority: 'low',
        actionable: false,
        category: 'market'
      }
    ];

    render(<FinancialInsights insights={insightsWithNonActionable} recommendations={[]} />);

    expect(screen.getByTestId('actionable-insights')).toBeInTheDocument();
    expect(screen.getByTestId('informational-insights')).toBeInTheDocument();
  });

  test('exports insights and recommendations', () => {
    render(
      <FinancialInsights
        insights={mockInsights}
        recommendations={mockRecommendations}
      />
    );

    const exportButton = screen.getByTestId('export-insights');
    fireEvent.click(exportButton);

    // Should trigger export functionality
    expect(exportButton).toBeInTheDocument();
  });

  test('handles loading state', () => {
    render(
      <FinancialInsights
        insights={[]}
        recommendations={[]}
        loading={true}
      />
    );

    expect(screen.getByTestId('insights-loading')).toBeInTheDocument();
  });

  test('shows refresh button and handles refresh', () => {
    const onRefresh = jest.fn();
    render(
      <FinancialInsights
        insights={mockInsights}
        recommendations={mockRecommendations}
        onRefresh={onRefresh}
      />
    );

    const refreshButton = screen.getByTestId('refresh-insights');
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalled();
  });

  test('accessibility: proper ARIA labels and keyboard navigation', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    const insightsContainer = screen.getByTestId('insights-container');
    expect(insightsContainer).toHaveAttribute('role', 'region');
    expect(insightsContainer).toHaveAttribute('aria-label');

    const firstInsight = screen.getAllByTestId(/insight-item/)[0];
    expect(firstInsight).toHaveAttribute('tabIndex', '0');
  });

  test('responsive design adapts to different screen sizes', () => {
    render(<FinancialInsights insights={mockInsights} recommendations={[]} />);

    const container = screen.getByTestId('insights-container');
    expect(container).toHaveClass('responsive-insights');
  });

  test('shows detailed analytics for business users', () => {
    render(
      <FinancialInsights
        insights={mockInsights}
        recommendations={[]}
        showAnalytics={true}
      />
    );

    expect(screen.getByTestId('insight-analytics')).toBeInTheDocument();
    expect(screen.getByText(/financial.insights.analytics/)).toBeInTheDocument();
  });

  test('handles real-time updates', () => {
    const { rerender } = render(
      <FinancialInsights insights={mockInsights} recommendations={[]} />
    );

    const newInsight = {
      id: '4',
      type: 'urgent_alert',
      title: 'Nouvelle alerte',
      content: 'Dépense inhabituelle détectée.',
      confidence: 0.95,
      priority: 'urgent',
      actionable: true,
      category: 'security'
    };

    rerender(
      <FinancialInsights
        insights={[...mockInsights, newInsight]}
        recommendations={[]}
      />
    );

    expect(screen.getByText('Nouvelle alerte')).toBeInTheDocument();
    expect(screen.getByTestId('priority-urgent')).toBeInTheDocument();
  });
});