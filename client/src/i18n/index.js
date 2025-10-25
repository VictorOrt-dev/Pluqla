import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ⚡ Performance: Import seulement la langue par défaut (FR)
// Les autres langues seront chargées dynamiquement si nécessaire
import translationFR from './locales/fr/translation.json';

// Configuration des ressources de traduction (FR seulement au démarrage)
const resources = {
  fr: {
    translation: translationFR
  }
  // EN et ES seront chargés via lazy loading
};

// Fonction pour charger une langue dynamiquement
async function loadLanguage(lng) {
  if (resources[lng]) {
    // Déjà chargé
    return resources[lng].translation;
  }

  try {
    let translation;
    switch (lng) {
      case 'en':
        translation = await import('./locales/en/translation.json');
        break;
      case 'es':
        translation = await import('./locales/es/translation.json');
        break;
      default:
        console.warn(`Language ${lng} not supported`);
        return null;
    }

    // Ajouter aux ressources
    resources[lng] = {
      translation: translation.default || translation
    };

    // Ajouter à i18n
    i18n.addResourceBundle(lng, 'translation', translation.default || translation);

    return translation.default || translation;
  } catch (error) {
    console.error(`Failed to load language ${lng}:`, error);
    return null;
  }
}

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

    // Mode debug (désactivé en production)
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
      useSuspense: true,

      // Délai par défaut pour Suspense
      wait: false
    }
  });

// Fonction utilitaire pour changer la langue avec lazy loading
export const changeLanguage = async (lng) => {
  // Charger la langue si pas encore chargée
  await loadLanguage(lng);

  // Changer la langue
  return i18n.changeLanguage(lng);
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