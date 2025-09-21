import React from 'react';
import { useTransport } from '../../../hooks/useTransport';

const TripHistory = ({ darkMode }) => {
  const { tripHistory } = useTransport();

  const getTransportIcon = (type) => {
    switch (type) {
      case 'car': return '🚗';
      case 'public': return '🚌';
      case 'bike': return '🚴';
      case 'tram': return '🚊';
      case 'scooter': return '🛴';
      case 'carpool': return '🚗👥';
      default: return '🚶';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Hier ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!tripHistory.length) {
    return (
      <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="text-4xl mb-4">📍</div>
        <p>Aucun trajet enregistré</p>
        <p className="text-sm mt-2">Commencez à suivre vos déplacements pour voir vos statistiques</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
        📋 Historique des trajets
      </h3>
      
      <div className="space-y-3">
        {tripHistory.slice(0, 20).map(trip => (
          <div 
            key={trip.id}
            className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {getTransportIcon(trip.transportOption.type)}
                </div>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    {trip.transportOption.description}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formatDate(trip.date)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                  {trip.cost.toFixed(2)}€
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {trip.actualDuration} min
                </p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  CO2: {trip.co2}g
                </span>
                {trip.actualDuration !== trip.transportOption.duration && (
                  <span className={`${
                    trip.actualDuration < trip.transportOption.duration 
                      ? 'text-green-500' 
                      : 'text-orange-500'
                  }`}>
                    {trip.actualDuration < trip.transportOption.duration ? '⚡' : '🐌'} 
                    {Math.abs(trip.actualDuration - trip.transportOption.duration)} min
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripHistory;