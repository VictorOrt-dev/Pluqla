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

// FIXED: Use existing metrics registry to avoid duplicate registration
const { register } = require('../monitoring/metrics');

// NOTE: Default metrics and HTTP metrics are already registered in monitoring/metrics.js
// We only add additional business-specific metrics here that aren't in the main registry

// ========================================
// CUSTOM METRICS DEFINITIONS
// ========================================

/**
 * HTTP Request Metrics
 * NOTE: These are already defined in monitoring/metrics.js,
 * so we'll retrieve them instead of re-creating
 */
let httpRequestDuration;
try {
  httpRequestDuration = register.getSingleMetric('pluqla_http_request_duration_seconds');
  if (!httpRequestDuration) {
    // Only create if it doesn't exist
    httpRequestDuration = new promClient.Histogram({
      name: 'pluqla_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
      registers: [register]
    });
  }
} catch (err) {
  // Metric exists, retrieve it
  httpRequestDuration = register.getSingleMetric('pluqla_http_request_duration_seconds');
}

// Get or create httpRequestTotal
let httpRequestTotal = register.getSingleMetric('pluqla_http_requests_total');
if (!httpRequestTotal) {
  httpRequestTotal = new promClient.Counter({
    name: 'pluqla_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  });
}

/**
 * Authentication Metrics
 */
let authAttemptsTotal = register.getSingleMetric('pluqla_auth_attempts_total');
if (!authAttemptsTotal) {
  authAttemptsTotal = new promClient.Counter({
    name: 'pluqla_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['method', 'status'], // method: password, oauth; status: success, failure
    registers: [register]
  });
}

let authFailuresTotal = register.getSingleMetric('pluqla_auth_failures_total');
if (!authFailuresTotal) {
  authFailuresTotal = new promClient.Counter({
    name: 'pluqla_auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['reason'], // invalid_credentials, account_locked, email_not_verified, etc.
    registers: [register]
  });
}

let activeSessionsGauge = register.getSingleMetric('pluqla_active_sessions');
if (!activeSessionsGauge) {
  activeSessionsGauge = new promClient.Gauge({
    name: 'pluqla_active_sessions',
    help: 'Number of currently active user sessions',
    registers: [register]
  });
}

let sessionDuration = register.getSingleMetric('pluqla_session_duration_seconds');
if (!sessionDuration) {
  sessionDuration = new promClient.Histogram({
    name: 'pluqla_session_duration_seconds',
    help: 'Duration of user sessions in seconds',
    buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400], // 1min to 24h
    registers: [register]
  });
}

/**
 * AI Service Metrics
 */
let aiRequestsTotal = register.getSingleMetric('pluqla_ai_requests_total');
if (!aiRequestsTotal) {
  aiRequestsTotal = new promClient.Counter({
    name: 'pluqla_ai_requests_total',
    help: 'Total number of AI service requests',
    labelNames: ['provider', 'operation', 'status'], // provider: openai, anthropic, none
    registers: [register]
  });
}

let aiRequestDuration = register.getSingleMetric('pluqla_ai_request_duration_seconds');
if (!aiRequestDuration) {
  aiRequestDuration = new promClient.Histogram({
    name: 'pluqla_ai_request_duration_seconds',
    help: 'Duration of AI service requests in seconds',
    labelNames: ['provider', 'operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // AI requests can be slow
    registers: [register]
  });
}

let aiErrorsTotal = register.getSingleMetric('pluqla_ai_errors_total');
if (!aiErrorsTotal) {
  aiErrorsTotal = new promClient.Counter({
    name: 'pluqla_ai_errors_total',
    help: 'Total number of AI service errors',
    labelNames: ['provider', 'error_type'], // rate_limit, timeout, api_error, invalid_response
    registers: [register]
  });
}

let aiCacheHitsTotal = register.getSingleMetric('pluqla_ai_cache_hits_total');
if (!aiCacheHitsTotal) {
  aiCacheHitsTotal = new promClient.Counter({
    name: 'pluqla_ai_cache_hits_total',
    help: 'Total number of AI cache hits',
    labelNames: ['operation'],
    registers: [register]
  });
}

/**
 * Database Metrics
 */
let dbQueryDuration = register.getSingleMetric('pluqla_db_query_duration_seconds');
if (!dbQueryDuration) {
  dbQueryDuration = new promClient.Histogram({
    name: 'pluqla_db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['model', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register]
  });
}

let dbQueriesTotal = register.getSingleMetric('pluqla_db_queries_total');
if (!dbQueriesTotal) {
  dbQueriesTotal = new promClient.Counter({
    name: 'pluqla_db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['model', 'operation', 'status'], // status: success, error
    registers: [register]
  });
}

let dbConnectionsActive = register.getSingleMetric('pluqla_db_connections_active');
if (!dbConnectionsActive) {
  dbConnectionsActive = new promClient.Gauge({
    name: 'pluqla_db_connections_active',
    help: 'Number of active database connections',
    registers: [register]
  });
}

let dbConnectionsIdle = register.getSingleMetric('pluqla_db_connections_idle');
if (!dbConnectionsIdle) {
  dbConnectionsIdle = new promClient.Gauge({
    name: 'pluqla_db_connections_idle',
    help: 'Number of idle database connections',
    registers: [register]
  });
}

/**
 * Session Cleanup Metrics
 */
let sessionCleanupRunsTotal = register.getSingleMetric('pluqla_session_cleanup_runs_total');
if (!sessionCleanupRunsTotal) {
  sessionCleanupRunsTotal = new promClient.Counter({
    name: 'pluqla_session_cleanup_runs_total',
    help: 'Total number of session cleanup runs',
    labelNames: ['status'], // success, failure
    registers: [register]
  });
}

let sessionCleanupDuration = register.getSingleMetric('pluqla_session_cleanup_duration_seconds');
if (!sessionCleanupDuration) {
  sessionCleanupDuration = new promClient.Histogram({
    name: 'pluqla_session_cleanup_duration_seconds',
    help: 'Duration of session cleanup operations in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register]
  });
}

let sessionCleanupSessionsDeleted = register.getSingleMetric('pluqla_session_cleanup_sessions_deleted_total');
if (!sessionCleanupSessionsDeleted) {
  sessionCleanupSessionsDeleted = new promClient.Counter({
    name: 'pluqla_session_cleanup_sessions_deleted_total',
    help: 'Total number of sessions deleted by cleanup',
    registers: [register]
  });
}

/**
 * Business Metrics
 */
let transactionsCreatedTotal = register.getSingleMetric('pluqla_transactions_created_total');
if (!transactionsCreatedTotal) {
  transactionsCreatedTotal = new promClient.Counter({
    name: 'pluqla_transactions_created_total',
    help: 'Total number of transactions created',
    labelNames: ['type'], // income, expense
    registers: [register]
  });
}

let transactionAmountSum = register.getSingleMetric('pluqla_transaction_amount_total');
if (!transactionAmountSum) {
  transactionAmountSum = new promClient.Counter({
    name: 'pluqla_transaction_amount_total',
    help: 'Total amount of all transactions',
    labelNames: ['type', 'currency'],
    registers: [register]
  });
}

let usersRegisteredTotal = register.getSingleMetric('pluqla_users_registered_total');
if (!usersRegisteredTotal) {
  usersRegisteredTotal = new promClient.Counter({
    name: 'pluqla_users_registered_total',
    help: 'Total number of users registered',
    labelNames: ['method'], // email, oauth
    registers: [register]
  });
}

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

    // Convert BigInt to regular numbers for JSON serialization
    const safeConnectionStats = connectionStats ? {
      total_connections: Number(connectionStats.total_connections || 0),
      active_connections: Number(connectionStats.active_connections || 0),
      idle_connections: Number(connectionStats.idle_connections || 0),
      app_connections: Number(connectionStats.app_connections || 0)
    } : null;

    updateSubsystemHealth('database', {
      healthy: dbHealth.healthy,
      latency: dbHealth.latency,
      connections: safeConnectionStats,
      error: dbHealth.error || null
    });

    // Update database connection gauges
    if (safeConnectionStats) {
      dbConnectionsActive.set(safeConnectionStats.active_connections);
      dbConnectionsIdle.set(safeConnectionStats.idle_connections);
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