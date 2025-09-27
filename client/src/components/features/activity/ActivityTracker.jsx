import React, { useState } from 'react';
import { useActivity } from '../../../hooks/useActivity';

const ActivityTracker = ({ darkMode }) => {
  const { activities, logActivity, weeklyStats } = useActivity();
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState('modérée');
  const [isLogging, setIsLogging] = useState(false);

  const handleLogActivity = () => {
    if (selectedActivity) {
      setIsLogging(true);
      logActivity(selectedActivity.id, duration, intensity);
      
      setTimeout(() => {
        setIsLogging(false);
        setSelectedActivity(null);
        setDuration(30);
      }, 1000);
    }
  };

  const intensityOptions = [
    { key: 'faible', label: 'Faible', color: 'text-green-500' },
    { key: 'modérée', label: 'Modérée', color: 'text-yellow-500' },
    { key: 'élevée', label: 'Élevée', color: 'text-red-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Stats hebdomadaires - Glassmorphism */}
      <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        darkMode
          ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
          : 'bg-white/70 border-gray-200/60 shadow-md'
      }`}>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <h3 className={`text-xl font-bold bg-gradient-to-r ${
                darkMode
                  ? 'from-white via-gray-200 to-gray-300'
                  : 'from-gray-900 via-gray-700 to-gray-600'
              } bg-clip-text text-transparent`}>
                Cette semaine
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Vos performances
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: weeklyStats.sessionsCount, label: 'Séances', color: 'red', icon: '🎯' },
              { value: `${weeklyStats.totalDuration}min`, label: 'Durée totale', color: 'blue', icon: '⏱️' },
              { value: weeklyStats.totalCalories, label: 'Calories', color: 'orange', icon: '🔥' },
              { value: `${weeklyStats.averageDuration}min`, label: 'Moy./séance', color: 'green', icon: '📊' }
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`group/stat relative p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-105 ${
                  darkMode
                    ? 'bg-gray-800/60 border-gray-600/40 hover:bg-gray-700/70'
                    : 'bg-white/80 border-gray-200/60 hover:bg-white/90'
                } shadow-lg hover:shadow-xl`}
              >
                <div className="text-center space-y-2">
                  <div className="text-lg">{stat.icon}</div>
                  <p className={`text-2xl font-bold bg-gradient-to-r from-${stat.color}-500 to-${stat.color}-600 bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                  <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.label}
                  </p>
                </div>

                {/* Hover effect gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r from-${stat.color}-500/5 to-${stat.color}-600/5 rounded-2xl opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sélection d'activité - Glassmorphism */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
            <span className="text-white text-lg">🏃</span>
          </div>
          <div>
            <h3 className={`text-xl font-bold bg-gradient-to-r ${
              darkMode
                ? 'from-white via-gray-200 to-gray-300'
                : 'from-gray-900 via-gray-700 to-gray-600'
            } bg-clip-text text-transparent`}>
              Enregistrer une activité
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Choisissez votre exercice
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {activities.map((activity, idx) => (
            <button
              key={activity.id}
              onClick={() => setSelectedActivity(activity)}
              className={`group relative p-4 backdrop-blur-sm rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                selectedActivity?.id === activity.id
                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 shadow-lg shadow-emerald-500/25'
                  : darkMode
                    ? 'border-gray-600/40 bg-gray-800/60 hover:border-gray-500/60 hover:bg-gray-700/70'
                    : 'border-gray-200/60 bg-white/80 hover:border-gray-300/80 hover:bg-white/90'
              } shadow-md hover:shadow-xl`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="text-center space-y-2">
                <div className="text-2xl mb-2">{activity.icon}</div>
                <div className={`text-sm font-semibold ${
                  selectedActivity?.id === activity.id
                    ? 'text-emerald-600'
                    : darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {activity.name}
                </div>
                <div className={`text-xs ${
                  selectedActivity?.id === activity.id
                    ? 'text-emerald-500'
                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {activity.caloriesPerMinute} cal/min
                </div>
              </div>

              {/* Selection indicator */}
              {selectedActivity?.id === activity.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  </div>
                </div>
              )}

              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration de la séance - Glassmorphism */}
      {selectedActivity && (
        <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl animate-scale-in ${
          darkMode
            ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
            : 'bg-white/70 border-gray-200/60 shadow-md'
        }`}>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-3xl"></div>

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                <span className="text-white text-2xl">{selectedActivity.icon}</span>
              </div>
              <div>
                <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedActivity.name}
                </h4>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configuration de votre séance
                </p>
              </div>
            </div>

            {/* Durée */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-lg">⏱️</span>
                <label className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Durée: <span className="text-emerald-500 font-bold">{duration} minutes</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className={`w-full h-3 rounded-lg appearance-none cursor-pointer transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-700 slider-thumb-dark'
                      : 'bg-gray-200 slider-thumb-light'
                  }`}
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((duration - 5) / (120 - 5)) * 100}%, ${darkMode ? '#374151' : '#e5e7eb'} ${((duration - 5) / (120 - 5)) * 100}%, ${darkMode ? '#374151' : '#e5e7eb'} 100%)`
                  }}
                />
                <div className="flex justify-between text-xs mt-2">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>5 min</span>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>120 min</span>
                </div>
              </div>
            </div>

            {/* Intensité */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-lg">🔥</span>
                <label className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Intensité
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {intensityOptions.map((option, idx) => (
                  <button
                    key={option.key}
                    onClick={() => setIntensity(option.key)}
                    className={`group relative p-3 rounded-2xl border transition-all duration-300 hover:scale-105 ${
                      intensity === option.key
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400 shadow-lg'
                        : darkMode
                          ? 'bg-gray-800/60 border-gray-600/40 text-gray-300 hover:bg-gray-700/70 hover:border-gray-500/60'
                          : 'bg-white/80 border-gray-200/60 text-gray-700 hover:bg-white/90 hover:border-gray-300/80'
                    } shadow-md hover:shadow-lg`}
                  >
                    <div className="text-center">
                      <div className={`text-sm font-semibold ${intensity === option.key ? 'text-white' : option.color}`}>
                        {option.label}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {intensity === option.key && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimation calories */}
            <div className={`p-4 backdrop-blur-sm rounded-2xl border mb-6 ${
              darkMode
                ? 'bg-gradient-to-r from-orange-900/30 to-red-900/30 border-orange-700/50'
                : 'bg-gradient-to-r from-orange-50/80 to-red-50/80 border-orange-200/60'
            } shadow-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                    <span className="text-white text-sm">🔥</span>
                  </div>
                  <span className={`text-sm font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                    Calories estimées
                  </span>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  {Math.round(selectedActivity.caloriesPerMinute * duration)} cal
                </span>
              </div>
            </div>

            {/* Bouton d'enregistrement */}
            <button
              onClick={handleLogActivity}
              disabled={isLogging}
              className={`group w-full py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-[1.02] ${
                isLogging
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {isLogging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">✅</span>
                    <span>Enregistrer la séance</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityTracker;
