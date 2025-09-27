import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const CategoryGrid = ({ darkMode }) => {
  const { setCurrentScreen } = useNavigation();

  const categories = [
    {
      id: 'activite',
      title: 'Loisirs',
      icon: '🎭',
      notifications: 3
    },
    {
      id: 'habits',
      title: 'Mode',
      icon: '👕',
      notifications: 0
    },
    {
      id: 'deplacement',
      title: 'Transport',
      icon: '🚗',
      notifications: 0
    },
    {
      id: 'alimentation',
      title: 'Alimentation',
      icon: '🍕',
      notifications: 5
    }
  ];

  return (
    <div>
      {/* Grid des 4 features principales sous le rond - Optimisé mobile-first */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm sm:max-w-md mx-auto">
        {categories.map((category, index) => (
          <button
            key={category.id}
            onClick={() => setCurrentScreen(category.id)}
            className={`pluqla-card-${darkMode ? 'dark' : 'light'} p-4 sm:p-6 text-center relative pluqla-scale-in touch-manipulation min-h-[100px] sm:min-h-[120px] flex flex-col justify-center hover:scale-105 transition-all duration-300 ${
              darkMode
                ? 'hover:shadow-[0_8px_32px_rgba(241,69,69,0.3)] hover:border-[#F14545]/20'
                : 'hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)] border border-transparent hover:border-[#F14545]/10'
            }`}
            style={{
              animationDelay: `${index * 100}ms`,
              ...(!darkMode && {
                background: 'linear-gradient(145deg, #FFFFFF 0%, #FFFAFA 100%)'
              })
            }}
          >
            {/* Notification indicator */}
            {category.notifications > 0 && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--pluqla-gradient-main)' }}>
                  <span className="text-white text-xs font-bold">
                    {category.notifications}
                  </span>
                </div>
              </div>
            )}

            {/* Category content centré et compact */}
            <div className="space-y-2">
              {/* Icon optimisé */}
              <div className="mx-auto">
                <span className="text-3xl sm:text-4xl">
                  {category.icon}
                </span>
              </div>

              {/* Title centré et compact */}
              <div>
                <h3 className={`text-sm sm:text-base font-bold transition-colors duration-300 ${
                  darkMode ? 'text-white group-hover:text-[#FF6B6B]' : 'text-[#121212] hover:text-[#F14545]'
                }`}>
                  {category.title}
                </h3>
              </div>
            </div>
          </button>
        ))}
      </div>

    </div>
  );
};

export default CategoryGrid;