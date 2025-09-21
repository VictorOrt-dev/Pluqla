import { useState, useCallback, useEffect, useRef } from 'react';

// Types de notifications avec configuration
const NOTIFICATION_TYPES = {
  success: { duration: 4000, icon: '✅', priority: 1 },
  achievement: { duration: 6000, icon: '🎉', priority: 1 },
  points: { duration: 3000, icon: '⭐', priority: 2 },
  warning: { duration: 5000, icon: '⚠️', priority: 2 },
  error: { duration: 7000, icon: '❌', priority: 0 },
  info: { duration: 3000, icon: 'ℹ️', priority: 3 }
};

const MAX_NOTIFICATIONS = 3;
const HISTORY_KEY = 'notification_history';
const MAX_HISTORY = 50;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);
  const timeoutsRef = useRef([]);
  const groupingRef = useRef({}); // Pour le groupement intelligent

  // Charger l'historique depuis localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'historique des notifications:', error);
    }
  }, []);

  // Sauvegarder l'historique dans localStorage
  const saveToHistory = useCallback((notification) => {
    const historyEntry = {
      ...notification,
      timestamp: new Date().toISOString()
    };

    setHistory(prev => {
      const newHistory = [historyEntry, ...prev].slice(0, MAX_HISTORY);

      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde de l\'historique:', error);
      }

      return newHistory;
    });
  }, []);

  // Groupement intelligent des notifications similaires
  const getGroupKey = useCallback((message, type) => {
    // Extraire les mots clés pour le groupement
    const keywords = message.toLowerCase().match(/\b\w+\b/g) || [];
    const keywordHash = keywords.slice(0, 3).join('_'); // Prendre les 3 premiers mots
    return `${type}_${keywordHash}`;
  }, []);

  // Supprimer une notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Nettoyer le timeout correspondant
    const timeoutIndex = timeoutsRef.current.findIndex(t => t.id === id);
    if (timeoutIndex !== -1) {
      clearTimeout(timeoutsRef.current[timeoutIndex].timeoutId);
      timeoutsRef.current.splice(timeoutIndex, 1);
    }
  }, []);

  const showNotification = useCallback((message, type = 'info', options = {}) => {
    const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const groupKey = getGroupKey(message, type);
    const now = Date.now();

    // Vérifier le groupement intelligent (notifications similaires récentes)
    const existingGroup = groupingRef.current[groupKey];
    if (existingGroup && now - existingGroup.lastSeen < 5000) { // 5 secondes
      // Grouper les notifications similaires
      existingGroup.count += 1;
      existingGroup.lastSeen = now;

      setNotifications(prev => prev.map(notif =>
        notif.id === existingGroup.id
          ? {
              ...notif,
              message: `${notif.originalMessage} (×${existingGroup.count})`,
              count: existingGroup.count
            }
          : notif
      ));

      return;
    }

    const notification = {
      id: now + Math.random(),
      message,
      originalMessage: message,
      type,
      icon: options.icon || config.icon,
      priority: config.priority,
      count: 1,
      createdAt: now
    };

    // Enregistrer pour le groupement
    groupingRef.current[groupKey] = {
      id: notification.id,
      count: 1,
      lastSeen: now
    };

    setNotifications(prev => {
      // Trier par priorité et limiter le nombre
      const newNotifications = [...prev, notification]
        .sort((a, b) => a.priority - b.priority) // Priorité croissante (0 = plus important)
        .slice(0, MAX_NOTIFICATIONS);

      return newNotifications;
    });

    // Sauvegarder dans l'historique
    saveToHistory(notification);

    // Auto-suppression avec délai personnalisable
    const duration = options.duration || config.duration;
    const timeoutId = setTimeout(() => {
      removeNotification(notification.id);
      // Nettoyer le groupement
      delete groupingRef.current[groupKey];
    }, duration);

    // Enregistrer le timeout
    timeoutsRef.current.push({ id: notification.id, timeoutId });

  }, [getGroupKey, saveToHistory, removeNotification]);

  // Supprimer manuellement une notification
  const dismissNotification = useCallback((id) => {
    removeNotification(id);
  }, [removeNotification]);

  // Supprimer toutes les notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    timeoutsRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    timeoutsRef.current = [];
    groupingRef.current = {};
  }, []);

  // Obtenir l'historique récent
  const getRecentHistory = useCallback((limit = 10) => {
    return history.slice(0, limit);
  }, [history]);

  // Nettoyer tous les timeouts au démontage
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  return {
    notifications,
    showNotification,
    dismissNotification,
    clearAllNotifications,
    history: getRecentHistory(),
    // Méthodes de convenance pour différents types
    success: (message, options) => showNotification(message, 'success', options),
    error: (message, options) => showNotification(message, 'error', options),
    warning: (message, options) => showNotification(message, 'warning', options),
    achievement: (message, options) => showNotification(message, 'achievement', options),
    points: (message, options) => showNotification(message, 'points', options),
    info: (message, options) => showNotification(message, 'info', options)
  };
};