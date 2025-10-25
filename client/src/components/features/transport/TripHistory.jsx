import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Bus, Bike, Train, Users, MapPin, Calendar, Repeat, Trash2, Loader2, AlertTriangle, Navigation } from 'lucide-react';
import { useTrips } from '../../../hooks/useTrips';
import DOMPurify from 'dompurify';

const TripHistory = ({ darkMode }) => {
  const { trips, loading, error, total, fetchTrips } = useTrips();
  const [page, setPage] = useState(0);
  const itemsPerPage = 20;

  const { deleteTrip } = useTrips();
  const [deletingTrip, setDeletingTrip] = useState(null);

  const getTransportIcon = (mode) => {
    const iconMap = {
      car: Car,
      bus: Bus,
      bike: Bike,
      train: Train,
      scooter: Bike,
      carpool: Users,
      default: Navigation
    };
    const IconComponent = iconMap[mode] || iconMap.default;
    return <IconComponent className="w-5 h-5" />;
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      setDeletingTrip(tripId);
      await deleteTrip(tripId);
      // Refetch trips after successful deletion
      await fetchTrips({ limit: itemsPerPage, offset: page * itemsPerPage });
    } catch (error) {
      console.error('Failed to delete trip:', error);
      // Error already handled by useTrips hook
    } finally {
      setDeletingTrip(null);
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

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchTrips({ limit: itemsPerPage, offset: newPage * itemsPerPage });
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  // Loading state
  if (loading && trips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <Loader2 className="h-8 w-8 text-red-500" />
        </motion.div>
        <p className="mt-2 text-sm">Chargement de l'historique...</p>
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center py-8 ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}
      >
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <p className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
          Erreur de chargement
        </p>
        <p className={`text-sm mt-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
          {error}
        </p>
        <motion.button
          onClick={() => fetchTrips({ limit: itemsPerPage, offset: page * itemsPerPage })}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            darkMode
              ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          Réessayer
        </motion.button>
      </motion.div>
    );
  }

  // Empty state
  if (!trips || trips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <p className="font-medium">Aucun trajet enregistré</p>
        <p className="text-sm mt-2">Commencez à suivre vos déplacements pour voir vos statistiques</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
            Historique des trajets
          </h3>
        </div>
        {total > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {total} trajet{total > 1 ? 's' : ''}
          </motion.span>
        )}
      </motion.div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {trips.map((trip, index) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={`${
                darkMode ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800/50' : 'bg-white/80 backdrop-blur-xl border-gray-200/50'
              } border rounded-2xl p-4 shadow-lg transition-all relative overflow-hidden`}
            >
              {/* Swipe to delete indicator */}
              <AnimatePresence>
                {deletingTrip === trip.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex items-center justify-center z-10"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="font-medium">Suppression...</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}
                  >
                    {getTransportIcon(trip.mode)}
                  </motion.div>
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(trip.name) }}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(trip.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        {trip.origin} → {trip.destination}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {trip.distanceKm && (
                      <p className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {trip.distanceKm} km
                      </p>
                    )}
                    {trip.recurring && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full inline-flex mt-1 ${
                          darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        <Repeat className="w-3 h-3" />
                        Quotidien
                      </motion.span>
                    )}
                  </div>

                  {/* Delete button */}
                  <motion.button
                    onClick={() => handleDeleteTrip(trip.id)}
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'hover:bg-red-900/30 text-red-400'
                        : 'hover:bg-red-50 text-red-500'
                    }`}
                    aria-label="Supprimer le trajet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mt-6"
        >
          <motion.button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0 || loading}
            whileHover={page !== 0 && !loading ? { scale: 1.05 } : {}}
            whileTap={page !== 0 && !loading ? { scale: 0.95 } : {}}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              page === 0 || loading
                ? 'opacity-50 cursor-not-allowed'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ← Précédent
          </motion.button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = idx;
              } else if (page < 3) {
                pageNumber = idx;
              } else if (page > totalPages - 4) {
                pageNumber = totalPages - 5 + idx;
              } else {
                pageNumber = page - 2 + idx;
              }

              return (
                <motion.button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.1 } : {}}
                  whileTap={!loading ? { scale: 0.9 } : {}}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    page === pageNumber
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                      : darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {pageNumber + 1}
                </motion.button>
              );
            })}
          </div>

          <motion.button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            whileHover={page < totalPages - 1 && !loading ? { scale: 1.05 } : {}}
            whileTap={page < totalPages - 1 && !loading ? { scale: 0.95 } : {}}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              page >= totalPages - 1 || loading
                ? 'opacity-50 cursor-not-allowed'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Suivant →
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TripHistory;
