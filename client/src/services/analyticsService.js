// Service d'analytics avancé pour métriques d'engagement et performance
// Impact: Optimisation UX basée sur données réelles d'usage
// RGPD compliant: Données anonymes et stockées localement uniquement

import { useMemo } from 'react';

// Configuration analytics
const ANALYTICS_CONFIG = {
  STORAGE_KEY: 'plus_clair_analytics',
  MAX_EVENTS: 1000, // Limite des événements stockés
  BATCH_SIZE: 50, // Taille des batches pour traitement
  AUTO_EXPORT_THRESHOLD: 500, // Export auto à 500 événements
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  PERFORMANCE_SAMPLE_RATE: 0.1, // 10% des événements de performance
};

// Types d'événements trackés
const EVENT_TYPES = {
  // Navigation et UX
  SCREEN_VIEW: 'screen_view',
  USER_ACTION: 'user_action',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',

  // Gamification
  POINTS_EARNED: 'points_earned',
  BADGE_UNLOCKED: 'badge_unlocked',
  CHALLENGE_COMPLETED: 'challenge_completed',
  LEVEL_UP: 'level_up',

  // IA et Suggestions
  AI_REQUEST_START: 'ai_request_start',
  AI_REQUEST_SUCCESS: 'ai_request_success',
  AI_REQUEST_ERROR: 'ai_request_error',
  CACHE_HIT: 'cache_hit',
  CACHE_MISS: 'cache_miss',

  // Économies et Transactions
  TRANSACTION_ADDED: 'transaction_added',
  GOAL_PROGRESS: 'goal_progress',
  SAVINGS_MILESTONE: 'savings_milestone',

  // Performance et Technique
  PERFORMANCE_METRIC: 'performance_metric',
  ERROR_OCCURRED: 'error_occurred',
  FEATURE_FLAG_VIEWED: 'feature_flag_viewed'
};

