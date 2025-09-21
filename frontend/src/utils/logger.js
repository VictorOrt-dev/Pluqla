// Système de logs développement
// Impact: Debug et monitoring des fonctionnalités en développement
// Utilisé par: Feature flags, hooks, composants pour debug

import { featureFlags } from './featureFlags';

// Configuration des logs
const LOG_CONFIG = {
  levels: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },
  colors: {
    ERROR: '#ff6b6b',
    WARN: '#ffa726',
    INFO: '#42a5f5',
    DEBUG: '#66bb6a',
    TRACE: '#ab47bc'
  },
  maxLogs: 1000,
  persistLogs: true
};

class Logger {
  constructor() {
    this.logs = [];
    this.level = LOG_CONFIG.levels.DEBUG;
    this.enabled = false;
    this.startTime = Date.now();
  }

  // Initialiser le logger
  initialize() {
    this.enabled = featureFlags.isEnabled('dev.logging');

    if (this.enabled) {
      console.log(
        '%c🚀 Logger initialized',
        'color: #42a5f5; font-weight: bold'
      );
      this.info('Application started', { timestamp: new Date().toISOString() });
    }
  }

  // Créer une entrée de log
  createLogEntry(level, message, data = null, category = 'general') {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      timeFromStart: Date.now() - this.startTime,
      level,
      category,
      message,
      data,
      stack: new Error().stack
    };

    this.logs.push(entry);

    // Limiter le nombre de logs en mémoire
    if (this.logs.length > LOG_CONFIG.maxLogs) {
      this.logs.shift();
    }

    return entry;
  }

  // Log avec niveau spécifique
  log(level, message, data = null, category = 'general') {
    if (!this.enabled || LOG_CONFIG.levels[level] > this.level) {
      return;
    }

    const entry = this.createLogEntry(level, message, data, category);

    // Afficher dans la console avec couleurs
    const color = LOG_CONFIG.colors[level];
    const timeStr = `${entry.timeFromStart}ms`;

    console.group(
      `%c[${level}] %c${timeStr} %c${category} %c${message}`,
      `color: ${color}; font-weight: bold`,
      'color: #666; font-size: 0.9em',
      'color: #999; font-style: italic',
      'color: inherit'
    );

    if (data) {
      console.log('Data:', data);
    }

    if (level === 'ERROR' && entry.stack) {
      console.log('Stack:', entry.stack);
    }

    console.groupEnd();
  }

  // Méthodes de niveau
  error(message, data = null, category = 'general') {
    this.log('ERROR', message, data, category);
  }

  warn(message, data = null, category = 'general') {
    this.log('WARN', message, data, category);
  }

  info(message, data = null, category = 'general') {
    this.log('INFO', message, data, category);
  }

  debug(message, data = null, category = 'general') {
    this.log('DEBUG', message, data, category);
  }

  trace(message, data = null, category = 'general') {
    this.log('TRACE', message, data, category);
  }

  // Logs spécialisés
  featureFlag(flagName, value, reason = '') {
    this.debug(`Feature flag ${flagName}: ${value}`, { flagName, value, reason }, 'feature-flags');
  }

  performance(operation, duration, data = null) {
    const level = duration > 1000 ? 'WARN' : duration > 500 ? 'INFO' : 'DEBUG';
    this.log(level, `Performance: ${operation} took ${duration}ms`, data, 'performance');
  }

  userAction(action, data = null) {
    this.info(`User action: ${action}`, data, 'user');
  }

  apiCall(endpoint, method, duration, success, data = null) {
    const level = success ? 'DEBUG' : 'WARN';
    this.log(level, `API ${method} ${endpoint} (${duration}ms)`, data, 'api');
  }

  // Timer pour mesurer les performances
  time(label) {
    if (!this.enabled) return () => {};

    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.performance(label, Math.round(duration));
      return duration;
    };
  }

  // Grouper les logs
  group(title) {
    if (this.enabled) {
      console.group(`📊 ${title}`);
    }
    return () => {
      if (this.enabled) {
        console.groupEnd();
      }
    };
  }

  // Obtenir les logs filtrés
  getLogs(filters = {}) {
    let filtered = [...this.logs];

    if (filters.level) {
      const minLevel = LOG_CONFIG.levels[filters.level];
      filtered = filtered.filter(log => LOG_CONFIG.levels[log.level] <= minLevel);
    }

    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    if (filters.since) {
      filtered = filtered.filter(log => log.timestamp >= filters.since);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Exporter les logs
  export() {
    const data = {
      logs: this.logs,
      config: LOG_CONFIG,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecoride-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Nettoyer les logs
  clear() {
    this.logs = [];
    if (this.enabled) {
      console.clear();
      this.info('Logs cleared');
    }
  }

  // Statistiques des logs
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentLogs = this.logs.filter(log => log.timestamp > oneHourAgo);
    const errorCount = recentLogs.filter(log => log.level === 'ERROR').length;
    const warnCount = recentLogs.filter(log => log.level === 'WARN').length;

    return {
      total: this.logs.length,
      recentHour: recentLogs.length,
      errors: errorCount,
      warnings: warnCount,
      categories: [...new Set(this.logs.map(log => log.category))],
      enabled: this.enabled
    };
  }
}

// Instance globale
export const logger = new Logger();

// Auto-initialisation
setTimeout(() => {
  if (typeof window !== 'undefined') {
    logger.initialize();
  }
}, 100);

// Hook React pour utiliser le logger
import { useEffect, useRef } from 'react';

export const useLogger = (category = 'component') => {
  const componentName = useRef(null);

  // Détecter le nom du composant
  useEffect(() => {
    if (!componentName.current) {
      const stack = new Error().stack;
      const match = stack.match(/at (\w+)/);
      componentName.current = match ? match[1] : 'UnknownComponent';
    }
  }, []);

  return {
    error: (message, data) => logger.error(message, data, category),
    warn: (message, data) => logger.warn(message, data, category),
    info: (message, data) => logger.info(message, data, category),
    debug: (message, data) => logger.debug(message, data, category),
    trace: (message, data) => logger.trace(message, data, category),
    time: (label) => logger.time(`${componentName.current}: ${label}`),
    userAction: (action, data) => logger.userAction(`${componentName.current}: ${action}`, data)
  };
};

// Intercepter les erreurs globales
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Global error', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error?.stack
    }, 'global');
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason,
      promise: event.promise
    }, 'global');
  });
}