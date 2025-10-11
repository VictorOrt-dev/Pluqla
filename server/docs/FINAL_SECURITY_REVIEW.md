# Final Security Review Checklist

**Pre-Production Security Verification**
Version: 2.0
Last Updated: December 2024

---

## Purpose

This checklist ensures all security measures are properly implemented and configured before deploying to production. Complete all items before go-live.

**Review Frequency:**
- ✅ Before initial production deployment
- ✅ Before major version releases
- ✅ After security-related changes
- ✅ Quarterly security audits

---

## Reviewer Information

| Field | Value |
|-------|-------|
| **Reviewer Name** | _________________ |
| **Review Date** | _________________ |
| **Version/Branch** | _________________ |
| **Environment** | ☐ Production ☐ Staging |
| **Sign-off** | _________________ |

---

## 1. Authentication & Authorization

### 1.1 JWT Configuration

- [ ] **JWT_SECRET** is set and ≥32 bytes (256 bits)
  - Verify: `npm run security:review`
  - Location: `.env` file
  - Expected: Hex string, 64+ characters

- [ ] **JWT_REFRESH_SECRET** is different from JWT_SECRET
  - Must be unique secret
  - Same length requirements (≥32 bytes)

- [ ] **JWT_EMAIL_SECRET** configured (if email verification enabled)
  - Separate secret for email tokens
  - ≥32 bytes

- [ ] **JWT_PASSWORD_RESET_SECRET** configured
  - Separate secret for password resets
  - ≥32 bytes

- [ ] **JWT expiration times** are appropriate
  - Access token: 15-30 minutes
  - Refresh token: 7 days
  - Email token: 24 hours
  - Reset token: 1 hour

- [ ] **JWT secrets are NOT committed** to version control
  - Check `.gitignore` includes `.env`
  - Verify no secrets in commit history: `git log -S "JWT_SECRET"`

**Test:**

```bash
# Validate JWT configuration
npm run security:review

# Expected output:
✅ JWT_SECRET meets security requirements
✅ JWT_REFRESH_SECRET meets security requirements
```

---

### 1.2 Password Security

- [ ] **Password hashing** uses bcrypt with cost factor ≥10
  - Check: `src/lib/auth.js` or similar
  - Cost factor: `bcrypt.hash(password, 10)`

- [ ] **Password validation** enforces strong passwords
  - Minimum 8 characters
  - Contains uppercase, lowercase, number, special char
  - Check password policy middleware

- [ ] **Account lockout** implemented after failed attempts
  - Max attempts: 5
  - Lockout duration: 15 minutes
  - Check: Account lockout middleware

**Test:**

```bash
# Test password validation
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"weak","name":"Test"}'

# Expected: 400 Bad Request (password too weak)
```

---

### 1.3 Role-Based Access Control (RBAC)

- [ ] **Admin routes** require admin role
  - Check: `src/routes/admin/*`
  - Middleware: `requireRole('admin')`

- [ ] **User routes** properly authenticated
  - Check: `src/routes/api/*`
  - Middleware: `authenticate`

- [ ] **Role escalation** not possible
  - Users cannot change own role
  - Only admin can modify roles

**Test:**

```bash
# Test admin route without admin token
curl -X GET http://localhost:3004/admin/auth/sessions \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected: 403 Forbidden
```

---

## 2. Session Management

### 2.1 Session Configuration

- [ ] **MAX_CONCURRENT_SESSIONS** is configured
  - Recommended: 5
  - Location: `.env`
  - Check: `src/middleware/sessionConcurrency.js`

- [ ] **SESSION_POLICY** is set
  - Options: `reject` or `drop-oldest`
  - Production recommendation: `reject`

- [ ] **Session expiration** is reasonable
  - Recommended: 24 hours
  - Check: Session creation code

- [ ] **Session cleanup job** is enabled
  - Check: `CLEANUP_ENABLED=true` in `.env`
  - Schedule: `CLEANUP_CRON_SCHEDULE=0 * * * *`

**Test:**

```bash
# Verify session cleanup
npm run auth:cli health

# Expected output includes:
✅ Sessions: OK (XXX total)
```

---

### 2.2 Session Security

