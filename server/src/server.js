// Chargement de dotenv en premier
require('dotenv').config();

const logger = require('./utils/logger');

// SECURITY FIX: Use secure logger instead of console.log to prevent environment variable exposure
logger.info('🔧 Environment variables loaded');
logger.info('📊 NODE_ENV configured');
logger.info('🚪 PORT configured');
logger.info('🗃️ DATABASE_URL configured');

const app = require('./app');
const { disconnectPrisma, getDatabaseHealth } = require('./lib/prisma');

const PORT = process.env.PORT || 3004; // FIXED: Match client proxy configuration
const NODE_ENV = process.env.NODE_ENV || 'development';

logger.info('🚀 Starting server setup...');

// Démarrage du serveur avec health check de la base de données
const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);

  // Vérification de la santé de la base de données au démarrage
  try {
    logger.info('🔍 Checking database connection...');
    const dbHealth = await getDatabaseHealth();

    if (dbHealth.healthy) {
      logger.info(`✅ Database connected successfully (${dbHealth.latency}ms)`);
    } else {
      logger.error('❌ Database connection failed:', dbHealth.error);
      logger.warn('⚠️ Server started but database is unavailable');
    }
  } catch (error) {
    logger.error('❌ Database health check failed:', error);
    logger.warn('⚠️ Server started but database status unknown');
  }
});

/**
 * Graceful shutdown handler
 *
 * Ensures proper cleanup of:
 * 1. HTTP server (stop accepting new requests)
 * 2. Database connections (close Prisma client)
 * 3. Other resources (caches, workers, etc.)
 *
 * @param {string} signal - Signal that triggered shutdown
 */
async function gracefulShutdown(signal) {
  logger.info(`⏹️  ${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = 30000; // 30 seconds max shutdown time
  let shutdownTimer;

  try {
    // Set maximum shutdown time to prevent hanging
    shutdownTimer = setTimeout(() => {
      logger.error('🚨 Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, shutdownTimeout);

    // Step 1: Stop accepting new HTTP requests
    logger.info('🔐 Stopping HTTP server...');
    await new Promise((resolve) => {
      server.close(resolve);
    });
    logger.info('✅ HTTP server stopped');

    // Step 2: Close database connections
    logger.info('🗄️ Disconnecting from database...');
    await disconnectPrisma();
    logger.info('✅ Database disconnected');

    // Step 3: Clear shutdown timer
    clearTimeout(shutdownTimer);

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);

    // Clear timeout and force exit on error
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
    }

    process.exit(1);
  }
}

// Register shutdown handlers for different signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', async (err, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', err);

  try {
    // Attempt graceful shutdown with shorter timeout for errors
    await disconnectPrisma(true); // Force disconnect
    logger.info('🗄️ Emergency database disconnect completed');
  } catch (disconnectError) {
    logger.error('❌ Failed to disconnect database during error handling:', disconnectError);
  }

  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;// restart trigger
