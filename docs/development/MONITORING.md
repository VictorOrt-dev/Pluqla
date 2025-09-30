# Pluqla Monitoring & Observability Guide

**Complete guide for monitoring, alerting, and observability in the Pluqla backend**

---

## 📋 Overview

The Pluqla backend includes comprehensive monitoring and observability features built on **Prometheus** metrics and custom health checks.

### Key Features

- ✅ **Health Check Endpoint** - Real-time status of all subsystems
- ✅ **Prometheus Metrics** - 20+ custom metrics for monitoring
- ✅ **Authentication Tracking** - Login failures, session metrics
- ✅ **AI Service Monitoring** - Provider errors, cache hits, latency
- ✅ **Database Monitoring** - Connection pool, query performance
- ✅ **Session Cleanup Tracking** - Cleanup runs, sessions deleted
- ✅ **Business Metrics** - Transactions, user registrations

---

## 🚀 Quick Start

### 1. Health Check

```bash
# Check overall system health
curl http://localhost:3004/health

# Response
{
  "status": "healthy",
  "timestamp": "2025-09-30T12:00:00Z",
  "uptime": 86400,
  "environment": "production",
  "version": "2.0.0",
  "subsystems": {
    "database": {
      "healthy": true,
      "latency": 15,
      "connections": {
        "active_connections": 3,
        "idle_connections": 2
      }
    },
    "auth": {
      "healthy": true,
      "activeSessions": 42
    },
    "ai": {
      "healthy": true,
      "activeProvider": "openai",
      "providers": {
        "openai": true,
        "anthropic": false
      }
    },
    "sessionCleanup": {
      "healthy": true,
      "lastRun": "2025-09-30T03:00:00Z"
    }
  }
}
```

### 2. Prometheus Metrics

```bash
# Get Prometheus metrics
curl http://localhost:3004/metrics

# Response (text/plain)
# HELP pluqla_auth_attempts_total Total number of authentication attempts
# TYPE pluqla_auth_attempts_total counter
pluqla_auth_attempts_total{method="password",status="success"} 1234
pluqla_auth_attempts_total{method="password",status="failure"} 56

# HELP pluqla_ai_requests_total Total number of AI service requests
# TYPE pluqla_ai_requests_total counter
pluqla_ai_requests_total{provider="openai",operation="suggestions",status="success"} 5678
...
```

---

## 🏥 Health Check Endpoint

### Endpoint Details

**URL**: `GET /health`

**Status Codes**:
- `200 OK` - System healthy or degraded but operational
- `503 Service Unavailable` - System unhealthy

**Response Format**:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "ISO 8601 timestamp",
  "uptime": "Process uptime in seconds",
  "environment": "development|production",
  "version": "Application version",
  "subsystems": {
    "database": { ... },
    "auth": { ... },
    "ai": { ... },
    "sessionCleanup": { ... }
  }
}
```

### Subsystems Monitored

#### 1. Database
```json
{
  "healthy": true,
  "latency": 15,
  "connections": {
    "total_connections": 5,
    "active_connections": 3,
    "idle_connections": 2,
    "app_connections": 5
  }
}
```

**Checks**:
- PostgreSQL connectivity
- Query latency
- Connection pool usage

#### 2. Authentication (Better Auth)
```json
{
  "healthy": true,
  "activeSessions": 42,
  "lastCheck": "2025-09-30T12:00:00Z"
}
```

**Checks**:
- Better Auth session table accessible
- Active sessions count

#### 3. AI Service
```json
{
  "healthy": true,
  "activeProvider": "openai",
  "providers": {
    "openai": true,
    "anthropic": false,
    "azure": false
  }
}
```

**Checks**:
- AI provider configuration
- At least one provider available (or provider=none)

#### 4. Session Cleanup
```json
{
  "healthy": true,
  "lastRun": "2025-09-30T03:00:00Z",
  "lastError": null
}
```

**Checks**:
- Cleanup service running
- No recent errors

### Health Check States

| Status | Description | HTTP Code | Action |
|--------|-------------|-----------|--------|
| **healthy** | All subsystems operational | 200 | ✅ None |
| **degraded** | Some subsystems degraded but system functional | 200 | ⚠️ Investigate |
| **unhealthy** | Critical subsystem failure | 503 | 🚨 Alert immediately |

### Usage Examples

**Kubernetes Liveness Probe**:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3004
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

**Docker Health Check**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1
```

