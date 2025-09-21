// Gestionnaire d'interface PWA pour installation et notifications
// Impact: UX native, engagement utilisateur, fonctionnalités hors-ligne
// Intégré avec: pwaService, notifications, analytics

import React, { useState, useEffect } from 'react';
import { usePWA } from '../../services/pwaService';
import { useAnalytics } from '../../services/analyticsService';

const PWAManager = () => {
  const {
    isOffline,
    canInstall,
    canNotify,
    isInstalled,
    suggestInstall,
    showInstallInstructions,
    requestNotificationPermission,
    showNotification
  } = usePWA();

  const { trackUserAction } = useAnalytics();

  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('online');

  // Gérer l'affichage du banner d'installation
  useEffect(() => {
    // Ne pas afficher si déjà installé ou déjà refusé
    if (isInstalled || installDismissed) {
      setShowInstallBanner(false);
      return;
    }

    // Afficher le banner après un délai si installation possible
    if (canInstall) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
        trackUserAction('install_banner_shown', 'pwa');
      }, 15000); // 15 secondes

      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, installDismissed, trackUserAction]);

  // Gérer les changements de statut de connexion
  useEffect(() => {
    const newStatus = isOffline ? 'offline' : 'online';
    if (newStatus !== connectionStatus) {
      setConnectionStatus(newStatus);
    }
  }, [isOffline, connectionStatus]);

  // Gérer la demande de notifications
  useEffect(() => {
    // Proposer les notifications après que l'utilisateur soit engagé
    if (!canNotify && !localStorage.getItem('notifications_dismissed')) {
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 60000); // 1 minute

      return () => clearTimeout(timer);
    }
  }, [canNotify]);

  // Handler pour l'installation
  const handleInstall = async () => {
    trackUserAction('install_banner_clicked', 'pwa');

    const success = await suggestInstall();

    if (success) {
      setShowInstallBanner(false);
    } else {
      // Fallback vers les instructions manuelles
      showInstallInstructions();
    }
  };

  // Handler pour refuser l'installation
  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    setInstallDismissed(true);
    trackUserAction('install_banner_dismissed', 'pwa');

    // Se souvenir du refus temporairement
    localStorage.setItem('install_dismissed', Date.now().toString());
  };

  // Handler pour accepter les notifications
  const handleAcceptNotifications = async () => {
    trackUserAction('notification_prompt_accepted', 'notifications');

    const granted = await requestNotificationPermission();

    if (granted) {
      showNotification('Notifications activées !', {
        body: 'Vous recevrez des conseils d\'économies personnalisés',
        tag: 'welcome-notification'
      });
    }

    setShowNotificationPrompt(false);
  };

  // Handler pour refuser les notifications
  const handleDismissNotifications = () => {
    setShowNotificationPrompt(false);
    localStorage.setItem('notifications_dismissed', 'true');
    trackUserAction('notification_prompt_dismissed', 'notifications');
  };

  return (
    <div className="pwa-manager">
      {/* Banner d'installation */}
      {showInstallBanner && (
        <div className="install-banner bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow-lg mx-4 mb-4 relative">
          <button
            onClick={handleDismissInstall}
            className="absolute top-2 right-2 text-white/70 hover:text-white text-xl"
            aria-label="Fermer"
          >
            ×
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-2xl">📱</div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                Installer +Clair
              </h3>
              <p className="text-xs text-white/90 mt-1">
                Accès rapide et mode hors-ligne disponible
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="bg-white text-green-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-50 transition-colors"
            >
              Installer
            </button>
          </div>
        </div>
      )}

      {/* Prompt pour notifications */}
      {showNotificationPrompt && (
        <div className="notification-prompt bg-blue-50 border border-blue-200 p-4 rounded-lg mx-4 mb-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🔔</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 text-sm">
                Recevoir des conseils personnalisés
              </h3>
              <p className="text-xs text-blue-700 mt-1">
                Activez les notifications pour des suggestions d'économies adaptées
              </p>
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={handleAcceptNotifications}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700"
                >
                  Activer
                </button>
                <button
                  onClick={handleDismissNotifications}
                  className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-300"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de statut de connexion */}
      {isOffline && (
        <div className="offline-indicator bg-yellow-50 border border-yellow-200 p-3 rounded-lg mx-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-xl">📶</div>
            <div>
              <h3 className="font-semibold text-yellow-900 text-sm">
                Mode hors-ligne
              </h3>
              <p className="text-xs text-yellow-700">
                Vos données restent accessibles. Synchronisation à la reconnexion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statut PWA (dev seulement) */}
      {process.env.NODE_ENV === 'development' && (
        <PWADebugPanel
          isOffline={isOffline}
          canInstall={canInstall}
          canNotify={canNotify}
          isInstalled={isInstalled}
        />
      )}
    </div>
  );
};

// Panel de debug pour développement
const PWADebugPanel = ({ isOffline, canInstall, canNotify, isInstalled }) => {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 left-4 bg-gray-800 text-white px-2 py-1 rounded text-xs z-50"
      >
        PWA Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg text-xs z-50 max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">PWA Debug</span>
        <button
          onClick={() => setShowDebug(false)}
          className="text-white/70 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-1">
        <div className={`flex justify-between ${isOffline ? 'text-red-400' : 'text-green-400'}`}>
          <span>Connexion:</span>
          <span>{isOffline ? 'Hors-ligne' : 'En ligne'}</span>
        </div>

        <div className={`flex justify-between ${canInstall ? 'text-green-400' : 'text-gray-400'}`}>
          <span>Installation:</span>
          <span>{canInstall ? 'Disponible' : 'Non dispo'}</span>
        </div>

        <div className={`flex justify-between ${canNotify ? 'text-green-400' : 'text-gray-400'}`}>
          <span>Notifications:</span>
          <span>{canNotify ? 'Activées' : 'Désactivées'}</span>
        </div>

        <div className={`flex justify-between ${isInstalled ? 'text-green-400' : 'text-gray-400'}`}>
          <span>App installée:</span>
          <span>{isInstalled ? 'Oui' : 'Non'}</span>
        </div>

        <div className="text-gray-400">
          <span>SW: </span>
          <span>{navigator.serviceWorker?.controller ? 'Actif' : 'Inactif'}</span>
        </div>
      </div>
    </div>
  );
};

export default PWAManager;