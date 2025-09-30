/**
 * LoginForm Component Tests
 * Tests: Validation, ARIA attributes, keyboard navigation, accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import LoginForm from '../src/components/auth/LoginForm';

// Mock i18n for tests
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'auth.login.title': 'Bon retour !',
        'auth.login.subtitle': 'Connecte-toi pour accéder à tes économies personnalisées',
        'auth.login.submit': 'Se connecter',
        'auth.login.loading': 'Connexion...',
        'auth.login.switchToRegister': 'Pas encore de compte ? S\'inscrire',
        'auth.fields.email': 'Adresse email',
        'auth.fields.password': 'Mot de passe',
        'auth.placeholders.email': 'ton.email@exemple.com',
        'auth.placeholders.password': 'Minimum 6 caractères',
        'auth.validation.emailRequired': 'L\'email est requis',
        'auth.validation.emailInvalid': 'Format d\'email invalide',
        'auth.validation.passwordRequired': 'Le mot de passe est requis',
        'auth.validation.passwordMinLength': 'Minimum 6 caractères',
      };
      return translations[key] || key;
    }
  }),
  I18nextProvider: ({ children }) => children,
}));

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnSwitchToSignup = jest.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    isLoading: false,
    serverError: null,
    onSwitchToSignup: mockOnSwitchToSignup,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form with all required elements', () => {
      render(<LoginForm {...defaultProps} />);

      // Check title and subtitle
      expect(screen.getByText('Bon retour !')).toBeInTheDocument();
      expect(screen.getByText('Connecte-toi pour accéder à tes économies personnalisées')).toBeInTheDocument();

      // Check form inputs
      expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();

      // Check submit button
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();

      // Check switch mode link
      expect(screen.getByRole('button', { name: /pas encore de compte/i })).toBeInTheDocument();
    });

    it('should render server error when provided', () => {
      render(<LoginForm {...defaultProps} serverError="Invalid credentials" />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /connexion/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('ARIA Attributes and Accessibility', () => {
    it('should have proper ARIA labels on inputs', () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);

      expect(emailInput).toHaveAttribute('aria-label', 'Adresse email');
      expect(passwordInput).toHaveAttribute('aria-label', 'Mot de passe');
    });

    it('should have aria-invalid when field has error', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      // Submit empty form to trigger validation
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have aria-describedby linking to error message', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      // Submit empty form
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('L\'email est requis');
        expect(errorMessage).toBeInTheDocument();
        expect(emailInput).toHaveAttribute('aria-describedby', 'login-email-error');
        expect(errorMessage.parentElement).toHaveAttribute('id', 'login-email-error');
      });
    });

    it('should have password toggle button with aria-pressed', () => {
      render(<LoginForm {...defaultProps} />);

      const toggleButton = screen.getByLabelText(/afficher le mot de passe/i);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      // Click to show password
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
      expect(toggleButton).toHaveAttribute('aria-label', 'Masquer le mot de passe');
    });

    it('should have role="status" on server error banner', () => {
      render(<LoginForm {...defaultProps} serverError="Server error" />);

      const errorBanner = screen.getByRole('status');
      expect(errorBanner).toHaveAttribute('aria-live', 'polite');
    });

    it('should have role="alert" on inline error messages', async () => {
      render(<LoginForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('should auto-focus email input on mount', () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      expect(emailInput).toHaveFocus();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      render(<LoginForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('L\'email est requis')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for invalid email format', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Format d\'email invalide')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for empty password', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for password less than 6 characters', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '12345' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Minimum 6 caractères')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should submit form with valid data', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should clear error when user starts typing', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      // Trigger error
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('L\'email est requis')).toBeInTheDocument();
      });

      // Start typing
      fireEvent.change(emailInput, { target: { value: 't' } });

      await waitFor(() => {
        expect(screen.queryByText('L\'email est requis')).not.toBeInTheDocument();
      });
    });

    it('should validate on blur', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);

      // Type invalid email and blur
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText('Format d\'email invalide')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should toggle password visibility', () => {
      render(<LoginForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const toggleButton = screen.getByLabelText(/afficher le mot de passe/i);

      // Initially password type
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click to hide
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should call onSwitchToSignup when link is clicked', () => {
      render(<LoginForm {...defaultProps} />);

      const switchLink = screen.getByRole('button', { name: /pas encore de compte/i });
      fireEvent.click(switchLink);

      expect(mockOnSwitchToSignup).toHaveBeenCalledTimes(1);
    });

    it('should disable inputs and buttons when loading', () => {
      render(<LoginForm {...defaultProps} isLoading={true} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /connexion/i });
      const switchButton = screen.getByRole('button', { name: /pas encore de compte/i });

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(switchButton).toBeDisabled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow tabbing through form elements', () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const toggleButton = screen.getByLabelText(/afficher le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      const switchButton = screen.getByRole('button', { name: /pas encore de compte/i });

      // Email should be focused initially
      expect(emailInput).toHaveFocus();

      // Tab to password
      userEvent.tab();
      expect(passwordInput).toHaveFocus();

      // Tab to toggle button
      userEvent.tab();
      expect(toggleButton).toHaveFocus();

      // Tab to submit
      userEvent.tab();
      expect(submitButton).toHaveFocus();

      // Tab to switch link
      userEvent.tab();
      expect(switchButton).toHaveFocus();
    });

    it('should submit form on Enter key in input', async () => {
      render(<LoginForm {...defaultProps} />);

      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });
});
