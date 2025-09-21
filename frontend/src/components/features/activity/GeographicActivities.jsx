import React, { useState } from 'react';

const GeographicActivities = ({ darkMode, aiSuggestions = [], isLoading = false }) => {
  const [userLocation] = useState('Paris, France'); // Placeholder - à connecter à la géolocalisation

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
            <span className="text-white text-lg">📍</span>
          </div>
          <div>
            <h3 className={`text-xl font-bold bg-gradient-to-r ${
              darkMode
                ? 'from-white via-gray-200 to-gray-300'
                : 'from-gray-900 via-gray-700 to-gray-600'
            } bg-clip-text text-transparent`}>
              Activités près de vous
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Découvertes géographiques personnalisées • {userLocation}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={`group relative p-8 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>
          <div className="relative z-10 text-center space-y-4">
            <div className="relative">
              <div className="animate-spin w-12 h-12 border-3 border-blue-500/30 border-t-blue-500 rounded-full mx-auto"></div>
              <div className="absolute inset-0 w-12 h-12 border-3 border-purple-500/20 border-r-purple-500 rounded-full mx-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="space-y-2">
              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Recherche d'activités près de vous...
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Analyse géographique par IA en cours
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activities List */}
      <div className="space-y-4">
        {aiSuggestions.map((activity, index) => (
          <div
            key={activity.id || index}
            className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
              darkMode
                ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
                : 'bg-white/70 border-gray-200/60 shadow-md'
            } ring-2 ring-blue-500/25 shadow-blue-500/10`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-start gap-4">
                {/* Location Icon */}
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <span className="text-white text-2xl">🎯</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-lg font-bold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.name || activity.title || 'Activité locale'}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full font-semibold">
                          🤖 IA Géo
                        </span>
                        {activity.category && (
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                            darkMode
                              ? 'bg-gray-800/60 border border-gray-600/40 text-gray-300'
                              : 'bg-white/80 border border-gray-200/60 text-gray-700'
                          }`}>
                            {activity.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 leading-relaxed`}>
                    {activity.description || activity.content || 'Activité recommandée dans votre zone géographique.'}
                  </p>

                  {/* Activity Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    {[
                      {
                        value: activity.price || activity.cost || 'Prix non spécifié',
                        label: 'Prix',
                        icon: '💰',
                        highlight: true
                      },
                      {
                        value: activity.distance || activity.location || '< 5km',
                        label: 'Distance',
                        icon: '📍'
                      },
                      {
                        value: activity.duration || activity.time || '2-3h',
                        label: 'Durée',
                        icon: '⏱️'
                      }
                    ].map((detail, idx) => (
                      <div
                        key={idx}
                        className={`p-3 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-105 ${
                          detail.highlight
                            ? darkMode
                              ? 'bg-emerald-900/20 border-emerald-700/50 hover:bg-emerald-800/30'
                              : 'bg-emerald-50/80 border-emerald-200/60 hover:bg-emerald-100/90'
                            : darkMode
                              ? 'bg-gray-800/60 border-gray-600/40 hover:bg-gray-700/70'
                              : 'bg-white/80 border-gray-200/60 hover:bg-white/90'
                        } shadow-md hover:shadow-lg`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{detail.icon}</span>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${
                              detail.highlight
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {detail.value}
                            </p>
                            <p className={`text-xs ${
                              detail.highlight
                                ? 'text-emerald-500 dark:text-emerald-500'
                                : darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {detail.label}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-[1.02] hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-lg">📍</span>
                        <span>Voir sur la carte</span>
                      </div>
                    </button>
                    <button className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 border-2 ${
                      darkMode
                        ? 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10'
                        : 'border-blue-500/50 text-blue-600 hover:bg-blue-50'
                    } shadow-md hover:shadow-lg`}>
                      <span className="text-lg">💾</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {aiSuggestions.length === 0 && !isLoading && (
          <div className={`group relative p-12 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
            darkMode
              ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
              : 'bg-white/70 border-gray-200/60 shadow-md'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>
            <div className="relative z-10 text-center space-y-6">
              <div className="relative">
                <div className="text-8xl animate-bounce">📍</div>
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Aucune activité trouvée
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  L'IA recherche des activités dans votre zone géographique
                </p>
              </div>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl">
                🔄 Actualiser la recherche
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeographicActivities;