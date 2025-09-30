# Monitoring & Alerting Deployment Guide

## Quick Start

### 1. Start Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Verify Services

```bash
# Check containers
docker ps | grep pluqla

# Test metrics endpoint
curl http://localhost:3004/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

### 3. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

## Configuration

### Environment Variables

```bash
# Grafana
GRAFANA_ADMIN_PASSWORD=secure_password

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_INTEGRATION_KEY=your_key
SECURITY_ALERT_EMAIL=security@domain.com

# Alert toggles
ALERT_FAILED_LOGIN_ENABLED=true
ALERT_LOCKOUT_ENABLED=true
ALERT_SESSION_CLEANUP_ENABLED=true
ALERT_API_ERROR_ENABLED=true
ALERT_JWT_FAILURE_ENABLED=true
ALERT_SUSPICIOUS_ACTIVITY_ENABLED=true
```

### Files

- `server/monitoring/prometheus.yml` - Prometheus config
- `server/monitoring/alerts.yml` - Alert rules
- `server/monitoring/alertmanager.yml` - Alert routing
- `server/monitoring/grafana-dashboard.json` - Dashboard
- `docker-compose.monitoring.yml` - Docker services

## Production Deployment

### 1. Secure Grafana

```bash
# Set strong password
export GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)

# Enable TLS
GF_SERVER_PROTOCOL=https
GF_SERVER_CERT_FILE=/etc/grafana/ssl/grafana.crt
GF_SERVER_CERT_KEY=/etc/grafana/ssl/grafana.key
```

### 2. Restrict Access

```javascript
// Restrict /metrics endpoint (add to src/app.js)
app.use('/metrics', (req, res, next) => {
  const allowedIPs = ['10.0.0.0/8', '172.16.0.0/12'];
  if (!isIpInRange(req.ip, allowedIPs)) {
    return res.status(403).send('Forbidden');
  }
  next();
});
```

### 3. Configure Firewall

```bash
# Allow API (with /metrics)
ufw allow 3004/tcp

# Restrict monitoring tools to internal network
ufw allow from 10.0.0.0/8 to any port 9090  # Prometheus
ufw allow from 10.0.0.0/8 to any port 3000  # Grafana
ufw allow from 10.0.0.0/8 to any port 9093  # Alertmanager
```

### 4. Setup Alerts

```bash
# Test Slack webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test alert from Pluqla"}'

# Verify alerts loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.type=="alerting")'
```

## Monitoring Checklist

- [ ] Metrics endpoint accessible
- [ ] Prometheus scraping successfully
- [ ] Grafana dashboard loaded
- [ ] Alert rules loaded
- [ ] Alertmanager configured
- [ ] Slack/email notifications working
- [ ] TLS enabled for Grafana
- [ ] Access restricted to internal network
- [ ] Backup configured for dashboards

## Troubleshooting

### Metrics not updating

1. Check API logs: `docker logs pluqla-api`
2. Verify middleware: Check `src/app.js` has `metricsMiddleware`
3. Test endpoint: `curl http://localhost:3004/metrics | grep pluqla_`

### Prometheus not scraping

1. Check targets: http://localhost:9090/targets
2. Verify network: `docker network inspect pluqla_monitoring`
3. Check config: `docker exec pluqla-prometheus cat /etc/prometheus/prometheus.yml`

### Alerts not firing

1. Check rules: http://localhost:9090/rules
2. View alerts: http://localhost:9090/alerts
3. Check Alertmanager: http://localhost:9093
4. Test webhook: `curl -X POST $SLACK_WEBHOOK_URL ...`

## Maintenance

### Update Dashboard

```bash
# Export from Grafana UI
curl http://admin:password@localhost:3000/api/dashboards/uid/pluqla-auth | jq '.dashboard' > grafana-dashboard.json

# Commit to repository
git add server/monitoring/grafana-dashboard.json
git commit -m "Update Grafana dashboard"
```

### Backup Configuration

```bash
# Backup Grafana data
docker run --rm \
  -v pluqla_grafana-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/grafana-backup-$(date +%Y%m%d).tar.gz /data

# Backup Prometheus data
docker run --rm \
  -v pluqla_prometheus-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/prometheus-backup-$(date +%Y%m%d).tar.gz /data
```

### Upgrade

```bash
# Pull latest images
docker-compose -f docker-compose.monitoring.yml pull

# Restart services
docker-compose -f docker-compose.monitoring.yml up -d
```

**Version**: 2.0.0
**Last Updated**: 2025-01-30
