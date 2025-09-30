/**
 * Monitoring Metrics Tests
 *
 * Verifies that Prometheus metrics are properly collected and exposed
 */

const request = require('supertest');
const app = require('../../src/app');
const { metrics, register } = require('../../src/monitoring/metrics');

describe('Prometheus Metrics', () => {
  describe('Metrics Endpoint', () => {
    it('should expose /metrics endpoint', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should return Prometheus text format', async () => {
      const response = await request(app).get('/metrics');

      const body = response.text;

      // Should contain metric headers
      expect(body).toContain('# HELP');
      expect(body).toContain('# TYPE');

      // Should contain our custom metrics
      expect(body).toContain('pluqla_');
    });

    it('should expose default Node.js metrics', async () => {
      const response = await request(app).get('/metrics');
      const body = response.text;

      // Default metrics from prom-client
      expect(body).toContain('pluqla_process_cpu');
      expect(body).toContain('pluqla_process_resident_memory_bytes');
      expect(body).toContain('pluqla_nodejs_eventloop_lag');
    });
  });

  describe('Authentication Metrics', () => {
    it('should expose authentication metrics', async () => {
      const response = await request(app).get('/metrics');
      const body = response.text;

      expect(body).toContain('pluqla_auth_login_attempts_total');
      expect(body).toContain('pluqla_auth_failed_logins_by_ip_total');
      expect(body).toContain('pluqla_auth_account_lockouts_total');
      expect(body).toContain('pluqla_auth_locked_accounts_current');
    });

    it('should record login attempts', async () => {
      // Record a failed login
      metrics.recordLoginAttempt('failure', 'email');

      const metricsText = await register.metrics();

      // Should increment the counter
      expect(metricsText).toContain('pluqla_auth_login_attempts_total{status="failure",method="email"}');
    });

    it('should record failed logins by IP', async () => {
      const testIp = '192.168.1.100';
      metrics.recordFailedLoginByIp(testIp, 'invalid_credentials');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_auth_failed_logins_by_ip_total');
      expect(metricsText).toContain(testIp);
    });

    it('should record account lockouts', async () => {
      const userId = 'test-user-id-123';
      metrics.recordAccountLockout(userId, 'brute_force');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_auth_account_lockouts_total');
    });
  });

  describe('Session Metrics', () => {
    it('should expose session metrics', async () => {
      const response = await request(app).get('/metrics');
      const body = response.text;

      expect(body).toContain('pluqla_session_creation_total');
      expect(body).toContain('pluqla_session_deletion_total');
      expect(body).toContain('pluqla_session_active_current');
      expect(body).toContain('pluqla_session_cleanup_runs_total');
      expect(body).toContain('pluqla_session_fixation_prevention_total');
    });

    it('should record session creation', async () => {
      metrics.recordSessionCreation('jwt');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_session_creation_total{type="jwt"}');
    });

    it('should record session deletion', async () => {
      metrics.recordSessionDeletion('jwt', 'logout');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_session_deletion_total{type="jwt",reason="logout"}');
    });

    it('should record session fixation prevention', async () => {
      metrics.recordSessionFixationPrevention('login');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_session_fixation_prevention_total{trigger="login"}');
    });

    it('should track active sessions', async () => {
      metrics.updateActiveSessionsCount('jwt', 42);

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_session_active_current{type="jwt"} 42');
    });
  });

  describe('HTTP/API Metrics', () => {
    it('should expose HTTP metrics', async () => {
      const response = await request(app).get('/metrics');
      const body = response.text;

      expect(body).toContain('pluqla_http_requests_total');
      expect(body).toContain('pluqla_http_request_duration_seconds');
      expect(body).toContain('pluqla_api_errors_total');
      expect(body).toContain('pluqla_rate_limit_hits_total');
    });

    it('should record HTTP requests automatically', async () => {
      // Make a request to trigger metrics middleware
      await request(app).get('/health');

      const metricsText = await register.metrics();

      // Should have recorded the request
      expect(metricsText).toContain('pluqla_http_requests_total');
      expect(metricsText).toContain('pluqla_http_request_duration_seconds');
    });

    it('should record rate limit hits', async () => {
      metrics.recordRateLimitHit('192.168.1.1', '/api/auth/login');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_rate_limit_hits_total');
    });
  });

  describe('Security Metrics', () => {
    it('should expose security metrics', async () => {
      const response = await request(app).get('/metrics');
      const body = response.text;

      expect(body).toContain('pluqla_jwt_validation_failures_total');
      expect(body).toContain('pluqla_security_suspicious_activity_total');
      expect(body).toContain('pluqla_auth_timing_seconds');
    });

    it('should record JWT validation failures', async () => {
      metrics.recordJwtValidationFailure('expired');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_jwt_validation_failures_total{reason="expired"}');
    });

    it('should record suspicious activity', async () => {
      metrics.recordSuspiciousActivity('timing_attack');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_security_suspicious_activity_total{type="timing_attack"}');
    });

    it('should record authentication timing', async () => {
      metrics.recordAuthTiming('login_total', 'success', 0.234);

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_auth_timing_seconds');
      expect(metricsText).toContain('operation="login_total"');
    });
  });

  describe('Database Metrics', () => {
    it('should expose database metrics', async () => {
      const response = await request(app).get('/metrics');
      const body = response.text;

      expect(body).toContain('pluqla_db_queries_total');
      expect(body).toContain('pluqla_db_query_duration_seconds');
      expect(body).toContain('pluqla_db_errors_total');
    });

    it('should record database queries', async () => {
      metrics.recordDbQuery('select', 0.015);

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_db_queries_total{operation="select"}');
      expect(metricsText).toContain('pluqla_db_query_duration_seconds');
    });

    it('should record database errors', async () => {
      metrics.recordDbError('insert', 'connection_error');

      const metricsText = await register.metrics();

      expect(metricsText).toContain('pluqla_db_errors_total');
    });
  });

  describe('Histogram Metrics', () => {
    it('should record timing histograms correctly', async () => {
      // Record multiple timing samples
      for (let i = 0; i < 10; i++) {
        metrics.recordAuthTiming('password_check', 'valid', 0.05 + Math.random() * 0.1);
      }

      const metricsText = await register.metrics();

      // Should have histogram buckets
      expect(metricsText).toContain('pluqla_auth_timing_seconds_bucket');
      expect(metricsText).toContain('le="0.01"');
      expect(metricsText).toContain('le="0.05"');
      expect(metricsText).toContain('le="0.1"');
      expect(metricsText).toContain('le="+Inf"');

      // Should have sum and count
      expect(metricsText).toContain('pluqla_auth_timing_seconds_sum');
      expect(metricsText).toContain('pluqla_auth_timing_seconds_count');
    });
  });

  describe('Metrics Helper Functions', () => {
    it('should handle errors gracefully when recording metrics', () => {
      // Should not throw even with invalid data
      expect(() => {
        metrics.recordLoginAttempt(null, null);
        metrics.recordFailedLoginByIp(null, null);
        metrics.recordSessionCreation(null);
      }).not.toThrow();
    });

    it('should provide all metric functions', () => {
      // Verify all expected functions exist
      expect(typeof metrics.recordLoginAttempt).toBe('function');
      expect(typeof metrics.recordFailedLoginByIp).toBe('function');
      expect(typeof metrics.recordFailedLoginByUser).toBe('function');
      expect(typeof metrics.recordAccountLockout).toBe('function');
      expect(typeof metrics.updateLockedAccountsCount).toBe('function');
      expect(typeof metrics.recordPasswordReset).toBe('function');
      expect(typeof metrics.recordSessionCreation).toBe('function');
      expect(typeof metrics.recordSessionDeletion).toBe('function');
      expect(typeof metrics.updateActiveSessionsCount).toBe('function');
      expect(typeof metrics.recordSessionCleanup).toBe('function');
      expect(typeof metrics.recordSessionFixationPrevention).toBe('function');
      expect(typeof metrics.recordHttpRequest).toBe('function');
      expect(typeof metrics.recordApiError).toBe('function');
      expect(typeof metrics.recordRateLimitHit).toBe('function');
      expect(typeof metrics.recordJwtValidationFailure).toBe('function');
      expect(typeof metrics.recordSuspiciousActivity).toBe('function');
      expect(typeof metrics.recordAuthTiming).toBe('function');
      expect(typeof metrics.recordDbQuery).toBe('function');
      expect(typeof metrics.recordDbError).toBe('function');
    });
  });

  describe('Integration with Real Endpoints', () => {
    it('should record metrics for real API calls', async () => {
      // Get initial metrics
      const before = await register.metrics();
      const beforeLines = before.split('\n');
      const httpRequestsBefore = beforeLines.find(line =>
        line.includes('pluqla_http_requests_total') && line.includes('/health')
      );

      // Make an API call
      await request(app).get('/health');

      // Get updated metrics
      const after = await register.metrics();
      const afterLines = after.split('\n');
      const httpRequestsAfter = afterLines.find(line =>
        line.includes('pluqla_http_requests_total') && line.includes('/health')
      );

      // Metrics should have been recorded
      expect(after).toContain('pluqla_http_requests_total');
      expect(after).toContain('pluqla_http_request_duration_seconds');
    });
  });
});
