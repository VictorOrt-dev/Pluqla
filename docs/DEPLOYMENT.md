# Pluqla Production Deployment Guide

## Overview

Complete guide for deploying Pluqla with GDPR and PSD2 compliance features.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Compliance Setup](#compliance-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 7.x or higher (for caching)
- **Docker**: 20.x or higher (optional, for containerized deployment)
- **SSL Certificate**: Required for production (Let's Encrypt recommended)

### Required Access

- Server with root/sudo access
- PostgreSQL superuser credentials
- Domain name with DNS configuration
- Email service (for compliance notifications)

---

## Database Setup

### 1. Create Production Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE pluqla_production;
CREATE USER pluqla_prod WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE pluqla_production TO pluqla_prod;

# Exit PostgreSQL
\q
```

### 2. Apply Prisma Migrations

```bash
# Set production database URL
export DATABASE_URL="postgresql://pluqla_prod:secure_password@localhost:5432/pluqla_production?schema=public"

# Navigate to server directory
cd server

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 3. Create Compliance Tables

The following tables are required for GDPR/PSD2 compliance:

- ✅ `users` (with `lastScaAt` field)
- ✅ `data_processing_logs`
- ✅ `user_consents`
- ✅ `sca_challenges`
- ✅ `sca_sessions`
- ✅ `sca_exemption_logs`
- ✅ `security_incidents`

**Verify:**
```bash
npx prisma studio
# Check that all compliance tables exist
```

### 4. Database Indexes

Ensure performance indexes are created:

```sql
-- Critical compliance indexes
CREATE INDEX IF NOT EXISTS idx_user_last_sca ON users(last_sca_at);
CREATE INDEX IF NOT EXISTS idx_data_processing_user_op ON data_processing_logs(user_id, operation);
CREATE INDEX IF NOT EXISTS idx_sca_exemption_user_created ON sca_exemption_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sca_challenge_user_status ON sca_challenges(user_id, status);
```

---

## Environment Configuration

### 1. Core Environment Variables

Create `.env.production`:

```bash
# NODE ENVIRONMENT
NODE_ENV=production

# DATABASE
DATABASE_URL="postgresql://pluqla_prod:SECURE_PASSWORD@localhost:5432/pluqla_production?schema=public"

# JWT SECRETS (minimum 32 characters each)
JWT_SECRET="production_jwt_secret_min_32_characters_long"
JWT_REFRESH_SECRET="production_refresh_secret_min_32_characters_long"
JWT_EMAIL_SECRET="production_email_secret_min_32_characters_long"
JWT_PASSWORD_RESET_SECRET="production_reset_secret_min_32_characters_long"

# JWT CONFIGURATION
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
JWT_EMAIL_EXPIRATION="24h"
JWT_PASSWORD_RESET_EXPIRATION="1h"
JWT_ISSUER="pluqla-app"
JWT_AUDIENCE="pluqla-users"

# SERVER
PORT=3004
CLIENT_URL="https://app.pluqla.com"

# CORS
ALLOWED_ORIGINS="https://app.pluqla.com,https://www.pluqla.com"

# REDIS (for caching)
REDIS_URL="redis://localhost:6379"

# EMAIL SERVICE (for compliance notifications)
EMAIL_SERVICE="smtp"
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="noreply@pluqla.com"
EMAIL_PASSWORD="email_password"
EMAIL_FROM="Pluqla <noreply@pluqla.com>"

# MONITORING
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project"
LOG_LEVEL="info"

# RATE LIMITING
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"

# COMPLIANCE
GDPR_DELETION_NOTIFICATION_EMAIL="compliance@pluqla.com"
PSD2_SCA_THRESHOLD="30"  # €30
PSD2_SCA_REAUTHENTICATION_DAYS="90"
DATA_RETENTION_YEARS="3"
```

### 2. Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 48

# Generate 4 different secrets for:
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - JWT_EMAIL_SECRET
# - JWT_PASSWORD_RESET_SECRET
```

### 3. Set File Permissions

```bash
chmod 600 .env.production
chown pluqla:pluqla .env.production
```

---

## Compliance Setup

### 1. GDPR Compliance Configuration

#### Data Processing Logs

Ensure logging is enabled for all sensitive operations:

```javascript
// In server/src/app.js or server/src/middleware/complianceMiddleware.js

const logDataProcessing = async (userId, operation, dataType) => {
  await prisma.dataProcessingLog.create({
    data: {
      userId,
      operation,
      dataType,
      description: `${operation} operation on ${dataType} data`,
      legalBasis: 'consent',
      timestamp: new Date()
    }
  });
};
```

#### Consent Management

Set default consents for new users:

```javascript
// In server/src/controllers/authController.js - register function

await prisma.userConsent.createMany({
  data: [
    {
      userId: newUser.id,
      consentType: 'data_processing',
      purpose: 'Service delivery',
      legalBasis: 'contract',
      granted: true,
      grantedAt: new Date(),
      version: '1.0'
    },
    {
      userId: newUser.id,
      consentType: 'analytics',
      purpose: 'Service improvement',
      legalBasis: 'legitimate_interest',
      granted: false,
      version: '1.0'
    }
  ]
});
```

### 2. PSD2 Compliance Configuration

#### SCA Configuration

Update [server/src/services/scaService.js](server/src/services/scaService.js):

```javascript
// Verify thresholds match regulatory requirements
const SCA_THRESHOLD_AMOUNT = parseFloat(process.env.PSD2_SCA_THRESHOLD) || 30;
const SCA_REAUTHENTICATION_DAYS = parseInt(process.env.PSD2_SCA_REAUTHENTICATION_DAYS) || 90;
```

#### Transaction Monitoring

Enable SCA checking for all financial transactions:

```javascript
// In transaction controller
const { requiresSCA, checkScaExemption, logScaExemption } = require('../services/scaService');

// Before processing transaction
const scaCheck = await requiresSCA(userId, amount);
if (scaCheck.required) {
  const exemption = await checkScaExemption(userId, amount, transactionData);

  if (!exemption.exempt) {
    // Require SCA challenge
    return res.status(403).json({
      error: 'SCA_REQUIRED',
      message: 'Strong Customer Authentication required',
      challengeRequired: true
    });
  } else {
    // Log exemption
    await logScaExemption(userId, transactionId, exemption, req);
  }
}
```

### 3. Privacy Policy & Terms

Update privacy policy to include:

- ✅ Data processing purposes
- ✅ Legal basis for processing
- ✅ Data retention periods
- ✅ User rights (access, deletion, portability)
- ✅ Cookie policy
- ✅ Third-party data sharing
- ✅ Contact information for DPO

---

## Deployment Steps

### Option 1: Manual Deployment

#### 1. Clone Repository

```bash
git clone https://github.com/pluqla/app.git
cd app
git checkout main
```

#### 2. Install Dependencies

```bash
# Server dependencies
cd server
npm ci --production

# Client dependencies
cd ../client
npm ci --production
```

#### 3. Build Application

```bash
# Build client
cd client
npm run build

# Build server (if using TypeScript)
cd ../server
npm run build
```

#### 4. Setup systemd Service

Create `/etc/systemd/system/pluqla-api.service`:

```ini
[Unit]
Description=Pluqla API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=pluqla
WorkingDirectory=/var/www/pluqla/server
EnvironmentFile=/var/www/pluqla/server/.env.production
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10s

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/pluqla/server/uploads

[Install]
WantedBy=multi-user.target
```

#### 5. Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable pluqla-api
sudo systemctl start pluqla-api
sudo systemctl status pluqla-api
```

### Option 2: Docker Deployment

#### 1. Build Docker Image

```bash
# Build server image
cd server
docker build -t pluqla/api:latest .

# Build client image
cd ../client
docker build -t pluqla/client:latest .
```

#### 2. Docker Compose

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: pluqla_production
      POSTGRES_USER: pluqla_prod
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  api:
    image: pluqla/api:latest
    depends_on:
      - postgres
      - redis
    env_file:
      - .env.production
    ports:
      - "3004:3004"
    restart: unless-stopped

  client:
    image: pluqla/client:latest
    ports:
      - "3000:3000"
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Deploy

```bash
docker-compose -f docker-compose.production.yml up -d
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API health
curl https://api.pluqla.com/api/health

# Expected response:
# {
#   "status": "API OK",
#   "timestamp": "2025-10-01T12:00:00Z",
#   "version": "1.0.0"
# }
```

### 2. Compliance Endpoint Tests

#### GDPR Endpoints

```bash
# Test data export (requires auth token)
curl https://api.pluqla.com/api/compliance/user/export-data \
  -H "Authorization: Bearer ${TOKEN}"

# Test account deletion (requires auth token)
curl -X DELETE https://api.pluqla.com/api/compliance/user/delete-account \
  -H "Authorization: Bearer ${TOKEN}"
```

#### PSD2 Endpoints

```bash
# Test SCA requirement check
curl -X POST https://api.pluqla.com/api/sca/check-requirement \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"amount":50.0,"transactionType":"payment"}'

# Test SCA challenge creation
curl -X POST https://api.pluqla.com/api/sca/create-challenge \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"transactionId":"test-123","amount":75.0}'
```

### 3. Database Verification

```sql
-- Verify compliance tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'data_processing_logs',
    'user_consents',
    'sca_challenges',
    'sca_sessions',
    'sca_exemption_logs'
  );

-- Should return all 5 tables

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'users'
  AND indexname LIKE '%sca%';
```

### 4. SSL/TLS Verification

```bash
# Test HTTPS connection
curl -v https://api.pluqla.com/api/health

# Verify SSL certificate
openssl s_client -connect api.pluqla.com:443 -servername api.pluqla.com
```

### 5. Automated Test Suite

```bash
# Run compliance tests
cd server
npm test -- --testPathPattern=gdpr
npm test -- --testPathPattern=psd2

# All tests should pass
```

---

## Monitoring & Alerts

### 1. Compliance Monitoring

Set up alerts for:

- ❗ Failed account deletions
- ❗ Data export errors
- ⚠️ High volume of GDPR requests (potential data breach)
- ⚠️ SCA challenge failures spike
- ⚠️ Unusual exemption patterns

### 2. Log Monitoring

```bash
# Monitor compliance logs
tail -f /var/log/pluqla/compliance.log

# Watch for:
# - DELETE operations (account deletions)
# - EXPORT operations (data exports)
# - SCA challenge creations/completions
# - Exemption logs
```

### 3. Database Monitoring

```sql
-- Monitor GDPR requests (run daily)
SELECT
  DATE(timestamp) as date,
  operation,
  COUNT(*) as count
FROM data_processing_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
  AND operation IN ('DELETE', 'EXPORT')
GROUP BY DATE(timestamp), operation
ORDER BY date DESC;

-- Monitor SCA compliance (run weekly)
SELECT
  exemption_type,
  COUNT(*) as count,
  AVG(amount) as avg_amount
FROM sca_exemption_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY exemption_type;
```

### 4. Automated Cleanup Tasks

Create cron jobs:

```bash
# Cleanup expired SCA challenges (daily at 2 AM)
0 2 * * * psql $DATABASE_URL -c "DELETE FROM sca_challenges WHERE status IN ('completed', 'expired') AND created_at < NOW() - INTERVAL '90 days';"

# Cleanup old processing logs (monthly)
0 3 1 * * psql $DATABASE_URL -c "DELETE FROM data_processing_logs WHERE timestamp < NOW() - INTERVAL '3 years';"
```

---

## Troubleshooting

### Common Issues

#### 1. Account Deletion Fails

**Symptoms:** 500 error on DELETE /api/compliance/user/delete-account

**Diagnosis:**
```bash
# Check logs
journalctl -u pluqla-api -n 100 | grep "Account deletion"

# Check database constraints
psql $DATABASE_URL -c "SELECT * FROM data_processing_logs WHERE operation = 'DELETE' AND success = false;"
```

**Solution:**
- Verify cascading deletes are configured in Prisma schema
- Check for foreign key constraints blocking deletion
- Ensure betterAuthSession and refreshToken cleanup works

#### 2. Data Export Timeout

**Symptoms:** Export fails for users with large datasets

**Diagnosis:**
```bash
# Check export size
psql $DATABASE_URL -c "SELECT user_id, COUNT(*) FROM transactions GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 10;"
```

**Solution:**
- Implement pagination for large exports
- Add streaming export for files > 10MB
- Optimize query performance with indexes

#### 3. SCA Challenge Expiration Issues

**Symptoms:** Challenges expire too quickly

**Diagnosis:**
```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time_seconds
FROM sca_challenges
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Solution:**
- Adjust challenge expiration (currently 5 minutes)
- Monitor user completion times
- Consider extending for slower connections

#### 4. High SCA Failure Rate

**Symptoms:** Many SCA challenges fail or locked

**Diagnosis:**
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(attempts) as avg_attempts
FROM sca_challenges
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

**Solution:**
- Investigate authentication method issues
- Check for potential brute-force attacks
- Review user feedback on UX

---

## Backup & Recovery

### Database Backups

```bash
# Daily backup
pg_dump $DATABASE_URL | gzip > /backups/pluqla_$(date +%Y%m%d).sql.gz

# Backup compliance tables specifically
pg_dump $DATABASE_URL \
  -t users \
  -t data_processing_logs \
  -t user_consents \
  -t sca_challenges \
  -t sca_exemption_logs \
  | gzip > /backups/compliance_$(date +%Y%m%d).sql.gz
```

### Restore Procedure

```bash
# Stop application
sudo systemctl stop pluqla-api

# Restore database
gunzip < /backups/pluqla_20251001.sql.gz | psql $DATABASE_URL

# Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Restart application
sudo systemctl start pluqla-api
```

---

## Security Checklist

- [ ] SSL/TLS certificate installed and valid
- [ ] All JWT secrets are 32+ characters and unique
- [ ] Database password is strong (16+ characters)
- [ ] .env.production has correct permissions (600)
- [ ] CORS configured with specific origins (no wildcards)
- [ ] Rate limiting enabled
- [ ] Password policy enforced (min 8 chars, complexity)
- [ ] Account lockout after 5 failed attempts
- [ ] Refresh token rotation enabled
- [ ] Helmet.js security headers configured
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection enabled
- [ ] Logging sensitive operations (auth, compliance)
- [ ] Monitoring alerts configured
- [ ] Backup procedure tested
- [ ] Incident response plan documented

---

## Compliance Checklist

### GDPR
- [ ] Privacy policy published and accessible
- [ ] Consent mechanism implemented
- [ ] Data export endpoint tested
- [ ] Account deletion endpoint tested
- [ ] Data processing logs enabled
- [ ] Data retention policy configured (3 years)
- [ ] DPO contact information published
- [ ] Cookie consent banner (if applicable)

### PSD2
- [ ] SCA threshold set to €30
- [ ] 90-day re-authentication enforced
- [ ] SCA exemptions implemented (low value, low risk, recurring, trusted)
- [ ] Two-factor authentication available
- [ ] SCA challenge flow tested
- [ ] Exemption logging enabled
- [ ] Transaction monitoring active

---

## Post-Deployment Tasks

1. **Week 1:**
   - Monitor error rates
   - Verify compliance endpoint usage
   - Check SCA challenge success rates
   - Review security logs

2. **Week 2:**
   - Generate compliance report
   - Analyze user deletion/export patterns
   - Optimize slow queries
   - Update documentation with production URLs

3. **Month 1:**
   - Conduct compliance audit
   - Review data retention policies
   - Test backup/restore procedure
   - Security penetration testing

4. **Quarterly:**
   - Review and update privacy policy
   - Update compliance documentation
   - Conduct security audit
   - Review SCA thresholds and exemptions

---

## Support & Escalation

### Internal Contacts

- **DevOps Team:** devops@pluqla.com
- **Security Team:** security@pluqla.com
- **Compliance Officer:** compliance@pluqla.com
- **DPO:** dpo@pluqla.com

### External Resources

- **GDPR Guidance:** https://gdpr.eu/
- **PSD2 Guidance:** https://ec.europa.eu/info/law/payment-services-psd-2-directive-eu-2015-2366_en
- **CNIL (France):** https://www.cnil.fr/
- **EBA RTS:** https://www.eba.europa.eu/

---

**Last Updated:** October 1, 2025
**Version:** 1.0.0
**Maintainer:** Pluqla DevOps Team