**Monitoring Script**:
```bash
#!/bin/bash
response=$(curl -s http://localhost:3004/health)
status=$(echo $response | jq -r '.status')

if [ "$status" != "healthy" ]; then
  echo "⚠️ System unhealthy: $status"
  # Send alert
fi
```

---

## 📊 Prometheus Metrics

### Endpoint Details

**URL**: `GET /metrics`

**Format**: Prometheus text format (text/plain)

**Content**: Default Node.js metrics + custom Pluqla metrics

### Available Metrics

#### Authentication Metrics

```prometheus
# Total authentication attempts by method and status
pluqla_auth_attempts_total{method="password|oauth|email", status="success|failure"}

# Authentication failures by reason
pluqla_auth_failures_total{reason="invalid_password|user_not_found|account_disabled|email_not_verified"}

# Current active sessions (gauge)
pluqla_active_sessions

# Session duration histogram
pluqla_session_duration_seconds
```

**Example Query**:
```promql
# Authentication success rate
sum(rate(pluqla_auth_attempts_total{status="success"}[5m]))
/
sum(rate(pluqla_auth_attempts_total[5m]))

# Failed login attempts in last hour
sum(increase(pluqla_auth_attempts_total{status="failure"}[1h]))

# Most common failure reason
topk(1, sum by (reason) (pluqla_auth_failures_total))
```

#### AI Service Metrics

```prometheus
# Total AI requests by provider, operation, and status
pluqla_ai_requests_total{provider="openai|anthropic|azure", operation="suggestions|analysis", status="success|failure"}

# AI request duration histogram
pluqla_ai_request_duration_seconds{provider, operation}

# AI errors by provider and error type
pluqla_ai_errors_total{provider, error_type="rate_limit|timeout|api_error|invalid_response"}

# AI cache hits by operation
pluqla_ai_cache_hits_total{operation}
```

**Example Query**:
```promql
# AI request success rate
sum(rate(pluqla_ai_requests_total{status="success"}[5m]))
/
sum(rate(pluqla_ai_requests_total[5m]))

# Average AI request duration
histogram_quantile(0.95,
  sum(rate(pluqla_ai_request_duration_seconds_bucket[5m])) by (le, provider)
)

# AI cache hit rate
sum(rate(pluqla_ai_cache_hits_total[5m]))
/
sum(rate(pluqla_ai_requests_total[5m]))

# AI provider errors
sum by (provider) (rate(pluqla_ai_errors_total[1h]))
```

#### Database Metrics

```prometheus
# Total database queries
pluqla_db_queries_total{model, operation, status="success|error"}

# Database query duration histogram
pluqla_db_query_duration_seconds{model, operation}

# Active database connections (gauge)
pluqla_db_connections_active

# Idle database connections (gauge)
pluqla_db_connections_idle
```

**Example Query**:
```promql
# Database query rate
sum(rate(pluqla_db_queries_total[5m]))

# Slow queries (>1s)
histogram_quantile(0.95,
  sum(rate(pluqla_db_query_duration_seconds_bucket[5m])) by (le, model, operation)
)

# Database connection pool utilization
pluqla_db_connections_active
/
(pluqla_db_connections_active + pluqla_db_connections_idle)
```

#### Session Cleanup Metrics

```prometheus
# Session cleanup runs
pluqla_session_cleanup_runs_total{status="success|failure"}

# Cleanup duration histogram
pluqla_session_cleanup_duration_seconds

# Total sessions deleted
pluqla_session_cleanup_sessions_deleted_total
```

