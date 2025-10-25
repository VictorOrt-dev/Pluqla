import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../../utils/lazyFramerMotion';
import { Car, Bus, Bike, Train, TrendingUp, MapPin, Euro, Leaf, Play, StopCircle } from 'lucide-react';
import { useTrips } from '../../../hooks/useTrips';

const TransportTracker = ({ darkMode, showNotification }) => {
  const { trips, loading: tripsLoading, error: tripsError, refreshTrips } = useTrips();
  const [isTracking, setIsTracking] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState({
    totalTrips: 0,
    totalCost: '0.00',
    averageCost: '0.00',
    totalCO2: 0
  });

  // Calculate monthly stats from trips (real costs)
  useEffect(() => {
    if (trips && trips.length > 0) {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentTrips = trips.filter(trip =>
        new Date(trip.createdAt) >= oneMonthAgo
      );

      // ✅ Use real cost data from trips
      const totalCost = recentTrips.reduce((sum, trip) => {
        return sum + (trip.actualCostEur || 0);
      }, 0);

      const totalCO2 = recentTrips.reduce((sum, trip) => {
        return sum + ((trip.actualCO2Kg || 0) * 1000); // Convert kg to grams
      }, 0);

      const totalTripsCount = recentTrips.length;
      const tripsWithCost = recentTrips.filter(t => t.actualCostEur).length;

      setMonthlyStats({
        totalTrips: totalTripsCount,
        totalCost: totalCost.toFixed(2),
        averageCost: tripsWithCost > 0 ? (totalCost / tripsWithCost).toFixed(2) : '0.00',
        totalCO2: Math.round(totalCO2)
      });
    } else {
      setMonthlyStats({
        totalTrips: 0,
        totalCost: '0.00',
        averageCost: '0.00',
        totalCO2: 0
      });
    }
  }, [trips]);

  const startTrip = (trip) => {
    setIsTracking(true);
    setStartTime(Date.now());
    setActiveTrip(trip);
  };

  const endTrip = () => {
    if (startTime && activeTrip) {
      const actualDuration = Math.round((Date.now() - startTime) / 60000);

      if (showNotification) {
        showNotification(
          `Trajet "${activeTrip.name}" terminé en ${actualDuration} minutes`,
          'success'
        );
      }

      setIsTracking(false);
      setStartTime(null);
      setActiveTrip(null);

      // Refresh trips to update the list
      refreshTrips();
    }
  };

  // ✨ Phase 2E - Lucide Transport Icons
  const getTransportIcon = (index) => {
    const icons = [Car, Bus, Bike, Train, Bike];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="w-5 h-5" />;
  };

  // Loading state
  if (tripsLoading && !trips.length) {
    return (
      <div className={`p-8 text-center ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl`}>
        <div className="flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Chargement de vos trajets...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (tripsError) {
    return (
      <div className={`p-6 ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-2xl`}>
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
              Erreur de chargement
            </h4>
            <p className={`text-sm mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              {tripsError}
            </p>
            <button
              onClick={refreshTrips}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              }`}
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* ✨ Phase 2E - Monthly Stats with Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`p-6 rounded-2xl ${
          darkMode
            ? 'bg-gray-900/80 backdrop-blur-xl border border-gray-800/50'
            : 'bg-white/80 backdrop-blur-xl border border-gray-200/50'
        } shadow-lg`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Stats du mois
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Performance de vos déplacements
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { value: `${monthlyStats.totalCost}€`, label: 'Coût total', icon: Euro, color: 'green' },
            { value: monthlyStats.totalTrips, label: 'Trajets', icon: MapPin, color: 'red' },
            { value: `${monthlyStats.averageCost}€`, label: 'Moy./trajet', icon: TrendingUp, color: 'blue' },
            { value: `${monthlyStats.totalCO2}g`, label: 'CO2', icon: Leaf, color: 'orange' }
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={`p-4 rounded-xl ${
                darkMode ? 'bg-gray-800/60' : 'bg-gray-50'
              } border ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-4 h-4 text-${stat.color}-500`} />
              </div>
              <p className={`text-2xl font-bold text-${stat.color}-500`}>{stat.value}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ✨ Phase 2E - Active Trip Tracker with Animations */}
      <AnimatePresence>
        {isTracking && activeTrip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className={`p-6 rounded-2xl ${
              darkMode
                ? 'bg-blue-900/20 border-blue-800/50'
                : 'bg-blue-50 border-blue-200'
            } border`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-3 h-3 rounded-full bg-blue-500"
                  />
                  <h4 className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                    Trajet en cours
                  </h4>
                </div>
                <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  {activeTrip.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className={`w-3 h-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {activeTrip.origin} → {activeTrip.destination}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={endTrip}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
              >
                <StopCircle className="w-4 h-4" />
                Terminer
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✨ Phase 2E - Trips List with Animations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Mes trajets
          </h3>
          {trips.length > 0 && (
            <span className={`text-xs px-3 py-1 rounded-full ${
              darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
            }`}>
              {trips.length} trajet{trips.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {trips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center py-12 rounded-2xl ${
              darkMode ? 'bg-gray-900/60 border-gray-800/50' : 'bg-white border-gray-200'
            } border`}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl mb-4"
            >
              <MapPin className="w-16 h-16 mx-auto text-gray-400" />
            </motion.div>
            <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Aucun trajet enregistré
            </p>
            <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              Créez votre premier trajet pour commencer
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.01, y: -2 }}
                className={`rounded-2xl p-4 ${
                  darkMode
                    ? 'bg-gray-900/60 border-gray-800/50'
                    : 'bg-white border-gray-200'
                } border hover:shadow-lg transition-shadow`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      {getTransportIcon(index)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {trip.name}
                        </h4>
                        {trip.recurring && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            darkMode ? 'bg-purple-900/30 text-purple-300 border border-purple-800/30' : 'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}>
                            Quotidien
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {trip.origin}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        → {trip.destination}
                      </p>
                      {trip.distanceKm && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {trip.distanceKm} km
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => startTrip(trip)}
                    disabled={isTracking}
                    whileHover={!isTracking ? { scale: 1.05 } : {}}
                    whileTap={!isTracking ? { scale: 0.95 } : {}}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isTracking
                        ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-400'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    {isTracking ? 'En cours...' : 'Démarrer'}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TransportTracker;
