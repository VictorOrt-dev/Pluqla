const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.events = [];
    this.isEnabled = process.env.ANALYTICS_ENABLED === 'true';
    this.maxEvents = 1000; // Limiter en mémoire pour le développement
  }

  /**
   * Enregistre un événement analytique
   * @param {string} eventType - Type d'événement (page_view, user_action, etc.)
   * @param {string} userId - ID de l'utilisateur (optionnel)
   * @param {Object} properties - Propriétés additionnelles de l'événement
   */
  trackEvent(eventType, userId = null, properties = {}) {
    if (!this.isEnabled) {
      return;
    }

    try {
      const event = {
        id: this.generateEventId(),
        type: eventType,
        userId,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          userAgent: properties.userAgent || 'unknown',
          ip: properties.ip || 'unknown'
        }
      };

      // Ajouter l'événement en mémoire
      this.events.push(event);

      // Nettoyer si trop d'événements
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }

      logger.info(`📊 Analytics event tracked: ${eventType}`, {
        userId,
        properties: Object.keys(properties)
      });

      return event;
    } catch (error) {
      logger.error('Failed to track analytics event:', error);
      return null;
    }
  }

  /**
   * Enregistre une vue de page
   */
  trackPageView(userId, page, properties = {}) {
    return this.trackEvent('page_view', userId, {
      page,
      ...properties
    });
  }

  /**
   * Enregistre une action utilisateur
   */
  trackUserAction(userId, action, properties = {}) {
    return this.trackEvent('user_action', userId, {
      action,
      ...properties
    });
  }

  /**
   * Enregistre une transaction d'épargne
   */
  trackSavingTransaction(userId, amount, category, properties = {}) {
    return this.trackEvent('saving_transaction', userId, {
      amount,
      category,
      ...properties
    });
  }

  /**
   * Enregistre l'utilisation d'une suggestion IA
   */
  trackAISuggestionUsed(userId, suggestionType, properties = {}) {
    return this.trackEvent('ai_suggestion_used', userId, {
      suggestionType,
      ...properties
    });
  }

  /**
   * Enregistre une inscription utilisateur
   */
  trackUserRegistration(userId, method = 'email', properties = {}) {
    return this.trackEvent('user_registration', userId, {
      method,
      ...properties
    });
  }

  /**
   * Enregistre une connexion utilisateur
   */
  trackUserLogin(userId, method = 'email', properties = {}) {
    return this.trackEvent('user_login', userId, {
      method,
      ...properties
    });
  }

  /**
   * Récupère les événements d'un utilisateur
   */
  getUserEvents(userId, limit = 50) {
    return this.events
      .filter((event) => event.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Récupère les statistiques globales
   */
  getGlobalStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayEvents = this.events.filter(
      (event) => new Date(event.timestamp) >= oneDayAgo
    );

    const weekEvents = this.events.filter(
      (event) => new Date(event.timestamp) >= oneWeekAgo
    );

    const uniqueUsersToday = new Set(
      todayEvents.map((event) => event.userId).filter(Boolean)
    ).size;

    const uniqueUsersWeek = new Set(
      weekEvents.map((event) => event.userId).filter(Boolean)
    ).size;

    return {
      totalEvents: this.events.length,
      todayEvents: todayEvents.length,
      weekEvents: weekEvents.length,
      uniqueUsersToday,
      uniqueUsersWeek,
      topEventTypes: this.getTopEventTypes()
    };
  }

  /**
   * Récupère les types d'événements les plus fréquents
   */
  getTopEventTypes(limit = 10) {
    const eventTypeCounts = {};

    this.events.forEach((event) => {
      eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
    });

    return Object.entries(eventTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * Récupère les métriques d'un utilisateur
   */
  getUserMetrics(userId) {
    const userEvents = this.getUserEvents(userId, 1000);

    const actionCounts = {};
    let totalSavings = 0;
    let aiSuggestionsUsed = 0;

    userEvents.forEach((event) => {
      if (event.type === 'user_action') {
        const { action } = event.properties;
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      }

      if (event.type === 'saving_transaction') {
        totalSavings += parseFloat(event.properties.amount) || 0;
      }

      if (event.type === 'ai_suggestion_used') {
        aiSuggestionsUsed++;
      }
    });

    return {
      totalEvents: userEvents.length,
      actionCounts,
      totalSavings,
      aiSuggestionsUsed,
      firstSeen: userEvents.length > 0 ? userEvents[userEvents.length - 1].timestamp : null,
      lastSeen: userEvents.length > 0 ? userEvents[0].timestamp : null
    };
  }

  /**
   * Nettoie les anciens événements
   */
  cleanOldEvents(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalLength = this.events.length;
    this.events = this.events.filter(
      (event) => new Date(event.timestamp) >= cutoffDate
    );

    const removedCount = originalLength - this.events.length;
    if (removedCount > 0) {
      logger.info(`📊 Cleaned ${removedCount} old analytics events`);
    }

    return removedCount;
  }

  /**
   * Génère un ID unique pour l'événement
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Active/désactive le tracking
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`📊 Analytics tracking ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Export des données pour sauvegarde
   */
  exportData() {
    return {
      events: this.events,
      metadata: {
        exportedAt: new Date().toISOString(),
        totalEvents: this.events.length,
        isEnabled: this.isEnabled
      }
    };
  }

  /**
   * Import des données depuis une sauvegarde
   */
  importData(data) {
    if (data.events && Array.isArray(data.events)) {
      this.events = data.events;
      logger.info(`📊 Imported ${data.events.length} analytics events`);
    }
  }
}

// Export singleton instance
module.exports = new AnalyticsService();
