// Chargement de dotenv en premier
require('dotenv').config();

console.log('🔧 Environment variables loaded');
console.log('📊 NODE_ENV:', process.env.NODE_ENV);
console.log('🚪 PORT:', process.env.PORT);
console.log('🗃️ DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 Starting server setup...');

// Démarrage du serveur
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
  logger.info('⏹️  SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('⏹️  SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Process terminated');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;// restart trigger
