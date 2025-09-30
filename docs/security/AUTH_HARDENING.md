# Authentication Security Hardening

## Overview

This document describes the authentication security features implemented in Phase 1 production readiness.

## Features Implemented

### 1. Password Complexity Policy

**Requirements:**
- Minimum 10 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 digit (0-9)
- At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- Not in common password list (top 100 passwords)
- No sequential characters (abc, 123)
- No repeated characters (aaa, 111)

**Implementation:**
- Server-side validation in `src/middleware/passwordPolicy.js`
- Integrated into registration and password reset flows
- Returns clear error messages for failed validation

**Configuration:**
No environment variables required. Policy is enforced automatically.

**Testing:**
```bash
# Valid password examples:
Tr0ub4dor&3Extended
C0rr3ct-H0rse-B@ttery
MyS3cur3P@ssw0rd!

# Invalid password examples:
password123!        # Too common
Short1!             # Too short
NoSpecialChar123    # Missing special char
```

### 2. Account Lockout (Brute-Force Prevention)

**Policy:**
- Lock account after N failed attempts within time window
- Default: 5 attempts in 15 minutes
- Lockout duration: 30 minutes
- Automatic unlock after duration

**Features:**
- Per-user + per-IP tracking
- Generic error messages (prevents user enumeration)
- Security incident logging
- Manual admin unlock capability

**Environment Variables:**
```bash
# Number of failed attempts before lockout (default: 5)
AUTH_MAX_ATTEMPTS=5

# Time window in milliseconds (default: 15 minutes)
AUTH_ATTEMPT_WINDOW_MS=900000

# Lockout duration in milliseconds (default: 30 minutes)
AUTH_LOCKOUT_DURATION_MS=1800000
```

**Implementation:**
- Service: `src/services/authLockoutService.js`
- Integrated into login flow in `src/controllers/authController.js`
- In-memory storage with optional Redis support

**API Response (when locked):**
```json
{
  "success": false,
  "error": "ACCOUNT_LOCKED",
  "message": "Trop de tentatives de connexion. Veuillez réessayer plus tard.",
  "data": {
    "remainingTime": 1234,
    "lockedUntil": "2024-01-01T12:30:00.000Z"
  }
}
```

**Admin Unlock:**
```javascript
const { unlockAccount } = require('./services/authLockoutService');
await unlockAccount(userId, adminUserId);
```

### 3. Secure Cookie Configuration

**Settings:**
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `secure: true` - HTTPS only in production
- `sameSite: 'strict'` - CSRF protection
- `domain: process.env.COOKIE_DOMAIN` - Required in production

**Environment Variables:**
```bash
# REQUIRED in production
COOKIE_DOMAIN="yourdomain.com"
# Or subdomain wildcard:
COOKIE_DOMAIN=".yourdomain.com"
```

**Validation:**
Server will fail to start in production if `COOKIE_DOMAIN` is missing.

**Configuration:**
Cookies are automatically configured in:
- `src/auth/betterAuth.js` - Better Auth session cookies
- Response helpers for manual cookie setting

### 4. Session Cleanup

**Automated Cleanup:**
- Runs via cron job (default: every 12 hours)
- Deletes expired Better Auth sessions
- Prevents database bloat

**Environment Variables:**
```bash
# Enable/disable session cleanup (default: true)
SESSION_CLEANUP_ENABLED=true

# Cron schedule (default: every 12 hours)
SESSION_CLEANUP_CRON="0 */12 * * *"

# Run cleanup on server startup (default: false)
SESSION_CLEANUP_ON_STARTUP=false
```

**Manual Cleanup:**
```bash
# Dry run (show what would be deleted)
node server/scripts/cleanupExpiredSessions.js --dry-run

# Actual cleanup
node server/scripts/cleanupExpiredSessions.js
```

**Monitoring:**
```javascript
const { getCleanupStats } = require('./services/sessionCleanupService');
const stats = getCleanupStats();
console.log(stats);
// {
//   totalRuns: 10,
//   totalSessionsCleaned: 1234,
//   lastRunAt: Date,
//   successRate: "98.5%"
// }
```

## Security Best Practices

### Password Storage

✅ **DO:**
- Hash passwords with bcrypt (saltRounds=12)
- Never log passwords (even hashed)
- Use secure random tokens for reset

❌ **DON'T:**
- Store passwords in plain text
- Use weak hashing (MD5, SHA1)
- Reuse salts

### User Enumeration Prevention

✅ **DO:**
- Use generic error messages ("Invalid credentials")
- Track failed attempts for non-existent users
- Same response time for valid/invalid users

❌ **DON'T:**
- Return "User not found" vs "Wrong password"
- Different response times
- Expose user existence in public APIs

### Token Management

✅ **DO:**
- Short-lived access tokens (15 minutes)
- Rotate refresh tokens on use
- Blacklist revoked tokens
- Include issuer/audience in JWT

❌ **DON'T:**
- Long-lived access tokens (>1 hour)
- Reuse refresh tokens
- Skip token validation
- Trust client-provided tokens

## Monitoring & Alerting

### Security Incidents

All security events are logged to `SecurityIncident` table:

```sql
SELECT * FROM security_incidents
WHERE severity = 'high' OR severity = 'critical'
ORDER BY created_at DESC
LIMIT 10;
```

### Account Lockout Stats

```javascript
const { getLockoutStats } = require('./services/authLockoutService');
const stats = getLockoutStats();
console.log(`Currently locked: ${stats.totalLocked}`);
```

### Failed Login Monitoring

Query analytics:

```sql
SELECT
  DATE(timestamp) as date,
  COUNT(*) as failed_logins
FROM analytics_events
WHERE type = 'auth_failed'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

## Testing

### Password Policy Tests

```bash
npm test -- tests/unit/passwordPolicy.test.js
```

### Account Lockout Tests

```bash
npm test -- tests/unit/accountLockout.test.js
```

### Integration Tests

```bash
# Test full auth flow with lockout
npm test -- tests/integration/auth-security.test.js
```

## Deployment Checklist

Before deploying to production:

- [ ] `COOKIE_DOMAIN` configured
- [ ] JWT secrets generated (32+ chars)
- [ ] PostgreSQL configured
- [ ] Session cleanup enabled
- [ ] Password policy tested
- [ ] Account lockout tested
- [ ] Security incident logging verified
- [ ] Monitoring/alerting configured
- [ ] Backup strategy in place

## Compliance

### OWASP Recommendations

This implementation follows OWASP Authentication Cheat Sheet:
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### GDPR Considerations

- User consent logged in `UserConsent` table
- Failed login attempts are personal data (retention policy required)
- Right to erasure applies to lockout records

## Support

For security issues:
- Report via: security@pluqla.com
- Slack: #pluqla-security
- Emergency: Contact CTO directly

## Changelog

**2024-12 - Phase 1 Production Readiness:**
- Implemented password complexity policy
- Added account lockout mechanism
- Configured secure cookies with domain validation
- Enabled automated session cleanup
- Added comprehensive security logging