**Example Query**:
```promql
# Cleanup success rate
sum(rate(pluqla_session_cleanup_runs_total{status="success"}[1d]))
/
sum(rate(pluqla_session_cleanup_runs_total[1d]))

# Average sessions deleted per run
rate(pluqla_session_cleanup_sessions_deleted_total[1d])
/
rate(pluqla_session_cleanup_runs_total[1d])

# Cleanup failures in last 7 days
sum(increase(pluqla_session_cleanup_runs_total{status="failure"}[7d]))
```

#### HTTP Metrics

```prometheus
# Total HTTP requests
pluqla_http_requests_total{method, route, status_code}

# HTTP request duration histogram
pluqla_http_request_duration_seconds{method, route, status_code}
```

**Example Query**:
```promql
# Request rate by endpoint
sum by (route) (rate(pluqla_http_requests_total[5m]))

# 95th percentile response time
histogram_quantile(0.95,
  sum(rate(pluqla_http_request_duration_seconds_bucket[5m])) by (le, route)
)

# Error rate (5xx responses)
sum(rate(pluqla_http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(pluqla_http_requests_total[5m]))
```

#### Business Metrics

```prometheus
# Transactions created
pluqla_transactions_created_total{type="income|expense"}

# Transaction amounts
pluqla_transaction_amount_total{type, currency}

# User registrations
pluqla_users_registered_total{method="email|oauth"}
```

---

## 🚨 Alert Rules

### Recommended Prometheus Alert Rules

Create a file `prometheus-alerts.yml`:

```yaml
groups:
  - name: pluqla_alerts
    interval: 30s
    rules:
      # ===== CRITICAL ALERTS =====

      - alert: SystemUnhealthy
        expr: up{job="pluqla-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Pluqla backend is down"
          description: "Backend has been down for more than 1 minute"

      - alert: DatabaseUnhealthy
        expr: absent(pluqla_db_queries_total) or (rate(pluqla_db_queries_total{status="error"}[5m]) > 0.1)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database experiencing errors"
          description: "Database error rate is above 10%"

      - alert: HighAuthFailureRate
        expr: (rate(pluqla_auth_attempts_total{status="failure"}[5m]) / rate(pluqla_auth_attempts_total[5m])) > 0.3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High authentication failure rate"
          description: "Auth failure rate is {{ $value | humanizePercentage }} over last 5 minutes"

      # ===== WARNING ALERTS =====

      - alert: DatabaseConnectionPoolHigh
        expr: pluqla_db_connections_active / (pluqla_db_connections_active + pluqla_db_connections_idle) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool utilization high"
          description: "Connection pool is {{ $value | humanizePercentage }} utilized"

      - alert: SlowAIRequests
        expr: histogram_quantile(0.95, rate(pluqla_ai_request_duration_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AI requests are slow"
          description: "95th percentile AI request duration is {{ $value }}s"

      - alert: HighAIErrorRate
        expr: (rate(pluqla_ai_requests_total{status="failure"}[5m]) / rate(pluqla_ai_requests_total[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High AI service error rate"
          description: "AI error rate is {{ $value | humanizePercentage }}"

      - alert: AIProviderRateLimited
        expr: rate(pluqla_ai_errors_total{error_type="rate_limit"}[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "AI provider rate limiting detected"
          description: "Provider {{ $labels.provider }} is rate limiting requests"

      - alert: SessionCleanupFailing
        expr: rate(pluqla_session_cleanup_runs_total{status="failure"}[1h]) > 0
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Session cleanup failures detected"
          description: "Session cleanup has failed {{ $value }} times in last hour"

      - alert: TooManyExpiredSessions
        expr: rate(pluqla_session_cleanup_sessions_deleted_total[1d]) / rate(pluqla_session_cleanup_runs_total[1d]) > 10000
        for: 1d
        labels:
          severity: warning
        annotations:
          summary: "Large number of expired sessions accumulating"
          description: "Cleanup is deleting {{ $value }} sessions per run. Consider increasing cleanup frequency."

      # ===== INFO ALERTS =====

      - alert: HighTrafficVolume
        expr: rate(pluqla_http_requests_total[5m]) > 100
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "High traffic volume detected"
          description: "Receiving {{ $value }} requests per second"

      - alert: LowCacheHitRate
        expr: (rate(pluqla_ai_cache_hits_total[5m]) / rate(pluqla_ai_requests_total[5m])) < 0.5
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "AI cache hit rate is low"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

### AlertManager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'slack'
    - match:
        severity: info
      receiver: 'email'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK'
        channel: '#pluqla-alerts'
        title: 'Pluqla Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'

  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK'
        channel: '#pluqla-alerts'

  - name: 'email'
    email_configs:
      - to: 'team@pluqla.com'
        from: 'alerts@pluqla.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@pluqla.com'
        auth_password: 'YOUR_PASSWORD'
```

