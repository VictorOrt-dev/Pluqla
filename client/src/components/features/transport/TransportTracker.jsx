import React, { useState, memo } from 'react';
import { useTransport } from '../../../hooks/useTransport';

const TransportTracker = memo(({ darkMode }) => {
  const { routes, addTrip, getBestRouteOption, monthlyStats } = useTransport();
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);

  const startTrip = (route, option) => {
    setIsTracking(true);
    setStartTime(Date.now());
    setSelectedRoute({ route, option });
  };

  const endTrip = () => {
    if (startTime && selectedRoute) {
      const actualDuration = Math.round((Date.now() - startTime) / 60000);
      addTrip(selectedRoute.route.id, selectedRoute.option, actualDuration);
      setIsTracking(false);
      setStartTime(null);
      setSelectedRoute(null);
    }
  };

  const getTransportIcon = (type) => {
    const icons = {
      car: '🚗',
      public: '🚌',
      bike: '🚴',
      tram: '🚊',
      default: '🛴'
    };
    return icons[type] || icons.default;
  };

  return (
    <div className="space-y-6">
      <div className={`p-4 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl`}>
        <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
          📊 Stats du mois
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{monthlyStats.totalCost}€</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Coût total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{monthlyStats.totalTrips}</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Trajets</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-700">{monthlyStats.averageCost}€</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Moy./trajet</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{monthlyStats.totalCO2}g</p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>CO2</p>
          </div>
        </div>
      </div>

      {isTracking && selectedRoute && (
        <div className={`p-4 ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-2xl`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-blue-800'}`}>
                Trajet en cours
              </h4>
              <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-red-600'}`}>
                {selectedRoute.route.name} • {selectedRoute.option.description}
              </p>
            </div>
            <button
              onClick={endTrip}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Terminer
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-black'}`}>
          🗺️ Mes trajets
        </h3>
        <div className="space-y-3">
          {routes.map(route => {
            const bestOption = getBestRouteOption(route);

            return (
              <div
                key={route.id}
                className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                      {route.name}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {route.distance} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-500">{bestOption.cost.toFixed(2)}€</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {bestOption.duration} min
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {route.options.slice(0, 4).map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => startTrip(route, option)}
                      disabled={isTracking}
                      className={`p-2 text-xs rounded-lg transition-all ${
                        isTracking
                          ? 'opacity-50 cursor-not-allowed'
                          : darkMode
                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      } ${option === bestOption ? 'ring-2 ring-green-500' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{getTransportIcon(option.type)}</span>
                        <span>{option.cost.toFixed(2)}€</span>
                      </div>
                      <div className="text-[10px] opacity-75 mt-1">
                        {option.duration}min • {option.co2}g CO2
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

TransportTracker.displayName = 'TransportTracker';

export default TransportTracker;