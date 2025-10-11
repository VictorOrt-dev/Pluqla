# 🔒 Session and CSRF Protection Implementation Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation](#implementation)
4. [Integration Guide](#integration-guide)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Rollback Plan](#rollback-plan)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This implementation provides enterprise-grade session management and CSRF protection for the Pluqla backend.

### Security Features

✅ **Session Management**
- Session fixation prevention (rotation on login)
- HttpOnly cookies (XSS protection)
- Secure cookies (HTTPS in production)
- SameSite=Strict (CSRF protection)
- 1-hour TTL with sliding expiration
- Redis-backed storage (with in-memory fallback)

✅ **CSRF Protection**
- Double-Submit Cookie technique
- Stateless (no server-side token storage)
- Automatic exemption for safe methods (GET, HEAD, OPTIONS)
- Cryptographically secure tokens (32 bytes)
- Token rotation on authentication changes

✅ **Production-Ready**
- XSS protection
- CSRF protection
- Session fixation prevention
- Idle timeout detection
- Rate limiting integration
- Comprehensive tests
- Graceful degradation

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────┐
│         Client (React Frontend)         │
└────────────┬────────────────────────────┘
             │
             │ HTTP + Cookies
             │
┌────────────▼────────────────────────────┐
│          Express Middleware             │
│  ┌────────────────────────────────────┐ │
│  │  1. Cookie Parser                  │ │
│  │  2. Session Middleware             │ │
│  │  3. CSRF Token Middleware          │ │
│  │  4. Session Activity Tracker       │ │
│  └────────────────────────────────────┘ │
└────────────┬────────────────────────────┘
             │
             │ Routes
             │
┌────────────▼────────────────────────────┐
│         Route Handlers                  │
│  ┌────────────────────────────────────┐ │
│  │  • Conditional CSRF Protection     │ │
│  │  • requireSession Middleware       │ │
│  │  • Business Logic                  │ │
│  └────────────────────────────────────┘ │
└────────────┬────────────────────────────┘
             │
             │ Data
             │
┌────────────▼────────────────────────────┐
│     Session Store (Redis/Memory)        │
└─────────────────────────────────────────┘
```

### Data Flow

**Login Flow:**
```
1. Client → POST /api/auth/login + CSRF token
2. Server validates credentials
3. Server rotates session ID (new session)
4. Server refreshes CSRF token
5. Server → Client: New session cookie + CSRF cookie
```

**Protected Request Flow:**
```
1. Client reads XSRF-TOKEN cookie
2. Client → POST /api/data + X-CSRF-Token header
3. Server validates:
   - Session exists (requireSession)
   - CSRF tokens match (csrfProtection)
4. Server processes request
5. Server → Client: Response + updated session
```

**Logout Flow:**
```
1. Client → POST /api/auth/logout + CSRF token
2. Server validates CSRF
3. Server destroys session
4. Server clears session cookie
5. Server → Client: Success response
```

---

## 🛠️ Implementation

### File Structure

```
server/
├── src/
│   ├── middleware/
│   │   ├── sessionMiddleware.js      # Session management
│   │   └── csrfProtection.js         # CSRF protection
│   ├── config/
│   │   └── securityIntegration.js    # Integration helper
│   └── app.js                         # Main app (integration point)
├── tests/
│   └── sessionCsrf.test.js           # Integration tests
├── examples/
│   ├── authRoutes.example.js         # Backend example
│   └── frontendIntegration.md        # Frontend examples
└── docs/
    └── SESSION_CSRF_IMPLEMENTATION.md # This file
```

### Dependencies

**Production:**
- `express-session` - Session management
- `connect-redis` - Redis session store
- `cookie-parser` - Cookie parsing (already installed)

**Dev:**
- `supertest` - API testing (already installed)
- `jest` - Test runner (already installed)

**Install:**
```bash
npm install express-session connect-redis
```

---

## 🔧 Integration Guide

### Step 1: Update .env

Add session configuration:

```env
# Session Configuration
SESSION_SECRET="your-super-secure-session-secret-at-least-32-characters"
SESSION_MAX_AGE=3600000  # 1 hour in milliseconds
SESSION_IDLE_TIMEOUT=1800000  # 30 minutes in milliseconds

# Optional: Redis for session storage
REDIS_URL="redis://localhost:6379"

# Cookie Configuration (optional)
COOKIE_DOMAIN=""  # Leave empty for localhost, set to your domain in production
TRUST_PROXY=false  # Set to true if behind load balancer
```

### Step 2: Integrate in app.js

**Option A: Manual Integration**

```javascript
// src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');

// Session and CSRF
const {
  sessionMiddleware,
  trackSessionActivity
} = require('./middleware/sessionMiddleware');

const {
  csrfTokenMiddleware,
  conditionalCsrfProtection,
  csrfErrorHandler,
  getCsrfToken
} = require('./middleware/csrfProtection');

const app = express();

// ... other middlewares (helmet, cors, etc.)

// Cookie parser (MUST be before session)
app.use(cookieParser());

// Session middleware
app.use(sessionMiddleware);

// CSRF token generation
app.use(csrfTokenMiddleware);

// Session activity tracking
app.use(trackSessionActivity);

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// ... body parser and other middlewares

// Routes
app.use('/api', routes);

// CSRF protection (AFTER routes)
app.use(conditionalCsrfProtection);

// CSRF error handler (AFTER routes)
app.use(csrfErrorHandler);

// ... other error handlers
```

**Option B: Using Integration Helper**

```javascript
// src/app.js
const { applySecurityMiddlewares, applyCsrfProtection, logSecurityConfig } = require('./config/securityIntegration');

const app = express();

// ... other middlewares (helmet, cors, etc.)

// Cookie parser (MUST be before session)
app.use(cookieParser());

// Apply session and CSRF middlewares
applySecurityMiddlewares(app);

// ... body parser and other middlewares

// Routes
app.use('/api', routes);

// Apply CSRF protection to routes
applyCsrfProtection(app);

// Log security configuration
logSecurityConfig();
```

### Step 3: Protect Routes

**Example: Authentication Routes**

```javascript
const {
  rotateSession,
  destroySession,
  requireSession
} = require('../middleware/sessionMiddleware');

const {
  csrfProtection,
  refreshCsrfToken
} = require('../middleware/csrfProtection');

// Login - rotates session and CSRF
router.post('/login', csrfProtection, async (req, res) => {
  // ... validate credentials

  // Rotate session
  await rotateSession(req, {
    userId: user.id,
    email: user.email,
    role: user.role
  });

  // Refresh CSRF token
  refreshCsrfToken(req, res);

  res.json({ success: true, user });
});

// Logout - destroys session
router.post('/logout', requireSession, csrfProtection, async (req, res) => {
  await destroySession(req, res);
  res.json({ success: true });
});

// Protected route
router.get('/profile', requireSession, async (req, res) => {
  // req.session has user data
  res.json({ user: req.session });
});

// State-changing operation
router.post('/data', requireSession, csrfProtection, async (req, res) => {
  // Both session and CSRF required
  res.json({ success: true });
});
```

### Step 4: Update Frontend

See `examples/frontendIntegration.md` for complete React integration.

**Quick Setup:**

```javascript
// src/services/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3004',
  withCredentials: true  // CRITICAL: Send cookies
});