---

## 📈 Grafana Dashboards

### Quick Setup

1. **Add Prometheus as Data Source**:
   ```json
   {
     "name": "Prometheus",
     "type": "prometheus",
     "url": "http://prometheus:9090",
     "access": "proxy"
   }
   ```

2. **Import Dashboard Template**:
   - Use provided dashboard JSON (see below)
   - Or create custom dashboard

### Recommended Panels

#### 1. System Overview Dashboard

**Panels**:
- System Health Status (single stat)
- Request Rate (graph)
- Error Rate (graph)
- Response Time P95 (graph)
- Active Sessions (gauge)

**Queries**:
```promql
# Request Rate
sum(rate(pluqla_http_requests_total[5m]))

# Error Rate
sum(rate(pluqla_http_requests_total{status_code=~"5.."}[5m]))

# Response Time P95
histogram_quantile(0.95, sum(rate(pluqla_http_request_duration_seconds_bucket[5m])) by (le))

# Active Sessions
pluqla_active_sessions
```

#### 2. Authentication Dashboard

**Panels**:
- Auth Success Rate (graph)
- Failed Logins by Reason (pie chart)
- Active Sessions (gauge)
- Session Duration (histogram)

**Queries**:
```promql
# Auth Success Rate
sum(rate(pluqla_auth_attempts_total{status="success"}[5m])) / sum(rate(pluqla_auth_attempts_total[5m]))

# Failed Logins by Reason
sum by (reason) (rate(pluqla_auth_failures_total[5m]))
```

#### 3. AI Service Dashboard

**Panels**:
- AI Request Rate by Provider (graph)
- AI Error Rate (graph)
- AI Request Duration (histogram)
- Cache Hit Rate (graph)

**Queries**:
```promql
# Request Rate by Provider
sum by (provider) (rate(pluqla_ai_requests_total[5m]))

# Error Rate
sum(rate(pluqla_ai_errors_total[5m])) by (provider, error_type)

# Cache Hit Rate
rate(pluqla_ai_cache_hits_total[5m]) / rate(pluqla_ai_requests_total[5m])
```

#### 4. Database Dashboard

**Panels**:
- Query Rate (graph)
- Query Duration P95 (graph)
- Connection Pool Usage (gauge)
- Slow Queries (table)

**Queries**:
```promql
# Query Rate
sum(rate(pluqla_db_queries_total[5m]))

# Connection Pool Usage
pluqla_db_connections_active / (pluqla_db_connections_active + pluqla_db_connections_idle)
```

---

## 🔧 Setup & Configuration

### 1. Install Prometheus

**Docker Compose**:
```yaml
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus-alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  pluqla-backend:
    build: .
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production

volumes:
  prometheus-data:
```

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'pluqla-backend'
    static_configs:
      - targets: ['pluqla-backend:3004']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 2. Install Grafana

```yaml
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
```

### 3. Install AlertManager

```yaml
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
```

---

## 🧪 Testing

### Run Monitoring Tests

```bash
cd server
npm test -- tests/integration/monitoring.test.js
```

