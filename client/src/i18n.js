import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des fichiers de traduction
import translationFR from './i18n/locales/fr/translation.json';
import translationEN from './i18n/locales/en/translation.json';
import translationES from './i18n/locales/es/translation.json';

// Configuration des ressources de traduction
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

// Configuration personnalisée du détecteur de langue
const languageDetectorOptions = {
  // Ordre de priorité pour détecter la langue
  order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],

  // Clés de localStorage
  lookupLocalStorage: 'i18nextLng',

  // Cache la langue détectée
  caches: ['localStorage'],

  // Exclure certains détecteurs en cas de problème
  excludeCacheFor: ['cimode'], // mode de développement

  // Ne pas détecter automatiquement depuis le navigateur si une langue est en cache
  checkWhitelist: true
};

i18n
  // Plugin de détection de langue
  .use(LanguageDetector)
  // Plugin React
  .use(initReactI18next)
  // Configuration
  .init({
    resources,

    // Langue par défaut
    fallbackLng: 'fr',

    // Langue par défaut si la détection échoue
    lng: 'fr',

    // Langues supportées
    supportedLngs: ['fr', 'en', 'es'],

    // Configuration du détecteur
    detection: languageDetectorOptions,

    // Mode debug (activé en développement)
    debug: process.env.NODE_ENV === 'development',

    // Configuration de l'interpolation
    interpolation: {
      escapeValue: false, // React fait déjà l'échappement
      format: function(value, format, lng) {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (format === 'capitalize') return value.charAt(0).toUpperCase() + value.slice(1);
        return value;
      }
    },

    // Namespace par défaut
    defaultNS: 'translation',

    // Comportement des clés manquantes
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing translation: ${key} for language: ${lng}`);
      }
      return fallbackValue || key;
    },

    // Comportement lors du changement de langue
    cleanCode: true,

    // Retourner un objet au lieu de la clé si la traduction n'existe pas
    returnObjects: false,

    // Utiliser la clé comme valeur par défaut si pas de traduction
    returnEmptyString: false,

    // Configuration React
    react: {
      // Re-render quand la langue change
      bindI18n: 'languageChanged',

      // Re-render quand les ressources changent
      bindI18nStore: '',

      // Utiliser les Suspense boundaries
      useSuspense: false, // Changed to false to avoid suspension issues

      // Délai par défaut pour Suspense
      wait: false
    }
  });

// Fonction utilitaire pour changer la langue
export const changeLanguage = (lng) => {
  console.log(`[i18n] 🌍 Changing language from ${i18n.language} to ${lng}`);

  // Ensure we don't trigger unnecessary re-authentication
  const currentLang = i18n.language;
  if (currentLang === lng) {
    console.log(`[i18n] ✅ Language already set to ${lng}, skipping change`);
    return Promise.resolve(true);
  }

  return i18n.changeLanguage(lng).then(() => {
    console.log(`[i18n] ✅ Language changed successfully to ${i18n.language}`);
    console.log(`[i18n] 💾 Language persisted in localStorage: ${localStorage.getItem('i18nextLng')}`);

    // Force une mise à jour pour tous les composants qui utilisent useTranslation
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: {
          language: lng,
          previousLanguage: currentLang
        }
      }));
    }
    return true;
  }).catch((error) => {
    console.error('[i18n] ❌ Failed to change language:', error);
    return false;
  });
};

// Fonction utilitaire pour obtenir la langue actuelle
export const getCurrentLanguage = () => {
  try {
    return i18n.language || 'fr';
  } catch (error) {
    console.warn('i18n not ready, using fallback language');
    return 'fr';
  }
};

// Fonction utilitaire pour obtenir les langues supportées
export const getSupportedLanguages = () => {
  try {
    return i18n.options?.supportedLngs?.filter(lang => lang !== 'cimode') || ['fr'];
  } catch (error) {
    console.warn('i18n not ready, using fallback languages');
    return ['fr'];
  }
};

// Fonction utilitaire pour vérifier si une langue est supportée
export const isLanguageSupported = (lng) => {
  return getSupportedLanguages().includes(lng);
};

// Configuration pour envoyer la langue au backend
export const getLanguageForAPI = () => {
  const currentLang = getCurrentLanguage();
  // Normaliser les codes de langue (ex: 'en-US' -> 'en')
  return currentLang.split('-')[0];
};

export default i18n;