// Add CSRF token to all state-changing requests
apiClient.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? match[1] : null;
}

export default apiClient;
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Session/CSRF tests only
npm test -- tests/sessionCsrf.test.js

# With coverage
npm run test:coverage
```

### Test Coverage

Tests verify:
- ✅ Session creation and rotation
- ✅ Session destruction on logout
- ✅ Session expiration (TTL)
- ✅ Session idle timeout
- ✅ CSRF token generation
- ✅ CSRF protection for POST/PUT/DELETE
- ✅ CSRF exemption for GET/HEAD/OPTIONS
- ✅ 403 responses for invalid CSRF tokens
- ✅ Session + CSRF integration

### Manual Testing

**1. Get CSRF Token:**
```bash
curl -c cookies.txt http://localhost:3004/api/csrf-token
```

**2. Login (with CSRF):**
```bash
curl -b cookies.txt -c cookies.txt \
  -H "X-CSRF-Token: <token-from-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pluqla.com","password":"password123"}' \
  http://localhost:3004/api/auth/login
```

**3. Access Protected Route:**
```bash
curl -b cookies.txt http://localhost:3004/api/auth/me
```

**4. Test CSRF Protection:**
```bash
# Should fail (no CSRF token)
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  http://localhost:3004/api/data

# Should succeed (with CSRF token)
curl -b cookies.txt \
  -H "X-CSRF-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}' \
  http://localhost:3004/api/data
```

---

## 🚀 Deployment

### Production Checklist

- [ ] `NODE_ENV=production` set
- [ ] `SESSION_SECRET` is strong and unique (32+ chars)
- [ ] Redis is configured and running
- [ ] `REDIS_URL` is set
- [ ] `TRUST_PROXY=true` if behind load balancer
- [ ] `COOKIE_DOMAIN` is set to your domain
- [ ] HTTPS is enabled (required for secure cookies)
- [ ] Frontend `withCredentials: true` is set
- [ ] CORS allows your frontend origin
- [ ] Tests pass (`npm run test:ci`)

### Environment Variables (Production)

```env
NODE_ENV=production

