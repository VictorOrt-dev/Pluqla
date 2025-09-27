import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const Navigation = ({ darkMode, userData, currentScreen }) => {
  const { setCurrentScreen } = useNavigation();

  const navItems = [
    {
      id: 'home',
      icon: '🏠',
      label: 'Accueil',
      active: currentScreen === 'home'
    },
    {
      id: 'finance',
      icon: '📊',
      label: 'Finance',
      active: currentScreen === 'finance'
    },
    {
      id: 'profile',
      icon: '👤',
      label: 'Profil',
      active: currentScreen === 'profile'
    }
  ];

  const handleNavigation = (screenId) => {
    console.log('👆 Navigation manuelle vers:', screenId);
    setCurrentScreen(screenId, true, true); // Marquer comme navigation manuelle
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${darkMode ? 'bg-black/95 border-gray-800' : 'bg-white/95 border-gray-200'} backdrop-blur-xl border-t`}>
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.id)}
            className={`py-3 px-4 flex flex-col items-center relative transition-all duration-200 hover:scale-105 min-h-[48px] min-w-[48px] ${
              item.active ? 'transform scale-105' : ''
            }`}
            aria-label={`Naviguer vers ${item.label}`}
          >
            <span className={`text-xl mb-1 transition-all duration-200 ${
              item.active ? 'opacity-100' : 'opacity-50'
            }`}>
              {item.icon}
            </span>
            <span className={`text-[10px] transition-all duration-200 ${
              item.active
                ? 'text-red-500 font-semibold'
                : darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {item.label}
            </span>

            {/* Badge indicator */}
            {item.badge && (
              <div className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}

            {/* Active indicator */}
            {item.active && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Navigation;