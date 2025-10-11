const client = require('prom-client');

// Enable default metrics collection (CPU, memory, etc.)
client.collectDefaultMetrics({
  timeout: 5000,
  prefix: 'pluqla_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Custom metrics for HTTP requests
const httpRequestDuration = new client.Histogram({
  name: 'pluqla_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'pluqla_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const http5xxErrors = new client.Counter({
  name: 'pluqla_http_5xx_errors_total',
  help: 'Total 5xx HTTP errors',
  labelNames: ['method', 'route', 'status']
});

// Authentication metrics
const authSuccess = new client.Counter({
  name: 'pluqla_auth_success_total',
  help: 'Total successful authentications',
  labelNames: ['type'] // login, refresh, verify
});

const authFailure = new client.Counter({
  name: 'pluqla_auth_failure_total',
  help: 'Total failed authentications',
  labelNames: ['type', 'reason'] // login, refresh, verify + reason
});

// Session metrics
const activeSessions = new client.Gauge({
  name: 'pluqla_active_sessions',
  help: 'Number of currently active sessions'
});

const sessionCreated = new client.Counter({
  name: 'pluqla_session_created_total',
  help: 'Total sessions created'
});

const sessionDestroyed = new client.Counter({
  name: 'pluqla_session_destroyed_total',
  help: 'Total sessions destroyed',
  labelNames: ['reason'] // logout, expired, concurrency_limit
});

const sessionConcurrencyRejected = new client.Counter({
  name: 'pluqla_session_concurrency_rejected_total',
  help: 'Total sessions rejected due to concurrency limit'
});

// Database metrics
const dbConnectionPoolSize = new client.Gauge({
  name: 'pluqla_db_connection_pool_size',
  help: 'Current database connection pool size'
});

const dbConnectionPoolUsed = new client.Gauge({
  name: 'pluqla_db_connection_pool_used',
  help: 'Number of used database connections'
});

const dbQueryDuration = new client.Histogram({
  name: 'pluqla_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
});

const dbQueryErrors = new client.Counter({
  name: 'pluqla_db_query_errors_total',
  help: 'Total database query errors',
  labelNames: ['operation', 'model', 'error_type']
});

// AI endpoint metrics
const aiRequests = new client.Counter({
  name: 'pluqla_ai_requests_total',
  help: 'Total AI API requests',
  labelNames: ['provider', 'endpoint', 'status'] // openai, claude, gemini
});

const aiRequestDuration = new client.Histogram({
  name: 'pluqla_ai_request_duration_seconds',
  help: 'AI request duration in seconds',
  labelNames: ['provider', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const aiTokensUsed = new client.Counter({
  name: 'pluqla_ai_tokens_used_total',
  help: 'Total AI tokens consumed',
  labelNames: ['provider', 'type'] // prompt, completion
});

const aiErrors = new client.Counter({
  name: 'pluqla_ai_errors_total',
  help: 'Total AI API errors',
  labelNames: ['provider', 'error_type']
});

// Business metrics
const transactionsCreated = new client.Counter({
  name: 'pluqla_transactions_created_total',
  help: 'Total transactions created',
  labelNames: ['category', 'type']
});

const usersRegistered = new client.Counter({
  name: 'pluqla_users_registered_total',
  help: 'Total users registered'
});

const premiumUpgrades = new client.Counter({
  name: 'pluqla_premium_upgrades_total',
  help: 'Total premium upgrades'
});

// Compliance metrics
const gdprRequests = new client.Counter({
  name: 'pluqla_gdpr_requests_total',
  help: 'Total GDPR requests',
  labelNames: ['type'] // export, deletion
});

const scaChallenges = new client.Counter({
  name: 'pluqla_sca_challenges_total',
  help: 'Total PSD2 SCA challenges',
  labelNames: ['status'] // created, completed, failed, expired
});

// Function to update active sessions count
async function updateActiveSessionsGauge(prisma) {
  try {
    const count = await prisma.betterAuthSession.count({
      where: {
        expires: { gt: new Date() }
      }
    });
    activeSessions.set(count);
  } catch (error) {
    console.error('Error updating active sessions gauge:', error.message);
  }
}

// Function to update database pool metrics
function updateDbPoolMetrics(poolStats) {
  if (poolStats) {
    dbConnectionPoolSize.set(poolStats.size || 0);
    dbConnectionPoolUsed.set(poolStats.used || 0);
  }
}

module.exports = {
  client,
  // HTTP metrics
  httpRequestDuration,
  httpRequestsTotal,
  http5xxErrors,
  // Auth metrics
  authSuccess,
  authFailure,
  // Session metrics
  activeSessions,
  sessionCreated,
  sessionDestroyed,
  sessionConcurrencyRejected,
  // Database metrics
  dbConnectionPoolSize,
  dbConnectionPoolUsed,
  dbQueryDuration,
  dbQueryErrors,
  // AI metrics
  aiRequests,
  aiRequestDuration,
  aiTokensUsed,
  aiErrors,
  // Business metrics
  transactionsCreated,
  usersRegistered,
  premiumUpgrades,
  // Compliance metrics
  gdprRequests,
  scaChallenges,
  // Helper functions
  updateActiveSessionsGauge,
  updateDbPoolMetrics
};
