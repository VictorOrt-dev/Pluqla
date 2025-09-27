// Analytics pour tracking de l'onboarding et conversion
class AnalyticsManager {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.isEnabled = true;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  // Événements d'onboarding
  trackOnboardingEvent(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      eventName: `onboarding_${eventName}`,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer
      }
    };

    this.events.push(event);
    this.persistEvent(event);

    // En développement, log dans la console
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event);
    }

    // Envoyer à l'API backend (si disponible)
    this.sendToBackend(event);
  }

  // Événements de conversion
  trackConversionEvent(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      eventName: `conversion_${eventName}`,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        conversionPath: this.getConversionPath()
      }
    };

    this.events.push(event);
    this.persistEvent(event);

    if (process.env.NODE_ENV === 'development') {
      console.log('💰 Conversion Event:', event);
    }

    this.sendToBackend(event);
  }

  // Événements d'engagement
  trackEngagementEvent(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      eventName: `engagement_${eventName}`,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now()
      }
    };

    this.events.push(event);
    this.persistEvent(event);

    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Engagement Event:', event);
    }

    this.sendToBackend(event);
  }

  // Métriques de performance
  trackPerformanceMetric(metricName, value, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      eventName: `performance_${metricName}`,
      properties: {
        ...properties,
        value,
        sessionId: this.sessionId,
        timestamp: Date.now()
      }
    };

    this.events.push(event);
    this.persistEvent(event);

    if (process.env.NODE_ENV === 'development') {
      console.log('⚡ Performance Metric:', event);
    }

    this.sendToBackend(event);
  }

  // Persistance locale
  persistEvent(event) {
    try {
      const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      storedEvents.push(event);

      // Garder seulement les 100 derniers événements
      if (storedEvents.length > 100) {
        storedEvents.splice(0, storedEvents.length - 100);
      }

      localStorage.setItem('analytics_events', JSON.stringify(storedEvents));
    } catch (error) {
      console.warn('Erreur sauvegarde analytics:', error);
    }
  }

  // Envoi vers le backend
  async sendToBackend(event) {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '/api';
      const token = localStorage.getItem('token');

      if (!token) return; // Pas d'envoi si pas authentifié

      await fetch(`${apiUrl}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      // Silencieux en cas d'erreur - les analytics ne doivent pas casser l'app
      if (process.env.NODE_ENV === 'development') {
        console.warn('Erreur envoi analytics:', error);
      }
    }
  }

  // Obtenir le chemin de conversion
  getConversionPath() {
    const onboardingEvents = this.events
      .filter(event => event.eventName.startsWith('onboarding_'))
      .map(event => event.eventName.replace('onboarding_', ''));

    return onboardingEvents;
  }

  // Métriques de session
  getSessionMetrics() {
    const sessionEvents = this.events.filter(event =>
      event.properties.sessionId === this.sessionId
    );

    if (sessionEvents.length === 0) return null;

    const firstEvent = sessionEvents[0];
    const lastEvent = sessionEvents[sessionEvents.length - 1];
    const duration = lastEvent.properties.timestamp - firstEvent.properties.timestamp;

    return {
      sessionId: this.sessionId,
      duration,
      eventCount: sessionEvents.length,
      startTime: firstEvent.properties.timestamp,
      endTime: lastEvent.properties.timestamp,
      onboardingEvents: sessionEvents.filter(e => e.eventName.startsWith('onboarding_')).length,
      conversionEvents: sessionEvents.filter(e => e.eventName.startsWith('conversion_')).length,
      engagementEvents: sessionEvents.filter(e => e.eventName.startsWith('engagement_')).length
    };
  }

  // Nettoyer les données
  clearEvents() {
    this.events = [];
    localStorage.removeItem('analytics_events');
  }

  // Export des données pour debugging
  exportData() {
    return {
      events: this.events,
      sessionMetrics: this.getSessionMetrics(),
      sessionId: this.sessionId,
      userId: this.userId
    };
  }
}

// Instance globale
const analytics = new AnalyticsManager();

// Fonctions utilitaires pour l'onboarding
export const trackOnboardingEvent = (eventName, properties = {}) => {
  analytics.trackOnboardingEvent(eventName, properties);
};

export const trackConversionEvent = (eventName, properties = {}) => {
  analytics.trackConversionEvent(eventName, properties);
};

export const trackEngagementEvent = (eventName, properties = {}) => {
  analytics.trackEngagementEvent(eventName, properties);
};

export const trackPerformanceMetric = (metricName, value, properties = {}) => {
  analytics.trackPerformanceMetric(metricName, value, properties);
};

// Événements spécifiques à l'onboarding
export const trackOnboardingStart = () => {
  trackOnboardingEvent('start', {
    startTime: Date.now(),
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
};

export const trackOnboardingComplete = (duration, stepData) => {
  trackOnboardingEvent('complete', {
    duration,
    completedSteps: stepData.completedSteps?.length || 0,
    skippedSteps: stepData.skippedSteps?.length || 0,
    userData: stepData.userData
  });

  trackConversionEvent('onboarding_conversion', {
    conversionTime: duration,
    conversionPath: analytics.getConversionPath()
  });
};

export const trackOnboardingDrop = (step, reason) => {
  trackOnboardingEvent('drop', {
    dropStep: step,
    reason,
    timeOnStep: Date.now() - analytics.events
      .filter(e => e.eventName === 'onboarding_step_view' && e.properties.step === step)[0]?.properties.timestamp
  });
};

// Configuration et utilitaires
export const setAnalyticsUserId = (userId) => {
  analytics.setUserId(userId);
};

export const getAnalyticsData = () => {
  return analytics.exportData();
};

export const clearAnalyticsData = () => {
  analytics.clearEvents();
};

export default analytics;