- [ ] **Session tokens** are cryptographically random
  - Check: `crypto.randomBytes(32)`

- [ ] **Session fixation** prevented
  - New session ID after login
  - Invalidate old session

- [ ] **Concurrent session limits** enforced
  - Test by logging in multiple times
  - Should hit limit or revoke oldest

**Test:**

```bash
# Test session concurrency
# Login 6 times with MAX_CONCURRENT_SESSIONS=5
# Should either reject 6th or revoke oldest
```

---

## 3. API Security

### 3.1 Rate Limiting

- [ ] **Global rate limiting** enabled
  - Check: `RATE_LIMIT_ENABLED=true`
  - Default: 100 req/min per IP

- [ ] **Auth endpoint rate limiting** strict
  - Login: 5 attempts per 15 minutes
  - Registration: 3 per hour

- [ ] **Admin endpoint rate limiting** configured
  - Recommendation: 30 req/min per user

**Test:**

```bash
# Test rate limiting (send 150 requests rapidly)
for i in {1..150}; do
  curl -s http://localhost:3004/health > /dev/null
done

# Should eventually return 429 Too Many Requests
```

---

### 3.2 Input Validation

- [ ] **All endpoints** validate input
  - Check: Joi schemas or express-validator
  - Look for `validateBody()`, `validateQuery()` middleware

- [ ] **SQL injection** prevented
  - Prisma ORM used (parameterized queries)
  - No raw SQL with string concatenation

- [ ] **XSS protection** enabled
  - Input sanitization: `sanitize-html`
  - Content-Security-Policy headers

- [ ] **CSRF protection** (if using cookies)
  - CSRF tokens for state-changing operations

**Test:**

```bash
# Test SQL injection prevention
curl -X GET "http://localhost:3004/api/users?search=' OR '1'='1" \
  -H "Authorization: Bearer $TOKEN"

# Should return empty results or error, not all users
```

---

### 3.3 CORS Configuration

- [ ] **ALLOWED_ORIGINS** properly configured
  - Production domains only
  - No wildcards (`*`) in production

- [ ] **Credentials** properly set
  - `credentials: true` if using cookies
  - `Access-Control-Allow-Credentials` header

**Check:**

```env
# .env
ALLOWED_ORIGINS=https://app.pluqla.com,https://www.pluqla.com
```

**Test:**

```bash
# Test CORS from unauthorized origin
curl -H "Origin: https://malicious.com" \
  http://localhost:3004/api/health \
  -v

# Should not include Access-Control-Allow-Origin in response
```

---

## 4. Data Protection

### 4.1 Database Security

- [ ] **DATABASE_URL** uses SSL in production
  - Connection string includes `sslmode=require`
  - Example: `postgresql://user:pass@host:5432/db?sslmode=require`

- [ ] **Database credentials** are strong
  - Not default (postgres/postgres)
  - Complex password (≥16 characters)

- [ ] **Connection pooling** configured
  - Pool size: 5-20 connections
  - Timeout: 30 seconds

- [ ] **Database backups** enabled
  - Daily automated backups
  - Tested restore procedure

**Test:**

```bash
# Verify SSL connection
psql "$DATABASE_URL" -c "SHOW ssl"

# Expected: on
```

---

### 4.2 Sensitive Data Handling

- [ ] **Passwords** never logged
  - Check logs: `grep -r "password" logs/`
  - Should find no actual passwords

- [ ] **API keys** not exposed in responses
  - Check API responses
  - Ensure keys are redacted

- [ ] **PII (Personally Identifiable Information)** protected
  - Email addresses masked in logs
  - Names anonymized in analytics

**Test:**

```bash
# Check for secrets in logs
grep -E "(JWT_SECRET|DATABASE_URL|password)" logs/combined.log

# Should find no actual secrets
```

---

## 5. Compliance

### 5.1 GDPR Compliance

- [ ] **Data deletion** endpoint implemented
  - Route: `DELETE /api/user/account`
  - Anonymization strategy (not hard delete)

- [ ] **Data export** endpoint implemented
  - Route: `GET /api/user/export`
  - Returns all user data in JSON

- [ ] **Processing logs** maintained
  - Audit trail for data operations
  - Accessible to admins

- [ ] **Privacy policy** link provided
  - In API documentation
  - In user-facing application

