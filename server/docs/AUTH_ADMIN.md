# Authentication Admin Tools

**CLI & API Tools for Authentication Administration**
Version: 1.0
Last Updated: December 2024

---

## Table of Contents

1. [Overview](#overview)
2. [CLI Tool](#cli-tool)
3. [Admin API](#admin-api)
4. [Common Tasks](#common-tasks)
5. [Security Considerations](#security-considerations)
6. [Troubleshooting](#troubleshooting)

---

## Overview

Pluqla provides two interfaces for authentication administration:

1. **CLI Tool**: Direct command-line access for server operations
2. **Admin API**: RESTful endpoints for programmatic access

Both tools require admin privileges and should be used with caution in production.

---

## CLI Tool

### Installation & Setup

The CLI tool is included with the backend. No additional installation required.

```bash
cd server
npm run auth:cli <command> [options]
```

**Alias:**

```bash
node src/cli/auth-admin.js <command> [options]
```

### Available Commands

#### 1. list-sessions

List and filter user sessions.

**Usage:**

```bash
npm run auth:cli list-sessions [options]
```

**Options:**

```
-u, --userId <id>       Filter by user ID
-s, --status <status>   Filter by status: active, expired, all (default: active)
-p, --page <number>     Page number (default: 1)
-l, --limit <number>    Results per page (default: 50)
-h, --help              Display help
```

**Examples:**

```bash
# List all active sessions
npm run auth:cli list-sessions

# List sessions for specific user
npm run auth:cli list-sessions --userId cmXXXXXXXX

# List expired sessions
npm run auth:cli list-sessions --status expired

# Paginate results
npm run auth:cli list-sessions --page 2 --limit 20

# All sessions for user
npm run auth:cli list-sessions --userId cmXXXXXXXX --status all
```

**Output:**

```
✓ Found 3 sessions (Total: 3)

Session 1:
  Token: 12345678abcd...efgh1234
  User: user@example.com (John Doe)
  Role: user
  Status: ACTIVE
  Expires: 2024-12-25T10:30:00.000Z
  Created: 2024-12-24T10:00:00.000Z

Session 2:
  ...

ℹ Page 1 of 1
```

---

#### 2. revoke-session

Revoke one or more sessions.

**Usage:**

```bash
npm run auth:cli revoke-session [options]
```

**Options:**

```
-t, --sessionToken <token>  Specific session token to revoke
-u, --userId <id>           Revoke all sessions for user ID
-a, --all                   Revoke ALL sessions (use with caution!)
-h, --help                  Display help
```

**Examples:**

```bash
# Revoke specific session
npm run auth:cli revoke-session --sessionToken abc123...

# Revoke all sessions for user
npm run auth:cli revoke-session --userId cmXXXXXXXX

# Revoke all sessions (WARNING: logs out ALL users!)
npm run auth:cli revoke-session --all
```

**Output:**

```
✓ Successfully revoked 1 session(s)
```

**Safety:**

- `--all` flag has 3-second confirmation delay
- Ctrl+C to cancel before execution

---

#### 3. rotate-keys

Rotate JWT signing keys (zero-downtime).

**Usage:**

```bash
npm run auth:cli rotate-keys [options]
```

**Options:**

```
-g, --generate           Generate new secure key (default: true)
-s, --secret <secret>    Provide custom secret (64-char hex string)
-h, --help               Display help
```

**Examples:**

```bash
# Generate new secret automatically (recommended)
npm run auth:cli rotate-keys --generate

# Provide custom secret
npm run auth:cli rotate-keys --secret 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**Output:**

```
ℹ Rotating JWT keys...
ℹ Generated new secure secret
✓ JWT keys rotated successfully

Key Rotation Details:
  Active Secrets: 2
  Grace Period: 24 hours
  Timestamp: 2024-12-24T10:00:00.000Z

📝 New Secret (save securely):
0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

⚠ Store this secret securely. It will not be shown again.
ℹ Update your .env file: JWT_SECRETS=<new_secret>,<old_secrets>
```

**Post-Rotation:**

1. **Save the new secret** to a secure location (password manager)
2. **Update environment variables:**
   ```env
   JWT_SECRETS=<new_secret>,<old_secret_1>,<old_secret_2>
   ```
3. **Restart application** to load new secrets
4. **Remove old secrets** after grace period (24h default)

**Grace Period:**

Old tokens remain valid during grace period to prevent service disruption.

---

#### 4. metrics

Display comprehensive authentication metrics.

**Usage:**

```bash
npm run auth:cli metrics
```

**Output:**

```
ℹ Fetching authentication metrics...
✓ Metrics retrieved successfully

📊 Authentication Metrics

Sessions:
  Active: 42
  Total: 150
  Active %: 28.00%

Users:
  Active (24h): 15
  Total Active: 50
  Engagement: 30.00%

Tokens:
  Refresh Tokens: 45
  Revoked: 10

JWT Manager:
  Active Secrets: 2
  Algorithm: HS256
  Grace Period: 24h
  Revoked JTIs (in memory): 5
```

---

#### 5. health

Run system health checks.

**Usage:**

```bash
npm run auth:cli health
```

**Output:**

```
ℹ Running health checks...
✓ Database: OK
✓ JWT Manager: OK (2 active secrets)
✓ Sessions: OK (150 total)

✓ All health checks passed ✓
```

**Exit Codes:**

- `0`: All checks passed
- `1`: One or more checks failed

**Use in CI/CD:**

```bash
# Health check before deployment
npm run auth:cli health || exit 1
```

---

#### 6. stats

Show JWT manager statistics.

**Usage:**

```bash
npm run auth:cli stats
```

**Output:**

```json
{
  "activeSecrets": 2,
  "algorithm": "HS256",
  "gracePeriodHours": 24,
  "revokedTokensInMemory": 5,
  "tokenSigningCount": 1500,
  "tokenVerificationCount": 5000
}
```

---

## Admin API

### Authentication

All admin endpoints require:
1. Valid JWT token
2. `admin` or `super_admin` role

**Headers:**

```http
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}

// 403 Forbidden
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Admin privileges required"
}
```

---

### Endpoints

#### GET /admin/auth/sessions

List and filter sessions.

**Query Parameters:**

```
userId    string   Filter by user ID
status    string   active | expired | all (default: active)
page      number   Page number (default: 1)
limit     number   Results per page (default: 50)
```

**Request:**

```http
GET /admin/auth/sessions?status=active&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "sessions": [
    {
      "id": "session_id",
      "sessionToken": "token...",
      "userId": "user_id",
      "expires": "2024-12-25T10:00:00.000Z",
      "createdAt": "2024-12-24T10:00:00.000Z",
      "user": {
        "email": "user@example.com",
        "name": "John Doe",
        "role": "user"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

#### POST /admin/auth/revoke-session

Revoke one or more sessions.

**Request Body:**

```json
{
  "sessionToken": "token_to_revoke"  // Option 1: Specific token
}

// OR

{
  "userId": "user_id"  // Option 2: All sessions for user
}
```

**Request:**

```http
POST /admin/auth/revoke-session
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "sessionToken": "abc123..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Session(s) revoked successfully",
  "revokedCount": 1
}
```

---

#### POST /admin/auth/rotate-keys

Rotate JWT signing keys.

**Request Body:**

```json
{
  "generate": true  // Auto-generate new secret
}

// OR

{
  "secret": "0123456789abcdef..."  // Provide custom secret (64-char hex)
}
```

**Request:**

```http
POST /admin/auth/rotate-keys
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "generate": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "JWT keys rotated successfully",
  "newSecret": "0123456789abcdef...",  // Only if generate=true
  "activeSecrets": 2,
  "gracePeriodHours": 24,
  "timestamp": "2024-12-24T10:00:00.000Z"
}
```

---

#### GET /admin/auth/metrics

Get comprehensive authentication metrics.

**Request:**

```http
GET /admin/auth/metrics
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "metrics": {
    "sessions": {
      "active": 42,
      "total": 150,
      "activePercentage": 28.0
    },
    "users": {
      "active24h": 15,
      "totalActive": 50,
      "engagementPercentage": 30.0
    },
    "tokens": {
      "refreshTokens": 45,
      "revokedTokens": 10
    },
    "jwt": {
      "activeSecrets": 2,
      "algorithm": "HS256",
      "gracePeriodHours": 24,
      "revokedTokensInMemory": 5
    },
    "timestamp": "2024-12-24T10:00:00.000Z"
  }
}
```

---

#### POST /admin/auth/revoke-token

Revoke JWT token by JTI (JWT ID).

**Request Body:**

```json
{
  "jti": "token-jti-here"
}
```

**Request:**

```http
POST /admin/auth/revoke-token
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "jti": "abc-123-def-456"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token revoked successfully",
  "jti": "abc-123-def-456"
}
```

---

#### GET /admin/auth/health

Check authentication system health.

**Request:**

```http
GET /admin/auth/health
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "health": {
    "database": {
      "status": "healthy",
      "message": "Connection OK"
    },
    "jwtManager": {
      "status": "healthy",
      "activeSecrets": 2
    },
    "sessions": {
      "status": "healthy",
      "count": 150
    },
    "overall": "healthy"
  },
  "timestamp": "2024-12-24T10:00:00.000Z"
}
```

---

## Common Tasks

### Task 1: Investigate Suspicious Activity

```bash
# 1. Check sessions for user
npm run auth:cli list-sessions --userId cmXXXXXXXX

# 2. Review recent activity (check logs)
tail -f logs/combined.log | grep cmXXXXXXXX

# 3. If compromised, revoke all sessions
npm run auth:cli revoke-session --userId cmXXXXXXXX

# 4. Notify user to reset password
# (via email endpoint or manual contact)
```

### Task 2: Scheduled Key Rotation

```bash
# 1. Generate new key
npm run auth:cli rotate-keys --generate

# 2. Save output to secure location
# Output: 0123456789abcdef...

# 3. Update .env file
# JWT_SECRETS=<new>,<old1>,<old2>

# 4. Restart application
npm restart

# 5. After 24h grace period, remove old secrets
# JWT_SECRETS=<new>,<old1>
```

### Task 3: Monitor System Health

```bash
# Run health check
npm run auth:cli health

# Get detailed metrics
npm run auth:cli metrics

# Check JWT stats
npm run auth:cli stats
```

### Task 4: Handle Account Takeover

```bash
# 1. Immediate: Revoke all user sessions
npm run auth:cli revoke-session --userId <compromised_user_id>

# 2. Revoke specific tokens (if JTI known)
# Via API:
curl -X POST http://localhost:3004/admin/auth/revoke-token \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jti": "compromised-jti"}'

# 3. Force password reset
# (via user management endpoint)

# 4. Notify security team
# (alerting/incident management)
```

### Task 5: Clean Up Expired Sessions

Sessions are cleaned automatically, but you can trigger manually:

```bash
# Via Node.js script
node -e "require('./src/jobs/sessionCleanup').runAllCleanupTasks().then(r => console.log(r))"
```

---

## Security Considerations

### Access Control

✅ **CLI Tool**:
- Requires server file system access
- Use SSH with key-based auth
- Restrict sudo access
- Log all CLI executions

✅ **Admin API**:
- Requires admin JWT token
- Rate limited (30 req/min)
- All actions logged
- IP whitelist recommended

### Audit Logging

All admin actions are logged:

```json
{
  "timestamp": "2024-12-24T10:00:00.000Z",
  "action": "revoke_session",
  "admin": "admin@example.com",
  "target": "user@example.com",
  "details": {
    "sessionToken": "abc123...",
    "reason": "security_incident"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

View logs:

```bash
tail -f logs/audit.log | grep admin_action
```

### Rate Limiting

Admin endpoints are rate limited:

```
Rate Limit: 30 requests / minute per admin user
Burst: 50 requests (short spike allowed)
```

Exceeding limit returns 429:

```json
{
  "success": false,
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded",
  "retryAfter": 45
}
```

### Production Best Practices

1. **Restrict Access**
   - Limit admin role to essential personnel
   - Use separate admin accounts (not personal)
   - Rotate admin credentials quarterly

2. **Secure CLI Access**
   - Use jump server/bastion host
   - Enable SSH key-based auth only
   - Log all SSH sessions

3. **Monitor Admin Actions**
   - Alert on high-privilege operations
   - Review audit logs weekly
   - Investigate suspicious patterns

4. **Key Rotation Schedule**
   - JWT secrets: Every 90 days
   - Admin passwords: Every 60 days
   - SSH keys: Every 6 months

---

## Troubleshooting

### Issue: CLI command not found

**Error:**

```
bash: auth-admin: command not found
```

**Solution:**

```bash
# Ensure you're in the server directory
cd server

# Use npm script
npm run auth:cli -- <command>

# Or direct path
node src/cli/auth-admin.js <command>
```

---

### Issue: Permission denied

**Error:**

```
Error: EACCES: permission denied
```

**Solution:**

```bash
# Make CLI executable
chmod +x src/cli/auth-admin.js

# Or run with node
node src/cli/auth-admin.js <command>
```

---

### Issue: Database connection failed

**Error:**

```
✗ Failed to list sessions: P1001: Can't reach database server
```

**Solution:**

```bash
# 1. Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# 2. Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# 3. Test connection
psql $DATABASE_URL -c "SELECT 1"

# 4. Check Prisma client is generated
npm run prisma:generate
```

---

### Issue: JWT verification failed

**Error:**

```
JsonWebTokenError: invalid signature
```

**Solution:**

```bash
# 1. Verify JWT_SECRETS in .env
cat .env | grep JWT_SECRET

# 2. Check secret format (hex string, ≥64 chars)
echo $JWT_SECRET | wc -c

# 3. Ensure secrets are not quoted
# WRONG: JWT_SECRET="abc123..."
# RIGHT: JWT_SECRET=abc123...

# 4. Restart application
npm restart
```

---

### Issue: No sessions found

**Output:**

```
✓ Found 0 sessions (Total: 0)
⚠ No sessions found matching criteria
```

**Possible Causes:**

1. All sessions expired (check with `--status all`)
2. Wrong userId filter
3. Sessions cleaned up automatically
4. Database empty (new installation)

**Debug:**

```bash
# Check all sessions (including expired)
npm run auth:cli list-sessions --status all

# Check database directly
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"BetterAuthSession\""
```

---

### Issue: Rate limit exceeded (API)

**Error:**

```json
{
  "error": "TOO_MANY_REQUESTS",
  "retryAfter": 45
}
```

**Solution:**

1. Wait for rate limit window to reset
2. Batch operations if possible
3. Contact infra team to adjust limits (if legitimate use case)

---

## Additional Resources

- [SECURITY.md](./SECURITY.md) - Security architecture
- [COMPLIANCE.md](./COMPLIANCE.md) - GDPR & PSD2 compliance
- [MONITORING.md](./MONITORING.md) - Observability setup

---

**Version:** 1.0.0
**Last Updated:** December 2024
**Maintained by:** Pluqla Backend Team

For support: backend-team@pluqla.com
