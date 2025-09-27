import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../contexts/NavigationContext';
import SuggestionsCard from './SuggestionsCard';

const SuggestionsDetailScreen = ({ darkMode }) => {
  const { t } = useTranslation();
  const { setCurrentScreen } = useNavigation();

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => setCurrentScreen('finance')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            darkMode
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t('common.back')}</span>
        </button>
      </div>

      {/* Suggestions détaillées */}
      <SuggestionsCard darkMode={darkMode} detailed={true} />
    </div>
  );
};

export default SuggestionsDetailScreen;