**Test:**

```bash
# Test GDPR export
curl -X GET http://localhost:3004/api/user/export \
  -H "Authorization: Bearer $USER_TOKEN"

# Should return comprehensive user data export
```

---

### 5.2 PSD2 Compliance (if applicable)

- [ ] **SCA (Strong Customer Authentication)** implemented
  - Triggered for transactions >€30
  - 90-day re-authentication enforced

- [ ] **SCA exemptions** properly logged
  - Low value exemption (<€30)
  - Trusted beneficiary exemption
  - Audit trail maintained

- [ ] **Transaction limits** enforced
  - €30 threshold for SCA
  - Cumulative amount tracking

**Test:**

```bash
# Test SCA requirement
curl -X POST http://localhost:3004/api/transactions \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50,"category":"groceries"}'

# Should require SCA challenge if >€30 and >90 days since last SCA
```

---

## 6. Monitoring & Logging

### 6.1 Security Monitoring

- [ ] **Prometheus metrics** endpoint exposed
  - Route: `GET /metrics`
  - Includes security-related metrics

- [ ] **Authentication failures** tracked
  - Metric: `pluqla_auth_failure_total`
  - Labeled by reason (invalid_credentials, account_locked, etc.)

- [ ] **Session metrics** tracked
  - Active sessions gauge
  - Session creation/destruction counters
  - Concurrency rejection counter

**Test:**

```bash
# Check metrics endpoint
curl http://localhost:3004/metrics | grep pluqla_auth

# Should see auth-related metrics
```

---

### 6.2 Logging Configuration

- [ ] **Structured logging** implemented
  - JSON format
  - Winston logger

- [ ] **Log levels** appropriate
  - Production: `info` or `warn`
  - Development: `debug`

- [ ] **Sensitive data** not logged
  - Passwords redacted
  - Tokens redacted
  - API keys redacted

- [ ] **Log rotation** configured
  - Daily rotation
  - 30-day retention
  - Max size: 50MB per file

**Check:**

```bash
# Verify log format
tail -n 20 logs/combined.log | jq

# Should parse as valid JSON
```

---

### 6.3 Alerting

- [ ] **Critical alerts** configured
  - High auth failure rate
  - API down
  - Database connection issues

- [ ] **Alert routing** set up
  - Critical → PagerDuty
  - Warning → Slack
  - Info → Email

- [ ] **Alert thresholds** tuned
  - Not too sensitive (alert fatigue)
  - Not too relaxed (miss incidents)

**Check:**

```
infra/prometheus/rules.yml
infra/alertmanager/config.yml
```

---

## 7. Infrastructure Security

### 7.1 Environment Variables

- [ ] **All required variables** set
  - Run: `npm run security:review`
  - Check for missing variables

- [ ] **Production secrets** different from dev/staging
  - Never reuse secrets across environments

- [ ] **Secrets management** solution used
  - AWS Secrets Manager / HashiCorp Vault
  - Or encrypted `.env` files with proper access control

**Test:**

```bash
# Validate environment
npm run security:review

# Expected: All validations passed
```

---

### 7.2 Dependency Security

- [ ] **No known vulnerabilities** in dependencies
  - Run: `npm audit`
  - Fix all critical and high severity issues

- [ ] **Dependencies up to date**
  - Run: `npm outdated`
  - Update regularly (monthly)

- [ ] **Dependency scanning** in CI/CD
  - Automated security checks
  - Block PRs with critical vulnerabilities

**Test:**

```bash
# Check for vulnerabilities
npm audit --production

# Expected: found 0 vulnerabilities
```

---

### 7.3 HTTPS/TLS

- [ ] **HTTPS enforced** in production
  - Redirect HTTP → HTTPS
  - HSTS header enabled

- [ ] **TLS version** is modern
  - TLS 1.2 minimum
  - TLS 1.3 preferred

- [ ] **Certificate valid** and not expiring soon
  - Valid for domain
  - Expiry >30 days

**Test:**

```bash
# Check TLS configuration
openssl s_client -connect api.pluqla.com:443 -tls1_2

# Verify certificate and supported protocols
```

---

## 8. Testing

### 8.1 Security Tests

