/**
 * Offline Mode Banner - Network status indicator
 * Shows when user is offline with retry functionality
 * Accessible, non-intrusive, auto-dismisses when back online
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineBanner = ({ darkMode = false, onRetry }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show "back online" state briefly, then hide
      setTimeout(() => setShowBanner(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetryClick = () => {
    if (onRetry) {
      onRetry();
    }
    // Check connection
    if (navigator.onLine) {
      setIsOnline(true);
      setShowBanner(false);
    }
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-7xl mx-auto">
            <div
              className={`rounded-2xl p-4 ${
                isOnline
                  ? darkMode
                    ? 'bg-gradient-to-r from-emerald-900/90 to-green-900/90 border-emerald-500/30'
                    : 'bg-gradient-to-r from-emerald-50/95 to-green-50/95 border-emerald-300'
                  : darkMode
                  ? 'bg-gradient-to-r from-slate-900/90 to-slate-800/90 border-slate-700'
                  : 'bg-gradient-to-r from-slate-100/95 to-gray-100/95 border-slate-300'
              } border backdrop-blur-xl shadow-2xl`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isOnline
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-slate-500/20 text-slate-500'
                    }`}
                  >
                    {isOnline ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Message */}
                  <div className="flex-1">
                    <h4
                      className={`font-semibold text-sm ${
                        isOnline
                          ? darkMode
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                          : darkMode
                          ? 'text-white'
                          : 'text-gray-900'
                      }`}
                    >
                      {isOnline ? 'Connexion rétablie' : 'Mode hors ligne'}
                    </h4>
                    <p
                      className={`text-xs mt-0.5 ${
                        isOnline
                          ? darkMode
                            ? 'text-emerald-400'
                            : 'text-emerald-600'
                          : darkMode
                          ? 'text-slate-400'
                          : 'text-gray-600'
                      }`}
                    >
                      {isOnline
                        ? 'Toutes les fonctionnalités sont disponibles'
                        : 'Certaines fonctionnalités sont limitées'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {!isOnline && onRetry && (
                    <motion.button
                      onClick={handleRetryClick}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        darkMode
                          ? 'bg-slate-700 text-white hover:bg-slate-600'
                          : 'bg-white text-gray-900 hover:bg-gray-50'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Réessayer la connexion"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Réessayer</span>
                      </div>
                    </motion.button>
                  )}

                  {/* Dismiss button */}
                  <motion.button
                    onClick={() => setShowBanner(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Fermer la notification"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

OfflineBanner.propTypes = {
  darkMode: PropTypes.bool,
  onRetry: PropTypes.func,
};

export default React.memo(OfflineBanner);
