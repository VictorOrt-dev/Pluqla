const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('./middleware/rateLimit');
const { requestTracker, globalErrorHandler } = require('./utils/responseHelper');
const { performanceMiddleware } = require('./middleware/performanceMiddleware');

// Routes
const routes = require('./routes');

const app = express();

// Trust proxy si derrière un reverse proxy
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

    // Permettre les requêtes sans origin (mobile, Postman, etc.)
    if (!origin) return callback(null, true);

    // En développement, autoriser tous les localhost
    if (process.env.NODE_ENV === 'development' && origin && origin.includes('localhost')) {
      console.log(`✅ CORS allowing development origin: ${origin}`);
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Middlewares de sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Désactivé pour les uploads d'images
}));

app.use(cors(corsOptions));
app.use(compression());

// Logging des requêtes HTTP
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Rate limiting global
app.use(rateLimit.global);

// Request tracking middleware (must be before routes)
app.use(requestTracker);

// Performance monitoring middleware
app.use(performanceMiddleware);

// Parsing du body
app.use(express.json({ limit: process.env.UPLOAD_MAX_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.UPLOAD_MAX_SIZE || '10mb' }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  etag: true,
}));

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  const { getDatabaseHealth, getConnectionStats } = require('./lib/prisma');

  try {
    // Get database health
    const dbHealth = await getDatabaseHealth();

    // Get connection statistics (only if database is healthy)
    let connectionStats = null;
    if (dbHealth.healthy) {
      try {
        connectionStats = await getConnectionStats();
      } catch (error) {
        // Connection stats are optional, continue without them
        console.warn('Failed to get connection stats:', error.message);
      }
    }

    const healthStatus = {
      status: dbHealth.healthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: require('../package.json').version,
      database: {
        healthy: dbHealth.healthy,
        latency: dbHealth.latency,
        error: dbHealth.error || null,
        connections: connectionStats
      }
    };

    // Return 503 if database is unhealthy
    const statusCode = dbHealth.healthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: require('../package.json').version,
      error: 'Health check failed',
      database: {
        healthy: false,
        error: error.message
      }
    });
  }
});

// API Routes
app.use('/api', routes);

// Route pour la documentation API (en développement)
if (process.env.NODE_ENV !== 'production') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const fs = require('fs');
    const path = require('path');

    const openApiPath = path.join(__dirname, '../openapi.json');
    if (fs.existsSync(openApiPath)) {
      const swaggerDocument = JSON.parse(
        fs.readFileSync(openApiPath, 'utf8')
      );

      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
      }));
    } else {
      logger.warn('OpenAPI documentation file not found at:', openApiPath);
    }
  } catch (error) {
    logger.warn('OpenAPI documentation not available:', error.message);
  }
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Route ${req.originalUrl} does not exist`,
    availableEndpoints: ['/health', '/api/auth', '/api/users', '/api/transactions'],
  });
});

// Global error handler (enhanced universal format)
app.use(globalErrorHandler);

module.exports = app;