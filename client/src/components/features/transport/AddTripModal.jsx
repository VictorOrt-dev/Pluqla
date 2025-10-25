import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Repeat, X, Loader2, Plus } from 'lucide-react';
import { useTrips } from '../../../hooks/useTrips';

const AddTripModal = ({ isOpen, onClose, onSuccess, darkMode, showNotification }) => {
  const { createTrip, loading } = useTrips();
  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    destination: '',
    distanceKm: '',
    recurring: false
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du trajet est requis';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Le nom ne peut pas dépasser 100 caractères';
    }

    if (!formData.origin.trim()) {
      newErrors.origin = 'L\'origine est requise';
    } else if (formData.origin.length > 200) {
      newErrors.origin = 'L\'origine ne peut pas dépasser 200 caractères';
    }

    if (!formData.destination.trim()) {
      newErrors.destination = 'La destination est requise';
    } else if (formData.destination.length > 200) {
      newErrors.destination = 'La destination ne peut pas dépasser 200 caractères';
    }

    if (formData.distanceKm) {
      const distance = parseFloat(formData.distanceKm);
      if (isNaN(distance) || distance <= 0) {
        newErrors.distanceKm = 'La distance doit être un nombre positif';
      } else if (distance > 1000) {
        newErrors.distanceKm = 'La distance ne peut pas dépasser 1000 km';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const tripData = {
        name: formData.name.trim(),
        origin: formData.origin.trim(),
        destination: formData.destination.trim(),
        distanceKm: formData.distanceKm ? parseFloat(formData.distanceKm) : null,
        recurring: formData.recurring
      };

      await createTrip(tripData);

      if (showNotification) {
        showNotification('Trajet créé avec succès !', 'success');
      }

      // Reset form
      setFormData({
        name: '',
        origin: '',
        destination: '',
        distanceKm: '',
        recurring: false
      });
      setErrors({});

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create trip:', error);
      if (showNotification) {
        showNotification(error.message || 'Erreur lors de la création du trajet', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative w-full max-w-md ${
              darkMode
                ? 'bg-gray-900/95 backdrop-blur-xl border-gray-700/50'
                : 'bg-white/95 backdrop-blur-xl border-gray-200/50'
            } rounded-2xl border shadow-2xl`}
          >

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between p-6 border-b ${
                darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Nouveau Trajet
                </h3>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                }`}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Nom du trajet <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <Navigation className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Domicile → Bureau"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all ${
                      errors.name
                        ? 'border-red-500 focus:border-red-500'
                        : darkMode
                          ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                  />
                </div>
                <AnimatePresence>
                  {errors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-1.5 text-sm text-red-500"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Origin */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Origine <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    placeholder="Ex: 15 Rue de la Paix, Paris"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all ${
                      errors.origin
                        ? 'border-red-500 focus:border-red-500'
                        : darkMode
                          ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                  />
                </div>
                <AnimatePresence>
                  {errors.origin && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-1.5 text-sm text-red-500"
                    >
                      {errors.origin}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Destination */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Destination <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    placeholder="Ex: 10 Avenue des Champs, Paris"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all ${
                      errors.destination
                        ? 'border-red-500 focus:border-red-500'
                        : darkMode
                          ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                  />
                </div>
                <AnimatePresence>
                  {errors.destination && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-1.5 text-sm text-red-500"
                    >
                      {errors.destination}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Distance */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className={`block text-sm font-semibold mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Distance (km) <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(optionnel)</span>
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    <Navigation className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    name="distanceKm"
                    value={formData.distanceKm}
                    onChange={handleChange}
                    placeholder="Ex: 12.5"
                    step="0.1"
                    min="0.1"
                    max="1000"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all ${
                      errors.distanceKm
                        ? 'border-red-500 focus:border-red-500'
                        : darkMode
                          ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                  />
                </div>
                <AnimatePresence>
                  {errors.distanceKm && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-1.5 text-sm text-red-500"
                    >
                      {errors.distanceKm}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Recurring */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 p-4 rounded-xl border transition-colors"
                style={{
                  borderColor: formData.recurring
                    ? (darkMode ? 'rgb(147 51 234 / 0.5)' : 'rgb(168 85 247 / 0.5)')
                    : (darkMode ? 'rgb(55 65 81)' : 'rgb(229 231 235)'),
                  backgroundColor: formData.recurring
                    ? (darkMode ? 'rgb(88 28 135 / 0.1)' : 'rgb(243 232 255)')
                    : (darkMode ? 'rgb(31 41 55 / 0.3)' : 'transparent')
                }}
              >
                <input
                  type="checkbox"
                  name="recurring"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={handleChange}
                  className="w-5 h-5 text-red-500 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                />
                <label
                  htmlFor="recurring"
                  className={`flex items-center gap-2 text-sm font-medium cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                  Trajet régulier (quotidien)
                </label>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex gap-3 pt-4"
              >
                <motion.button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                    darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Annuler
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-4 h-4" />
                      </motion.div>
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Créer le trajet
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddTripModal;