- [ ] **Authentication tests** pass
  - Test suite: `npm run test:auth`
  - All JWT tests passing

- [ ] **Authorization tests** pass
  - Admin routes reject non-admin users
  - User routes require authentication

- [ ] **Input validation tests** pass
  - SQL injection attempts blocked
  - XSS attempts sanitized

**Run:**

```bash
npm run test:auth
npm run test:integration

# All tests should pass
```

---

### 8.2 Performance Tests

- [ ] **Benchmarks** meet targets
  - P95 latency <500ms
  - Throughput >100 req/s
  - Error rate <1%

- [ ] **Load testing** completed
  - K6 scenario passed
  - No performance degradation under load

**Run:**

```bash
npm run bench:all

# Check results in bench/results/
```

---

## 9. Documentation

### 9.1 Security Documentation

- [ ] **SECURITY.md** complete and up-to-date
  - Architecture documented
  - Security features explained

- [ ] **AUTH_ADMIN.md** complete
  - CLI and API documented
  - Examples provided

- [ ] **Deployment guide** includes security steps
  - DEPLOYMENT.md exists
  - Security checklist included

---

### 9.2 Operational Procedures

- [ ] **Incident response plan** documented
  - Security incident procedures
  - Contact information

- [ ] **Key rotation procedure** documented
  - JWT secret rotation steps
  - Frequency (90 days)

- [ ] **Backup and recovery** documented
  - Database backup procedure
  - Recovery testing schedule

---

## 10. Final Checks

### 10.1 Pre-Deployment

- [ ] **Code review** completed
  - Security-focused review
  - Sign-off from security team

- [ ] **Penetration testing** completed (if applicable)
  - External security audit
  - All findings addressed

- [ ] **Security training** completed
  - Team trained on security features
  - Incident response procedures known

---

### 10.2 Post-Deployment

- [ ] **Health checks** passing
  - `npm run auth:cli health`
  - All systems operational

- [ ] **Monitoring** active
  - Grafana dashboards accessible
  - Alerts being received

- [ ] **Backups** verified
  - First backup completed
  - Restore tested

---

## Sign-Off

### Security Review Approval

I confirm that all items in this checklist have been reviewed and verified:

**Reviewer Signature:** _______________________

**Date:** _______________________

**Approved for Production:** ☐ Yes ☐ No ☐ With Conditions

**Conditions (if any):**

_______________________________________________
_______________________________________________
_______________________________________________

---

## Appendix A: Quick Test Commands

### Environment Validation

```bash
npm run security:review
```

### Health Check

```bash
npm run auth:cli health
```

### Authentication Tests

```bash
npm run test:auth
```

### Integration Tests

```bash
npm run test:integration
```

### Performance Benchmarks

```bash
npm run bench:autocannon
npm run bench:k6
```

### Dependency Audit

```bash
npm audit --production
npm outdated
```

---

## Appendix B: Common Issues

### Issue: JWT_SECRET too short

**Error:**

```
❌ JWT_SECRET is too short for secure JWT signing (24 < 32 bytes)
```

**Fix:**

```bash
# Generate new 64-char hex secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env
JWT_SECRET=<generated_secret>
```

---

### Issue: Database connection failing

**Error:**

```
✗ Database: FAILED - connection refused
```

**Fix:**

1. Verify PostgreSQL is running
2. Check DATABASE_URL is correct
3. Ensure SSL mode is appropriate for environment
4. Test connection: `psql "$DATABASE_URL"`

---

### Issue: High auth failure rate

**Alert:**

```
High authentication failure rate (>10%)
```

**Investigation:**

1. Check logs: `tail -f logs/combined.log | grep auth_failure`
2. Look for brute force patterns
3. Consider temporary IP blocking
4. Review rate limiting configuration

---

## Appendix C: Emergency Contacts

| Role | Contact |
|------|---------|
| **Security Lead** | security@pluqla.com |
| **On-Call Engineer** | oncall@pluqla.com |
| **PagerDuty** | +1-XXX-XXX-XXXX |
| **Incident Commander** | incident@pluqla.com |

---

**Version:** 2.0.0
**Last Updated:** December 2024
**Maintained by:** Pluqla Security Team

**Next Review Date:** _______________________
