/**
 * Prometheus Metrics Registry
 *
 * Provides centralized monitoring metrics for authentication,
 * sessions, API performance, and security events.
 */

const client = require('prom-client');
const logger = require('../utils/logger');

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'pluqla_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ============================================================
// AUTHENTICATION METRICS
// ============================================================

/**
 * Counter: Login attempts
 * Labels: status (success|failure), method (email|oauth)
 */
const loginAttemptsCounter = new client.Counter({
  name: 'pluqla_auth_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status', 'method'],
  registers: [register],
});

/**
 * Counter: Failed login attempts by IP
 * Labels: ip, reason (invalid_credentials|account_locked|rate_limited)
 */
const failedLoginsByIpCounter = new client.Counter({
  name: 'pluqla_auth_failed_logins_by_ip_total',
  help: 'Failed login attempts grouped by IP address',
  labelNames: ['ip', 'reason'],
  registers: [register],
});

/**
 * Counter: Failed login attempts by user
 * Labels: user_id, reason
 */
const failedLoginsByUserCounter = new client.Counter({
  name: 'pluqla_auth_failed_logins_by_user_total',
  help: 'Failed login attempts grouped by user',
  labelNames: ['user_id', 'reason'],
  registers: [register],
});

/**
 * Counter: Account lockout events
 * Labels: user_id, trigger (brute_force|manual)
 */
const accountLockoutCounter = new client.Counter({
  name: 'pluqla_auth_account_lockouts_total',
  help: 'Total number of account lockout events',
  labelNames: ['user_id', 'trigger'],
  registers: [register],
});

/**
 * Gauge: Currently locked accounts
 */
const lockedAccountsGauge = new client.Gauge({
  name: 'pluqla_auth_locked_accounts_current',
  help: 'Number of currently locked accounts',
  registers: [register],
});

/**
 * Counter: Password reset requests
 * Labels: status (success|failure)
 */
const passwordResetCounter = new client.Counter({
  name: 'pluqla_auth_password_reset_total',
  help: 'Total password reset requests',
  labelNames: ['status'],
  registers: [register],
});

// ============================================================
// SESSION METRICS
// ============================================================

/**
 * Counter: Session creation events
 * Labels: type (jwt|refresh|session)
 */
const sessionCreationCounter = new client.Counter({
  name: 'pluqla_session_creation_total',
  help: 'Total number of sessions created',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Counter: Session deletion events
 * Labels: type, reason (logout|expired|cleanup|invalidated)
 */
const sessionDeletionCounter = new client.Counter({
  name: 'pluqla_session_deletion_total',
  help: 'Total number of sessions deleted',
  labelNames: ['type', 'reason'],
  registers: [register],
});

/**
 * Gauge: Active sessions
 * Labels: type
 */
const activeSessionsGauge = new client.Gauge({
  name: 'pluqla_session_active_current',
  help: 'Number of currently active sessions',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Counter: Session cleanup runs
 * Labels: status (success|failure)
 */
const sessionCleanupCounter = new client.Counter({
  name: 'pluqla_session_cleanup_runs_total',
  help: 'Total session cleanup job runs',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Histogram: Session cleanup duration
 */
const sessionCleanupDuration = new client.Histogram({
  name: 'pluqla_session_cleanup_duration_seconds',
  help: 'Time taken to run session cleanup',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * Counter: Session fixation prevention events
 */
const sessionFixationPreventionCounter = new client.Counter({
  name: 'pluqla_session_fixation_prevention_total',
  help: 'Number of times session fixation was prevented',
  labelNames: ['trigger'],
  registers: [register],
});

// ============================================================
// API METRICS
// ============================================================

/**
 * Counter: HTTP requests
 * Labels: method, route, status_code
 */
const httpRequestsCounter = new client.Counter({
  name: 'pluqla_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Histogram: HTTP request duration
 * Labels: method, route, status_code
 */
const httpRequestDuration = new client.Histogram({
  name: 'pluqla_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Counter: API errors
 * Labels: route, error_type, status_code
 */
const apiErrorsCounter = new client.Counter({
  name: 'pluqla_api_errors_total',
  help: 'Total API errors',
  labelNames: ['route', 'error_type', 'status_code'],
  registers: [register],
});

/**
 * Counter: Rate limit hits
 * Labels: ip, endpoint
 */
const rateLimitCounter = new client.Counter({
  name: 'pluqla_rate_limit_hits_total',
  help: 'Number of rate limit hits',
  labelNames: ['ip', 'endpoint'],
  registers: [register],
});

// ============================================================
// SECURITY METRICS
// ============================================================

/**
 * Counter: JWT validation failures
 * Labels: reason (expired|invalid|malformed)
 */
const jwtValidationFailuresCounter = new client.Counter({
  name: 'pluqla_jwt_validation_failures_total',
  help: 'JWT validation failures',
  labelNames: ['reason'],
  registers: [register],
});

/**
 * Counter: Suspicious activity events
 * Labels: type (timing_attack|session_reuse|token_reuse)
 */
const suspiciousActivityCounter = new client.Counter({
  name: 'pluqla_security_suspicious_activity_total',
  help: 'Suspicious security events detected',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Histogram: Authentication timing
 * Used to detect timing attacks
 */
const authTimingHistogram = new client.Histogram({
  name: 'pluqla_auth_timing_seconds',
  help: 'Authentication operation timing (for timing attack detection)',
  labelNames: ['operation', 'result'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
  registers: [register],
});

// ============================================================
// DATABASE METRICS
// ============================================================

/**
 * Counter: Database queries
 * Labels: operation (select|insert|update|delete)
 */
const dbQueriesCounter = new client.Counter({
  name: 'pluqla_db_queries_total',
  help: 'Total database queries',
  labelNames: ['operation'],
  registers: [register],
});

/**
 * Histogram: Database query duration
 * Labels: operation
 */
const dbQueryDuration = new client.Histogram({
  name: 'pluqla_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

/**
 * Counter: Database errors
 * Labels: operation, error_type
 */
const dbErrorsCounter = new client.Counter({
  name: 'pluqla_db_errors_total',
  help: 'Database errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Record a login attempt
 */
function recordLoginAttempt(status, method = 'email') {
  try {
    loginAttemptsCounter.labels(status, method).inc();
  } catch (error) {
    logger.error('Failed to record login attempt metric', { error: error.message });
  }
}

/**
 * Record a failed login by IP
 */
function recordFailedLoginByIp(ip, reason) {
  try {
    failedLoginsByIpCounter.labels(ip, reason).inc();
  } catch (error) {
    logger.error('Failed to record failed login by IP metric', { error: error.message });
  }
}

/**
 * Record a failed login by user
 */
function recordFailedLoginByUser(userId, reason) {
  try {
    failedLoginsByUserCounter.labels(userId, reason).inc();
  } catch (error) {
    logger.error('Failed to record failed login by user metric', { error: error.message });
  }
}

/**
 * Record an account lockout
 */
function recordAccountLockout(userId, trigger = 'brute_force') {
  try {
    accountLockoutCounter.labels(userId, trigger).inc();
  } catch (error) {
    logger.error('Failed to record account lockout metric', { error: error.message });
  }
}

/**
 * Update locked accounts gauge
 */
function updateLockedAccountsCount(count) {
  try {
    lockedAccountsGauge.set(count);
  } catch (error) {
    logger.error('Failed to update locked accounts gauge', { error: error.message });
  }
}

/**
 * Record password reset
 */
function recordPasswordReset(status) {
  try {
    passwordResetCounter.labels(status).inc();
  } catch (error) {
    logger.error('Failed to record password reset metric', { error: error.message });
  }
}

/**
 * Record session creation
 */
function recordSessionCreation(type = 'jwt') {
  try {
    sessionCreationCounter.labels(type).inc();
  } catch (error) {
    logger.error('Failed to record session creation metric', { error: error.message });
  }
}

/**
 * Record session deletion
 */
function recordSessionDeletion(type, reason) {
  try {
    sessionDeletionCounter.labels(type, reason).inc();
  } catch (error) {
    logger.error('Failed to record session deletion metric', { error: error.message });
  }
}

/**
 * Update active sessions gauge
 */
function updateActiveSessionsCount(type, count) {
  try {
    activeSessionsGauge.labels(type).set(count);
  } catch (error) {
    logger.error('Failed to update active sessions gauge', { error: error.message });
  }
}

/**
 * Record session cleanup
 */
function recordSessionCleanup(status, duration) {
  try {
    sessionCleanupCounter.labels(status).inc();
    if (duration) {
      sessionCleanupDuration.observe(duration);
    }
  } catch (error) {
    logger.error('Failed to record session cleanup metric', { error: error.message });
  }
}

/**
 * Record session fixation prevention
 */
function recordSessionFixationPrevention(trigger) {
  try {
    sessionFixationPreventionCounter.labels(trigger).inc();
  } catch (error) {
    logger.error('Failed to record session fixation prevention metric', { error: error.message });
  }
}

/**
 * Record HTTP request
 */
function recordHttpRequest(method, route, statusCode, duration) {
  try {
    httpRequestsCounter.labels(method, route, statusCode).inc();
    httpRequestDuration.labels(method, route, statusCode).observe(duration);
  } catch (error) {
    logger.error('Failed to record HTTP request metric', { error: error.message });
  }
}

/**
 * Record API error
 */
function recordApiError(route, errorType, statusCode) {
  try {
    apiErrorsCounter.labels(route, errorType, statusCode).inc();
  } catch (error) {
    logger.error('Failed to record API error metric', { error: error.message });
  }
}

/**
 * Record rate limit hit
 */
function recordRateLimitHit(ip, endpoint) {
  try {
    rateLimitCounter.labels(ip, endpoint).inc();
  } catch (error) {
    logger.error('Failed to record rate limit metric', { error: error.message });
  }
}

/**
 * Record JWT validation failure
 */
function recordJwtValidationFailure(reason) {
  try {
    jwtValidationFailuresCounter.labels(reason).inc();
  } catch (error) {
    logger.error('Failed to record JWT validation failure metric', { error: error.message });
  }
}

/**
 * Record suspicious activity
 */
function recordSuspiciousActivity(type) {
  try {
    suspiciousActivityCounter.labels(type).inc();
  } catch (error) {
    logger.error('Failed to record suspicious activity metric', { error: error.message });
  }
}

/**
 * Record authentication timing
 */
function recordAuthTiming(operation, result, duration) {
  try {
    authTimingHistogram.labels(operation, result).observe(duration);
  } catch (error) {
    logger.error('Failed to record auth timing metric', { error: error.message });
  }
}

/**
 * Record database query
 */
function recordDbQuery(operation, duration) {
  try {
    dbQueriesCounter.labels(operation).inc();
    dbQueryDuration.labels(operation).observe(duration);
  } catch (error) {
    logger.error('Failed to record database query metric', { error: error.message });
  }
}

/**
 * Record database error
 */
function recordDbError(operation, errorType) {
  try {
    dbErrorsCounter.labels(operation, errorType).inc();
  } catch (error) {
    logger.error('Failed to record database error metric', { error: error.message });
  }
}

module.exports = {
  register,
  metrics: {
    // Authentication
    recordLoginAttempt,
    recordFailedLoginByIp,
    recordFailedLoginByUser,
    recordAccountLockout,
    updateLockedAccountsCount,
    recordPasswordReset,

    // Sessions
    recordSessionCreation,
    recordSessionDeletion,
    updateActiveSessionsCount,
    recordSessionCleanup,
    recordSessionFixationPrevention,

    // HTTP/API
    recordHttpRequest,
    recordApiError,
    recordRateLimitHit,

    // Security
    recordJwtValidationFailure,
    recordSuspiciousActivity,
    recordAuthTiming,

    // Database
    recordDbQuery,
    recordDbError,
  },
};
