import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { getEnabledCategories } from '../../config/featureFlags';

const CategoryGrid = ({ darkMode, userData }) => {
  const { setCurrentScreen } = useNavigation();

  // Micro-informations intelligentes par feature (dynamiques selon contexte)
  const getMicroInfo = (categoryId) => {
    const currentHour = new Date().getHours();

    switch(categoryId) {
      case 'finance':
        // Finance sans micro-info - Layout centré épuré
        return null;

      case 'alimentation':
        // Suggestion contextuelle selon l'heure
        let mealTime = 'Déjeuner';
        if (currentHour < 11) mealTime = 'Petit-déj';
        else if (currentHour >= 14 && currentHour < 19) mealTime = 'Dîner';
        else if (currentHour >= 19) mealTime = 'Dîner';
        return { label: 'Prochain', value: mealTime };

      case 'deplacement':
        // Calcul approximatif basé sur économies (fictif mais cohérent)
        const savedAmount = userData?.savedAmount || 0;
        const kmSaved = Math.floor(savedAmount / 8); // ~8€ = 10km transport
        return { label: 'Économisé', value: `${kmSaved}km` };

      default:
        return null;
    }
  };

  // ⚠️ TOUTES les catégories sont définies ici (aucune suppression)
  // Le filtrage se fait via feature flags pour la V1
  // Pour réactiver habits/activite: voir client/src/config/featureFlags.js
  const allCategories = [
    {
      id: 'finance',
      title: 'Finance',
      icon: '/assets/logos/logo_economies.png',
      iconType: 'image',
      iconAlt: 'Mascotte Économies Pluqla',
      notifications: 0,
      isPremium: true,
      microInfo: getMicroInfo('finance')
    },
    {
      id: 'alimentation',
      title: 'Alimentation',
      icon: '/assets/logos/logo_food.png',
      iconType: 'image',
      iconAlt: 'Mascotte Alimentation',
      notifications: 5,
      microInfo: getMicroInfo('alimentation')
    },
    {
      id: 'deplacement',
      title: 'Transport',
      icon: '/assets/logos/logo_transport.png',
      iconType: 'image',
      iconAlt: 'Mascotte Transport',
      notifications: 0,
      microInfo: getMicroInfo('deplacement')
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

  // ✅ Filtrage dynamique selon feature flags
  // En V1: 3 features (finance, alimentation, deplacement)
  // En V2+: 5 features (si habits et activite réactivés)
  const categories = getEnabledCategories(allCategories);

  // Calcul dynamique du layout
  // 3 features → 1 premium + 2 normales (grid 1x2)
  // 5 features → 1 premium + 4 normales (grid 2x2)
  const otherCategories = categories.slice(1);
  const gridCols = otherCategories.length <= 2 ? 'grid-cols-2' : 'grid-cols-2';

  return (
    <div>
      {/* Grid harmonieux - Espace optimisé */}
      <div className="space-y-3 max-w-sm sm:max-w-md mx-auto">
        {/* Finance Card - Featured avec rouge premium (cohérence Pluqla) */}
        <div className="w-full">
          <button
            key={categories[0].id}
            onClick={() => setCurrentScreen(categories[0].id)}
            className={`relative w-full p-4 text-center pluqla-scale-in touch-manipulation min-h-[115px] flex flex-col justify-center transition-all duration-300 rounded-xl border group overflow-hidden ${
              darkMode
                ? 'bg-gradient-to-b from-gray-900/95 to-gray-800/90 border-white/10 hover:border-[#F14545]/60 hover:scale-[1.02]'
                : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/50 hover:scale-[1.02]'
            } backdrop-blur-sm shadow-[0_8px_24px_rgba(241,69,69,0.25)] hover:shadow-[0_12px_40px_rgba(241,69,69,0.4)]`}
            style={{
              animationDelay: `0ms`
            }}
          >
            {/* Premium hover glow overlay - Rouge Pluqla */}
            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              darkMode
                ? 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/8'
                : 'bg-gradient-to-br from-[#F14545]/12 to-[#FF6B6B]/10 shadow-inner'
            }`}></div>

            {/* Ring effet premium pour différencier */}
            <div className="absolute inset-0 rounded-xl opacity-70 ring-1 ring-inset ring-[#F14545]/20 group-hover:ring-[#F14545]/40 transition-all duration-300"></div>

            {/* Category content centré */}
            <div className="flex items-center justify-center space-x-3 px-2 relative z-10">
              <div className="transform transition-transform duration-300 group-hover:scale-110 flex items-center justify-center w-14 h-14 p-2">
                {categories[0].iconType === 'image' ? (
                  <img
                    src={categories[0].icon}
                    alt={categories[0].iconAlt || categories[0].title}
                    loading="lazy"
                    className={`max-w-full max-h-full object-contain transition-all duration-300 ${
                      darkMode
                        ? 'drop-shadow-lg group-hover:drop-shadow-[0_0_12px_rgba(241,69,69,0.6)]'
                        : 'drop-shadow-md group-hover:drop-shadow-[0_6px_12px_rgba(241,69,69,0.5)] group-hover:filter group-hover:brightness-110'
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
                  <span className={`text-3xl transition-all duration-300 ${
                    darkMode
                      ? 'drop-shadow-lg group-hover:drop-shadow-[0_0_8px_rgba(241,69,69,0.5)]'
                      : 'drop-shadow-md group-hover:drop-shadow-[0_4px_8px_rgba(241,69,69,0.4)] group-hover:filter group-hover:brightness-110'
                  }`}>
                    {categories[0].icon}
                  </span>
                )}
              </div>
              <h3 className={`text-base font-bold transition-all duration-300 ${
                darkMode
                  ? 'text-white group-hover:text-[#FF6B6B] group-hover:drop-shadow-[0_0_4px_rgba(255,107,107,0.6)]'
                  : 'text-[#121212] group-hover:text-[#F14545] group-hover:drop-shadow-[0_0_4px_rgba(241,69,69,0.5)]'
              }`}>
                {categories[0].title}
              </h3>
            </div>
          </button>
        </div>

        {/* Other Categories Grid - Dynamique selon nombre de features */}
        {/* V1: grid-cols-2 (1x2) | V2: grid-cols-2 (2x2) */}
        <div className={`grid ${gridCols} gap-3`}>
          {otherCategories.map((category, index) => (
            <button
              key={category.id}
              onClick={() => setCurrentScreen(category.id)}
              className={`relative p-4 text-center pluqla-scale-in touch-manipulation min-h-[115px] flex flex-col justify-center transition-all duration-300 rounded-xl border group overflow-hidden ${
                darkMode
                  ? 'bg-gradient-to-b from-gray-900/90 to-gray-800/90 border-white/10 hover:border-[#F14545]/50 hover:shadow-[0_8px_24px_rgba(241,69,69,0.3)] hover:scale-[1.03]'
                  : 'bg-gradient-to-b from-white/98 to-[#FAFAFA]/95 border-gray-200 hover:border-[#F14545]/40 hover:shadow-[0_6px_20px_rgba(241,69,69,0.15)] hover:scale-[1.03]'
              } backdrop-blur-sm shadow-md hover:shadow-lg`}
              style={{
                animationDelay: `${(index + 1) * 50}ms`
              }}
            >
            {/* Premium notification indicator with glow */}
            {category.notifications > 0 && (
              <div className="absolute top-2 right-2 z-10">
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-r from-[#F14545] to-[#FF6B6B] shadow-md shadow-[#F14545]/40 animate-pulse">
                  <span className="text-white text-[10px] font-bold">
                    {category.notifications}
                  </span>
                </div>
              </div>
            )}

            {/* Premium hover glow overlay */}
            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              darkMode
                ? 'bg-gradient-to-br from-[#F14545]/5 to-[#FF6B6B]/5'
                : 'bg-gradient-to-br from-[#F14545]/8 to-[#FF6B6B]/6 shadow-inner'
            }`}></div>

            {/* Light mode premium border glow effect */}
            {!darkMode && (
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[inset_0_1px_0_rgba(241,69,69,0.1)]"></div>
            )}

            {/* Category content avec micro-info */}
            <div className="space-y-1 relative z-10">
              {/* Icon */}
              <div className="mx-auto transform transition-transform duration-300 group-hover:scale-110 flex items-center justify-center w-14 h-14 p-2">
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
                  <span className={`text-3xl transition-all duration-300 ${
                    darkMode
                      ? 'drop-shadow-lg group-hover:drop-shadow-[0_0_8px_rgba(241,69,69,0.4)]'
                      : 'drop-shadow-md group-hover:drop-shadow-[0_4px_8px_rgba(241,69,69,0.3)] group-hover:filter group-hover:brightness-110'
                  }`}>
                    {category.icon}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className={`text-sm font-bold transition-all duration-300 leading-tight ${
                darkMode
                  ? 'text-white group-hover:text-[#FF6B6B] group-hover:drop-shadow-[0_0_4px_rgba(255,107,107,0.6)]'
                  : 'text-[#121212] group-hover:text-[#F14545] group-hover:drop-shadow-[0_0_4px_rgba(241,69,69,0.4)]'
              }`}>
                {category.title}
              </h3>

              {/* Micro-info contextuelle */}
              {category.microInfo && (
                <div className={`text-[10px] ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {category.microInfo.label}: <span className={`font-semibold ${
                    darkMode ? 'text-[#FF6B6B]' : 'text-[#F14545]'
                  }`}>{category.microInfo.value}</span>
                </div>
              )}
            </div>
          </button>
        ))}
        </div>
      </div>

    </div>
  );
};

export default CategoryGrid;
