import React, { useState } from 'react';
import { motion, AnimatePresence } from '../../../utils/lazyFramerMotion';
import { Car, Bus, Bike, Train, Users, MapPin, Euro, Leaf, TrendingDown, Zap, Clock, Sparkles, ChevronDown, Loader2, AlertCircle, Target } from 'lucide-react';
import { useTrips } from '../../../hooks/useTrips';
import { useTransportOptimization } from '../../../hooks/useTransportOptimization';

const RouteOptimizer = ({ darkMode, showNotification }) => {
  const { trips, loading: tripsLoading } = useTrips();
  const { submitTrip, loading: optimizing, result, error, progress } = useTransportOptimization();
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState({});

  const handleOptimize = async (trip) => {
    if (!trip.distanceKm) {
      if (showNotification) {
        showNotification(
          'La distance du trajet est requise pour l\'optimisation',
          'error'
        );
      }
      return;
    }

    try {
      setSelectedTrip(trip.id);
      const optimizationResult = await submitTrip({
        origin: trip.origin,
        destination: trip.destination,
        distance: trip.distanceKm,
        recurring: trip.recurring
      });

      // Store result for this trip
      setOptimizationResults(prev => ({
        ...prev,
        [trip.id]: optimizationResult
      }));

      if (showNotification) {
        showNotification(
          `Optimisation terminée : ${optimizationResult.optimalMode} recommandé`,
          'success'
        );
      }

      setSelectedTrip(null);
    } catch (err) {
      console.error('Optimization failed:', err);
      if (showNotification) {
        showNotification(
          err.message || 'Erreur lors de l\'optimisation',
          'error'
        );
      }
      setSelectedTrip(null);
    }
  };

  const [expandedTrip, setExpandedTrip] = useState(null);

  const getTransportIcon = (mode) => {
    const iconMap = {
      car_personal: Car,
      car_carpool: Users,
      public_bus: Bus,
      public_metro: Train,
      public_train: Train,
      public_tram: Train,
      bike_personal: Bike,
      bike_share: Bike,
      scooter_personal: Bike,
      scooter_share: Bike,
      walk: MapPin,
      taxi: Car,
      motorcycle: Bike,
      default: Car
    };
    const IconComponent = iconMap[mode] || iconMap.default;
    return <IconComponent className="w-5 h-5" />;
  };

  const getModeLabel = (mode) => {
    const labels = {
      car_personal: 'Voiture personnelle',
      car_carpool: 'Covoiturage',
      public_bus: 'Bus',
      public_metro: 'Métro',
      public_train: 'Train',
      public_tram: 'Tramway',
      bike_personal: 'Vélo personnel',
      bike_share: 'Vélo partagé',
      scooter_personal: 'Trottinette personnelle',
      scooter_share: 'Trottinette partagée',
      walk: 'À pied',
      taxi: 'Taxi',
      motorcycle: 'Moto'
    };
    return labels[mode] || mode;
  };

  // Loading state
  if (tripsLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`p-8 text-center ${darkMode ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800/50' : 'bg-white/80 backdrop-blur-xl border-gray-200/50'} border rounded-2xl shadow-lg`}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <Loader2 className="h-8 w-8 text-red-500" />
        </motion.div>
        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Chargement...
        </p>
      </motion.div>
    );
  }

  // Empty state
  if (!trips || trips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-center py-12 ${darkMode ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800/50' : 'bg-white/80 backdrop-blur-xl border-gray-200/50'} border rounded-2xl shadow-lg`}
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Aucun trajet à optimiser
        </p>
        <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
          Créez vos trajets pour obtenir des recommandations d'optimisation
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            Optimiseur de trajets IA
          </h3>
        </div>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Obtenez des recommandations personnalisées pour réduire vos coûts et votre impact environnemental
        </p>

        <div className="space-y-4">
          {trips
            .filter(trip => trip.distanceKm) // Only show trips with distance
            .map((trip) => {
              const tripResult = optimizationResults[trip.id];
              const isOptimizing = selectedTrip === trip.id && optimizing;

              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`${darkMode ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800/50' : 'bg-white/80 backdrop-blur-xl border-gray-200/50'} border rounded-2xl p-5 shadow-lg`}
                >
                  {/* Trip Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-black'}`}>
                        {trip.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {trip.origin} → {trip.destination}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <MapPin className="w-3 h-3" />
                          {trip.distanceKm} km
                        </span>
                        {trip.recurring && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                              darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            <Zap className="w-3 h-3" />
                            Quotidien
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <motion.button
                      onClick={() => handleOptimize(trip)}
                      disabled={isOptimizing}
                      whileHover={!isOptimizing ? { scale: 1.05, y: -2 } : {}}
                      whileTap={!isOptimizing ? { scale: 0.95 } : {}}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                        isOptimizing
                          ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-400'
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-xl'
                      }`}
                    >
                      {isOptimizing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="w-4 h-4" />
                          </motion.div>
                          <span>{Math.round(progress)}%</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Optimiser
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Optimization Result */}
                  <AnimatePresence>
                    {tripResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={`mt-4 p-5 rounded-2xl border-2 ${
                          darkMode
                            ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50'
                            : 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-300/50'
                        } shadow-lg relative overflow-hidden`}
                      >
                        {/* AI Badge - Top Right */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="absolute top-3 right-3"
                        >
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-lg">
                            <Sparkles className="w-3 h-3 text-white" />
                            <span className="text-xs font-bold text-white">IA</span>
                          </div>
                        </motion.div>

                        <div className="flex items-center gap-4 mb-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`flex items-center justify-center w-16 h-16 rounded-2xl ${
                              darkMode ? 'bg-green-800/50' : 'bg-white'
                            } shadow-lg`}
                          >
                            {getTransportIcon(tripResult.optimalMode)}
                          </motion.div>
                          <div className="flex-1">
                            <h5 className={`font-bold text-base ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                              Meilleure option : {getModeLabel(tripResult.optimalMode)}
                            </h5>
                            <p className={`text-sm mt-1 ${darkMode ? 'text-green-400/80' : 'text-green-700/80'}`}>
                              Recommandation basée sur votre trajet
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={`text-center p-3 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} shadow-md`}
                          >
                            <Euro className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                            <p className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {tripResult.totalCostEur.toFixed(2)}€
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Coût estimé
                            </p>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`text-center p-3 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} shadow-md`}
                          >
                            <Leaf className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                            <p className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              {tripResult.co2ImpactKg.toFixed(2)}kg
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              CO2
                            </p>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className={`text-center p-3 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} shadow-md`}
                          >
                            <TrendingDown className={`w-5 h-5 mx-auto mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            <p className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              -{tripResult.savingsPotential.toFixed(2)}€
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Économies
                            </p>
                          </motion.div>
                        </div>

                        {/* All Options */}
                        {tripResult.costsBreakdown && (
                          <motion.details
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-4"
                          >
                            <summary className={`cursor-pointer text-sm font-semibold flex items-center gap-2 p-3 rounded-xl transition-colors ${
                              darkMode ? 'hover:bg-gray-800/50 text-gray-300' : 'hover:bg-white text-gray-700'
                            }`}>
                              <ChevronDown className="w-4 h-4" />
                              Voir toutes les options
                            </summary>
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-3 space-y-2"
                            >
                              {Object.entries(tripResult.costsBreakdown).map(([mode, cost], idx) => (
                                <motion.div
                                  key={mode}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  whileHover={{ scale: 1.02, x: 4 }}
                                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                                    mode === tripResult.optimalMode
                                      ? darkMode
                                        ? 'bg-green-800/40 border-2 border-green-600/50 shadow-lg'
                                        : 'bg-green-200 border-2 border-green-400 shadow-lg'
                                      : darkMode
                                        ? 'bg-gray-800/50 border border-gray-700/50'
                                        : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                                      mode === tripResult.optimalMode
                                        ? darkMode ? 'bg-green-700/50' : 'bg-green-300'
                                        : darkMode ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}>
                                      {getTransportIcon(mode)}
                                    </div>
                                    <div>
                                      <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {getModeLabel(mode)}
                                      </span>
                                      {mode === tripResult.optimalMode && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <Sparkles className="w-3 h-3 text-green-500" />
                                          <span className="text-xs text-green-500 font-semibold">Recommandé</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-sm font-bold ${
                                    mode === tripResult.optimalMode
                                      ? 'text-green-500'
                                      : darkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    {cost.toFixed(2)}€
                                  </span>
                                </motion.div>
                              ))}
                            </motion.div>
                          </motion.details>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
        </div>

        {/* No distance warning */}
        {trips.some(trip => !trip.distanceKm) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${
              darkMode ? 'bg-yellow-900/20 border-yellow-800/50' : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <p className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              Certains trajets n'ont pas de distance renseignée. Modifiez-les pour obtenir des optimisations.
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default RouteOptimizer;
