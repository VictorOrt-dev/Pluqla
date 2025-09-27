/**
 * Tests unitaires pour LoginScreen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from '../LoginScreen';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import authService from '../../../services/authService';

// Mock des hooks
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/NavigationContext');
jest.mock('../../../services/authService');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'auth.login.title': 'Connexion',
        'auth.register.title': 'Inscription',
        'auth.login.subtitle': 'Connectez-vous à votre compte',
        'auth.register.subtitle': 'Créez votre compte',
        'auth.fields.name': 'Nom',
        'auth.fields.email': 'Email',
        'auth.fields.password': 'Mot de passe',
        'auth.fields.confirmPassword': 'Confirmer le mot de passe',
        'auth.placeholders.name': 'Votre nom',
        'auth.placeholders.email': 'votre@email.com',
        'auth.placeholders.password': 'Votre mot de passe',
        'auth.placeholders.confirmPassword': 'Confirmez votre mot de passe',
        'auth.login.submit': 'Se connecter',
        'auth.register.submit': "S'inscrire",
        'auth.login.loading': 'Connexion...',
        'auth.register.loading': 'Inscription...',
        'auth.login.switchToRegister': "Pas de compte ? S'inscrire",
        'auth.register.switchToLogin': 'Déjà un compte ? Se connecter',
        'auth.validation.nameRequired': 'Le nom est requis',
        'auth.validation.emailRequired': 'L\'email est requis',
        'auth.validation.emailInvalid': 'Email invalide',
        'auth.validation.passwordRequired': 'Le mot de passe est requis',
        'auth.validation.passwordMinLength': 'Minimum 6 caractères',
        'auth.validation.passwordMismatch': 'Les mots de passe ne correspondent pas',
        'auth.errors.registerError': 'Erreur lors de l\'inscription',
        'auth.errors.networkError': 'Erreur de réseau',
        'auth.security.ssl': 'SSL Sécurisé',
        'auth.security.gdpr': 'RGPD Conforme',
        'auth.security.secure': 'Données Protégées',
        'auth.security.dataProtection': 'Vos données sont protégées selon les standards européens'
      };
      return translations[key] || key;
    }
  })
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

describe('LoginScreen', () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();
  const mockSetCurrentScreen = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock returns
    useAuth.mockReturnValue({
      login: mockLogin,
      error: null,
      isLoading: false,
      clearError: mockClearError
    });

    useNavigation.mockReturnValue({
      setCurrentScreen: mockSetCurrentScreen
    });

    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Rendering', () => {
    test('should render login form by default', () => {
      render(<LoginScreen />);

      expect(screen.getByText('Connexion')).toBeInTheDocument();
      expect(screen.getByText('Connectez-vous à votre compte')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Votre mot de passe')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    });

    test('should render register form when authMode is register', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authMode') return 'register';
        return null;
      });

      render(<LoginScreen />);

      expect(screen.getByText('Inscription')).toBeInTheDocument();
      expect(screen.getByText('Créez votre compte')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Votre nom')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirmez votre mot de passe')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeInTheDocument();
    });

    test('should render security badges', () => {
      render(<LoginScreen />);

      expect(screen.getByText('SSL Sécurisé')).toBeInTheDocument();
      expect(screen.getByText('RGPD Conforme')).toBeInTheDocument();
      expect(screen.getByText('Données Protégées')).toBeInTheDocument();
    });

    test('should render language selector', () => {
      render(<LoginScreen />);

      // The LanguageSelector component should be rendered
      expect(document.querySelector('.absolute.top-4.right-4')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('should validate email format', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      expect(screen.getByText('Email invalide')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('should validate password length', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123');
      await user.click(submitButton);

      expect(screen.getByText('Minimum 6 caractères')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      await user.click(submitButton);

      expect(screen.getByText('L\'email est requis')).toBeInTheDocument();
      expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument();
    });

    test('should validate password confirmation in register mode', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authMode') return 'register';
        return null;
      });

      const user = userEvent.setup();
      render(<LoginScreen />);

      const nameInput = screen.getByPlaceholderText('Votre nom');
      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirmez votre mot de passe');
      const submitButton = screen.getByRole('button', { name: /s'inscrire/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');
      await user.click(submitButton);

      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    });

    test('should clear validation errors when user types', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      // Trigger validation error
      await user.click(submitButton);
      expect(screen.getByText('L\'email est requis')).toBeInTheDocument();

      // Type in email field
      await user.type(emailInput, 'test@example.com');

      // Error should be cleared
      expect(screen.queryByText('L\'email est requis')).not.toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    test('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const toggleButton = passwordInput.parentElement.querySelector('button[type="button"]');

      expect(passwordInput.type).toBe('password');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    test('should switch between login and register modes', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      // Start in login mode
      expect(screen.getByText('Connexion')).toBeInTheDocument();

      // Switch to register
      const switchToRegisterButton = screen.getByText("Pas de compte ? S'inscrire");
      await user.click(switchToRegisterButton);

      expect(screen.getByText('Inscription')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Votre nom')).toBeInTheDocument();

      // Switch back to login
      const switchToLoginButton = screen.getByText('Déjà un compte ? Se connecter');
      await user.click(switchToLoginButton);

      expect(screen.getByText('Connexion')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Votre nom')).not.toBeInTheDocument();
    });

    test('should preserve email when switching modes', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      await user.type(emailInput, 'test@example.com');

      // Switch to register mode
      const switchButton = screen.getByText("Pas de compte ? S'inscrire");
      await user.click(switchButton);

      // Email should be preserved
      const preservedEmailInput = screen.getByPlaceholderText('votre@email.com');
      expect(preservedEmailInput.value).toBe('test@example.com');
    });
  });

  describe('Login Flow', () => {
    test('should handle successful login', async () => {
      mockLogin.mockResolvedValue({ success: true, user: { id: 1, name: 'John' } });

      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('john@example.com', 'password123');
        expect(mockSetCurrentScreen).toHaveBeenCalledWith('home', true, true);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('authMode');
      });
    });

    test('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      mockLogin.mockResolvedValue({ success: false, error: errorMessage });

      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
        expect(mockSetCurrentScreen).not.toHaveBeenCalled();
      });
    });

    test('should show loading state during login', async () => {
      useAuth.mockReturnValue({
        login: mockLogin,
        error: null,
        isLoading: true,
        clearError: mockClearError
      });

      render(<LoginScreen />);

      const submitButton = screen.getByRole('button', { name: /connexion\.\.\./i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Connexion...')).toBeInTheDocument();
    });
  });

  describe('Registration Flow', () => {
    test('should handle successful registration', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authMode') return 'register';
        return null;
      });

      authService.register.mockResolvedValue({
        success: true,
        user: { id: 1, name: 'John Doe' },
        token: 'test-token'
      });
      mockLogin.mockResolvedValue({ success: true, user: { id: 1, name: 'John Doe' } });

      const user = userEvent.setup();
      render(<LoginScreen />);

      const nameInput = screen.getByPlaceholderText('Votre nom');
      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirmez votre mot de passe');
      const submitButton = screen.getByRole('button', { name: /s'inscrire/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123'
        });
        expect(mockLogin).toHaveBeenCalledWith('john@example.com', 'password123');
        expect(mockSetCurrentScreen).toHaveBeenCalledWith('onboarding', true, true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('isNewUser', 'true');
      });
    });

    test('should handle registration failure', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authMode') return 'register';
        return null;
      });

      const errorMessage = 'Email already exists';
      authService.register.mockResolvedValue({
        success: false,
        message: errorMessage
      });

      const user = userEvent.setup();
      render(<LoginScreen />);

      const nameInput = screen.getByPlaceholderText('Votre nom');
      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const confirmPasswordInput = screen.getByPlaceholderText('Confirmez votre mot de passe');
      const submitButton = screen.getByRole('button', { name: /s'inscrire/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalled();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display auth context errors', () => {
      useAuth.mockReturnValue({
        login: mockLogin,
        error: 'Network error',
        isLoading: false,
        clearError: mockClearError
      });

      render(<LoginScreen />);

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    test('should clear auth errors when user types', async () => {
      useAuth.mockReturnValue({
        login: mockLogin,
        error: 'Some error',
        isLoading: false,
        clearError: mockClearError
      });

      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      await user.type(emailInput, 'a');

      expect(mockClearError).toHaveBeenCalled();
    });

    test('should handle network errors gracefully', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Erreur de réseau')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels', () => {
      render(<LoginScreen />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    });

    test('should have proper ARIA attributes for errors', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      await user.click(submitButton);

      const errorElement = screen.getByText('L\'email est requis');
      expect(errorElement).toHaveClass('text-red-500');
    });

    test('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<LoginScreen />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByPlaceholderText('votre@email.com')).toHaveFocus();

      await user.tab();
      expect(screen.getByPlaceholderText('Votre mot de passe')).toHaveFocus();

      await user.tab();
      const passwordToggle = document.activeElement;
      expect(passwordToggle.tagName).toBe('BUTTON');

      await user.tab();
      expect(screen.getByRole('button', { name: /se connecter/i })).toHaveFocus();
    });
  });

  describe('Dark Mode', () => {
    test('should apply dark mode styles', () => {
      const { container } = render(<LoginScreen darkMode={true} />);

      expect(container.firstChild).toHaveClass('pluqla-bg-dark');
    });

    test('should apply light mode styles', () => {
      const { container } = render(<LoginScreen darkMode={false} />);

      expect(container.firstChild).toHaveClass('pluqla-bg-light');
    });
  });
});