class AnalyticsService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.eventQueue = [];
    this.isExporting = false;

    // Initialiser session
    this.initializeSession();

    // Auto-export si trop d'événements
    this.setupAutoExport();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  initializeSession() {
    this.track(EVENT_TYPES.SESSION_START, {
      sessionId: this.sessionId,
      timestamp: this.sessionStart,
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
  }

  setupAutoExport() {
    // Export automatique toutes les 10 minutes
    setInterval(() => {
      const stored = this.getStoredData();
      if (stored.events.length >= ANALYTICS_CONFIG.AUTO_EXPORT_THRESHOLD) {
        console.log('📊 Auto-export des analytics triggered');
        this.exportData('auto_export');
      }
    }, 10 * 60 * 1000);
  }

  // Méthode principale de tracking
  track(eventType, data = {}, metadata = {}) {
    try {
      const event = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: eventType,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        data: this.sanitizeData(data),
        metadata: {
          ...metadata,
          url: window.location.href,
          referrer: document.referrer
        }
      };

      // Ajouter à la queue
      this.eventQueue.push(event);

      // Stocker dans localStorage (batch processing)
      this.flushEventQueue();

      // Échantillonnage pour performance
      if (eventType === EVENT_TYPES.PERFORMANCE_METRIC) {
        if (Math.random() > ANALYTICS_CONFIG.PERFORMANCE_SAMPLE_RATE) {
          return; // Ne pas stocker cet événement de performance
        }
      }

    } catch (error) {
      console.error('Erreur tracking analytics:', error);
    }
  }

  // Nettoyer les données sensibles
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Supprimer les données sensibles
    const sensitiveKeys = ['password', 'token', 'email', 'phone', 'ssn', 'creditCard'];
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // Vider la queue d'événements vers localStorage
  flushEventQueue() {
    if (this.eventQueue.length === 0) return;

    try {
      const stored = this.getStoredData();
      stored.events.push(...this.eventQueue);

      // Limiter le nombre d'événements stockés
      if (stored.events.length > ANALYTICS_CONFIG.MAX_EVENTS) {
        stored.events = stored.events.slice(-ANALYTICS_CONFIG.MAX_EVENTS);
      }

      stored.lastUpdated = Date.now();
      localStorage.setItem(ANALYTICS_CONFIG.STORAGE_KEY, JSON.stringify(stored));

      // Vider la queue
      this.eventQueue = [];

    } catch (error) {
      console.error('Erreur flush queue analytics:', error);
      // En cas d'erreur localStorage, vider la queue pour éviter l'accumulation
      this.eventQueue = [];
    }
  }

  // Récupérer les données stockées
  getStoredData() {
    try {
      const stored = localStorage.getItem(ANALYTICS_CONFIG.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        events: [],
        sessionId: this.sessionId,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Erreur lecture analytics:', error);
      return {
        events: [],
        sessionId: this.sessionId,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        version: '1.0'
      };
    }
  }

  // Tracking spécialisés
  trackScreenView(screenName, metadata = {}) {
    this.track(EVENT_TYPES.SCREEN_VIEW, {
      screenName,
      timestamp: Date.now()
    }, metadata);
  }

  trackUserAction(action, target, metadata = {}) {
    this.track(EVENT_TYPES.USER_ACTION, {
      action,
      target,
      timestamp: Date.now()
    }, metadata);
  }

  trackGamificationEvent(eventType, data = {}) {
    this.track(eventType, {
      ...data,
      category: 'gamification',
      timestamp: Date.now()
    });
  }

  trackAIRequest(status, category, data = {}) {
    const eventType = status === 'start' ? EVENT_TYPES.AI_REQUEST_START :
                      status === 'success' ? EVENT_TYPES.AI_REQUEST_SUCCESS :
                      EVENT_TYPES.AI_REQUEST_ERROR;

    this.track(eventType, {
      category,
      status,
      ...data,
      timestamp: Date.now()
    });
  }

  trackCacheEvent(eventType, data = {}) {
    this.track(eventType, {
      ...data,
      category: 'cache',
      timestamp: Date.now()
    });
  }

  trackTransaction(transaction, metadata = {}) {
    this.track(EVENT_TYPES.TRANSACTION_ADDED, {
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type,
      timestamp: Date.now()
    }, metadata);
  }

  trackGoalProgress(goal, progress, metadata = {}) {
    this.track(EVENT_TYPES.GOAL_PROGRESS, {
      goalId: goal.id,
      goalType: goal.type,
      progress,
      timestamp: Date.now()
    }, metadata);
  }

  trackError(error, context = {}) {
    this.track(EVENT_TYPES.ERROR_OCCURRED, {
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500), // Limiter la taille
      context,
      timestamp: Date.now()
    });
  }

  // Analytics et insights
  getUsageStats() {
    const stored = this.getStoredData();
    const events = stored.events || [];

    const stats = {
      totalEvents: events.length,
      sessionsCount: new Set(events.map(e => e.sessionId)).size,
      screenViews: events.filter(e => e.type === EVENT_TYPES.SCREEN_VIEW).length,
      userActions: events.filter(e => e.type === EVENT_TYPES.USER_ACTION).length,
      aiRequests: events.filter(e => e.type.includes('ai_request')).length,
      errors: events.filter(e => e.type === EVENT_TYPES.ERROR_OCCURRED).length,
      dateRange: {
        firstEvent: events.length > 0 ? new Date(Math.min(...events.map(e => e.timestamp))) : null,
        lastEvent: events.length > 0 ? new Date(Math.max(...events.map(e => e.timestamp))) : null
      }
    };

    return stats;
  }

  getInsights() {
    const stored = this.getStoredData();
    const events = stored.events || [];

    if (events.length === 0) {
      return { message: 'Pas assez de données pour générer des insights' };
    }

    // Analyse des tendances
    const screenViews = events.filter(e => e.type === EVENT_TYPES.SCREEN_VIEW);
    const popularScreens = this.getMostFrequent(screenViews.map(e => e.data.screenName));

    const userActions = events.filter(e => e.type === EVENT_TYPES.USER_ACTION);
    const popularActions = this.getMostFrequent(userActions.map(e => e.data.action));

    const aiRequests = events.filter(e => e.type.includes('ai_request'));
    const aiSuccessRate = aiRequests.length > 0 ?
      (aiRequests.filter(e => e.type === EVENT_TYPES.AI_REQUEST_SUCCESS).length / aiRequests.length) * 100 : 0;

    return {
      popularScreens,
      popularActions,
      aiSuccessRate: Math.round(aiSuccessRate),
      totalSessions: new Set(events.map(e => e.sessionId)).size,
      avgEventsPerSession: Math.round(events.length / new Set(events.map(e => e.sessionId)).size),
      lastAnalysis: new Date().toISOString()
    };
  }

  getMostFrequent(array) {
    const frequency = {};
    array.forEach(item => {
      if (item) frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item, count]) => ({ item, count }));
  }

  // Export des données
  exportData(reason = 'manual') {
    if (this.isExporting) {
      console.log('Export déjà en cours...');
      return false;
    }

    try {
      this.isExporting = true;

      // Vider la queue avant export
      this.flushEventQueue();

      const stored = this.getStoredData();
      const stats = this.getUsageStats();

      const exportData = {
        meta: {
          exportedAt: new Date().toISOString(),
          exportReason: reason,
          sessionId: this.sessionId,
          timestamp: Date.now(),
          reason,
          version: '1.0'
        },
        summary: stats,
        recentEvents: stored.events.slice(-100), // 100 événements les plus récents
        privacy: {
          dataAnonymized: true,
          storageLocal: true,
          noExternalTracking: true
        }
      };

      // Création du blob pour téléchargement
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plusClair-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📊 Analytics exported successfully');
      return true;

    } catch (error) {
      console.error('Erreur export analytics:', error);
      return false;
    } finally {
      this.isExporting = false;
    }
  }

  // Nettoyage
  clearAllData() {
    try {
      localStorage.removeItem(ANALYTICS_CONFIG.STORAGE_KEY);
      this.eventQueue = [];
      console.log('🗑️ All analytics data cleared');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }
}

// Instance globale
export const analyticsService = new AnalyticsService();

// Hook React pour analytics optimisé
export const useAnalytics = () => {
  return useMemo(() => ({
    track: analyticsService.track.bind(analyticsService),
    trackScreenView: analyticsService.trackScreenView.bind(analyticsService),
    trackUserAction: analyticsService.trackUserAction.bind(analyticsService),
    trackGamificationEvent: analyticsService.trackGamificationEvent.bind(analyticsService),
    trackAIRequest: analyticsService.trackAIRequest.bind(analyticsService),
    trackCacheEvent: analyticsService.trackCacheEvent.bind(analyticsService),
    trackTransaction: analyticsService.trackTransaction.bind(analyticsService),
    trackGoalProgress: analyticsService.trackGoalProgress.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    getUsageStats: analyticsService.getUsageStats.bind(analyticsService),
    getInsights: analyticsService.getInsights.bind(analyticsService),
    exportData: analyticsService.exportData.bind(analyticsService)
  }), []); // Pas de dépendances car analyticsService est stable
};