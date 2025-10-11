/**
 * Metrics Route
 *
 * Exposes Prometheus metrics endpoint for monitoring
 */

const express = require('express');
const router = express.Router();
const { client } = require('../infra/metrics/promClient');
const logger = require('../utils/logger');

/**
 * GET /metrics
 * Prometheus metrics endpoint
 *
 * Returns metrics in Prometheus text format
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', { error: error.message });
    res.status(500).end();
  }
});

/**
 * GET /metrics/health
 * Health check endpoint for monitoring systems
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