**Expected Output**:
```
✓ Health Check Endpoint (8 tests)
  ✓ should return comprehensive health status
  ✓ should include database subsystem health
  ✓ should include auth subsystem health
  ✓ should include AI subsystem health
  ✓ should include session cleanup subsystem health

✓ Prometheus Metrics Endpoint (7 tests)
  ✓ should expose metrics at /metrics
  ✓ should include default Node.js metrics
  ✓ should include custom Pluqla metrics

✓ Authentication Metrics (5 tests)
✓ AI Service Metrics (5 tests)
✓ Session Cleanup Metrics (4 tests)
✓ Database Metrics (2 tests)
```

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3004/health | jq

# Test metrics endpoint
curl http://localhost:3004/metrics

# Trigger auth failure (should increment metric)
curl -X POST http://localhost:3004/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"fake@example.com","password":"wrong"}'

# Check metrics updated
curl http://localhost:3004/metrics | grep pluqla_auth_failures_total
```

---

## 📊 Monitoring Best Practices

### 1. Alert Fatigue Prevention

- ✅ **Set appropriate thresholds** - Don't alert on temporary spikes
- ✅ **Use severity levels** - Critical alerts for urgent issues only
- ✅ **Group related alerts** - Reduce noise during incidents
- ✅ **Add context to alerts** - Include relevant metrics in alert messages

### 2. Metrics Collection

- ✅ **Use labels wisely** - Don't create high-cardinality labels
- ✅ **Monitor what matters** - Focus on actionable metrics
- ✅ **Set retention policies** - Balance storage cost vs data granularity
- ✅ **Regular cleanup** - Remove unused metrics and dashboards

### 3. Performance Impact

- ✅ **Lightweight instrumentation** - Metrics collection should be fast
- ✅ **Sampling for high-traffic** - Sample expensive operations
- ✅ **Asynchronous logging** - Don't block requests for metrics
- ✅ **Monitor the monitor** - Track metrics collection overhead

### 4. Security

- ✅ **Secure metrics endpoint** - Consider authentication for `/metrics`
- ✅ **Don't expose sensitive data** - Never log passwords, tokens, API keys
- ✅ **Audit alert rules** - Ensure alerts don't leak sensitive info
- ✅ **Encrypt communications** - Use HTTPS for Prometheus scraping

---

## 🚨 Troubleshooting

### Issue: Metrics not appearing

**Solution**:
1. Check Prometheus is scraping: `curl http://prometheus:9090/api/v1/targets`
2. Verify `/metrics` endpoint accessible: `curl http://localhost:3004/metrics`
3. Check Prometheus logs: `docker logs prometheus`

### Issue: Health check always returns "degraded"

**Solution**:
1. Check individual subsystems: `curl http://localhost:3004/health | jq '.subsystems'`
2. Identify unhealthy subsystem
3. Review logs for specific subsystem errors

### Issue: Too many alerts firing

**Solution**:
1. Review alert thresholds in `prometheus-alerts.yml`
2. Increase `for:` duration for transient issues
3. Use `group_wait` and `repeat_interval` in AlertManager

### Issue: High memory usage from metrics

**Solution**:
1. Reduce high-cardinality labels
2. Decrease Prometheus retention: `--storage.tsdb.retention.time=15d`
3. Sample expensive metrics

---

## 📚 Additional Resources

### Documentation
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node.js Monitoring Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

### Pluqla Specific
- [Health Check API](../server/src/services/monitoringService.js)
- [Metrics Implementation](../server/src/services/monitoringService.js)
- [Integration Tests](../server/tests/integration/monitoring.test.js)

---

## ✅ Production Checklist

Before deploying monitoring to production:

- [ ] Prometheus installed and configured
- [ ] AlertManager configured with notification channels
- [ ] Grafana dashboards created
- [ ] Alert rules tested and validated
- [ ] Health check endpoint accessible
- [ ] Metrics endpoint secured (if needed)
- [ ] On-call rotation configured
- [ ] Runbooks created for common alerts
- [ ] Team trained on alert response
- [ ] Backup monitoring solution (CloudWatch, Datadog, etc.)

---

**Version**: 1.0.0
**Last Updated**: 2025-09-30
**Maintained By**: Pluqla DevOps Team