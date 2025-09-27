/**
 * Modern Button Component Tests
 *
 * Tests for Phase 3 enhanced button component:
 * - Variant rendering and styling
 * - Loading states and interactions
 * - Icon integration
 * - Accessibility compliance
 * - Performance tracking integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModernButton, {
  ChevronRightIcon,
  PlusIcon,
  CheckIcon
} from '../ModernButton';

// Mock performance profiler
jest.mock('../../common/PerformanceProfiler', () => ({
  useInteractionTracking: () => ({
    trackInteraction: jest.fn()
  })
}));

describe('ModernButton', () => {
  const defaultProps = {
    children: 'Test Button'
  };

  describe('Rendering', () => {
    test('renders with default props', () => {
      render(<ModernButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('pluqla-btn');
      expect(button).toHaveAttribute('type', 'button');
    });

    test('renders different variants correctly', () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'success', 'danger'];

      variants.forEach(variant => {
        const { rerender } = render(
          <ModernButton {...defaultProps} variant={variant} />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('pluqla-btn');

        rerender(<ModernButton {...defaultProps} />);
      });
    });

    test('renders different sizes correctly', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];

      sizes.forEach(size => {
        const { rerender } = render(
          <ModernButton {...defaultProps} size={size} />
        );

        const button = screen.getByRole('button');
        expect(button).toHaveClass('pluqla-btn');

        rerender(<ModernButton {...defaultProps} />);
      });
    });

    test('renders with custom className', () => {
      render(
        <ModernButton {...defaultProps} className="custom-class" />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('pluqla-btn');
    });

    test('renders with custom type attribute', () => {
      render(
        <ModernButton {...defaultProps} type="submit" />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Icons', () => {
    test('renders with left icon', () => {
      render(
        <ModernButton
          {...defaultProps}
          leftIcon={<PlusIcon data-testid="left-icon" />}
        />
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    test('renders with right icon', () => {
      render(
        <ModernButton
          {...defaultProps}
          rightIcon={<ChevronRightIcon data-testid="right-icon" />}
        />
      );

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    test('renders with both left and right icons', () => {
      render(
        <ModernButton
          {...defaultProps}
          leftIcon={<PlusIcon data-testid="left-icon" />}
          rightIcon={<ChevronRightIcon data-testid="right-icon" />}
        />
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    test('hides icons when loading', () => {
      render(
        <ModernButton
          {...defaultProps}
          isLoading={true}
          leftIcon={<PlusIcon data-testid="left-icon" />}
          rightIcon={<ChevronRightIcon data-testid="right-icon" />}
        />
      );

      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading spinner when isLoading is true', () => {
      render(
        <ModernButton {...defaultProps} isLoading={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      // Loading spinner should be present (animated div)
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    test('hides content when loading', () => {
      render(
        <ModernButton {...defaultProps} isLoading={true} />
      );

      const contentWrapper = screen.getByText('Test Button').parentElement;
      expect(contentWrapper).toHaveClass('opacity-0');
    });

    test('shows content when not loading', () => {
      render(
        <ModernButton {...defaultProps} isLoading={false} />
      );

      const contentWrapper = screen.getByText('Test Button').parentElement;
      expect(contentWrapper).toHaveClass('opacity-100');
    });

    test('disables button when loading', () => {
      render(
        <ModernButton {...defaultProps} isLoading={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Disabled State', () => {
    test('renders as disabled when disabled prop is true', () => {
      render(
        <ModernButton {...defaultProps} disabled={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('prevents click when disabled', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(
        <ModernButton
          {...defaultProps}
          disabled={true}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    test('prevents click when loading', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(
        <ModernButton
          {...defaultProps}
          isLoading={true}
          onClick={onClick}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    test('calls onClick when clicked', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(
        <ModernButton {...defaultProps} onClick={onClick} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('calls onClick with event object', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(
        <ModernButton {...defaultProps} onClick={onClick} />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).toHaveBeenCalledWith(expect.any(Object));
    });

    test('does not call onClick when disabled', async () => {
      const onClick = jest.fn();

      render(
        <ModernButton
          {...defaultProps}
          onClick={onClick}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    test('handles keyboard events', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(
        <ModernButton {...defaultProps} onClick={onClick} />
      );

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('has proper button role', () => {
      render(<ModernButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('is focusable by default', () => {
      render(<ModernButton {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    test('is not focusable when disabled', () => {
      render(<ModernButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      button.focus();
      expect(button).not.toHaveFocus();
    });

    test('supports aria attributes', () => {
      render(
        <ModernButton
          {...defaultProps}
          aria-label="Custom label"
          aria-describedby="description"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'description');
    });

    test('has proper disabled state attributes', () => {
      render(<ModernButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toBeDisabled();
    });
  });

  describe('Performance Tracking', () => {
    test('tracks interaction on click', async () => {
      const { useInteractionTracking } = require('../../common/PerformanceProfiler');
      const mockTrackInteraction = jest.fn();

      useInteractionTracking.mockReturnValue({
        trackInteraction: mockTrackInteraction
      });

      const user = userEvent.setup();

      render(<ModernButton {...defaultProps} variant="primary" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockTrackInteraction).toHaveBeenCalledWith(
        'button-primary-click',
        expect.any(Number)
      );
    });

    test('does not track when disabled', async () => {
      const { useInteractionTracking } = require('../../common/PerformanceProfiler');
      const mockTrackInteraction = jest.fn();

      useInteractionTracking.mockReturnValue({
        trackInteraction: mockTrackInteraction
      });

      render(<ModernButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockTrackInteraction).not.toHaveBeenCalled();
    });
  });

  describe('Icon Components', () => {
    test('ChevronRightIcon renders correctly', () => {
      render(<ChevronRightIcon data-testid="chevron-right" />);

      const icon = screen.getByTestId('chevron-right');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    test('PlusIcon renders correctly', () => {
      render(<PlusIcon data-testid="plus" />);

      const icon = screen.getByTestId('plus');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    test('CheckIcon renders correctly', () => {
      render(<CheckIcon data-testid="check" />);

      const icon = screen.getByTestId('check');
      expect(icon).toBeInTheDocument();
      expect(icon.tagName).toBe('svg');
    });

    test('icons accept custom className', () => {
      render(<PlusIcon className="custom-icon-class" data-testid="plus" />);

      const icon = screen.getByTestId('plus');
      expect(icon).toHaveClass('custom-icon-class');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty children', () => {
      render(<ModernButton />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('handles null children', () => {
      render(<ModernButton>{null}</ModernButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('handles complex children', () => {
      render(
        <ModernButton>
          <span>Complex</span>
          <strong>Children</strong>
        </ModernButton>
      );

      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Children')).toBeInTheDocument();
    });

    test('forwards additional props', () => {
      render(
        <ModernButton
          {...defaultProps}
          data-testid="custom-button"
          title="Tooltip text"
        />
      );

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('title', 'Tooltip text');
    });

    test('handles rapid successive clicks', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<ModernButton {...defaultProps} onClick={onClick} />);

      const button = screen.getByRole('button');

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);
    });
  });
});