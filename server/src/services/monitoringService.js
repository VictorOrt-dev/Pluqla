/**
 * Monitoring Service
 *
 * Provides comprehensive monitoring and observability for the Pluqla backend.
 *
 * Features:
 * - Prometheus metrics collection
 * - Health checks for all subsystems (DB, Auth, AI)
 * - Custom business metrics (auth failures, AI errors, session cleanup)
 * - Real-time service status tracking
 *
 * Usage:
 *   const { metrics, recordAuthFailure, getHealthStatus } = require('./monitoringService');
 *   recordAuthFailure('invalid_credentials');
 *   const health = await getHealthStatus();
 */

const promClient = require('prom-client');
const logger = require('../utils/logger');

// Initialize Prometheus registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'pluqla_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10
});

// ========================================
// CUSTOM METRICS DEFINITIONS
// ========================================

/**
 * HTTP Request Metrics
 */
const httpRequestDuration = new promClient.Histogram({
  name: 'pluqla_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

const httpRequestTotal = new promClient.Counter({
  name: 'pluqla_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestTotal);

/**
 * Authentication Metrics
 */
const authAttemptsTotal = new promClient.Counter({
  name: 'pluqla_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'status'] // method: password, oauth; status: success, failure
});
register.registerMetric(authAttemptsTotal);

const authFailuresTotal = new promClient.Counter({
  name: 'pluqla_auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['reason'] // invalid_credentials, account_locked, email_not_verified, etc.
});
register.registerMetric(authFailuresTotal);

const activeSessionsGauge = new promClient.Gauge({
  name: 'pluqla_active_sessions',
  help: 'Number of currently active user sessions'
});
register.registerMetric(activeSessionsGauge);

const sessionDuration = new promClient.Histogram({
  name: 'pluqla_session_duration_seconds',
  help: 'Duration of user sessions in seconds',
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400] // 1min to 24h
});
register.registerMetric(sessionDuration);

/**
 * AI Service Metrics
 */
const aiRequestsTotal = new promClient.Counter({
  name: 'pluqla_ai_requests_total',
  help: 'Total number of AI service requests',
  labelNames: ['provider', 'operation', 'status'] // provider: openai, anthropic, none
});
register.registerMetric(aiRequestsTotal);

const aiRequestDuration = new promClient.Histogram({
  name: 'pluqla_ai_request_duration_seconds',
  help: 'Duration of AI service requests in seconds',
  labelNames: ['provider', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60] // AI requests can be slow
});
register.registerMetric(aiRequestDuration);

const aiErrorsTotal = new promClient.Counter({
  name: 'pluqla_ai_errors_total',
  help: 'Total number of AI service errors',
  labelNames: ['provider', 'error_type'] // rate_limit, timeout, api_error, invalid_response
});
register.registerMetric(aiErrorsTotal);

const aiCacheHitsTotal = new promClient.Counter({
  name: 'pluqla_ai_cache_hits_total',
  help: 'Total number of AI cache hits',
  labelNames: ['operation']
});
register.registerMetric(aiCacheHitsTotal);

/**
 * Database Metrics
 */
const dbQueryDuration = new promClient.Histogram({
  name: 'pluqla_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['model', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});
register.registerMetric(dbQueryDuration);

const dbQueriesTotal = new promClient.Counter({
  name: 'pluqla_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['model', 'operation', 'status'] // status: success, error
});
register.registerMetric(dbQueriesTotal);

const dbConnectionsActive = new promClient.Gauge({
  name: 'pluqla_db_connections_active',
  help: 'Number of active database connections'
});
register.registerMetric(dbConnectionsActive);

const dbConnectionsIdle = new promClient.Gauge({
  name: 'pluqla_db_connections_idle',
  help: 'Number of idle database connections'
});
register.registerMetric(dbConnectionsIdle);

/**
 * Session Cleanup Metrics
 */
const sessionCleanupRunsTotal = new promClient.Counter({
  name: 'pluqla_session_cleanup_runs_total',
  help: 'Total number of session cleanup runs',
  labelNames: ['status'] // success, failure
});
register.registerMetric(sessionCleanupRunsTotal);

const sessionCleanupDuration = new promClient.Histogram({
  name: 'pluqla_session_cleanup_duration_seconds',
  help: 'Duration of session cleanup operations in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});
register.registerMetric(sessionCleanupDuration);

const sessionCleanupSessionsDeleted = new promClient.Counter({
  name: 'pluqla_session_cleanup_sessions_deleted_total',
  help: 'Total number of sessions deleted by cleanup'
});
register.registerMetric(sessionCleanupSessionsDeleted);

/**
 * Business Metrics
 */
const transactionsCreatedTotal = new promClient.Counter({
  name: 'pluqla_transactions_created_total',
  help: 'Total number of transactions created',
  labelNames: ['type'] // income, expense
});
register.registerMetric(transactionsCreatedTotal);

const transactionAmountSum = new promClient.Counter({
  name: 'pluqla_transaction_amount_total',
  help: 'Total amount of all transactions',
  labelNames: ['type', 'currency']
});
register.registerMetric(transactionAmountSum);

const usersRegisteredTotal = new promClient.Counter({
  name: 'pluqla_users_registered_total',
  help: 'Total number of users registered',
  labelNames: ['method'] // email, oauth
});
register.registerMetric(usersRegisteredTotal);

// ========================================
// SERVICE HEALTH TRACKING
// ========================================

/**
 * Track health status of each subsystem
 */
const subsystemHealth = {
  database: { healthy: false, lastCheck: null, latency: null, error: null },
  auth: { healthy: false, lastCheck: null, error: null },
  ai: { healthy: false, lastCheck: null, providers: {}, error: null },
  sessionCleanup: { healthy: true, lastRun: null, lastError: null }
};

/**
 * Update subsystem health status
 */
function updateSubsystemHealth(subsystem, status) {
  if (subsystemHealth[subsystem]) {
    subsystemHealth[subsystem] = {
      ...subsystemHealth[subsystem],
      ...status,
      lastCheck: new Date()
    };
  }
}

/**
 * Get current health status of all subsystems
 */
async function getHealthStatus() {
  const { getDatabaseHealth, getConnectionStats } = require('../lib/prisma');

  // Check database health
  try {
    const dbHealth = await getDatabaseHealth();
    const connectionStats = dbHealth.healthy ? await getConnectionStats() : null;

    updateSubsystemHealth('database', {
      healthy: dbHealth.healthy,
      latency: dbHealth.latency,
      connections: connectionStats,
      error: dbHealth.error || null
    });

    // Update database connection gauges
    if (connectionStats) {
      dbConnectionsActive.set(parseInt(connectionStats.active_connections || 0));
      dbConnectionsIdle.set(parseInt(connectionStats.idle_connections || 0));
    }
  } catch (error) {
    logger.error('Database health check failed:', error);
    updateSubsystemHealth('database', {
      healthy: false,
      error: error.message
    });
  }

  // Check Better Auth health
  try {
    const { prisma } = require('../lib/prisma');
    // Simple check: can we query sessions table?
    await prisma.betterAuthSession.count({ take: 1 });

    // Count active sessions
    const activeSessions = await prisma.betterAuthSession.count({
      where: {
        expires: { gt: new Date() }
      }
    });

    activeSessionsGauge.set(activeSessions);

    updateSubsystemHealth('auth', {
      healthy: true,
      activeSessions,
      error: null
    });
  } catch (error) {
    logger.error('Auth health check failed:', error);
    updateSubsystemHealth('auth', {
      healthy: false,
      error: error.message
    });
  }

  // Check AI service health
  try {
    const aiStatus = {
      healthy: false,
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        azure: !!process.env.AZURE_OPENAI_API_KEY
      },
      activeProvider: process.env.AI_PROVIDER || 'none'
    };

    // AI is "healthy" if at least one provider is configured OR provider is set to "none"
    aiStatus.healthy = aiStatus.activeProvider === 'none' ||
                       Object.values(aiStatus.providers).some(configured => configured);

    updateSubsystemHealth('ai', {
      ...aiStatus,
      error: aiStatus.healthy ? null : 'No AI provider configured'
    });
  } catch (error) {
    logger.error('AI health check failed:', error);
    updateSubsystemHealth('ai', {
      healthy: false,
      error: error.message
    });
  }

  // Overall system health
  const allHealthy = Object.values(subsystemHealth).every(s => s.healthy);
  const anyUnhealthy = Object.values(subsystemHealth).some(s => !s.healthy);

  return {
    status: allHealthy ? 'healthy' : (anyUnhealthy ? 'degraded' : 'unhealthy'),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('../../package.json').version,
    subsystems: subsystemHealth
  };
}

// ========================================
// METRIC RECORDING FUNCTIONS
// ========================================

/**
 * Record HTTP request metrics
 */
function recordHttpRequest(method, route, statusCode, duration) {
  httpRequestTotal.labels(method, route, statusCode).inc();
  httpRequestDuration.labels(method, route, statusCode).observe(duration);
}

/**
 * Record authentication attempt
 */
function recordAuthAttempt(method, success, reason = null) {
  const status = success ? 'success' : 'failure';
  authAttemptsTotal.labels(method, status).inc();

  if (!success && reason) {
    authFailuresTotal.labels(reason).inc();
  }
}

/**
 * Record authentication failure
 */
function recordAuthFailure(reason) {
  authFailuresTotal.labels(reason).inc();
}

/**
 * Record session duration when user logs out
 */
function recordSessionDuration(durationSeconds) {
  sessionDuration.observe(durationSeconds);
}

/**
 * Record AI service request
 */
function recordAIRequest(provider, operation, success, duration, errorType = null) {
  const status = success ? 'success' : 'failure';
  aiRequestsTotal.labels(provider, operation, status).inc();
  aiRequestDuration.labels(provider, operation).observe(duration);

  if (!success && errorType) {
    aiErrorsTotal.labels(provider, errorType).inc();
  }
}

/**
 * Record AI cache hit
 */
function recordAICacheHit(operation) {
  aiCacheHitsTotal.labels(operation).inc();
}

/**
 * Record database query
 */
function recordDatabaseQuery(model, operation, success, duration) {
  const status = success ? 'success' : 'error';
  dbQueriesTotal.labels(model, operation, status).inc();
  dbQueryDuration.labels(model, operation).observe(duration);
}

/**
 * Record session cleanup metrics
 */
function recordSessionCleanup(success, duration, sessionsDeleted) {
  const status = success ? 'success' : 'failure';
  sessionCleanupRunsTotal.labels(status).inc();
  sessionCleanupDuration.observe(duration);

  if (success && sessionsDeleted > 0) {
    sessionCleanupSessionsDeleted.inc(sessionsDeleted);
  }
}

/**
 * Update session cleanup health status
 */
function updateSessionCleanupHealth(lastRun, lastError = null) {
  subsystemHealth.sessionCleanup = {
    healthy: !lastError,
    lastRun,
    lastError
  };
}

/**
 * Record business metrics
 */
function recordTransaction(type, amount, currency = 'EUR') {
  transactionsCreatedTotal.labels(type).inc();
  transactionAmountSum.labels(type, currency).inc(amount);
}

function recordUserRegistration(method = 'email') {
  usersRegisteredTotal.labels(method).inc();
}

// ========================================
// MIDDLEWARE
// ========================================

/**
 * Express middleware to automatically track HTTP requests
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture metrics
  res.end = function (...args) {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route ? req.route.path : req.path;

    recordHttpRequest(req.method, route, res.statusCode, duration);

    // Call original end function
    originalEnd.apply(res, args);
  };

  next();
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  // Prometheus registry and metrics
  register,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    authAttemptsTotal,
    authFailuresTotal,
    activeSessionsGauge,
    sessionDuration,
    aiRequestsTotal,
    aiRequestDuration,
    aiErrorsTotal,
    aiCacheHitsTotal,
    dbQueryDuration,
    dbQueriesTotal,
    dbConnectionsActive,
    dbConnectionsIdle,
    sessionCleanupRunsTotal,
    sessionCleanupDuration,
    sessionCleanupSessionsDeleted,
    transactionsCreatedTotal,
    transactionAmountSum,
    usersRegisteredTotal
  },

  // Health check
  getHealthStatus,
  updateSubsystemHealth,

  // Metric recording functions
  recordHttpRequest,
  recordAuthAttempt,
  recordAuthFailure,
  recordSessionDuration,
  recordAIRequest,
  recordAICacheHit,
  recordDatabaseQuery,
  recordSessionCleanup,
  updateSessionCleanupHealth,
  recordTransaction,
  recordUserRegistration,

  // Middleware
  metricsMiddleware
};