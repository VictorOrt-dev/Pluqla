import React from 'react';
import { useActivity } from '../../../hooks/useActivity';

const ActivityRecommendations = ({
  darkMode,
  aiSuggestions = [],
  isLoading = false,
  title = "Suggestions IA personnalisées",
  subtitle = "Recommandations générées par IA",
  icon = "🤖"
}) => {
  const { userProfile, updateProfile } = useActivity();

  const levelOptions = [
    { key: 'beginner', label: 'Débutant', description: 'Je commence le sport' },
    { key: 'intermediate', label: 'Intermédiaire', description: 'Je fais du sport régulièrement' },
    { key: 'advanced', label: 'Avancé', description: 'Je suis un sportif confirmé' }
  ];

  const handleLevelChange = (newLevel) => {
    updateProfile({ level: newLevel });
  };

  return (
    <div className="space-y-6">
      {/* Profil utilisateur - Glassmorphism */}
      <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        darkMode
          ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
          : 'bg-white/70 border-gray-200/60 shadow-md'
      }`}>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
              <span className="text-white text-lg">👤</span>
            </div>
            <div>
              <h3 className={`text-xl font-bold bg-gradient-to-r ${
                darkMode
                  ? 'from-white via-gray-200 to-gray-300'
                  : 'from-gray-900 via-gray-700 to-gray-600'
              } bg-clip-text text-transparent`}>
                Mon profil sportif
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Personnalisez votre expérience
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Niveau de sport */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-lg">🏆</span>
                <label className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Niveau actuel: {userProfile.level === 'beginner' ? 'Débutant' : userProfile.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {levelOptions.map((option, idx) => (
                  <button
                    key={option.key}
                    onClick={() => handleLevelChange(option.key)}
                    className={`group relative p-4 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                      userProfile.level === option.key
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-lg'
                        : darkMode
                          ? 'bg-gray-800/60 border-gray-600/40 text-gray-300 hover:bg-gray-700/70 hover:border-gray-500/60'
                          : 'bg-white/80 border-gray-200/60 text-gray-700 hover:bg-white/90 hover:border-gray-300/80'
                    } shadow-md hover:shadow-lg`}
                  >
                    <div className="text-center space-y-2">
                      <div className={`text-sm font-bold ${userProfile.level === option.key ? 'text-white' : ''}`}>
                        {option.label}
                      </div>
                      <div className={`text-xs opacity-80 ${userProfile.level === option.key ? 'text-white' : ''}`}>
                        {option.description}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {userProfile.level === option.key && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Poids */}
            <div className={`p-4 backdrop-blur-sm rounded-2xl border ${
              darkMode
                ? 'bg-gray-800/40 border-gray-600/30'
                : 'bg-white/60 border-gray-200/50'
            }`}>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-lg">⚖️</span>
                <label className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Poids: <span className="text-emerald-500 font-bold">{userProfile.weight} kg</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={userProfile.weight}
                  onChange={(e) => updateProfile({ weight: parseInt(e.target.value) })}
                  className={`w-full h-3 rounded-lg appearance-none cursor-pointer transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-700 slider-thumb-dark'
                      : 'bg-gray-200 slider-thumb-light'
                  }`}
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((userProfile.weight - 40) / (150 - 40)) * 100}%, ${darkMode ? '#374151' : '#e5e7eb'} ${((userProfile.weight - 40) / (150 - 40)) * 100}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
                  }}
                />
                <div className="flex justify-between text-xs mt-2">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>40 kg</span>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>150 kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions IA - Glassmorphism */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
            <span className="text-white text-lg">{icon}</span>
          </div>
          <div>
            <h3 className={`text-xl font-bold bg-gradient-to-r ${
              darkMode
                ? 'from-white via-gray-200 to-gray-300'
                : 'from-gray-900 via-gray-700 to-gray-600'
            } bg-clip-text text-transparent`}>
              {title}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {isLoading ? 'Chargement en cours...' : subtitle}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className={`group relative p-8 backdrop-blur-xl rounded-3xl border transition-all duration-500 ${
            darkMode
              ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
              : 'bg-white/70 border-gray-200/60 shadow-md'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 rounded-3xl"></div>
            <div className="relative z-10 text-center space-y-4">
              <div className="relative">
                <div className="animate-spin w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full mx-auto"></div>
                <div className="absolute inset-0 w-12 h-12 border-3 border-indigo-500/20 border-r-indigo-500 rounded-full mx-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div className="space-y-2">
                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Génération de suggestions IA...
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Analyse de votre profil en cours
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {aiSuggestions.map((suggestion, idx) => (
            <div
              key={suggestion.id || idx}
              className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
                darkMode
                  ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
                  : 'bg-white/70 border-gray-200/60 shadow-md'
              } ring-2 ring-purple-500/25 shadow-purple-500/10`}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              {/* Gradient overlay IA */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 rounded-3xl"></div>

              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                    <span className="text-white text-2xl">🤖</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-lg font-bold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {suggestion.title || suggestion.name || 'Suggestion IA'}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full font-semibold">
                            🤖 IA Personnalisée
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 leading-relaxed`}>
                      {suggestion.description || suggestion.content || 'Recommandation générée par intelligence artificielle selon votre profil.'}
                    </p>

                    {/* Informations suggestion IA */}
                    <div className={`p-4 backdrop-blur-sm rounded-2xl border ${
                      darkMode
                        ? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-purple-700/50'
                        : 'bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-purple-200/60'
                    } shadow-lg`}>
                      <div className="flex items-start space-x-3">
                        <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                          <span className="text-white text-sm">✨</span>
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                            Suggestion adaptée à votre profil
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                            Générée par IA selon vos préférences et objectifs
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Objectifs hebdomadaires - Glassmorphism */}
      <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        darkMode
          ? 'bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-purple-700/50 shadow-lg'
          : 'bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-purple-200/60 shadow-md'
      }`}>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
              <span className="text-white text-lg">{title.includes('Sport') ? '🏆' : '🎪'}</span>
            </div>
            <div>
              <h3 className={`text-xl font-bold bg-gradient-to-r ${
                darkMode
                  ? 'from-purple-200 via-pink-200 to-purple-300'
                  : 'from-purple-900 via-pink-800 to-purple-700'
              } bg-clip-text text-transparent`}>
                {title.includes('Sport') ? 'Objectifs sportifs' : 'Idées de sorties'}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                {title.includes('Sport') ? 'Vos défis personnels' : 'Suggestions pour vous divertir'}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {aiSuggestions.slice(0, 2).map((suggestion, idx) => (
              <div
                key={suggestion.id || idx}
                className={`flex justify-between items-center p-3 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-purple-800/20 border-purple-600/30 hover:bg-purple-700/30'
                    : 'bg-white/60 border-purple-200/50 hover:bg-white/80'
                } shadow-lg hover:shadow-xl`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🤖</span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>
                    {suggestion.title || suggestion.name || 'Suggestion IA'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                    {title.includes('Sport') ? 'Sport' : 'Sortie'}
                  </span>
                  <span className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    IA
                  </span>
                </div>
              </div>
            ))}
            {aiSuggestions.length === 0 && !isLoading && (
              <div className={`text-center p-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="text-2xl mb-2">🤖</div>
                <p className="text-sm">Aucune suggestion IA disponible</p>
              </div>
            )}
          </div>

          <div className={`p-4 backdrop-blur-sm rounded-2xl border-t ${
            darkMode
              ? 'border-purple-600/30 bg-purple-800/10'
              : 'border-purple-300/50 bg-white/40'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <span className={`text-sm font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                  Suggestions IA disponibles
                </span>
              </div>
              <span className={`text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent`}>
                {aiSuggestions.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityRecommendations;