# Authentication System - Better Auth Integration

Complete authentication documentation for Pluqla's Better Auth implementation.

## 🔐 Overview

Pluqla uses **Better Auth** for secure, modern authentication with PostgreSQL session storage. This system provides:

- Session-based authentication with automatic cleanup
- Role-based access control (User, Premium, Admin)
- Google OAuth integration
- Legacy JWT compatibility during migration
- AI endpoint protection with PII sanitization
- Rate limiting by user tier

## 🚀 Quick Start

### Authentication Flow

```javascript
// 1. User Registration
POST /api/auth/sign-up
{
  "email": "user@example.com",
  "password": "secure123",
  "name": "John Doe"
}

// 2. User Login
POST /api/auth/sign-in
{
  "email": "user@example.com",
  "password": "secure123"
}

// 3. Access Protected Resources
GET /api/ai-secure/suggestions
Cookie: better-auth.session-token=abc123...
```

### Session Management

```javascript
// Check current session
GET /api/auth/session
// Returns: { user: { id, email, name, role }, session: { ... } }

// Sign out
POST /api/auth/sign-out
// Clears session and cookies
```

## 🔧 Implementation Details

### Better Auth Configuration

**File**: `server/src/auth/betterAuth.js`

```javascript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

export const auth = betterAuth({
  database: prismaAdapter(prismaClient, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      enabled: !!process.env.GOOGLE_CLIENT_ID
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5  // 5 minutes
    }
  },
  baseURL: process.env.BASE_URL || "http://localhost:3004"
});
```

### Better Auth Cookie Configuration

**Purpose**: Secure session persistence with proper cookie settings to prevent XSS, CSRF, and ensure sessions survive browser restarts.

#### Cookie Security Settings

```javascript
// Configuration in server/src/auth/betterAuth.js
session: {
  // Session duration: 7 days (configurable via SESSION_EXPIRES_IN env)
  expiresIn: parseInt(process.env.SESSION_EXPIRES_IN || '604800', 10),

  // Update session timestamp every 1 hour (configurable via SESSION_UPDATE_AGE)
  updateAge: parseInt(process.env.SESSION_UPDATE_AGE || '3600', 10),

  // Cookie configuration for secure session persistence
  cookie: {
    name: 'pluqla.session-token',

    // SECURITY: httpOnly prevents JavaScript access (XSS protection)
    httpOnly: true,

    // SECURITY: secure=true in production (HTTPS only)
    secure: process.env.NODE_ENV === 'production',

    // SECURITY: sameSite=strict prevents CSRF attacks
    sameSite: 'strict',

    // Path where cookie is valid
    path: '/',

    // Domain (only in production with actual domain)
    domain: process.env.COOKIE_DOMAIN || undefined,

    // Max age: 7 days (matches session expiration)
    maxAge: parseInt(process.env.SESSION_EXPIRES_IN || '604800', 10) * 1000
  }
}
```

#### Cookie Security Explained

| Setting | Value | Purpose |
|---------|-------|---------|
| **httpOnly** | `true` | Prevents JavaScript from accessing the cookie, mitigating XSS attacks |
| **secure** | `true` in production | Ensures cookie is only sent over HTTPS, preventing man-in-the-middle attacks |
| **sameSite** | `'strict'` | Prevents CSRF attacks by not sending cookie in cross-site requests |
| **maxAge** | `604800000` ms (7 days) | Cookie persists for 7 days, surviving browser restarts |
| **path** | `'/'` | Cookie is valid for all routes |
| **domain** | `undefined` (dev) or actual domain (prod) | Restricts cookie to specific domain |

#### Environment Variables

Configure session behavior via `.env`:

```env
# Session expiration time in seconds (default: 604800 = 7 days)
SESSION_EXPIRES_IN=604800

# Session update age in seconds (default: 3600 = 1 hour)
# How often to update the session timestamp on requests
SESSION_UPDATE_AGE=3600

# Cookie domain (leave empty for localhost, set to your domain in production)
COOKIE_DOMAIN=""
# Production example:
# COOKIE_DOMAIN="pluqla.com"
```

#### Development vs Production

**Development (NODE_ENV=development)**:
- `secure: false` - Allows HTTP (localhost doesn't have HTTPS)
- `domain: undefined` - Works with localhost

**Production (NODE_ENV=production)**:
- `secure: true` - Requires HTTPS
- `domain: process.env.COOKIE_DOMAIN` - Set to your actual domain

#### Cookie Parser Middleware

**REQUIRED**: The app must use `cookie-parser` middleware to read cookies:

```javascript
// server/src/app.js
const cookieParser = require('cookie-parser');

// Add BEFORE routes
app.use(cookieParser());
```

Without `cookie-parser`, the `req.cookies` object will be undefined and sessions won't work.

#### Helper Functions

**Set Session Cookie**:
```javascript
const { setSessionCookie } = require('./auth/betterAuth');

// After successful login
const session = await createSession(userId);
setSessionCookie(res, session.sessionToken); // Sets cookie with secure options
```

**Clear Session Cookie**:
```javascript
const { clearSessionCookie } = require('./auth/betterAuth');

// On logout
clearSessionCookie(res); // Removes cookie with matching options
```

#### Testing Cookie Persistence

```javascript
// Test 1: Session persists after login
const session = await createSession(userId);
const response = await request(app)
  .get('/api/protected')
  .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);
expect(response.status).toBe(200);

// Test 2: Session survives browser restart (new agent)
const newAgent = request.agent(app);
const response2 = await newAgent
  .get('/api/protected')
  .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);
expect(response2.status).toBe(200);

// Test 3: Expired sessions are rejected
const expiredSession = await createExpiredSession(userId);
const response3 = await request(app)
  .get('/api/protected')
  .set('Cookie', [`pluqla.session-token=${expiredSession.sessionToken}`]);
expect(response3.status).toBe(401);
```

#### Common Issues & Solutions

**Issue 1: Sessions don't persist**
- ✅ **Solution**: Ensure `cookie-parser` middleware is installed and configured
- ✅ **Verify**: Check `req.cookies` is defined in your middleware

**Issue 2: Cookies not sent in production**
- ✅ **Solution**: Set `secure: true` and ensure your site uses HTTPS
- ✅ **Verify**: Check `NODE_ENV=production` is set

**Issue 3: CORS blocking cookies**
- ✅ **Solution**: Enable `credentials: true` in CORS configuration
- ✅ **Verify**: Frontend must send `credentials: 'include'` in fetch requests

**Issue 4: Cookie domain mismatch**
- ✅ **Solution**: Set `COOKIE_DOMAIN` to match your actual domain (e.g., `pluqla.com`)
- ✅ **Verify**: Don't set domain in development (leave empty for localhost)

#### Best Practices

1. **Always use httpOnly**: Prevents XSS attacks
2. **Always use sameSite=strict**: Prevents CSRF attacks
3. **Use secure=true in production**: Requires HTTPS
4. **Set appropriate maxAge**: Balance between security and convenience (7 days is reasonable)
5. **Clean up expired sessions**: Run periodic cleanup to prevent database bloat
6. **Test session persistence**: Ensure cookies survive browser restart
7. **Monitor session duration**: Alert if sessions expire too quickly

---

### Automatic Session Cleanup

**Purpose**: Prevent database bloat by automatically deleting expired sessions. Without cleanup, the database will accumulate millions of expired session rows over time.

#### How It Works

The session cleanup service runs automatically on a schedule (default: 3 AM daily) and:
1. Queries the database for expired sessions (`expires < NOW()`)
2. Deletes expired sessions in bulk
3. Logs cleanup metrics (count, duration, errors)
4. **Never deletes active sessions** (safety guarantee)

#### Configuration

Configure via environment variables in `.env`:

```env
# Enable automatic session cleanup (default: true)
SESSION_CLEANUP_ENABLED=true

# Cron schedule for session cleanup (default: "0 3 * * *" = 3 AM daily)
# Format: "minute hour day month weekday"
SESSION_CLEANUP_CRON="0 3 * * *"

# Run cleanup on server startup (default: false)
SESSION_CLEANUP_ON_STARTUP=false
```

#### Cron Schedule Examples

| Schedule | Description |
|----------|-------------|
| `"0 3 * * *"` | Every day at 3:00 AM (default) |
| `"*/30 * * * *"` | Every 30 minutes |
| `"0 */6 * * *"` | Every 6 hours (0:00, 6:00, 12:00, 18:00) |
| `"0 2 * * 0"` | Every Sunday at 2:00 AM |
| `"0 0 1 * *"` | First day of every month at midnight |

**Validation**: The cron expression is validated on startup. Invalid expressions log an error and disable cleanup.

#### Implementation

**Service File**: `server/src/services/sessionCleanupService.js`

```javascript
const { initializeCleanupService } = require('./services/sessionCleanupService');

// On server startup (in server.js)
await initializeCleanupService({
  runOnStartup: process.env.SESSION_CLEANUP_ON_STARTUP === 'true',
  enabled: process.env.SESSION_CLEANUP_ENABLED !== 'false'
});
```

**Cleanup Function**: Uses the existing `cleanupExpiredSessions()` from `betterAuth.js`:

```javascript
async function cleanupExpiredSessions() {
  const result = await prisma.betterAuthSession.deleteMany({
    where: {
      expires: {
        lt: new Date() // Only sessions with expires < NOW()
      }
    }
  });

  logger.info('Cleaned up expired sessions', { count: result.count });
  return result.count;
}
```

#### Manual Cleanup (Testing & Admin)

```javascript
const { triggerManualCleanup } = require('./services/sessionCleanupService');

// Trigger cleanup manually
const result = await triggerManualCleanup();
console.log(`Cleaned up ${result.sessionsDeleted} sessions in ${result.duration}ms`);
```

**Admin Endpoint** (optional - add to your routes):

```javascript
// server/src/routes/admin.js
const { requireAdmin } = require('../auth/betterAuth');
const { triggerManualCleanup, getCleanupStats } = require('../services/sessionCleanupService');

// GET /api/admin/sessions/cleanup-stats
router.get('/sessions/cleanup-stats', requireAdmin, async (req, res) => {
  const stats = getCleanupStats();
  res.json(stats);
});

// POST /api/admin/sessions/cleanup
router.post('/sessions/cleanup', requireAdmin, async (req, res) => {
  const result = await triggerManualCleanup();
  res.json(result);
});
```

#### Monitoring & Metrics

The cleanup service tracks statistics:

```javascript
const stats = getCleanupStats();
console.log(stats);
// Output:
// {
//   totalRuns: 150,
//   totalSessionsCleaned: 45230,
//   lastRunAt: "2025-09-30T03:00:00.000Z",
//   lastRunDuration: 345,
//   lastRunSessionsCleaned: 312,
//   failures: 0,
//   lastError: null,
//   averageSessionsPerRun: 301,
//   successRate: "100.00%"
// }
```

**Logged Events**:

```
🧹 Starting session cleanup job (runId=cleanup-1727668800000)
✅ Session cleanup completed successfully (sessionsDeleted=312, duration=345ms)
⚠️ Large number of expired sessions cleaned up (sessionsDeleted=15234)
❌ Session cleanup failed (error=Database connection timeout)
```

#### Performance

| Sessions | Cleanup Time | Database Load |
|----------|--------------|---------------|
| 100 | < 100ms | Minimal |
| 1,000 | < 500ms | Low |
| 10,000 | < 2s | Moderate |
| 100,000 | < 10s | High (consider increasing frequency) |

**Recommendation**: If cleanup regularly deletes > 10,000 sessions, increase frequency (e.g., every 6 hours instead of daily).

#### Safety Guarantees

1. **Never deletes active sessions**: Query explicitly checks `expires < NOW()`
2. **Graceful error handling**: Errors don't crash the server, cleanup continues on next schedule
3. **Transaction safety**: Uses Prisma's `deleteMany` (atomic operation)
4. **Logging**: All operations logged for audit trail

#### Testing

**Integration Tests**: `server/tests/integration/session-cleanup.test.js`

```bash
# Run cleanup tests
npm test -- tests/integration/session-cleanup.test.js
```

**Test Coverage**:
- ✅ Expired sessions are deleted
- ✅ Active sessions remain untouched
- ✅ Mixed expired/active sessions handled correctly
- ✅ Manual cleanup trigger works
- ✅ Statistics tracking accurate
- ✅ Performance benchmarks (100, 1000, 10000 sessions)

#### Troubleshooting

**Issue 1: Cleanup not running**

**Check**:
```bash
# Verify environment variable
echo $SESSION_CLEANUP_ENABLED

# Check logs for initialization message
grep "Session cleanup scheduler" logs/app.log
```

**Solution**:
```env
SESSION_CLEANUP_ENABLED=true
```

---

**Issue 2: Invalid cron expression**

**Error**:
```
❌ Invalid SESSION_CLEANUP_CRON expression
```

**Solution**: Use valid cron format `"minute hour day month weekday"`
```env
SESSION_CLEANUP_CRON="0 3 * * *"
```

---

**Issue 3: Database bloat still occurring**

**Check**:
```sql
-- Count expired sessions
SELECT COUNT(*) FROM better_auth_sessions
WHERE expires < NOW();
```

**Solution**: Increase cleanup frequency
```env
SESSION_CLEANUP_CRON="0 */6 * * *"  # Every 6 hours
```

---

**Issue 4: Cleanup taking too long**

**Check stats**:
```javascript
const stats = getCleanupStats();
console.log(`Average sessions per run: ${stats.averageSessionsPerRun}`);
```

**Solutions**:
1. Increase cleanup frequency (less sessions per run)
2. Add database index: `CREATE INDEX idx_session_expires ON better_auth_sessions(expires);`
3. Consider archiving old sessions instead of deleting

#### Best Practices

1. **Enable by default**: Set `SESSION_CLEANUP_ENABLED=true` in production
2. **Run at low-traffic hours**: Default 3 AM is ideal for most applications
3. **Monitor cleanup stats**: Check `averageSessionsPerRun` weekly
4. **Alert on failures**: Set up alerts if `failures > 0`
5. **Test before deploying**: Run `triggerManualCleanup()` in staging
6. **Document custom schedules**: Note why if using non-default schedule

#### Production Checklist

Before deploying to production:
- [ ] `SESSION_CLEANUP_ENABLED=true` in `.env`
- [ ] Valid `SESSION_CLEANUP_CRON` expression
- [ ] Database has adequate performance for bulk deletes
- [ ] Monitoring/alerts set up for cleanup failures
- [ ] Tested manual cleanup works
- [ ] Integration tests passing

---

### Authentication Middleware

**File**: `server/src/auth/betterAuth.js`

```javascript
// Base protection - requires valid session
export const protect = async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.['better-auth.session-token'] ||
                        req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const { session, user } = await auth.api.getSession({
      headers: { cookie: `better-auth.session-token=${sessionToken}` }
    });

    if (!session || !user) {
      return res.status(401).json({
        error: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Premium user protection
export const requirePremium = (req, res, next) => {
  if (!req.user?.isPremium && req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED',
      upgradeUrl: '/pricing'
    });
  }
  next();
};

// Admin-only protection
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Administrator access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};
```

## 🛡️ Protected Endpoints

### AI Secure Routes

**File**: `server/src/routes/secureAi.js`

All `/api/ai-secure/*` endpoints require authentication:

```javascript
import { protect, requirePremium } from '../auth/betterAuth.js';

// Apply base protection to all routes
router.use(protect);

// Free tier endpoints (authenticated users)
router.post('/suggestions', rateLimit.ai, getSuggestions);
router.post('/categorize', rateLimit.ai, categorizeTransaction);
router.post('/insights', rateLimit.ai, getInsights);

// Premium tier endpoints
router.post('/analyze/investment', requirePremium, rateLimit.ai, analyzeInvestment);
router.post('/optimize/portfolio', requirePremium, rateLimit.ai, optimizePortfolio);
router.post('/forecast/spending', requirePremium, rateLimit.ai, forecastSpending);

// Admin endpoints
router.get('/usage/stats', requireAdmin, getUsageStats);
router.post('/model/update', requireAdmin, updateModel);
```

### Rate Limiting by Tier

```javascript
// Different limits based on user role
const rateLimit = {
  ai: (req, res, next) => {
    const limits = {
      user: { windowMs: 15 * 60 * 1000, max: 10 },      // 10/15min
      premium: { windowMs: 15 * 60 * 1000, max: 50 },   // 50/15min
      admin: { windowMs: 15 * 60 * 1000, max: 1000 }    // 1000/15min
    };

    const userTier = req.user?.isPremium ? 'premium' :
                    req.user?.role === 'admin' ? 'admin' : 'user';

    return rateLimit(limits[userTier])(req, res, next);
  }
};
```

## 👤 User Roles & Permissions

### Role Hierarchy

```typescript
type UserRole = 'user' | 'premium' | 'admin';

interface Permissions {
  user: {
    ai: ['suggestions', 'categorize', 'insights'];
    finance: ['view_transactions', 'add_transactions'];
    profile: ['view', 'edit'];
  };
  premium: {
    ai: ['all_user_features', 'investment_analysis', 'portfolio_optimization'];
    finance: ['advanced_analytics', 'export_data'];
    support: ['priority_support'];
  };
  admin: {
    ai: ['all_features', 'usage_stats', 'model_management'];
    users: ['view_all', 'edit_roles', 'suspend'];
    system: ['view_logs', 'manage_settings'];
  };
}
```

### Role Assignment

```javascript
// Database schema (Prisma)
model User {
  id        String  @id @default(cuid())
  email     String  @unique
  name      String
  role      String  @default("user")        // user, admin
  isPremium Boolean @default(false)         // Premium subscription
  status    String  @default("active")      // active, inactive, suspended

  // Better Auth relations
  betterAuthSessions BetterAuthSession[]
  betterAuthAccounts BetterAuthAccount[]
}

// Promote user to premium
PUT /api/admin/users/:id/premium
{
  "isPremium": true,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

## 🔗 Google OAuth Integration

### Setup Configuration

**Environment Variables**:
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
BASE_URL="http://localhost:3004"
```

**Google Console Setup**:
1. Create project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3004/api/auth/callback/google`

### OAuth Flow

```javascript
// Initiate Google OAuth
GET /api/auth/sign-in/google
// Redirects to Google consent screen

// Handle callback
GET /api/auth/callback/google?code=...
// Processes OAuth response and creates/updates user

// Frontend integration
const handleGoogleLogin = () => {
  window.location.href = '/api/auth/sign-in/google';
};
```

## 🔄 Legacy JWT Compatibility

During the migration period, both Better Auth and JWT are supported:

**File**: `server/src/auth/legacyCompatibility.js`

```javascript
export const hybridAuth = async (req, res, next) => {
  // Try Better Auth first
  const betterAuthResult = await tryBetterAuth(req);
  if (betterAuthResult.success) {
    req.user = betterAuthResult.user;
    req.session = betterAuthResult.session;
    return next();
  }

  // Fallback to JWT
  const jwtResult = await tryJWTAuth(req);
  if (jwtResult.success) {
    req.user = jwtResult.user;
    req.legacyAuth = true; // Flag for migration tracking
    return next();
  }

  // Neither auth method succeeded
  return res.status(401).json({
    error: 'Authentication required',
    supportedMethods: ['better-auth', 'jwt']
  });
};
```

### Migration Endpoint

```javascript
// Migrate JWT user to Better Auth
POST /api/auth/migrate
Authorization: Bearer JWT_TOKEN

// Response
{
  "success": true,
  "message": "Account migrated to Better Auth",
  "sessionToken": "better-auth-session-token"
}
```

## 🧪 Testing Authentication

### Unit Tests

**File**: `server/tests/auth/betterAuth.test.js`

```javascript
describe('Better Auth Integration', () => {
  describe('User Registration', () => {
    it('should create user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          email: 'test@example.com',
          password: 'secure123',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });
  });

  describe('Protected Routes', () => {
    it('should block unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/ai-secure/suggestions');

      expect(response.status).toBe(401);
    });

    it('should allow authenticated requests', async () => {
      const { sessionToken } = await createTestUser();

      const response = await request(app)
        .get('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${sessionToken}`);

      expect(response.status).toBe(200);
    });
  });
});
```

### Integration Tests

**File**: `server/tests/auth/aiEndpointProtection.test.js`

```javascript
describe('AI Endpoint Protection', () => {
  describe('PII Sanitization', () => {
    it('should sanitize user data before sending to AI', async () => {
      const { sessionToken } = await createTestUser({
        email: 'john.doe@example.com',
        name: 'John Doe'
      });

      const spy = jest.spyOn(aiService, 'getSuggestions');

      await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({ category: 'groceries', amount: 50 });

      const aiRequest = spy.mock.calls[0][0];
      expect(aiRequest).not.toContain('john.doe@example.com');
      expect(aiRequest).not.toContain('John Doe');
      expect(aiRequest).toMatch(/user_[a-z0-9]+/); // Anonymized ID
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce different limits by user tier', async () => {
      const { sessionToken: userToken } = await createTestUser({ role: 'user' });
      const { sessionToken: premiumToken } = await createTestUser({
        role: 'user',
        isPremium: true
      });

      // Test user limits (10 requests per 15 minutes)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/ai-secure/suggestions')
          .set('Cookie', `better-auth.session-token=${userToken}`)
          .send({ category: 'groceries', amount: 50 });
        expect(response.status).toBe(200);
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${userToken}`)
        .send({ category: 'groceries', amount: 50 });
      expect(response.status).toBe(429);

      // Premium user should still work
      const premiumResponse = await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${premiumToken}`)
        .send({ category: 'groceries', amount: 50 });
      expect(premiumResponse.status).toBe(200);
    });
  });
});
```

## 🚨 Error Handling

### Common Error Codes

```javascript
const AUTH_ERRORS = {
  AUTH_REQUIRED: {
    status: 401,
    message: 'Authentication required',
    action: 'Please sign in to continue'
  },
  SESSION_INVALID: {
    status: 401,
    message: 'Invalid or expired session',
    action: 'Please sign in again'
  },
  PREMIUM_REQUIRED: {
    status: 403,
    message: 'Premium subscription required',
    action: 'Upgrade to access this feature'
  },
  ADMIN_REQUIRED: {
    status: 403,
    message: 'Administrator access required',
    action: 'Contact system administrator'
  },
  RATE_LIMITED: {
    status: 429,
    message: 'Too many requests',
    action: 'Please wait before trying again'
  }
};
```

### Frontend Error Handling

```javascript
// API service with automatic token refresh
const apiService = {
  async request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: 'include' // Include session cookies
    });

    if (response.status === 401) {
      // Session expired, redirect to login
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    if (response.status === 403) {
      // Permission denied
      const error = await response.json();
      if (error.code === 'PREMIUM_REQUIRED') {
        // Show upgrade modal
        showUpgradeModal();
        return;
      }
    }

    return response;
  }
};
```

## 🔧 Configuration Reference

### Environment Variables

```env
# Core Better Auth Settings
BETTER_AUTH_SECRET="your-64-character-secret-here"
BASE_URL="http://localhost:3004"

# Database (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/pluqla_dev"

# JWT Compatibility (Optional during migration)
JWT_SECRET="your-jwt-secret-32-characters-minimum"
JWT_REFRESH_SECRET="your-refresh-secret-32-characters-minimum"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Security Keys (Required)
FINANCIAL_ENCRYPTION_KEY="your-financial-encryption-key-64-chars"
BANK_ENCRYPTION_KEY="your-bank-encryption-key-64-chars"
SESSION_SECRET="your-session-secret-32-characters-minimum"
```

### Session Configuration

```javascript
// Customize session behavior
const sessionConfig = {
  expiresIn: 60 * 60 * 24 * 7,  // 7 days
  updateAge: 60 * 60 * 24,      // Update session daily
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5              // 5 minute cache
  },
  cleanup: {
    enabled: true,
    interval: 60 * 60 * 24      // Daily cleanup of expired sessions
  }
};
```

## 🚀 Production Deployment

### Security Checklist

- [ ] Use strong, unique secrets (≥32 characters)
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set secure session cookies
- [ ] Enable rate limiting
- [ ] Configure database connection pooling
- [ ] Set up session cleanup jobs
- [ ] Monitor authentication metrics

### Environment Setup

```bash
# Generate production secrets
openssl rand -hex 32  # BETTER_AUTH_SECRET
openssl rand -hex 32  # FINANCIAL_ENCRYPTION_KEY
openssl rand -hex 32  # BANK_ENCRYPTION_KEY

# Production environment
NODE_ENV=production
BASE_URL=https://your-domain.com
DATABASE_URL=postgresql://user:pass@prod-db:5432/pluqla

# Enable security features
TRUST_PROXY=true
CORS_ORIGIN=https://your-domain.com
```

### Health Checks

```javascript
// Authentication health endpoint
GET /api/auth/health

// Response
{
  "status": "healthy",
  "database": { "connected": true },
  "sessions": { "active": 1524, "expired": 0 },
  "authentication": { "enabled": true, "methods": ["email", "google"] }
}
```

## 📚 Additional Resources

- [Better Auth Documentation](https://better-auth.com/docs)
- [API Endpoints Reference](./API.md)
- [Security Guidelines](./SECURITY.md)
- [Testing Procedures](./TESTS.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

**Last Updated**: December 2024 | **Version**: 2.0.0 | **Status**: Production Ready