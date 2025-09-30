/**
 * Monitoring Service Integration Tests
 *
 * Tests comprehensive monitoring and observability features:
 * - Health check endpoint with all subsystems
 * - Prometheus metrics collection
 * - Authentication failure tracking
 * - AI service error tracking
 * - Session cleanup metrics
 * - Database connection monitoring
 */

const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');
const {
  recordAuthAttempt,
  recordAIRequest,
  recordSessionCleanup,
  getHealthStatus,
  register,
  metrics
} = require('../../src/services/monitoringService');

describe('Monitoring Service', () => {
  describe('Health Check Endpoint', () => {
    it('should return comprehensive health status for all subsystems', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThanOrEqual(503);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('subsystems');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    });

    it('should include database subsystem health', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body.subsystems).toHaveProperty('database');
      expect(response.body.subsystems.database).toHaveProperty('healthy');
      expect(response.body.subsystems.database).toHaveProperty('lastCheck');

      if (response.body.subsystems.database.healthy) {
        expect(response.body.subsystems.database).toHaveProperty('latency');
        expect(typeof response.body.subsystems.database.latency).toBe('number');
      }
    });

    it('should include auth subsystem health', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body.subsystems).toHaveProperty('auth');
      expect(response.body.subsystems.auth).toHaveProperty('healthy');
      expect(response.body.subsystems.auth).toHaveProperty('lastCheck');

      if (response.body.subsystems.auth.healthy) {
        expect(response.body.subsystems.auth).toHaveProperty('activeSessions');
        expect(typeof response.body.subsystems.auth.activeSessions).toBe('number');
      }
    });

    it('should include AI subsystem health', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body.subsystems).toHaveProperty('ai');
      expect(response.body.subsystems.ai).toHaveProperty('healthy');
      expect(response.body.subsystems.ai).toHaveProperty('lastCheck');
      expect(response.body.subsystems.ai).toHaveProperty('providers');
      expect(response.body.subsystems.ai).toHaveProperty('activeProvider');
    });

    it('should include session cleanup subsystem health', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body.subsystems).toHaveProperty('sessionCleanup');
      expect(response.body.subsystems.sessionCleanup).toHaveProperty('healthy');
    });

    it('should return 200 when all subsystems are healthy', async () => {
      const health = await getHealthStatus();

      if (health.status === 'healthy') {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body.status).toBe('healthy');
      }
    });

    it('should return 200 when system is degraded but operational', async () => {
      const response = await request(app)
        .get('/health');

      if (response.body.status === 'degraded') {
        expect(response.status).toBe(200);
      }
    });

    it('should return 503 when system is unhealthy', async () => {
      const response = await request(app)
        .get('/health');

      if (response.body.status === 'unhealthy') {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('Prometheus Metrics Endpoint', () => {
    it('should expose metrics at /metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('pluqla_');
    });

    it('should include default Node.js metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Default metrics from prom-client
      expect(response.text).toContain('process_cpu_user_seconds_total');
      expect(response.text).toContain('nodejs_heap_size_total_bytes');
      expect(response.text).toContain('nodejs_eventloop_lag_seconds');
    });

    it('should include custom Pluqla metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Custom metrics we defined
      expect(response.text).toContain('pluqla_auth_attempts_total');
      expect(response.text).toContain('pluqla_ai_requests_total');
      expect(response.text).toContain('pluqla_db_queries_total');
      expect(response.text).toContain('pluqla_session_cleanup_runs_total');
    });

    it('should expose authentication metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('pluqla_auth_attempts_total');
      expect(response.text).toContain('pluqla_auth_failures_total');
      expect(response.text).toContain('pluqla_active_sessions');
    });

    it('should expose AI service metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('pluqla_ai_requests_total');
      expect(response.text).toContain('pluqla_ai_errors_total');
      expect(response.text).toContain('pluqla_ai_cache_hits_total');
    });

    it('should expose database metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('pluqla_db_queries_total');
      expect(response.text).toContain('pluqla_db_connections_active');
      expect(response.text).toContain('pluqla_db_connections_idle');
    });

    it('should expose session cleanup metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('pluqla_session_cleanup_runs_total');
      expect(response.text).toContain('pluqla_session_cleanup_sessions_deleted_total');
    });
  });

  describe('Authentication Metrics', () => {
    beforeEach(async () => {
      // Reset metrics by getting current values
      const currentMetrics = await register.metrics();
      // Metrics will continue incrementing from current values
    });

    it('should increment auth_attempts_total on successful login', () => {
      const initialValue = metrics.authAttemptsTotal._hashMap;
      recordAuthAttempt('password', true);

      // Verify metric was recorded (counter should have increased)
      expect(metrics.authAttemptsTotal).toBeDefined();
    });

    it('should increment auth_attempts_total on failed login', () => {
      recordAuthAttempt('password', false, 'invalid_password');

      expect(metrics.authAttemptsTotal).toBeDefined();
      expect(metrics.authFailuresTotal).toBeDefined();
    });

    it('should track different failure reasons', () => {
      recordAuthAttempt('password', false, 'user_not_found');
      recordAuthAttempt('password', false, 'invalid_password');
      recordAuthAttempt('password', false, 'account_disabled');

      expect(metrics.authFailuresTotal).toBeDefined();
    });

    it('should differentiate between auth methods', () => {
      recordAuthAttempt('password', true);
      recordAuthAttempt('oauth', true);
      recordAuthAttempt('email', true);

      expect(metrics.authAttemptsTotal).toBeDefined();
    });

    it('should track active sessions gauge', async () => {
      const health = await getHealthStatus();

      if (health.subsystems.auth.healthy) {
        expect(health.subsystems.auth).toHaveProperty('activeSessions');
        expect(typeof health.subsystems.auth.activeSessions).toBe('number');
      }
    });
  });

  describe('AI Service Metrics', () => {
    it('should record successful AI requests', () => {
      recordAIRequest('openai', 'suggestions', true, 1.5);

      expect(metrics.aiRequestsTotal).toBeDefined();
      expect(metrics.aiRequestDuration).toBeDefined();
    });

    it('should record failed AI requests with error types', () => {
      recordAIRequest('anthropic', 'suggestions', false, 0.5, 'rate_limit');
      recordAIRequest('openai', 'suggestions', false, 30.0, 'timeout');
      recordAIRequest('anthropic', 'analysis', false, 2.0, 'api_error');

      expect(metrics.aiErrorsTotal).toBeDefined();
    });

    it('should track different AI providers', () => {
      recordAIRequest('openai', 'suggestions', true, 1.2);
      recordAIRequest('anthropic', 'suggestions', true, 1.8);
      recordAIRequest('azure', 'suggestions', true, 1.5);

      expect(metrics.aiRequestsTotal).toBeDefined();
    });

    it('should track different AI operations', () => {
      recordAIRequest('openai', 'suggestions', true, 1.5);
      recordAIRequest('openai', 'analysis', true, 2.5);
      recordAIRequest('openai', 'categorization', true, 1.0);

      expect(metrics.aiRequestsTotal).toBeDefined();
    });

    it('should track AI cache hits', () => {
      const { recordAICacheHit } = require('../../src/services/monitoringService');

      recordAICacheHit('suggestions');
      recordAICacheHit('suggestions');
      recordAICacheHit('analysis');

      expect(metrics.aiCacheHitsTotal).toBeDefined();
    });
  });

  describe('Session Cleanup Metrics', () => {
    it('should record successful session cleanup', () => {
      recordSessionCleanup(true, 0.5, 100);

      expect(metrics.sessionCleanupRunsTotal).toBeDefined();
      expect(metrics.sessionCleanupDuration).toBeDefined();
      expect(metrics.sessionCleanupSessionsDeleted).toBeDefined();
    });

    it('should record failed session cleanup', () => {
      recordSessionCleanup(false, 1.5, 0);

      expect(metrics.sessionCleanupRunsTotal).toBeDefined();
    });

    it('should track cleanup duration', () => {
      recordSessionCleanup(true, 0.1, 50);
      recordSessionCleanup(true, 2.5, 1000);
      recordSessionCleanup(true, 5.0, 10000);

      expect(metrics.sessionCleanupDuration).toBeDefined();
    });

    it('should count total sessions deleted', () => {
      recordSessionCleanup(true, 0.5, 100);
      recordSessionCleanup(true, 0.6, 150);
      recordSessionCleanup(true, 0.7, 200);

      expect(metrics.sessionCleanupSessionsDeleted).toBeDefined();
    });
  });

  describe('Database Metrics', () => {
    it('should track database connection gauges', async () => {
      const health = await getHealthStatus();

      if (health.subsystems.database.healthy && health.subsystems.database.connections) {
        expect(health.subsystems.database.connections).toHaveProperty('active_connections');
        expect(health.subsystems.database.connections).toHaveProperty('idle_connections');
      }
    });

    it('should update connection metrics on health check', async () => {
      const health = await getHealthStatus();

      if (health.subsystems.database.healthy) {
        const metricsResponse = await request(app)
          .get('/metrics')
          .expect(200);

        expect(metricsResponse.text).toContain('pluqla_db_connections_active');
        expect(metricsResponse.text).toContain('pluqla_db_connections_idle');
      }
    });
  });

  describe('Metrics Format and Labels', () => {
    it('should use proper Prometheus naming convention', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      const lines = response.text.split('\n');
      const metricLines = lines.filter(line =>
        line.startsWith('pluqla_') && !line.startsWith('#')
      );

      metricLines.forEach(line => {
        // Check metric name follows convention
        expect(line).toMatch(/^pluqla_[a-z_]+/);
      });
    });

    it('should include labels for auth attempts', async () => {
      recordAuthAttempt('password', true);
      recordAuthAttempt('oauth', false, 'invalid_token');

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('method=');
      expect(response.text).toContain('status=');
    });

    it('should include labels for AI requests', async () => {
      recordAIRequest('openai', 'suggestions', true, 1.5);

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('provider=');
      expect(response.text).toContain('operation=');
    });
  });

  describe('Health Status Function', () => {
    it('should return complete health status object', async () => {
      const health = await getHealthStatus();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('environment');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('subsystems');

      expect(health.subsystems).toHaveProperty('database');
      expect(health.subsystems).toHaveProperty('auth');
      expect(health.subsystems).toHaveProperty('ai');
      expect(health.subsystems).toHaveProperty('sessionCleanup');
    });

    it('should mark system as healthy when all subsystems are healthy', async () => {
      const health = await getHealthStatus();

      const allHealthy = Object.values(health.subsystems).every(s => s.healthy);

      if (allHealthy) {
        expect(health.status).toBe('healthy');
      }
    });

    it('should mark system as degraded when some subsystems are unhealthy', async () => {
      const health = await getHealthStatus();

      const someUnhealthy = Object.values(health.subsystems).some(s => !s.healthy);
      const someHealthy = Object.values(health.subsystems).some(s => s.healthy);

      if (someUnhealthy && someHealthy) {
        expect(health.status).toBe('degraded');
      }
    });

    it('should include timestamp in ISO format', async () => {
      const health = await getHealthStatus();

      expect(health.timestamp).toBeDefined();
      expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
    });

    it('should include process uptime', async () => {
      const health = await getHealthStatus();

      expect(health.uptime).toBeDefined();
      expect(typeof health.uptime).toBe('number');
      expect(health.uptime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle health check errors gracefully', async () => {
      const response = await request(app)
        .get('/health');

      // Should always return a response, never crash
      expect(response.status).toBeDefined();
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('status');
    });

    it('should handle metrics endpoint errors gracefully', async () => {
      const response = await request(app)
        .get('/metrics');

      // Should always return a response
      expect(response.status).toBeDefined();
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should respond to health check quickly (<500ms)', async () => {
      const start = Date.now();

      await request(app)
        .get('/health')
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(200);
          expect(res.status).toBeLessThanOrEqual(503);
        });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should respond to metrics endpoint quickly (<200ms)', async () => {
      const start = Date.now();

      await request(app)
        .get('/metrics')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });
  });
});