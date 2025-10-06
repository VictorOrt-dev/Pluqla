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
    }`}>
      {/* Header with back button - matching HomeScreen DA */}
      <div className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        darkMode
          ? 'bg-gradient-to-b from-[#121212] to-[#1a0b0b] border-[#F14545]/30 backdrop-blur-xl'
          : 'bg-gradient-to-b from-[#FAFAFA]/95 to-[#F5F5F5]/95 border-[#F14545]/20 backdrop-blur-xl shadow-sm'
      }`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <button
            onClick={() => setCurrentScreen('home')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-2xl transition-all duration-200 ${
              darkMode
                ? 'text-white/80 hover:text-white hover:bg-black/40'
                : 'text-gray-700 hover:text-[#121212] hover:bg-black/10'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-semibold">Retour</span>
          </button>

          <h1 className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
            darkMode
              ? 'text-white drop-shadow-[0_0_4px_rgba(255,107,107,0.4)]'
              : 'text-[#121212] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
          }`}>
            Finance
          </h1>

          <div className="w-16 sm:w-20"></div> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Main content */}
      <Dashboard darkMode={darkMode} />
    </div>
  );
};

export default FinancePage;