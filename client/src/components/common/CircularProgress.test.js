import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NavigationContext } from '../../contexts/NavigationContext';
import CircularProgress from './CircularProgress';

// Mock NavigationContext
const mockSetCurrentScreen = jest.fn();
const mockNavigationValue = {
  setCurrentScreen: mockSetCurrentScreen,
  currentScreen: 'home'
};

const renderWithContext = (component) => {
  return render(
    <NavigationContext.Provider value={mockNavigationValue}>
      {component}
    </NavigationContext.Provider>
  );
};

describe('CircularProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with correct amount and percentage', () => {
    renderWithContext(
      <CircularProgress
        amount={500}
        percentage={50}
        goal={1000}
        darkMode={false}
      />
    );

    // Check if amount is displayed
    expect(screen.getByText('500€')).toBeInTheDocument();
    expect(screen.getByText('économisés')).toBeInTheDocument();
    expect(screen.getByText('50% de 1000€')).toBeInTheDocument();
  });

  test('applies correct styling for dark mode', () => {
    renderWithContext(
      <CircularProgress
        amount={250}
        percentage={25}
        goal={1000}
        darkMode={true}
      />
    );

    const component = screen.getByRole('button');

    // Check if dark mode styling is applied
    expect(component).toBeInTheDocument();

    // The SVG should be present with correct circles
    const svg = component.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(2); // Background and progress circles

    // Check if background circle has dark mode stroke
    const backgroundCircle = circles[0];
    expect(backgroundCircle).toHaveAttribute('stroke', '#374151');
  });

  test('handles click events and navigation when clickable', async () => {
    renderWithContext(
      <CircularProgress
        amount={750}
        percentage={75}
        goal={1000}
        clickable={true}
      />
    );

    const component = screen.getByRole('button');

    // Test click event
    fireEvent.click(component);

    await waitFor(() => {
      expect(mockSetCurrentScreen).toHaveBeenCalledWith('finance');
    });
  });

  test('handles keyboard navigation (Enter and Space)', async () => {
    renderWithContext(
      <CircularProgress
        amount={300}
        percentage={30}
        goal={1000}
        clickable={true}
      />
    );

    const component = screen.getByRole('button');

    // Test Enter key
    fireEvent.keyDown(component, { key: 'Enter' });
    await waitFor(() => {
      expect(mockSetCurrentScreen).toHaveBeenCalledWith('finance');
    });

    // Reset mock
    mockSetCurrentScreen.mockClear();

    // Test Space key
    fireEvent.keyDown(component, { key: ' ' });
    await waitFor(() => {
      expect(mockSetCurrentScreen).toHaveBeenCalledWith('finance');
    });
  });

  test('does not handle clicks when clickable is false', () => {
    renderWithContext(
      <CircularProgress
        amount={400}
        percentage={40}
        goal={1000}
        clickable={false}
      />
    );

    // Should not have button role when not clickable
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // Click should not trigger navigation
    const component = screen.getByText('400€').closest('div').closest('div').closest('div');
    fireEvent.click(component);

    expect(mockSetCurrentScreen).not.toHaveBeenCalled();
  });

  test('renders SVG with correct dimensions and calculations', () => {
    const testSize = 200;
    const testPercentage = 60;

    renderWithContext(
      <CircularProgress
        amount={600}
        percentage={testPercentage}
        size={testSize}
        goal={1000}
      />
    );

    const component = screen.getByRole('button');
    const svg = component.querySelector('svg');

    // Check SVG dimensions
    expect(svg).toHaveAttribute('width', testSize.toString());
    expect(svg).toHaveAttribute('height', testSize.toString());
    expect(svg).toHaveAttribute('viewBox', `0 0 ${testSize} ${testSize}`);

    // Check circles positioning
    const circles = svg.querySelectorAll('circle');
    const progressCircle = circles[1]; // Second circle is the progress circle

    expect(progressCircle).toHaveAttribute('cx', (testSize / 2).toString());
    expect(progressCircle).toHaveAttribute('cy', (testSize / 2).toString());

    // Check if stroke-dasharray and stroke-dashoffset are set
    expect(progressCircle).toHaveAttribute('stroke-dasharray');
    expect(progressCircle).toHaveAttribute('stroke-dashoffset');
  });

  test('displays hover call-to-action when clickable', () => {
    renderWithContext(
      <CircularProgress
        amount={800}
        percentage={80}
        goal={1000}
        clickable={true}
      />
    );

    // Call-to-action should be present but initially hidden (opacity-0)
    const cta = screen.getByText('📊 Voir le détail');
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveClass('opacity-0');
  });

  test('does not display hover call-to-action when not clickable', () => {
    renderWithContext(
      <CircularProgress
        amount={800}
        percentage={80}
        goal={1000}
        clickable={false}
      />
    );

    // Call-to-action should not be present
    expect(screen.queryByText('📊 Voir le détail')).not.toBeInTheDocument();
  });

  test('renders with default props when not provided', () => {
    renderWithContext(<CircularProgress />);

    expect(screen.getByText('0€')).toBeInTheDocument();
    expect(screen.getByText('0% de 1000€')).toBeInTheDocument();
    expect(screen.getByText('économisés')).toBeInTheDocument();
  });
});