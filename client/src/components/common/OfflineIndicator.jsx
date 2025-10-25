/**
 * OfflineIndicator Component
 *
 * Displays online/offline status with toast notifications
 * Features: Auto-hide when online, persistent when offline, update notifications
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Download, X } from 'lucide-react';

/**
 * OfflineIndicator Component
 */
const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  /**
   * Handle online/offline status
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);

      // Hide "back online" toast after 3 seconds
      setTimeout(() => {
        setShowOnlineToast(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Listen for service worker updates
   */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }
  }, []);

  /**
   * Handle update
   */
  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      });
    }
  };

  return (
    <>
      {/* Offline Banner - Persistent */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white shadow-2xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-center gap-3">
                <WifiOff size={20} className="animate-pulse" />
                <p className="text-sm font-semibold">
                  Vous êtes hors ligne - Les données affichées peuvent être obsolètes
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Online Toast - Auto-hide */}
      <AnimatePresence>
        {showOnlineToast && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15 }}
            className="fixed top-4 right-4 z-[9999] bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Wifi size={24} />
              </div>
              <div>
                <p className="font-bold text-base">Connexion rétablie !</p>
                <p className="text-sm text-white/90">
                  Vous êtes de nouveau en ligne
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Available Banner */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-4 left-4 right-4 z-[9998] bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-2xl max-w-md mx-auto"
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 rounded-full">
                  <Download size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base mb-1">
                    Mise à jour disponible
                  </p>
                  <p className="text-sm text-white/90 mb-3">
                    Une nouvelle version de Pluqla est disponible
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdate}
                      className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-all shadow-md"
                    >
                      Mettre à jour
                    </button>
                    <button
                      onClick={() => setUpdateAvailable(false)}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold text-sm hover:bg-white/20 transition-all"
                    >
                      Plus tard
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setUpdateAvailable(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status Dot (bottom right, subtle) */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-4 right-4 z-[9997]"
      >
        <div
          className={`w-3 h-3 rounded-full shadow-lg ${
            isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          }`}
          title={isOnline ? 'En ligne' : 'Hors ligne'}
        />
      </motion.div>
    </>
  );
};

export default OfflineIndicator;
