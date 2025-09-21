import React, { useState } from 'react';

// Styles CSS pour masquer la scrollbar
const scrollbarHideStyle = {
  scrollbarWidth: 'none', // Firefox
  msOverflowStyle: 'none', // IE et Edge
  '&::-webkit-scrollbar': {
    display: 'none' // Chrome, Safari, Opera
  }
};

const CityActivities = ({
  darkMode,
  aiSuggestions = [],
  isLoading = false,
  error = null,
  userData,
  setUserData,
  onUsePlan,
  category
}) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [cityData] = useState([
    // Activités gratuites
    {
      id: 1,
      type: 'gratuit',
      title: 'Randonnée urbaine',
      description: 'Découvrez les quartiers historiques à pied',
      price: 'Gratuit',
      location: 'Centre-ville',
      duration: '2h',
      rating: 4.5,
      icon: '🚶‍♀️',
      category: 'outdoor'
    },
    {
      id: 2,
      type: 'gratuit',
      title: 'Parc municipal',
      description: 'Détente et sport en plein air',
      price: 'Gratuit',
      location: 'Parc central',
      duration: '1-3h',
      rating: 4.2,
      icon: '🌳',
      category: 'nature'
    },
    {
      id: 3,
      type: 'gratuit',
      title: 'Musée municipal',
      description: 'Exposition permanente gratuite',
      price: 'Gratuit',
      location: 'Quartier culturel',
      duration: '1h30',
      rating: 4.0,
      icon: '🏛️',
      category: 'culture'
    },
    // Activités payantes
    {
      id: 4,
      type: 'payant',
      title: 'Escape Game',
      description: 'Résolvez les énigmes en équipe',
      price: '25€/pers',
      location: 'Centre commercial',
      duration: '1h',
      rating: 4.7,
      icon: '🔍',
      category: 'entertainment'
    },
    {
      id: 5,
      type: 'payant',
      title: 'Cours de cuisine',
      description: 'Apprenez la cuisine locale',
      price: '45€/pers',
      location: 'École culinaire',
      duration: '3h',
      rating: 4.8,
      icon: '👨‍🍳',
      category: 'learning'
    },
    {
      id: 6,
      type: 'payant',
      title: 'Karting',
      description: 'Course sur circuit indoor',
      price: '20€/session',
      location: 'Zone industrielle',
      duration: '30min',
      rating: 4.6,
      icon: '🏎️',
      category: 'sport'
    },
    // Activités sponsorisées
    {
      id: 7,
      type: 'sponso',
      title: 'Dégustation viticole',
      description: 'Découverte des vins locaux',
      price: '15€/pers',
      priceOriginal: '30€/pers',
      location: 'Cave partenaire',
      duration: '2h',
      rating: 4.9,
      icon: '🍷',
      category: 'tasting',
      sponsor: 'Caves Régionales'
    },
    {
      id: 8,
      type: 'sponso',
      title: 'Séance spa détente',
      description: 'Relaxation et bien-être',
      price: '35€/pers',
      priceOriginal: '60€/pers',
      location: 'Spa wellness',
      duration: '90min',
      rating: 4.8,
      icon: '🧘‍♀️',
      category: 'wellness',
      sponsor: 'Wellness Center'
    }
  ]);

  const filterOptions = [
    { key: 'all', label: 'Tout', icon: '🎯' },
    { key: 'gratuit', label: 'Gratuit', icon: '🆓' },
    { key: 'payant', label: 'Payant', icon: '💳' },
    { key: 'sponso', label: 'Promo', icon: '🎁' }
  ];

  const filteredActivities = cityData.filter(activity =>
    activeFilter === 'all' || activity.type === activeFilter
  );

  // Combiner les suggestions IA avec les activités locales
  const combinedContent = [
    ...aiSuggestions.map(suggestion => ({
      ...suggestion,
      type: 'ai',
      icon: '🤖',
      isAI: true
    })),
    ...filteredActivities
  ];

  const handleBookActivity = (activity) => {
    if (activity.isAI && onUsePlan) {
      onUsePlan(activity, category);
    } else {
      // Logic pour réserver une activité locale
      console.log('Réservation activité:', activity);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header et Filtres - Glassmorphism */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl">
            <span className="text-white text-lg">🏙️</span>
          </div>
          <div>
            <h3 className={`text-xl font-bold bg-gradient-to-r ${
              darkMode
                ? 'from-white via-gray-200 to-gray-300'
                : 'from-gray-900 via-gray-700 to-gray-600'
            } bg-clip-text text-transparent`}>
              Activités locales
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Découvrez votre ville
            </p>
          </div>
        </div>

        <div className={`p-3 backdrop-blur-xl rounded-2xl border ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div
            className="flex space-x-2 overflow-x-auto pb-1"
            style={scrollbarHideStyle}
          >
            {filterOptions.map((filter, idx) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`group relative flex items-center space-x-2 px-4 py-3 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-300 min-w-fit hover:scale-105 ${
                  activeFilter === filter.key
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                    : darkMode
                      ? 'bg-gray-800/60 border border-gray-600/40 text-gray-300 hover:bg-gray-700/70 hover:border-gray-500/60'
                      : 'bg-white/80 border border-gray-200/60 text-gray-700 hover:bg-white/90 hover:border-gray-300/80'
                } shadow-md hover:shadow-lg`}
                style={{ animationDelay: `${idx * 75}ms` }}
              >
                <span className="text-lg">{filter.icon}</span>
                <span className="text-sm">{filter.label}</span>

                {/* Active indicator */}
                {activeFilter === filter.key && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-white rounded-full shadow-lg"></div>
                )}

                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message d'état - Glassmorphism */}
      {isLoading && (
        <div className={`group relative p-8 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 rounded-3xl"></div>
          <div className="relative z-10 text-center space-y-4">
            <div className="relative">
              <div className="animate-spin w-12 h-12 border-3 border-pink-500/30 border-t-pink-500 rounded-full mx-auto"></div>
              <div className="absolute inset-0 w-12 h-12 border-3 border-rose-500/20 border-r-rose-500 rounded-full mx-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="space-y-2">
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Chargement des activités locales...
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Découverte de votre région
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-red-900/40 border-red-700/50 shadow-lg'
            : 'bg-red-50/80 border-red-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 rounded-3xl"></div>
          <div className="relative z-10 flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl">
              <span className="text-white text-lg">⚠️</span>
            </div>
            <div>
              <p className={`font-semibold ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                Erreur de chargement
              </p>
              <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des activités - Glassmorphism */}
      <div className="space-y-4">
        {combinedContent.map((activity, index) => (
          <div
            key={activity.id || index}
            className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
              darkMode
                ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
                : 'bg-white/70 border-gray-200/60 shadow-md'
            } ${activity.type === 'sponso' ? 'ring-2 ring-pink-500/25 shadow-pink-500/10' : ''}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient overlay based on activity type */}
            <div className={`absolute inset-0 rounded-3xl ${
              activity.type === 'gratuit'
                ? 'bg-gradient-to-br from-green-500/5 to-emerald-500/5'
                : activity.type === 'payant'
                  ? 'bg-gradient-to-br from-blue-500/5 to-indigo-500/5'
                  : activity.type === 'sponso'
                    ? 'bg-gradient-to-br from-pink-500/5 to-rose-500/5'
                    : 'bg-gradient-to-br from-purple-500/5 to-indigo-500/5'
            }`}></div>
            <div className="relative z-10 space-y-4">
              {/* Header avec icône et titre */}
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl shadow-lg">
                  <span className="text-white text-2xl">{activity.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-lg leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.title}
                      </h3>
                      {/* Badges avec styles améliorés */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {activity.isAI && (
                          <span className="text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full font-semibold">
                            🤖 IA
                          </span>
                        )}
                        {activity.type === 'sponso' && (
                          <span className="text-xs bg-gradient-to-r from-pink-500 to-rose-600 text-white px-3 py-1 rounded-full font-semibold">
                            🎁 PROMO
                          </span>
                        )}
                        {activity.type === 'gratuit' && (
                          <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full font-semibold">
                            🆓 GRATUIT
                          </span>
                        )}
                      </div>
                    </div>
                    {activity.rating && (
                      <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full shadow-lg">
                        <span className="text-sm">⭐</span>
                        <span className="text-sm font-bold">{activity.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2 leading-relaxed`}>
                    {activity.description}
                  </p>
                </div>
              </div>

              {/* Informations et bouton - Glassmorphism */}
              <div className="space-y-4">
                {/* Détails en grille responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: activity.price, originalPrice: activity.priceOriginal, label: 'Prix', icon: '💰', isPrice: true },
                    { value: activity.duration, label: 'Durée', icon: '⏱️' },
                    { value: activity.location, label: 'Lieu', icon: '📍' }
                  ].filter(item => item.value).map((item, idx) => (
                    <div
                      key={idx}
                      className={`group p-3 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-105 ${
                        darkMode
                          ? 'bg-gray-800/60 border-gray-600/40 hover:bg-gray-700/70'
                          : 'bg-white/80 border-gray-200/60 hover:bg-white/90'
                      } shadow-md hover:shadow-lg`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className={`text-sm font-semibold truncate ${
                              item.isPrice && activity.type === 'sponso'
                                ? 'text-green-600 dark:text-green-400'
                                : darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {item.value}
                            </p>
                            {item.originalPrice && (
                              <span className="line-through text-gray-500 text-xs">
                                {item.originalPrice}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sponsor info */}
                {activity.sponsor && (
                  <div className={`p-3 backdrop-blur-sm rounded-2xl border ${
                    darkMode
                      ? 'bg-pink-900/30 border-pink-700/50'
                      : 'bg-pink-50/80 border-pink-200/60'
                  } shadow-lg`}>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">🤝</span>
                      <span className={`text-xs font-medium ${darkMode ? 'text-pink-300' : 'text-pink-700'}`}>
                        En partenariat avec {activity.sponsor}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bouton d'action amélioré */}
                <button
                  onClick={() => handleBookActivity(activity)}
                  className={`group w-full sm:w-auto sm:px-8 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
                    activity.type === 'sponso'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700'
                      : activity.type === 'gratuit'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg">
                      {activity.type === 'gratuit' ? '🔍' : activity.type === 'sponso' ? '🎁' : '💳'}
                    </span>
                    <span>{activity.type === 'gratuit' ? 'Découvrir' : 'Réserver'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {combinedContent.length === 0 && !isLoading && (
        <div className={`group relative p-12 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 rounded-3xl"></div>
          <div className="relative z-10 text-center space-y-6">
            <div className="relative">
              <div className="text-8xl animate-bounce">🎭</div>
              <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Aucune activité trouvée
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Essayez un autre filtre ou découvrez nos suggestions personnalisées
              </p>
            </div>
            <button
              onClick={() => setActiveFilter('all')}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:from-pink-600 hover:to-rose-700 shadow-lg hover:shadow-xl"
            >
              🔄 Voir toutes les activités
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityActivities;