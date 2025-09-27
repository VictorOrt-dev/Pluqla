import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import LanguageSelector from '../../components/common/LanguageSelector';

// Mock des fonctions i18n
jest.mock('../../i18n', () => ({
  ...jest.requireActual('../../i18n'),
  changeLanguage: jest.fn(() => Promise.resolve()),
  getCurrentLanguage: jest.fn(() => 'fr'),
  getSupportedLanguages: jest.fn(() => ['fr', 'en', 'es'])
}));

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('LanguageSelector Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dropdown variant', () => {
    it('should render language selector with French flag by default', () => {
      renderWithI18n(<LanguageSelector variant="dropdown" />);

      expect(screen.getByText('🇫🇷')).toBeInTheDocument();
      expect(screen.getByText('Français')).toBeInTheDocument();
    });

    it('should show dropdown menu when clicked', () => {
      renderWithI18n(<LanguageSelector variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('🇪🇸')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
    });

    it('should call changeLanguage when selecting a different language', async () => {
      const { changeLanguage } = require('../../i18n');
      renderWithI18n(<LanguageSelector variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const englishOption = screen.getByText('English').closest('button');
      fireEvent.click(englishOption);

      await waitFor(() => {
        expect(changeLanguage).toHaveBeenCalledWith('en');
      });
    });

    it('should close dropdown when clicking outside', () => {
      renderWithI18n(<LanguageSelector variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Vérifier que le dropdown est ouvert
      expect(screen.getByText('English')).toBeInTheDocument();

      // Simuler un clic à l'extérieur
      fireEvent.click(document.body);

      // Le dropdown devrait être fermé
      expect(screen.queryByText('English')).not.toBeInTheDocument();
    });
  });

  describe('Pills variant', () => {
    it('should render language pills', () => {
      renderWithI18n(<LanguageSelector variant="pills" />);

      expect(screen.getByText('🇫🇷')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('🇪🇸')).toBeInTheDocument();
      expect(screen.getByText('Français')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
    });

    it('should highlight current language pill', () => {
      renderWithI18n(<LanguageSelector variant="pills" />);

      const frenchPill = screen.getByText('Français').closest('button');
      expect(frenchPill).toHaveClass('bg-gradient-to-r', 'from-blue-500', 'to-red-500');
    });

    it('should change language when clicking a pill', async () => {
      const { changeLanguage } = require('../../i18n');
      renderWithI18n(<LanguageSelector variant="pills" />);

      const englishPill = screen.getByText('English').closest('button');
      fireEvent.click(englishPill);

      await waitFor(() => {
        expect(changeLanguage).toHaveBeenCalledWith('en');
      });
    });
  });

  describe('Minimal variant', () => {
    it('should render only flag icons', () => {
      renderWithI18n(<LanguageSelector variant="minimal" />);

      expect(screen.getByText('🇫🇷')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('🇪🇸')).toBeInTheDocument();

      // Ne devrait pas afficher les noms des langues
      expect(screen.queryByText('Français')).not.toBeInTheDocument();
      expect(screen.queryByText('English')).not.toBeInTheDocument();
    });

    it('should show language name in title attribute', () => {
      renderWithI18n(<LanguageSelector variant="minimal" />);

      const frenchButton = screen.getByTitle('Français');
      const englishButton = screen.getByTitle('English');
      const spanishButton = screen.getByTitle('Español');

      expect(frenchButton).toBeInTheDocument();
      expect(englishButton).toBeInTheDocument();
      expect(spanishButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for dropdown', () => {
      renderWithI18n(<LanguageSelector variant="dropdown" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be keyboard navigable', () => {
      renderWithI18n(<LanguageSelector variant="dropdown" />);

      const button = screen.getByRole('button');

      // Tester l'ouverture avec Enter
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('Dark mode', () => {
    it('should apply dark mode classes when darkMode is true', () => {
      renderWithI18n(<LanguageSelector variant="dropdown" darkMode={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-gray-700', 'bg-gray-900', 'text-white');
    });

    it('should apply light mode classes when darkMode is false', () => {
      renderWithI18n(<LanguageSelector variant="dropdown" darkMode={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-gray-300', 'bg-white', 'text-gray-700');
    });
  });

  describe('Error handling', () => {
    it('should handle changeLanguage errors gracefully', async () => {
      const { changeLanguage } = require('../../i18n');
      changeLanguage.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithI18n(<LanguageSelector variant="dropdown" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const englishOption = screen.getByText('English').closest('button');
      fireEvent.click(englishOption);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error changing language:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});