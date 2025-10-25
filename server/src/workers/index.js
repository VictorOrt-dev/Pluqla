/**
 * Workers Index
 *
 * Lance tous les workers Bull pour traiter les jobs en arrière-plan
 * Ce fichier doit être exécuté dans un process séparé du serveur API
 *
 * Usage:
 *   node src/workers/index.js
 *   PM2: pm2 start src/workers/index.js --name "pluqla-workers"
 */

const { enrichmentQueue } = require('../queues/enrichmentQueue');
const { popularityQueue } = require('../queues/popularityQueue');
const enrichmentProcessor = require('./enrichmentProcessor');
const popularityProcessor = require('./popularityProcessor');
const logger = require('../utils/logger');
const { testConnection } = require('../config/redis');

/**
 * Initialize workers
 */
async function initializeWorkers() {
  try {
    logger.info('Starting Pluqla workers...');

    // Test Redis connection
    const redisConnected = await testConnection();
    if (!redisConnected) {
      throw new Error('Redis connection failed');
    }

    // Register processors
    logger.info('Registering enrichment processor...');
    enrichmentQueue.process('enrich-recipe', 2, enrichmentProcessor.processEnrichment);

    logger.info('Registering popularity processors...');
    popularityQueue.process('calculate-all', 1, popularityProcessor.processCalculateAll);
    popularityQueue.process('calculate-one', 2, popularityProcessor.processCalculateOne);

    // Schedule CRON jobs
    const { schedulePopularityCalculation } = require('../queues/popularityQueue');
    schedulePopularityCalculation();

    logger.info('Workers started successfully', {
      enrichmentConcurrency: 2,
      popularityConcurrency: 1
    });

    // Health check endpoint (optional - si workers exposent HTTP)
    if (process.env.WORKER_HTTP_PORT) {
      const express = require('express');
      const app = express();

      app.get('/health', async (req, res) => {
        const enrichmentStats = await require('../queues/enrichmentQueue').getQueueStats();
        const popularityStats = await require('../queues/popularityQueue').getQueueStats();

        res.json({
          status: 'healthy',
          uptime: process.uptime(),
          queues: {
            enrichment: enrichmentStats,
            popularity: popularityStats
          }
        });
      });

      app.listen(process.env.WORKER_HTTP_PORT, () => {
        logger.info(`Worker health endpoint listening on port ${process.env.WORKER_HTTP_PORT}`);
      });
    }

  } catch (error) {
    logger.error('Failed to start workers', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down workers gracefully...');

  try {
    await Promise.all([
      enrichmentQueue.close(),
      popularityQueue.close()
    ]);

    logger.info('Workers shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in worker', {
    error: error.message,
    stack: error.stack
  });
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in worker', {
    reason,
    promise
  });
  shutdown();
});

// Start workers
if (require.main === module) {
  initializeWorkers().catch((error) => {
    logger.error('Worker initialization failed', {
      error: error.message
    });
    process.exit(1);
  });
}

module.exports = {
  initializeWorkers,
  shutdown
};
