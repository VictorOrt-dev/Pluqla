const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('./middleware/rateLimit');
const { requestTracker, globalErrorHandler } = require('./utils/responseHelper');
const { performanceMiddleware } = require('./middleware/performanceMiddleware');
const metricsMiddleware = require('./middleware/metricsMiddleware');

// ✨ Phase 7 - Modern CSRF Protection (no vulnerable dependencies)
const { conditionalCsrfProtection, csrfErrorHandler, attachCsrfToken } = require('./middleware/csrf-modern');

// ✨ Phase 1B - Security & Observability
const { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } = require('./config/sentry');
const { prometheusMiddleware } = require('./config/prometheus');
const { attachIPHash } = require('./services/ipDeduplicationService');

// Routes
const routes = require('./routes');

const app = express();

// ✨ Phase 1B - Initialize Sentry error tracking (MUST be first)
if (process.env.SENTRY_DSN && process.env.SENTRY_ENABLED !== 'false') {
  initSentry(app);
  logger.info('✅ Sentry error tracking initialized');
}

// Trust proxy si derrière un reverse proxy
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// CORS Configuration - Enhanced for development and production
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

    // Permettre les requêtes sans origin (mobile apps, Postman, curl, same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // En développement, autoriser tous les localhost et 127.0.0.1
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      if (isLocalhost) {
        logger.info(`✅ CORS allowing development origin: ${origin}`);
        return callback(null, true);
      }
    }

    // Check against allowed origins list
    if (allowedOrigins.includes(origin)) {
      logger.info(`✅ CORS allowing configured origin: ${origin}`);
      return callback(null, true);
    }

    // Log rejected origin for debugging
    logger.warn(`⚠️  CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-API-Key',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours - cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// ✨ Phase 1B - Sentry request tracking (must be before other middlewares)
if (process.env.SENTRY_DSN && process.env.SENTRY_ENABLED !== 'false') {
  app.use(sentryRequestHandler());
  app.use(sentryTracingHandler());
}

// ✨ Phase 7 - Enhanced Security Headers with CSP for Recipe APIs
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (React + Tailwind)
      scriptSrc: [
        "'self'",
        process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : '',
        process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : '', // React dev only
        'https://cdn.jsdelivr.net', // CDN for libraries
      ].filter(Boolean),
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https:', // Allow all HTTPS images
        'https://spoonacular.com',
        'https://*.spoonacular.com',
        'https://edamam-product-images.s3.amazonaws.com',
        'https://www.themealdb.com',
        'https://*.unsplash.com', // For placeholder images
      ],
      connectSrc: [
        "'self'",
        process.env.NODE_ENV === 'development' ? 'http://localhost:*' : '',
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '', // WebSocket dev
        'https://api.spoonacular.com',
        'https://api.edamam.com',
        'https://www.themealdb.com',
        process.env.SENTRY_DSN ? 'https://sentry.io' : '',
      ].filter(Boolean),
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // Enable XSS filter
}));

app.use(cors(corsOptions));
app.use(compression());

// ✨ Phase 2 - Cache headers for optimal performance
const { setCacheHeaders, setSecurityHeaders } = require('./middleware/cacheHeaders');
app.use(setCacheHeaders);
app.use(setSecurityHeaders);

// Logging des requêtes HTTP
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (msg) => {
        try {
          logger.info(msg.trim());
        } catch (err) {
          // Silently ignore EPIPE errors during logging
          if (err.code !== 'EPIPE') {
            console.error('Morgan logging error:', err);
          }
        }
      }
    },
    skip: (req, res) => {
      // Skip logging if socket is already closed
      return !res.socket || res.socket.destroyed;
    }
  }));
} else {
  // Development mode - safe morgan with EPIPE protection
  const stream = process.stdout;
  stream.on('error', (err) => {
    if (err.code !== 'EPIPE') {
      console.error('Stream error:', err);
    }
  });

  app.use(morgan('dev', {
    skip: (req, res) => {
      // Skip logging if socket is already closed
      return !res.socket || res.socket.destroyed;
    }
  }));
}

// ✨ Phase 1B - IP Deduplication (attach ipHash to all requests for GDPR compliance)
app.use(attachIPHash);

// Rate limiting global
app.use(rateLimit.global);

// Request tracking middleware (must be before routes)
app.use(requestTracker);

// Performance monitoring middleware
app.use(performanceMiddleware);

// ✨ Phase 1B - Prometheus metrics middleware (must be before routes)
if (process.env.PROMETHEUS_METRICS_ENABLED !== 'false') {
  app.use(prometheusMiddleware);
  logger.info('✅ Prometheus metrics collection enabled');
}

// Legacy metrics middleware (keeping for backward compatibility)
app.use(metricsMiddleware);

// Cookie parser middleware (REQUIRED for Better Auth session persistence + CSRF)
app.use(cookieParser());

// ✨ Phase 7 - CSRF Protection (must be after cookieParser, before routes)
// Apply CSRF protection to all state-changing methods (POST, PUT, PATCH, DELETE)
// Skips API key authenticated requests and webhooks
app.use(conditionalCsrfProtection);

// Attach CSRF token to all responses for frontend consumption
app.use(attachCsrfToken);

// Parsing du body with enhanced error handling
app.use(express.json({
  limit: process.env.UPLOAD_MAX_SIZE || '10mb',
  // Custom error handler for JSON parsing errors
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (err) {
      // Store parsing error for better error message
      req.jsonParseError = err;
      throw err;
    }
  }
}));

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    // Bad JSON format
    logger.warn('JSON parsing error', {
      url: req.url,
      method: req.method,
      error: err.message,
      ip: req.ip
    });

    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains malformed JSON. Please check your input for special characters that need escaping.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

app.use(express.urlencoded({ extended: true, limit: process.env.UPLOAD_MAX_SIZE || '10mb' }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  etag: true
}));

// Comprehensive health check endpoint with all subsystems
app.get('/health', async (req, res) => {
  const { getHealthStatus } = require('./services/monitoringService');

  try {
    const healthStatus = await getHealthStatus();

    // Determine HTTP status code based on health
    let statusCode = 200;
    if (healthStatus.status === 'degraded') {
      statusCode = 200; // Still operational, just degraded
    } else if (healthStatus.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: require('../package.json').version,
      error: 'Health check failed: ' + error.message,
      subsystems: {
        database: { healthy: false, error: 'Unknown' },
        auth: { healthy: false, error: 'Unknown' },
        ai: { healthy: false, error: 'Unknown' },
        sessionCleanup: { healthy: false, error: 'Unknown' }
      }
    });
  }
});

// ✨ Phase 1B - Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    // Try Phase 1B Prometheus metrics first
    if (process.env.PROMETHEUS_METRICS_ENABLED !== 'false') {
      const { register } = require('./config/prometheus');
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      return res.end(metrics);
    }

    // Fallback to legacy metrics
    const { register } = require('./monitoring/metrics');
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    logger.error('Error generating metrics:', err);
    res.status(500).end('Error generating metrics');
  }
});

// Better Auth Routes (mount before other API routes)
// TEMPORARILY DISABLED: Better Auth has issues with SQLite adapter
// const { auth } = require('./auth/betterAuth');
// app.use('/api/auth', auth.handler);

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
        customCss: '.swagger-ui .topbar { display: none }'
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
    availableEndpoints: ['/health', '/api/auth', '/api/users', '/api/transactions']
  });
});

// ✨ Phase 1B - Sentry error handler (must be after routes, before other error handlers)
if (process.env.SENTRY_DSN && process.env.SENTRY_ENABLED !== 'false') {
  app.use(sentryErrorHandler());
}

// ✨ Phase 7 - CSRF error handler (must be before global error handler)
app.use(csrfErrorHandler);

// Global error handler (enhanced universal format)
app.use(globalErrorHandler);

module.exports = app;
