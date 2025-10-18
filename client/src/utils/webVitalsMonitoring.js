/**
 * Web Vitals Monitoring - Phase 3
 *
 * Collecte et envoie les Core Web Vitals au backend pour monitoring Prometheus
 *
 * Métriques collectées:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */

import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';
import secureLogger from './secureLogger';

// Configuration
const WEB_VITALS_ENDPOINT = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/analytics/web-vitals`
  : '/api/analytics/web-vitals';

const BATCH_SIZE = 5;
const BATCH_TIMEOUT = 10000; // 10 seconds

// Thresholds pour ratings (Google)
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 }
};

// Batch storage
let metricsBatch = [];
let batchTimer = null;

/**
 * Déterminer le rating d'une métrique
 */
function getRating(name, value) {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Envoyer le batch de métriques au backend
 */
async function sendMetricsBatch() {
  if (metricsBatch.length === 0) return;

  const batch = [...metricsBatch];
  metricsBatch = [];

  try {
    const response = await fetch(WEB_VITALS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('accessToken') && {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        })
      },
      body: JSON.stringify({
        metrics: batch,
        url: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      secureLogger.info('Web Vitals sent successfully', {
        count: batch.length
      });
    } else {
      secureLogger.warn('Failed to send Web Vitals', {
        status: response.status
      });
    }
  } catch (error) {
    secureLogger.error('Error sending Web Vitals', {
      error: error.message
    });
  }
}

/**
 * Ajouter une métrique au batch
 */
function addMetric(metric) {
  const { name, value, rating, delta, id, navigationType } = metric;

  const metricData = {
    name,
    value: Math.round(value),
    rating: rating || getRating(name, value),
    delta: delta ? Math.round(delta) : null,
    id,
    navigationType,
    timestamp: Date.now()
  };

  metricsBatch.push(metricData);

  // Log en développement
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, metricData);
  }

  // Envoyer si batch plein
  if (metricsBatch.length >= BATCH_SIZE) {
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
    sendMetricsBatch();
  } else {
    // Sinon, programmer envoi après timeout
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        batchTimer = null;
        sendMetricsBatch();
      }, BATCH_TIMEOUT);
    }
  }
}

/**
 * Initialiser le monitoring Web Vitals
 */
export function initWebVitalsMonitoring() {
  if (typeof window === 'undefined') {
    return; // SSR safety
  }

  try {
    // Collecter LCP (Largest Contentful Paint)
    getLCP((metric) => {
      addMetric(metric);
    }, {
      reportAllChanges: false // Seulement la dernière valeur
    });

    // Collecter FID (First Input Delay)
    getFID((metric) => {
      addMetric(metric);
    });

    // Collecter CLS (Cumulative Layout Shift)
    getCLS((metric) => {
      addMetric(metric);
    }, {
      reportAllChanges: false // Seulement la dernière valeur
    });

    // Collecter FCP (First Contentful Paint)
    getFCP((metric) => {
      addMetric(metric);
    });

    // Collecter TTFB (Time to First Byte)
    getTTFB((metric) => {
      addMetric(metric);
    });

    secureLogger.info('Web Vitals monitoring initialized');

    // Envoyer les métriques restantes avant déchargement de la page
    window.addEventListener('beforeunload', () => {
      if (metricsBatch.length > 0) {
        // Utiliser sendBeacon pour envoi garanti
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify({
            metrics: metricsBatch,
            url: window.location.pathname,
            timestamp: new Date().toISOString()
          })], { type: 'application/json' });

          navigator.sendBeacon(WEB_VITALS_ENDPOINT, blob);
        }
      }
    });
  } catch (error) {
    secureLogger.error('Failed to initialize Web Vitals monitoring', {
      error: error.message
    });
  }
}

/**
 * Mesurer la performance d'une action spécifique
 */
export function measurePerformance(actionName, callback) {
  const start = performance.now();

  const finish = () => {
    const duration = performance.now() - start;

    // Envoyer métrique custom
    addMetric({
      name: 'CUSTOM',
      value: duration,
      rating: getRating('FID', duration), // Utiliser les seuils FID pour actions
      id: `${actionName}-${Date.now()}`,
      navigationType: 'custom',
      action: actionName
    });
  };

  // Support async et sync
  try {
    const result = callback();

    if (result && typeof result.then === 'function') {
      return result.finally(finish);
    } else {
      finish();
      return result;
    }
  } catch (error) {
    finish();
    throw error;
  }
}

/**
 * Tracker une navigation SPA
 */
export function trackNavigation(fromRoute, toRoute) {
  const start = performance.now();

  // Retourner fonction pour appeler quand navigation terminée
  return () => {
    const duration = performance.now() - start;

    addMetric({
      name: 'SPA_NAVIGATION',
      value: duration,
      rating: getRating('FID', duration),
      id: `nav-${Date.now()}`,
      navigationType: 'spa',
      from: fromRoute,
      to: toRoute
    });
  };
}

/**
 * Exporter métriques pour développement/debug
 */
export function getMetricsSnapshot() {
  return {
    pending: [...metricsBatch],
    batchSize: metricsBatch.length,
    timerActive: batchTimer !== null
  };
}

export default {
  initWebVitalsMonitoring,
  measurePerformance,
  trackNavigation,
  getMetricsSnapshot
};
