import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../contexts/NavigationContext';
import Dashboard from '../components/finance/Dashboard';

const FinancePage = ({ userData, darkMode }) => {
  const { t } = useTranslation();
  const { setCurrentScreen } = useNavigation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-screen transition-all duration-500 transform ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    } ${darkMode ? 'bg-black' : 'bg-gradient-to-br from-gray-50 via-white to-red-50/20'}`}>
      {/* Header with back button */}
      <div className={`sticky top-0 z-10 border-b transition-colors duration-300 ${
        darkMode
          ? 'bg-black/80 backdrop-blur-lg border-gray-800'
          : 'bg-white/80 backdrop-blur-lg border-gray-200'
      }`}>
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => setCurrentScreen('home')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">{t('common.back')}</span>
          </button>

          <h1 className={`text-xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {t('finance.title')}
          </h1>

          <div className="w-20"></div> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Main content */}
      <div className="relative">
        <Dashboard userData={userData} darkMode={darkMode} />
      </div>
    </div>
  );
};

export default FinancePage;