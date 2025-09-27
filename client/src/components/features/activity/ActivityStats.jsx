import React from 'react';
import { useActivity } from '../../../hooks/useActivity';

const ActivityStats = ({ darkMode }) => {
  const { activityHistory } = useActivity();

  // Calculs statistiques
  const last30Days = activityHistory.filter(activity => {
    const activityDate = new Date(activity.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return activityDate >= thirtyDaysAgo;
  });

  const totalSessions = last30Days.length;
  const totalMinutes = last30Days.reduce((sum, activity) => sum + activity.duration, 0);
  const totalCalories = last30Days.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
  
  const averagePerWeek = Math.round((totalSessions / 4.3) * 10) / 10;
  const favoriteActivity = activityHistory.reduce((acc, activity) => {
    acc[activity.activityName] = (acc[activity.activityName] || 0) + 1;
    return acc;
  }, {});
  
  const mostFrequent = Object.keys(favoriteActivity).reduce((a, b) => 
    favoriteActivity[a] > favoriteActivity[b] ? a : b, '');

  // Données pour le graphique hebdomadaire
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayActivities = activityHistory.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.toDateString() === date.toDateString();
    });
    const dayCalories = dayActivities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
    
    weeklyData.push({
      day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      calories: dayCalories,
      sessions: dayActivities.length
    });
  }

  const maxCalories = Math.max(...weeklyData.map(d => d.calories), 1);

  return (
    <div className="space-y-6">
      {/* Statistiques générales - Glassmorphism */}
      <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        darkMode
          ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
          : 'bg-white/70 border-gray-200/60 shadow-md'
      }`}>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-indigo-500/5 rounded-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-red-500 to-indigo-600 rounded-xl">
              <span className="text-white text-lg">📈</span>
            </div>
            <div>
              <h3 className={`text-xl font-bold bg-gradient-to-r ${
                darkMode
                  ? 'from-white via-gray-200 to-gray-300'
                  : 'from-gray-900 via-gray-700 to-gray-600'
              } bg-clip-text text-transparent`}>
                Statistiques
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                30 derniers jours
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { value: totalSessions, label: 'Séances', color: 'red', icon: '🎯' },
              { value: `${Math.round(totalMinutes / 60)}h`, label: 'Durée totale', color: 'blue', icon: '⏱️' },
              { value: totalCalories, label: 'Calories', color: 'orange', icon: '🔥' },
              { value: averagePerWeek, label: 'Séances/sem', color: 'green', icon: '📊' }
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`group relative p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-105 ${
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
                <div className={`absolute inset-0 bg-gradient-to-r from-${stat.color}-500/5 to-${stat.color}-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              </div>
            ))}
          </div>

          {mostFrequent && (
            <div className={`relative p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-700/50'
                : 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/60'
            } shadow-lg`}>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                  <span className="text-white text-sm">🏆</span>
                </div>
                <div>
                  <p className={`font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    Activité favorite: {mostFrequent}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                    {favoriteActivity[mostFrequent]} séance{favoriteActivity[mostFrequent] > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Graphique hebdomadaire - Glassmorphism */}
      <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        darkMode
          ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
          : 'bg-white/70 border-gray-200/60 shadow-md'
      }`}>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <h3 className={`text-xl font-bold bg-gradient-to-r ${
                darkMode
                  ? 'from-white via-gray-200 to-gray-300'
                  : 'from-gray-900 via-gray-700 to-gray-600'
              } bg-clip-text text-transparent`}>
                Calories brûlées
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                7 derniers jours
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between h-40 mb-4 p-4 bg-gradient-to-t from-gray-50/10 to-transparent rounded-2xl">
            {weeklyData.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 group/bar">
                <div className="relative">
                  <div
                    className="w-8 bg-gradient-to-t from-orange-500 via-red-500 to-pink-500 rounded-t-lg transition-all duration-500 hover:scale-110 cursor-pointer shadow-lg"
                    style={{
                      height: `${Math.max((day.calories / maxCalories) * 120, 4)}px`,
                      minHeight: '4px'
                    }}
                  />

                  {/* Tooltip on hover */}
                  <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200 ${
                    darkMode ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'
                  } whitespace-nowrap shadow-lg`}>
                    {day.calories} cal
                  </div>
                </div>

                <div className="mt-3 text-center space-y-1">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {day.calories}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {day.day}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className={`text-center p-3 rounded-2xl ${
            darkMode ? 'bg-gray-800/40' : 'bg-gray-50/60'
          } backdrop-blur-sm`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Total cette semaine: <span className="text-orange-500 font-bold">
                {weeklyData.reduce((sum, day) => sum + day.calories, 0)} calories
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Historique récent - Glassmorphism */}
      <div className={`group relative p-6 backdrop-blur-xl rounded-3xl border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
        darkMode
          ? 'bg-gray-900/60 border-gray-700/50 shadow-lg'
          : 'bg-white/70 border-gray-200/60 shadow-md'
      }`}>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-red-500/5 rounded-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-indigo-500 to-red-600 rounded-xl">
              <span className="text-white text-lg">🕐</span>
            </div>
            <div>
              <h3 className={`text-xl font-bold bg-gradient-to-r ${
                darkMode
                  ? 'from-white via-gray-200 to-gray-300'
                  : 'from-gray-900 via-gray-700 to-gray-600'
              } bg-clip-text text-transparent`}>
                Activités récentes
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Dernières séances
              </p>
            </div>
          </div>

          {activityHistory.slice(0, 5).length > 0 ? (
            <div className="space-y-3">
              {activityHistory.slice(0, 5).map((activity, idx) => (
                <div
                  key={activity.id}
                  className={`group/item p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    darkMode
                      ? 'bg-gray-800/40 border-gray-600/30 hover:bg-gray-700/50'
                      : 'bg-white/60 border-gray-200/50 hover:bg-white/80'
                  }`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-red-500 to-indigo-600 rounded-lg">
                        <span className="text-white text-sm">🏃‍♂️</span>
                      </div>
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {activity.activityName}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(activity.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <p className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activity.duration} min
                      </p>
                      <p className="text-sm font-medium bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                        {activity.caloriesBurned} cal
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="space-y-3">
                <div className="text-4xl">🏃‍♂️</div>
                <p className="font-medium">Aucune activité enregistrée</p>
                <p className="text-sm">Commencez votre premier entraînement !</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityStats;
