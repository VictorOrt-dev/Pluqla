import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import translationFR from './i18n/locales/fr/translation.json';
import translationEN from './i18n/locales/en/translation.json';
import translationES from './i18n/locales/es/translation.json';

const resources = {
  fr: {
    translation: translationFR
  },
  en: {
    translation: translationEN
  },
  es: {
    translation: translationES
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false
    },

    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie']
    }
  });

// Utility functions
export const getCurrentLanguage = () => {
  return i18n.language || 'fr';
};

export const getSupportedLanguages = () => {
  return [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];
};

export const changeLanguage = async (language) => {
  try {
    await i18n.changeLanguage(language);
    return true;
  } catch (error) {
    console.error('Failed to change language:', error);
    return false;
  }
};

export const getLanguageForAPI = () => {
  const lang = getCurrentLanguage();
  // Normaliser les codes de langue pour l'API
  switch (lang) {
    case 'en':
    case 'en-US':
      return 'en';
    case 'es':
    case 'es-ES':
      return 'es';
    case 'fr':
    case 'fr-FR':
    default:
      return 'fr';
  }
};

export default i18n;