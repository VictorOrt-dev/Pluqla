/**
 * WEB VITALS TRACKING
 * Mesure et envoie les métriques Core Web Vitals au backend
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): Temps de chargement du plus gros élément visible (< 2.5s)
 * - FID (First Input Delay): Temps de réponse à la première interaction (< 100ms)
 * - CLS (Cumulative Layout Shift): Stabilité visuelle (< 0.1)
 *
 * Other Vitals:
 * - FCP (First Contentful Paint): Premier pixel affiché (< 1.8s)
 * - TTFB (Time to First Byte): Temps de réponse serveur (< 600ms)
 * - INP (Interaction to Next Paint): Réactivité globale (< 200ms)
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

// Configuration
const ANALYTICS_ENDPOINT = '/api/analytics/web-vitals';
const ENABLE_CONSOLE_LOG = process.env.NODE_ENV === 'development';

/**
 * Envoie une métrique au backend
 * @param {Object} metric - Métrique Web Vitals
 */
function sendToAnalytics(metric) {
  const { name, value, rating, delta, id, navigationType } = metric;

  // Log en développement
  if (ENABLE_CONSOLE_LOG) {
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${emoji} [Web Vitals] ${name}:`, {
      value: `${value.toFixed(2)}ms`,
      rating,
      delta: `${delta.toFixed(2)}ms`,
    });
  }

  // Préparer le payload
  const payload = {
    name,
    value: Math.round(value),
    rating,
    delta: Math.round(delta),
    id,
    navigationType,
    url: window.location.pathname,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    connection: getConnectionInfo(),
    deviceMemory: navigator.deviceMemory || null,
  };

  // Envoyer via sendBeacon (non-bloquant, même si l'utilisateur quitte la page)
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
  } else {
    // Fallback pour les navigateurs qui ne supportent pas sendBeacon
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // Important pour envoyer même après navigation
    }).catch((error) => {
      console.error('[Web Vitals] Failed to send metric:', error);
    });
  }
}

/**
 * Obtient les informations de connexion réseau
 * @returns {Object} Informations de connexion
 */
function getConnectionInfo() {
  if (!navigator.connection) {
    return null;
  }

  return {
    effectiveType: navigator.connection.effectiveType, // 4g, 3g, 2g, slow-2g
    downlink: navigator.connection.downlink, // Mbps
    rtt: navigator.connection.rtt, // Round-trip time en ms
    saveData: navigator.connection.saveData, // Économie de données activée
  };
}

/**
 * Obtient le type de périphérique
 * @returns {string} Type de périphérique (mobile, tablet, desktop)
 */
function getDeviceType() {
  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Initialise le tracking des Web Vitals
 * @param {Function} onMetric - Callback appelé pour chaque métrique (optionnel)
 */
export function initWebVitals(onMetric) {
  const callback = (metric) => {
    // Envoyer au backend
    sendToAnalytics(metric);

    // Callback personnalisé si fourni
    if (onMetric && typeof onMetric === 'function') {
      onMetric(metric);
    }
  };

  // Enregistrer les listeners pour chaque métrique (web-vitals v3+)
  // Note: FID has been deprecated in favor of INP
  onCLS(callback);  // Cumulative Layout Shift
  onFCP(callback);  // First Contentful Paint
  onLCP(callback);  // Largest Contentful Paint
  onTTFB(callback); // Time to First Byte
  onINP(callback);  // Interaction to Next Paint (replaces FID)

  // Log initial en développement
  if (ENABLE_CONSOLE_LOG) {
    console.log('[Web Vitals] Tracking initialized', {
      deviceType: getDeviceType(),
      connection: getConnectionInfo(),
    });
  }
}

/**
 * Obtient un rating basé sur la valeur et les seuils d'une métrique
 * @param {string} name - Nom de la métrique
 * @param {number} value - Valeur de la métrique
 * @returns {string} Rating (good, needs-improvement, poor)
 */
export function getMetricRating(name, value) {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 600, poor: 1500 },
    INP: { good: 200, poor: 500 },
  };

  const threshold = thresholds[name];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Obtient le score Lighthouse estimé basé sur les Core Web Vitals
 * @param {Object} vitals - Objet contenant les valeurs LCP, FID, CLS
 * @returns {number} Score estimé (0-100)
 */
export function estimateLighthouseScore(vitals) {
  const { LCP, FID, CLS } = vitals;

  // Pondération Lighthouse:
  // LCP: 25%
  // FID: 10%
  // CLS: 15%
  // (Autres: FCP 10%, Speed Index 10%, TBT 30%, TTI 10%)

  let score = 100;

  // LCP
  if (LCP) {
    if (LCP > 4000) score -= 25;
    else if (LCP > 2500) score -= (LCP - 2500) / 60; // Dégradation progressive
  }

  // FID
  if (FID) {
    if (FID > 300) score -= 10;
    else if (FID > 100) score -= (FID - 100) / 20;
  }

  // CLS
  if (CLS) {
    if (CLS > 0.25) score -= 15;
    else if (CLS > 0.1) score -= (CLS - 0.1) * 100;
  }

  return Math.max(0, Math.round(score));
}

/**
 * Hook React pour utiliser Web Vitals
 * @returns {Object} State avec les métriques collectées
 */
export function useWebVitals() {
  const [vitals, setVitals] = React.useState({
    LCP: null,
    FID: null,
    CLS: null,
    FCP: null,
    TTFB: null,
    INP: null,
  });

  React.useEffect(() => {
    initWebVitals((metric) => {
      setVitals((prev) => ({
        ...prev,
        [metric.name]: metric.value,
      }));
    });
  }, []);

  return vitals;
}

// Détection de React (pour le hook)
let React;
try {
  React = require('react');
} catch (e) {
  // React non disponible
}

export default initWebVitals;
