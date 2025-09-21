import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import SavingsSummary from '../SavingsSummary';

// Mock data
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
  }
};

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('SavingsSummary', () => {
  beforeEach(() => {
    // Reset i18n language to French for consistent testing
    i18n.changeLanguage('fr');
  });

  test('renders financial summary correctly', () => {
    renderWithI18n(
      <SavingsSummary
        data={mockFinancialData}
        userData={mockUserData}
        darkMode={false}
      />
    );

    // Check if main elements are rendered
    expect(screen.getByText('Synthèse Financière')).toBeInTheDocument();
    expect(screen.getByText('1 200 €')).toBeInTheDocument(); // Current savings
    expect(screen.getByText('3 500 €')).toBeInTheDocument(); // Monthly income
    expect(screen.getByText('2 500 €')).toBeInTheDocument(); // Total expenses
  });

  test('displays savings rate correctly', () => {
    renderWithI18n(
      <SavingsSummary
        data={mockFinancialData}
        userData={mockUserData}
        darkMode={false}
      />
    );

    expect(screen.getByText('28,6%')).toBeInTheDocument();
  });

  test('shows goal progress correctly', () => {
    renderWithI18n(
      <SavingsSummary
        data={mockFinancialData}
        userData={mockUserData}
        darkMode={false}
      />
    );

    // Progress should be 150% (1200/800)
    expect(screen.getByText('150,0% complété')).toBeInTheDocument();
    expect(screen.getByText('🎉 Objectif atteint !')).toBeInTheDocument();
  });

  test('displays positive net savings in green', () => {
    renderWithI18n(
      <SavingsSummary
        data={mockFinancialData}
        userData={mockUserData}
        darkMode={false}
      />
    );

    const netSavingsElement = screen.getByText('1 000 €');
    expect(netSavingsElement).toHaveClass('text-green-500');
  });

  test('displays negative net savings in red', () => {
    const negativeData = {
      ...mockFinancialData,
      totals: {
        ...mockFinancialData.totals,
        netSavings: -500
      }
    };

    renderWithI18n(
      <SavingsSummary
        data={negativeData}
        userData={mockUserData}
        darkMode={false}
      />
    );

    const netSavingsElement = screen.getByText('-500 €');
    expect(netSavingsElement).toHaveClass('text-red-500');
  });

  test('renders correctly in dark mode', () => {
    const { container } = renderWithI18n(
      <SavingsSummary
        data={mockFinancialData}
        userData={mockUserData}
        darkMode={true}
      />
    );

    // Check if dark mode classes are applied
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('bg-gradient-to-br', 'from-gray-900');
  });

  test('handles missing data gracefully', () => {
    const emptyData = {
      period: 'month',
      totals: {
        expenses: 0,
        income: 0,
        netSavings: 0,
        savingsRate: 0,
        currentSavings: 0,
        monthlyGoal: 0
      }
    };

    const emptyUserData = {
      savedAmount: 0,
      monthlyGoal: 0
    };

    renderWithI18n(
      <SavingsSummary
        data={emptyData}
        userData={emptyUserData}
        darkMode={false}
      />
    );

    expect(screen.getByText('0 €')).toBeInTheDocument();
    expect(screen.getByText('0,0%')).toBeInTheDocument();
  });

  test('calculates progress percentage correctly', () => {
    const testCases = [
      { saved: 400, goal: 800, expectedProgress: '50,0%' },
      { saved: 800, goal: 800, expectedProgress: '100,0%' },
      { saved: 1200, goal: 800, expectedProgress: '150,0%' },
      { saved: 100, goal: 1000, expectedProgress: '10,0%' }
    ];

    testCases.forEach(({ saved, goal, expectedProgress }) => {
      const userData = { savedAmount: saved, monthlyGoal: goal };
      const data = { ...mockFinancialData };

      const { unmount } = renderWithI18n(
        <SavingsSummary
          data={data}
          userData={userData}
          darkMode={false}
        />
      );

      expect(screen.getByText(`${expectedProgress} complété`)).toBeInTheDocument();

      unmount();
    });
  });

  test('displays different savings rate colors based on value', () => {
    const testCases = [
      { rate: 25, expectedClass: 'text-green-500' }, // High savings rate
      { rate: 15, expectedClass: 'text-yellow-500' }, // Medium savings rate
      { rate: 5, expectedClass: 'text-red-500' } // Low savings rate
    ];

    testCases.forEach(({ rate, expectedClass }) => {
      const data = {
        ...mockFinancialData,
        totals: {
          ...mockFinancialData.totals,
          savingsRate: rate
        }
      };

      const { unmount } = renderWithI18n(
        <SavingsSummary
          data={data}
          userData={mockUserData}
          darkMode={false}
        />
      );

      const savingsRateElement = screen.getByText(`${rate.toFixed(1)}%`);
      expect(savingsRateElement).toHaveClass(expectedClass);

      unmount();
    });
  });
});