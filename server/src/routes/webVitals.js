/**
 * Web Vitals Analytics Endpoint - Phase 3
 *
 * Reçoit les métriques Core Web Vitals du client et les enregistre dans Prometheus
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const {
  webVitalsLCP,
  webVitalsFID,
  webVitalsCLS,
  webVitalsFCP,
  webVitalsTTFB,
  webVitalsByRating
} = require('../config/prometheus');

/**
 * POST /api/analytics/web-vitals
 * Enregistre les métriques Web Vitals
 */
router.post('/web-vitals', async (req, res) => {
  try {
    const {
      name,
      value,
      rating,
      delta,
      id,
      navigationType,
      url,
      timestamp,
      userAgent,
      connection,
      deviceMemory
    } = req.body;

    // Validation
    if (!name || !value || !rating) {
      return res.status(400).json({
        error: 'Missing required fields: name, value, rating'
      });
    }

    // Enregistrer la métrique dans Prometheus
    switch (name) {
      case 'LCP':
        webVitalsLCP.observe(value);
        webVitalsByRating.inc({ metric: 'LCP', rating });
        break;

      case 'FID':
        webVitalsFID.observe(value);
        webVitalsByRating.inc({ metric: 'FID', rating });
        break;

      case 'CLS':
        webVitalsCLS.observe(value);
        webVitalsByRating.inc({ metric: 'CLS', rating });
        break;

      case 'FCP':
        webVitalsFCP.observe(value);
        webVitalsByRating.inc({ metric: 'FCP', rating });
        break;

      case 'TTFB':
        webVitalsTTFB.observe(value);
        webVitalsByRating.inc({ metric: 'TTFB', rating });
        break;

      case 'INP':
        // INP (Interaction to Next Paint) - use FID histogram for now
        webVitalsFID.observe(value);
        webVitalsByRating.inc({ metric: 'INP', rating });
        break;

      default:
        logger.warn('Unknown Web Vital metric', { name });
    }

    // Log pour debug/analytics
    logger.info('Web Vital recorded', {
      name,
      value: Math.round(value),
      rating,
      url,
      connection: connection?.effectiveType || 'unknown'
    });

    res.status(200).json({
      success: true,
      message: 'Web Vital recorded'
    });
  } catch (error) {
    logger.error('Error recording Web Vital', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to record Web Vital'
    });
  }
});

/**
 * POST /api/analytics/web-vitals/batch
 * Enregistre plusieurs métriques en batch
 */
router.post('/web-vitals/batch', async (req, res) => {
  try {
    const { metrics, url, referrer, userAgent, timestamp } = req.body;

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({
        error: 'metrics must be a non-empty array'
      });
    }

    let recorded = 0;
    let failed = 0;

    for (const metric of metrics) {
      try {
        const { name, value, rating } = metric;

        if (!name || !value || !rating) {
          failed++;
          continue;
        }

        // Enregistrer dans Prometheus
        switch (name) {
          case 'LCP':
            webVitalsLCP.observe(value);
            webVitalsByRating.inc({ metric: 'LCP', rating });
            break;
          case 'FID':
            webVitalsFID.observe(value);
            webVitalsByRating.inc({ metric: 'FID', rating });
            break;
          case 'CLS':
            webVitalsCLS.observe(value);
            webVitalsByRating.inc({ metric: 'CLS', rating });
            break;
          case 'FCP':
            webVitalsFCP.observe(value);
            webVitalsByRating.inc({ metric: 'FCP', rating });
            break;
          case 'TTFB':
            webVitalsTTFB.observe(value);
            webVitalsByRating.inc({ metric: 'TTFB', rating });
            break;
          case 'INP':
            webVitalsFID.observe(value);
            webVitalsByRating.inc({ metric: 'INP', rating });
            break;
        }

        recorded++;
      } catch (metricError) {
        logger.error('Error recording individual metric', {
          error: metricError.message,
          metric
        });
        failed++;
      }
    }

    logger.info('Web Vitals batch recorded', {
      recorded,
      failed,
      total: metrics.length,
      url
    });

    res.status(200).json({
      success: true,
      recorded,
      failed,
      total: metrics.length
    });
  } catch (error) {
    logger.error('Error recording Web Vitals batch', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to record Web Vitals batch'
    });
  }
});

/**
 * GET /api/analytics/web-vitals/summary
 * Obtient un résumé des métriques Web Vitals
 * (Pour dashboard admin)
 */
router.get('/web-vitals/summary', async (req, res) => {
  try {
    // Note: En production, ces données viendraient de Prometheus ou d'une DB
    // Ici, on retourne juste un message indiquant où trouver les métriques

    res.status(200).json({
      message: 'Web Vitals metrics are exposed on /metrics endpoint for Prometheus',
      metrics: [
        'web_vitals_lcp_milliseconds',
        'web_vitals_fid_milliseconds',
        'web_vitals_cls_score',
        'web_vitals_fcp_milliseconds',
        'web_vitals_ttfb_milliseconds',
        'web_vitals_by_rating_total'
      ],
      grafanaDashboard: 'http://localhost:3001/dashboards' // À configurer
    });
  } catch (error) {
    logger.error('Error fetching Web Vitals summary', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch Web Vitals summary'
    });
  }
});

module.exports = router;
