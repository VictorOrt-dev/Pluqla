import React, { useState, useEffect } from 'react';

// Styles pour chaque type de notification
const getNotificationStyles = (type) => {
  const baseStyles = "backdrop-blur-sm border border-opacity-20 text-white shadow-lg";

  switch (type) {
    case 'success':
      return `${baseStyles} bg-green-500/90 border-green-400 dark:bg-green-600/90 dark:border-green-500`;
    case 'achievement':
      return `${baseStyles} bg-gradient-to-r from-red-500/90 to-pink-500/90 border-orange-400 dark:from-red-600/90 dark:to-pink-600/90`;
    case 'points':
      return `${baseStyles} bg-gradient-to-r from-blue-500/90 to-cyan-500/90 border-blue-400 dark:from-blue-600/90 dark:to-cyan-600/90`;
    case 'warning':
      return `${baseStyles} bg-orange-500/90 border-orange-400 dark:bg-orange-600/90 dark:border-orange-500`;
    case 'error':
      return `${baseStyles} bg-red-500/90 border-red-400 dark:bg-red-600/90 dark:border-red-500`;
    case 'info':
    default:
      return `${baseStyles} bg-gray-600/90 border-gray-500 dark:bg-gray-700/90 dark:border-gray-600`;
  }
};

const NotificationItem = ({ notif, onDismiss, isVisible }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleDismiss = () => {
    setIsRemoving(true);
    setTimeout(() => onDismiss(notif.id), 150); // Délai pour l'animation
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isRemoving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
        }
        ${isRemoving ? 'translate-x-full opacity-0 scale-90' : ''}
      `}
    >
      <div
        className={`
          p-4 rounded-xl font-medium text-sm relative overflow-hidden cursor-pointer
          transition-all duration-200 hover:scale-105 active:scale-95
          ${getNotificationStyles(notif.type)}
        `}
        onClick={handleDismiss}
      >
        {/* Barre de progression pour les notifications qui disparaissent */}
        <div
          className="absolute top-0 left-0 h-1 bg-white/30 rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: '100%',
            animation: `shrink ${notif.type === 'achievement' ? '6s' : notif.type === 'error' ? '7s' : '4s'} linear forwards`
          }}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icône avec animation */}
            <span
              className="text-lg transition-transform duration-200 hover:scale-110"
              style={{
                animation: notif.type === 'achievement' ? 'bounce 1s ease-in-out' : 'none'
              }}
            >
              {notif.icon}
            </span>

            <div className="flex-1">
              <p className="leading-tight">
                {notif.message}
              </p>

              {/* Compteur pour notifications groupées */}
              {notif.count > 1 && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20 text-white">
                    {notif.count} notifications
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bouton de fermeture subtil */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="ml-3 text-white/70 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
            aria-label="Fermer la notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const Notifications = ({ notifications, onDismiss }) => {
  const [visibleNotifications, setVisibleNotifications] = useState(new Set());

  // Gérer l'apparition des notifications avec délai
  useEffect(() => {
    notifications.forEach((notif, index) => {
      setTimeout(() => {
        setVisibleNotifications(prev => new Set([...prev, notif.id]));
      }, index * 100); // Décalage de 100ms entre chaque notification
    });

    // Nettoyer les notifications supprimées
    setVisibleNotifications(prev => {
      const current = new Set(notifications.map(n => n.id));
      return new Set([...prev].filter(id => current.has(id)));
    });
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <>
      {/* Styles CSS pour les animations personnalisées */}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }

        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
            transform: translate3d(0,0,0);
          }

          40%, 43% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -8px, 0);
          }

          70% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -4px, 0);
          }

          90% {
            transform: translate3d(0, -2px, 0);
          }
        }

        .notification-container {
          pointer-events: none;
        }

        .notification-container > * {
          pointer-events: auto;
        }
      `}</style>

      <div className="notification-container fixed top-20 left-4 right-4 z-50 space-y-3 max-w-sm mx-auto">
        {notifications.map(notif => (
          <NotificationItem
            key={notif.id}
            notif={notif}
            onDismiss={onDismiss}
            isVisible={visibleNotifications.has(notif.id)}
          />
        ))}
      </div>
    </>
  );
};

export default Notifications;