# Session
SESSION_SECRET=<generate-with-openssl-rand-hex-32>
SESSION_MAX_AGE=3600000
SESSION_IDLE_TIMEOUT=1800000

# Redis
REDIS_URL=redis://<redis-host>:6379

# Cookies
COOKIE_DOMAIN=.yourapp.com
TRUST_PROXY=true

# CORS
CORS_ORIGIN=https://app.yourapp.com,https://www.yourapp.com
```

### Generate Session Secret

```bash
openssl rand -hex 32
```

---

## ⚠️ Rollback Plan

If session/CSRF implementation causes issues, follow this rollback plan:

### Immediate Rollback (Emergency)

**Step 1: Disable CSRF Protection**

Comment out CSRF middleware in `app.js`:

```javascript
// ROLLBACK: Temporarily disable CSRF protection
// app.use(csrfTokenMiddleware);
// app.use(conditionalCsrfProtection);
// app.use(csrfErrorHandler);
```

**Step 2: Disable Session Middleware**

Comment out session middleware:

```javascript
// ROLLBACK: Temporarily disable session management
// app.use(sessionMiddleware);
// app.use(trackSessionActivity);
```

**Step 3: Restore Previous Auth**

Ensure Better Auth is still working:

```javascript
// This should still work (uses Better Auth sessions)
const { protect } = require('./auth/betterAuth');
router.get('/protected', protect, handler);
```

**Step 4: Restart Server**

```bash
npm run dev  # Development
npm start    # Production
```

### Gradual Rollback (Planned)

**Option 1: Keep Session, Disable CSRF**

If session works but CSRF causes issues:

```javascript
// Keep session (works fine)
app.use(sessionMiddleware);
app.use(trackSessionActivity);

// Remove CSRF (temporary)
// app.use(csrfTokenMiddleware);
// app.use(conditionalCsrfProtection);
```

**Option 2: Keep CSRF, Disable Session**

If CSRF works but session causes issues:

```javascript
// Remove session (temporary)
// app.use(sessionMiddleware);

// Keep CSRF (works fine)
app.use(csrfTokenMiddleware);
app.use(conditionalCsrfProtection);
```

### Frontend Rollback

Remove CSRF token from requests:

```javascript
// ROLLBACK: Comment out CSRF interceptor
/*
apiClient.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    const csrfToken = getCsrfToken();
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
*/
```

### Verification After Rollback

1. ✅ Server starts without errors
2. ✅ Login works
3. ✅ Protected routes work
4. ✅ Frontend can make API calls
5. ✅ No CORS errors
6. ✅ No cookie errors

---

## 🐛 Troubleshooting

### Issue: "CSRF token missing"

**Cause:** Frontend not sending CSRF token

**Fix:**
```javascript
// Ensure axios sends cookies
axios.create({
  withCredentials: true  // ← Add this
});

// Ensure CSRF token is added to headers
config.headers['X-CSRF-Token'] = getCsrfTokenFromCookie();
```

### Issue: "Session expired"

**Cause:** Session TTL too short or idle timeout triggered

**Fix:**
```env
# Increase TTL (default: 1 hour)
SESSION_MAX_AGE=7200000  # 2 hours

# Increase idle timeout (default: 30 min)
SESSION_IDLE_TIMEOUT=3600000  # 1 hour
```

### Issue: "CORS error with cookies"

**Cause:** CORS not allowing credentials

**Fix:**
```javascript
// Backend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true  // ← Add this
}));

// Frontend
axios.create({
  withCredentials: true  // ← Add this
});
```

### Issue: Redis connection failed

**Cause:** Redis not running or wrong URL

**Fix:**
```bash
# Check Redis is running
docker ps | grep redis

# Check Redis URL
echo $REDIS_URL

# Test connection
redis-cli ping
# Expected: PONG
```

**Fallback:** Remove `REDIS_URL` from `.env` to use in-memory storage

### Issue: Session not persisting

**Cause:** Cookie not being sent or SameSite policy

**Fix:**
```javascript
// Development (localhost)
cookie: {
  sameSite: 'lax',  // ← Change from 'strict'
  secure: false      // ← Disable for HTTP
}

// Production (HTTPS)
cookie: {
  sameSite: 'strict',
  secure: true
}
```

---

## 📚 Additional Resources

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Express Session Docs](https://github.com/expressjs/session)
- [Double-Submit Cookie Technique](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)

---

**Status:** ✅ Production-Ready
**Version:** 1.0.0
**Last Updated:** 2025-10-01
**Author:** Pluqla Security Team
