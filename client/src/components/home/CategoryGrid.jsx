import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const CategoryGrid = ({ darkMode }) => {
  const { setCurrentScreen } = useNavigation();

  const categories = [
    {
      id: 'finance',
      title: 'Finance',
      icon: '/assets/logos/logo_economies.png',
      iconType: 'image',
      iconAlt: 'Mascotte Économies Pluqla',
      notifications: 0,
      isPremium: true
    },
    {
      id: 'alimentation',
      title: 'Alimentation',
      icon: '/assets/logos/logo_food.png',
      iconType: 'image',
      iconAlt: 'Mascotte Alimentation',
      notifications: 5
    },
    {
      id: 'deplacement',
      title: 'Transport',
      icon: '/assets/logos/logo_transport.png',
      iconType: 'image',
      iconAlt: 'Mascotte Transport',
      notifications: 0
    },
    {
      id: 'habits',
      title: 'Habits',
      icon: '/assets/logos/logo_mode.png',
      iconType: 'image',
      iconAlt: 'Mascotte Habits',
      notifications: 0
    },
    {
      id: 'activite',
      title: 'Activité',
      icon: '/assets/logos/logo_lifestyle.png',
      iconType: 'image',
      iconAlt: 'Mascotte Activité',
      notifications: 3
    }
  ];

  return (
    <div>
      {/* Grid des categories - Layout adaptatif */}
      <div className="space-y-3 max-w-sm sm:max-w-md mx-auto">
        {/* Finance Card - Featured prominently */}
        <div className="w-full">
          <button
            key={categories[0].id}
            onClick={() => setCurrentScreen(categories[0].id)}
            className={`relative w-full p-4 sm:p-6 text-center pluqla-scale-in touch-manipulation min-h-[100px] sm:min-h-[120px] flex flex-col justify-center transition-all duration-300 rounded-2xl border group overflow-hidden ${
              darkMode
                ? 'bg-gradient-to-r from-blue-900/90 to-indigo-900/90 border-blue-400/20 hover:border-blue-400/50 hover:shadow-[0_12px_40px_rgba(59,130,246,0.3)] hover:scale-105'
                : 'bg-gradient-to-r from-blue-50/98 to-indigo-50/95 border-blue-200 hover:border-blue-400/40 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)] hover:scale-105'
            } backdrop-blur-sm shadow-lg hover:shadow-xl`}
            style={{
              animationDelay: `0ms`
            }}
          >
            {/* Premium badge for finance */}
            <div className="absolute top-3 right-3 z-10">
              <div className="px-2 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/40">
                <span className="text-white text-xs font-bold">
                  NEW
                </span>
              </div>
            </div>

            {/* Premium hover glow overlay */}
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              darkMode
                ? 'bg-gradient-to-br from-blue-500/5 to-indigo-500/5'
                : 'bg-gradient-to-br from-blue-500/8 to-indigo-500/6 shadow-inner'
            }`}></div>

            {/* Category content */}
            <div className="space-y-2 relative z-10">
              <div className="mx-auto transform transition-transform duration-300 group-hover:scale-110 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 p-2">
                {categories[0].iconType === 'image' ? (
                  <img
                    src={categories[0].icon}
                    alt={categories[0].iconAlt || categories[0].title}
                    loading="lazy"
                    className={`max-w-full max-h-full object-contain transition-all duration-300 ${
                      darkMode
                        ? 'drop-shadow-lg group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                        : 'drop-shadow-md group-hover:drop-shadow-[0_6px_12px_rgba(59,130,246,0.4)] group-hover:filter group-hover:brightness-110'
                    }`}
                    style={{
                      imageRendering: '-webkit-optimize-contrast',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                ) : (
                  <span className={`text-3xl sm:text-4xl transition-all duration-300 ${
                    darkMode
                      ? 'drop-shadow-lg group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                      : 'drop-shadow-md group-hover:drop-shadow-[0_4px_8px_rgba(59,130,246,0.3)] group-hover:filter group-hover:brightness-110'
                  }`}>
                    {categories[0].icon}
                  </span>
                )}
              </div>
              <div>
                <h3 className={`text-sm sm:text-base font-bold transition-all duration-300 ${
                  darkMode
                    ? 'text-white group-hover:text-blue-400 group-hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]'
                    : 'text-[#121212] group-hover:text-blue-600 group-hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.4)]'
                }`}>
                  {categories[0].title}
                </h3>
              </div>
            </div>
          </button>
        </div>

        {/* Other Categories Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {categories.slice(1).map((category, index) => (
            <button
              key={category.id}
              onClick={() => setCurrentScreen(category.id)}
              className={`relative p-4 sm:p-6 text-center pluqla-scale-in touch-manipulation min-h-[100px] sm:min-h-[120px] flex flex-col justify-center transition-all duration-300 rounded-2xl border group overflow-hidden ${
                darkMode
                  ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_12px_40px_rgba(241,69,69,0.3)] hover:scale-105'
                  : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_8px_32px_rgba(241,69,69,0.15)] hover:scale-105'
              } backdrop-blur-sm shadow-lg hover:shadow-xl`}
              style={{
                animationDelay: `${(index + 1) * 100}ms`
              }}
            >
            {/* Premium notification indicator with glow */}
            {category.notifications > 0 && (
              <div className="absolute top-3 right-3 z-10">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-r from-[#F14545] to-[#FF6B6B] shadow-lg shadow-[#F14545]/40 animate-pulse">
                  <span className="text-white text-xs font-bold">
                    {category.notifications}
                  </span>
                </div>
              </div>
            )}

            {/* Premium hover glow overlay - enhanced for light mode */}
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              darkMode
                ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
                : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
            }`}></div>

            {/* Light mode premium border glow effect */}
            {!darkMode && (
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[inset_0_1px_0_rgba(241,69,69,0.1)]"></div>
            )}

            {/* Category content centré et compact with relative positioning */}
            <div className="space-y-2 relative z-10">
              {/* Icon with enhanced light mode effects */}
              <div className="mx-auto transform transition-transform duration-300 group-hover:scale-110 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 p-2">
                {category.iconType === 'image' ? (
                  <img
                    src={category.icon}
                    alt={category.iconAlt || category.title}
                    loading="lazy"
                    className={`max-w-full max-h-full object-contain transition-all duration-300 ${
                      darkMode
                        ? 'drop-shadow-lg group-hover:drop-shadow-[0_0_12px_rgba(241,69,69,0.5)]'
                        : 'drop-shadow-md group-hover:drop-shadow-[0_6px_12px_rgba(241,69,69,0.4)] group-hover:filter group-hover:brightness-110'
                    }`}
                    style={{
                      imageRendering: '-webkit-optimize-contrast',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                ) : (
                  <span className={`text-3xl sm:text-4xl transition-all duration-300 ${
                    darkMode
                      ? 'drop-shadow-lg group-hover:drop-shadow-[0_0_8px_rgba(241,69,69,0.4)]'
                      : 'drop-shadow-md group-hover:drop-shadow-[0_4px_8px_rgba(241,69,69,0.3)] group-hover:filter group-hover:brightness-110'
                  }`}>
                    {category.icon}
                  </span>
                )}
              </div>

              {/* Title with enhanced hover effects */}
              <div>
                <h3 className={`text-sm sm:text-base font-bold transition-all duration-300 ${
                  darkMode
                    ? 'text-white group-hover:text-[#FF6B6B] group-hover:drop-shadow-[0_0_4px_rgba(255,107,107,0.6)]'
                    : 'text-[#121212] group-hover:text-[#F14545] group-hover:drop-shadow-[0_0_4px_rgba(241,69,69,0.4)]'
                }`}>
                  {category.title}
                </h3>
              </div>
            </div>
          </button>
        ))}
        </div>
      </div>

    </div>
  );
};

export default CategoryGrid;