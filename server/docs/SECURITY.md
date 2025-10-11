# Security Documentation

**Pluqla Backend Security Implementation**
Version: 2.0
Last Updated: December 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [JWT Management](#jwt-management)
4. [Session Security](#session-security)
5. [API Security](#api-security)
6. [Database Security](#database-security)
7. [Compliance](#compliance)
8. [Monitoring & Incident Response](#monitoring--incident-response)
9. [Security Best Practices](#security-best-practices)
10. [Vulnerability Disclosure](#vulnerability-disclosure)

---

## Overview

Pluqla implements defense-in-depth security architecture with multiple layers of protection:

- **Authentication**: JWT-based with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: Concurrent session limits, automated cleanup
- **API Protection**: Rate limiting, input validation, CORS
- **Data Protection**: Encryption at rest and in transit, GDPR compliance
- **Monitoring**: Real-time security metrics, alerting

### Security Stack

```
┌─────────────────────────────────────┐
│         HTTPS/TLS (Transport)       │
├─────────────────────────────────────┤
│    Rate Limiting & WAF Protection   │
├─────────────────────────────────────┤
│     JWT Verification & Validation   │
├─────────────────────────────────────┤
│   Authorization (RBAC) Middleware   │
├─────────────────────────────────────┤
│      Input Validation (Joi)         │
├─────────────────────────────────────┤
│     Business Logic & Controllers    │
├─────────────────────────────────────┤
│    Database Layer (Prisma ORM)      │
├─────────────────────────────────────┤
│    PostgreSQL (Encrypted Storage)   │
└─────────────────────────────────────┘
```

---

## Authentication & Authorization

### JWT Token Types

Pluqla uses multiple JWT token types for different purposes:

1. **Access Token** (short-lived, 15 minutes)
   - Used for API authentication
   - Contains user ID, role, type
   - Signed with `JWT_SECRET`

2. **Refresh Token** (long-lived, 7 days)
   - Used to obtain new access tokens
   - Stored in database with revocation support
   - Signed with `JWT_REFRESH_SECRET`

3. **Email Verification Token** (24 hours)
   - One-time use for email verification
   - Signed with `JWT_EMAIL_SECRET`

4. **Password Reset Token** (1 hour)
   - One-time use for password resets
   - Signed with `JWT_PASSWORD_RESET_SECRET`

### Token Structure

```javascript
{
  "userId": "cmXXXXXXXXXXX",
  "type": "access",
  "role": "user",
  "iat": 1702000000,
  "exp": 1702000900,
  "aud": "plus-clair-users",
  "iss": "plus-clair-app",
  "jti": "unique-token-id"  // Optional, for revocation
}
```

### Role-Based Access Control (RBAC)

**Roles:**
- `user`: Standard user (default)
- `admin`: Administrator with elevated privileges
- `super_admin`: System administrator (all permissions)

**Middleware Usage:**

```javascript
// Require authentication
router.get('/profile', authenticate, userController.getProfile);

// Require specific role
router.get('/admin/users', authenticate, requireRole('admin'), adminController.listUsers);

// Require one of multiple roles
router.post('/content', authenticate, requireRole(['admin', 'super_admin']), contentController.create);
```

---

## JWT Management

### Key Rotation

Pluqla supports **zero-downtime JWT key rotation** using multi-secret verification:

```javascript
// Environment configuration
JWT_SECRETS=secret1_hex,secret2_hex,secret3_hex
JWT_GRACE_PERIOD_HOURS=24
```

**How it works:**
1. New tokens are signed with the **primary secret** (first in array)
2. Token verification attempts **all secrets** in order
3. Old secrets remain valid during grace period
4. Secrets are rotated via CLI or API

**Rotation via CLI:**

```bash
# Generate new secret automatically
npm run auth:cli rotate-keys --generate

# Or provide custom secret (64-char hex)
npm run auth:cli rotate-keys --secret=0123456789abcdef...
```

**Rotation via API (Admin only):**

```bash
POST /admin/auth/rotate-keys
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "generate": true
}
```

### Token Revocation

Tokens can be revoked using **JTI (JWT ID)** blacklisting:

```javascript
// Add JTI to revocation list
jwtManager.revokeToken('jti-12345');

// Verification automatically checks revocation
const decoded = jwtManager.verifyToken(token);
// Returns null if token is revoked
```

**Revocation Storage:**
- In-memory Set for O(1) lookups
- LRU cache (10,000 capacity) for performance
- Database persistence for distributed systems

**CLI Usage:**

```bash
# Revoke specific token
npm run auth:cli revoke-token --jti=token-id-here
```

### Security Features

✅ **Algorithm Enforcement**: Only HS256 and RS256 allowed
✅ **'none' Algorithm Protection**: Constant-time algorithm check
✅ **Minimum Secret Length**: 32 bytes (256 bits) enforced
✅ **Entropy Validation**: Weak secrets rejected on startup
✅ **Timing Attack Prevention**: Constant-time comparisons
✅ **JTI-based Revocation**: Blacklist support
✅ **Multi-secret Rotation**: Zero-downtime key rotation

---

## Session Security

### Concurrent Session Limits

Prevent account sharing and unauthorized access:

```env
MAX_CONCURRENT_SESSIONS=5       # Max sessions per user
SESSION_POLICY=reject           # 'reject' or 'drop-oldest'
```

**Policies:**

1. **`reject`** (recommended for high-security)
   - Returns 429 error when limit reached
   - User must manually log out from another device

2. **`drop-oldest`**
   - Automatically revokes oldest session
   - Better UX, slight security trade-off

**Error Response (reject policy):**

```json
{
  "success": false,
  "error": "TOO_MANY_SESSIONS",
  "message": "Maximum concurrent sessions (5) reached. Please log out from another device.",
  "maxSessions": 5,
  "activeSessions": 5
}
```

### Session Cleanup

Automated cleanup job removes:
- **Expired sessions** (past expiration date)
- **Orphaned refresh tokens** (expired or revoked >30 days)
- **Old SCA challenges** (completed/expired >90 days)

```env
CLEANUP_ENABLED=true                    # Enable/disable cleanup
CLEANUP_CRON_SCHEDULE=0 * * * *        # Every hour (cron format)
TZ=UTC                                  # Timezone for scheduling
```

**Manual Cleanup:**

```javascript
const { runAllCleanupTasks } = require('./src/jobs/sessionCleanup');

const result = await runAllCleanupTasks();
console.log(`Deleted ${result.sessions.deletedSessions} expired sessions`);
```

### Session Monitoring

Track session metrics via Prometheus:

```
# Active sessions gauge
pluqla_active_sessions{} 42

# Session creation counter
pluqla_sessions_created_total{} 1500

# Session destruction counter
pluqla_sessions_destroyed_total{reason="logout"} 800
pluqla_sessions_destroyed_total{reason="expired"} 650
pluqla_sessions_destroyed_total{reason="concurrency_limit"} 50

# Concurrency rejections
pluqla_session_concurrency_rejected_total{} 12
```

---

## API Security

### Rate Limiting

**Global Rate Limit:**

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000      # 1 minute
RATE_LIMIT_MAX_REQUESTS=100     # 100 requests per minute
```

**Endpoint-Specific Limits:**

```javascript
// Authentication endpoints: 5 req/15min per IP
app.use('/api/auth', authRateLimiter);

// Admin endpoints: 30 req/min per user
app.use('/admin', adminRateLimiter);
```

**Rate Limit Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702000900
Retry-After: 60
```

### Input Validation

**Joi Schema Validation:**

```javascript
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(2).max(100).required()
});

// Middleware
app.post('/api/users', validateBody(userSchema), createUser);
```

**Express-Validator:**

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/users',
  body('email').isEmail().normalizeEmail(),
  body('password').isStrongPassword(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);
```

### CORS Configuration

```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400  // 24 hours
};

app.use(cors(corsOptions));
```

### Security Headers (Helmet)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Database Security

### Prisma ORM Security

✅ **Parameterized Queries**: Automatic SQL injection prevention
✅ **Type Safety**: TypeScript integration
✅ **Connection Pooling**: Prevent connection exhaustion
✅ **Row-Level Security**: Prisma middleware for tenant isolation

**Configuration:**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pluqla?schema=public&sslmode=require"

# Connection pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_TIMEOUT=30000
```

### Sensitive Data Handling

**Password Hashing:**

```javascript
const bcrypt = require('bcryptjs');

// Hash password (cost factor: 10)
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password (constant-time comparison)
const isValid = await bcrypt.compare(password, hashedPassword);
```

**Data Encryption:**

```javascript
const crypto = require('crypto');

// Encrypt sensitive data before storage
function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}
```

### Database Indexes

Performance + Security:

```sql
-- User lookup (prevent timing attacks)
CREATE INDEX idx_users_email ON users(email);

-- Session queries
CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires);

-- Audit logs
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

---

## Compliance

### GDPR (General Data Protection Regulation)

**Right to Erasure (Article 17):**

```bash
DELETE /api/user/account
Authorization: Bearer <user_token>
```

Implementation:
- **Anonymization** instead of hard deletion (audit trail)
- Replaces PII: `email`, `name`, `password`
- Preserves transaction history (financial regulations)
- Logs deletion in audit trail

**Right to Data Portability (Article 20):**

```bash
GET /api/user/export
Authorization: Bearer <user_token>
```

Exports:
- User profile
- Transactions
- AI suggestions
- Sessions
- Account history

**Processing Logs:**

```bash
GET /admin/compliance/logs?userId=xxx
Authorization: Bearer <admin_token>
```

### PSD2 (Strong Customer Authentication)

**SCA Requirement:**
- Triggered for transactions >€30
- Required every 90 days (re-authentication)
- Multi-factor authentication support

**Flow:**

```javascript
// 1. Check if SCA required
const { required, reason } = await scaService.requiresSCA(userId, amount);

// 2. If required, create challenge
if (required) {
  const challenge = await scaService.createScaChallenge(userId, transactionId, ['sms', 'email']);
}

// 3. User completes challenge
await scaService.completeScaChallenge(challengeId, verificationMethod);

// 4. Update lastScaAt timestamp
await prisma.user.update({
  where: { id: userId },
  data: { lastScaAt: new Date() }
});
```

**Exemptions:**
- Low value (<€30)
- Low risk (ML risk scoring)
- Trusted beneficiaries
- Recurring payments

---

## Monitoring & Incident Response

### Security Metrics

**Prometheus Metrics:**

```prometheus
# Authentication
pluqla_auth_success_total{}
pluqla_auth_failure_total{reason="invalid_credentials"}
pluqla_auth_failure_total{reason="account_locked"}

# Sessions
pluqla_active_sessions{}
pluqla_session_concurrency_rejected_total{}

# GDPR/PSD2
pluqla_gdpr_deletion_requests_total{}
pluqla_gdpr_export_requests_total{}
pluqla_sca_challenges_created_total{}
pluqla_sca_challenges_completed_total{}
```

### Alerts

**Critical Alerts (PagerDuty):**
- High authentication failure rate (>10%)
- API down (no requests for 5min)
- Database connection pool exhausted
- High 5xx error rate (>5%)

**Warning Alerts (Slack):**
- Elevated latency (P95 >500ms)
- High session creation rate
- GDPR request spike
- Low disk space

**Configuration:**

See `infra/alertmanager/config.yml` and `infra/prometheus/rules.yml`

### Incident Response Playbook

**Security Incident Detected:**

1. **Assess Severity**
   - Critical: Data breach, system compromise
   - High: Account takeover, DDoS
   - Medium: Brute force, suspicious activity

2. **Immediate Actions**
   - Revoke compromised sessions/tokens
   - Enable additional rate limiting
   - Notify security team

3. **Containment**
   ```bash
   # Revoke all sessions for user
   npm run auth:cli revoke-session --userId=<user_id>

   # Rotate JWT secrets
   npm run auth:cli rotate-keys --generate

   # Block IP address (firewall/CDN)
   ```

4. **Investigation**
   - Review logs: `tail -f logs/combined.log | grep ERROR`
   - Check metrics: Grafana dashboard
   - Analyze database audit logs

5. **Recovery**
   - Reset affected user passwords
   - Notify affected users (GDPR breach notification)
   - Update security controls

6. **Post-Mortem**
   - Document incident
   - Update security policies
   - Improve monitoring/alerts

---

## Security Best Practices

### Development

✅ **Never commit secrets** to version control
✅ **Use `.env` files** for local development
✅ **Rotate secrets regularly** (90 days)
✅ **Run security audits**: `npm audit`
✅ **Keep dependencies updated**: `npm update`
✅ **Code review** all security-related changes
✅ **Write security tests** for auth flows

### Production

✅ **Use HTTPS/TLS** everywhere
✅ **Enable rate limiting**
✅ **Configure WAF** (e.g., Cloudflare)
✅ **Implement DDoS protection**
✅ **Use environment-specific secrets**
✅ **Enable database backups** (daily)
✅ **Monitor security metrics** 24/7
✅ **Conduct penetration testing** annually
✅ **Maintain audit logs** (1 year retention)

### Environment Variables Checklist

Run validation before deployment:

```bash
npm run security:review
```

This checks:
- JWT secret strength (≥32 bytes, high entropy)
- Database URL format
- Required variables present
- Weak password patterns
- Production-specific configs

---

## Vulnerability Disclosure

### Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

**Email:** security@pluqla.com
**PGP Key:** [Public key available on website]

**Please include:**
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response Timeline:**
- Acknowledgment: Within 24 hours
- Initial assessment: Within 72 hours
- Fix development: 7-14 days (depending on severity)
- Public disclosure: After patch deployment + 30 days

### Responsible Disclosure

We follow responsible disclosure practices:
1. Report received and acknowledged
2. Vulnerability verified
3. Fix developed and tested
4. Patch deployed to production
5. Public disclosure (with credit to reporter)

### Bug Bounty Program

Coming soon! We're planning a bug bounty program for 2025.

---

## Security Audit Log

| Date | Change | Impact |
|------|--------|--------|
| 2024-12-10 | Implemented JWT key rotation | Zero-downtime key updates |
| 2024-12-11 | Added session concurrency limits | Prevent account sharing |
| 2024-12-12 | GDPR compliance features | EU data protection |
| 2024-12-13 | PSD2 SCA implementation | Payment security |
| 2024-12-14 | Security monitoring & alerts | Real-time threat detection |

---

## Additional Resources

- [AUTH_ADMIN.md](./AUTH_ADMIN.md) - Authentication admin tools
- [COMPLIANCE.md](./COMPLIANCE.md) - GDPR & PSD2 compliance
- [MONITORING.md](./MONITORING.md) - Observability setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide

---

**Version:** 2.0.0
**Last Updated:** December 2024
**Maintained by:** Pluqla Security Team

For questions or clarifications, contact: security@pluqla.com
