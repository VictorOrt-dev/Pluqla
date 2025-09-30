import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage, getSupportedLanguages } from '../../i18n';

const LanguageSelector = ({
  variant = 'dropdown', // 'dropdown', 'pills', 'minimal'
  showLabels = true,
  className = '',
  darkMode = false
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Protection contre les erreurs d'initialisation i18n
  let currentLang, supportedLanguages;
  try {
    currentLang = getCurrentLanguage() || 'fr';
    supportedLanguages = getSupportedLanguages() || ['fr'];
  } catch (error) {
    console.warn('i18n not ready, using fallbacks:', error);
    currentLang = 'fr';
    supportedLanguages = ['fr'];
  }

  const languages = {
    fr: {
      code: 'fr',
      name: t('language.french'),
      nativeName: 'Français',
      flag: '🇫🇷'
    },
    en: {
      code: 'en',
      name: t('language.english'),
      nativeName: 'English',
      flag: '🇺🇸'
    },
    es: {
      code: 'es',
      name: t('language.spanish'),
      nativeName: 'Español',
      flag: '🇪🇸'
    }
  };

  // Fonction pour obtenir les langues supportées avec fallback sécurisé
  const getSafeLanguages = () => {
    const supportedLangs = supportedLanguages || ['fr'];
    return supportedLangs.filter(langCode => languages[langCode]);
  };

  const safeLanguages = getSafeLanguages();

  const handleLanguageChange = async (langCode) => {
    try {
      console.log(`[LanguageSelector] 🎯 Starting language change to: ${langCode}`);
      console.log(`[LanguageSelector] 🔒 Authentication state before change: preserved`);

      const result = await changeLanguage(langCode);
      setIsOpen(false);

      if (result) {
        console.log(`[LanguageSelector] ✅ Language changed successfully to: ${langCode}`);
        console.log(`[LanguageSelector] 🔒 Authentication state after change: should remain preserved`);

        // Force a small delay to ensure the language has been set
        setTimeout(() => {
          // Force re-render by triggering a custom event
          window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: langCode }
          }));
          console.log(`[LanguageSelector] 📡 Custom languageChanged event dispatched`);
        }, 100);
      } else {
        console.error(`[LanguageSelector] ❌ Failed to change language to: ${langCode}`);
      }

      // Analytics event si disponible
      if (window.gtag) {
        window.gtag('event', 'language_change', {
          new_language: langCode,
          previous_language: currentLang
        });
      }

      // Notification de succès
      if (window.showNotification && languages[langCode]) {
        window.showNotification(
          t('notifications.success.language_changed', {
            language: languages[langCode].nativeName
          }),
          'success'
        );
      }
    } catch (error) {
      console.error('Erreur lors du changement de langue:', error);
      if (window.showNotification) {
        window.showNotification(t('notifications.error.generic_error'), 'error');
      }
    }
  };

  const getCurrentLanguageData = () => {
    // Protection supplémentaire : assurer que currentLang existe dans languages
    const safeLang = (currentLang && languages[currentLang]) ? currentLang : 'fr';
    return languages[safeLang] || languages.fr;
  };

  // Variant Pills (pour onboarding)
  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {showLabels && (
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mr-2`}>
            {t('language.selector')}:
          </span>
        )}
        {safeLanguages.map((langCode) => {
          const lang = languages[langCode];
          const isActive = currentLang === langCode;

          return (
            <button
              key={langCode}
              onClick={() => handleLanguageChange(langCode)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'pluqla-btn-primary text-white'
                  : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span className="mr-1">{lang?.flag || '🏳️'}</span>
              {lang?.nativeName || langCode}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant Minimal (juste les drapeaux)
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {safeLanguages.map((langCode) => {
          const lang = languages[langCode];
          const isActive = currentLang === langCode;

          return (
            <button
              key={langCode}
              onClick={() => handleLanguageChange(langCode)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900 scale-110'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={lang?.nativeName || langCode}
            >
              {lang?.flag || '🏳️'}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant Dropdown (par défaut)
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${
          darkMode
            ? 'border-gray-600 bg-gray-800/50 text-white hover:bg-gray-700 hover:border-[#F14545]/50'
            : 'border-gray-300 bg-white/90 text-gray-700 hover:bg-gray-50 hover:border-[#F14545]/40'
        } ${isOpen ? 'ring-2 ring-[#F14545]/30 border-[#F14545]/50' : ''} backdrop-blur-sm`}
      >
        <span className="text-lg">{getCurrentLanguageData().flag}</span>
        {showLabels && (
          <span className="text-sm font-medium">
            {getCurrentLanguageData().nativeName}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop pour fermer le dropdown */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu dropdown */}
          <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-xl border z-20 ${
            darkMode
              ? 'border-gray-600 bg-gray-800/95 backdrop-blur-md'
              : 'border-gray-200 bg-white/95 backdrop-blur-md'
          } shadow-[#F14545]/10`}>
            <div className="py-1">
              {supportedLanguages.filter(langCode => languages[langCode]).map((langCode) => {
                const lang = languages[langCode];
                const isActive = currentLang === langCode;

                return (
                  <button
                    key={langCode}
                    onClick={() => handleLanguageChange(langCode)}
                    className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? darkMode
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-blue-50 text-blue-700'
                        : darkMode
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{lang?.flag || '🏳️'}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{lang?.nativeName || langCode}</div>
                      {showLabels && (
                        <div className={`text-xs ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {lang?.name || langCode}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;