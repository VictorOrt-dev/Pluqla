# 🚀 Quick Start: Session & CSRF Protection

**Time to implement:** 15 minutes

---

## 📦 1. Install Dependencies (2 min)

```bash
cd server
npm install express-session connect-redis
```

---

## 🔧 2. Update .env (1 min)

Add to `server/.env`:

```env
# Session Configuration
SESSION_SECRET="your-super-secure-session-secret-at-least-32-characters"
SESSION_MAX_AGE=3600000
SESSION_IDLE_TIMEOUT=1800000

# Optional: Redis (recommended for production)
# REDIS_URL="redis://localhost:6379"
```

**Generate secure secret:**
```bash
openssl rand -hex 32
```

---

## 🛠️ 3. Integrate in app.js (5 min)

**File:** `src/app.js`

Add these imports at the top:

```javascript
const cookieParser = require('cookie-parser');

// Session and CSRF
const {
  sessionMiddleware,
  trackSessionActivity,
  requireSession
} = require('./middleware/sessionMiddleware');

const {
  csrfTokenMiddleware,
  conditionalCsrfProtection,
  csrfErrorHandler,
  getCsrfToken
} = require('./middleware/csrfProtection');
```

Apply middlewares **BEFORE** routes:

```javascript
// Cookie parser (MUST be first)
app.use(cookieParser());

// Session management
app.use(sessionMiddleware);

// CSRF token generation
app.use(csrfTokenMiddleware);

// Session activity tracking
app.use(trackSessionActivity);

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your routes here
app.use('/api', routes);
```

Apply CSRF protection **AFTER** routes:

```javascript
// CSRF protection (after routes)
app.use(conditionalCsrfProtection);

// CSRF error handler (after routes)
app.use(csrfErrorHandler);

// Your other error handlers here
```

---

## 🔐 4. Update Auth Routes (5 min)

**File:** `src/routes/auth.js`

Import helpers:

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
```

**Login:**

```javascript
router.post('/login', csrfProtection, async (req, res) => {
  try {
    // ... validate credentials ...

    // SECURITY: Rotate session after login
    await rotateSession(req, {
      userId: user.id,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium
    });

    // SECURITY: Refresh CSRF token
    refreshCsrfToken(req, res);

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Logout:**

```javascript
router.post('/logout', requireSession, csrfProtection, async (req, res) => {
  try {
    await destroySession(req, res);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Protected Routes:**

```javascript
// Requires session only (GET is safe, no CSRF needed)
router.get('/me', requireSession, async (req, res) => {
  // Access user data from session
  const userId = req.session.userId;
  // ... fetch user data ...
});

// Requires session AND CSRF (POST/PUT/DELETE)
router.post('/data', requireSession, csrfProtection, async (req, res) => {
  // Protected state-changing operation
});
```

---

## ⚛️ 5. Update Frontend (2 min)

**File:** `client/src/services/api.js`

```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3004',
  withCredentials: true  // CRITICAL: Send cookies with requests
});

// Get CSRF token from cookie
function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? match[1] : null;
}

// Add CSRF token to state-changing requests
apiClient.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Handle session/CSRF errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired - redirect to login
      window.location.href = '/login';
    }
    if (error.response?.status === 403 && error.response?.data?.code?.startsWith('CSRF_')) {
      // CSRF error - refresh page
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## ✅ 6. Test (optional, 1 min)

```bash
# Run tests
npm test -- tests/sessionCsrf.test.js

# Start server
npm run dev
```

**Manual Test:**

1. Open browser to `http://localhost:3000`
2. Open DevTools → Network tab
3. Log in
4. Check cookies: `pluqla.sid` and `XSRF-TOKEN` should be set
5. Make a POST request - `X-CSRF-Token` header should be present

---

## 🎉 Done!

You now have:
- ✅ Secure session management (1-hour TTL)
- ✅ CSRF protection (Double-Submit Cookie)
- ✅ Session rotation on login
- ✅ XSS protection (HttpOnly cookies)
- ✅ Session idle timeout (30 min)

---

## 🔍 Quick Reference

### Backend

**Protect a route:**
```javascript
// Session only
router.get('/profile', requireSession, handler);

// Session + CSRF
router.post('/data', requireSession, csrfProtection, handler);

// Exempt from CSRF
router.post('/webhook', csrfExempt, handler);
```

**Access session data:**
```javascript
req.session.userId
req.session.email
req.session.role
```

### Frontend

**Make API call:**
```javascript
import apiClient from './services/api';

// GET (no CSRF needed)
const response = await apiClient.get('/api/profile');

// POST (CSRF automatically added by interceptor)
const response = await apiClient.post('/api/data', { name: 'Test' });
```

---

## 🆘 Troubleshooting

**"CSRF token missing"**
→ Ensure `withCredentials: true` in axios config

**"Session expired"**
→ Increase `SESSION_MAX_AGE` in .env

**"CORS error"**
→ Ensure `credentials: true` in CORS config

**Redis errors**
→ Remove `REDIS_URL` from .env (will use in-memory storage)

---

## 📚 More Info

See full documentation: [`docs/SESSION_CSRF_IMPLEMENTATION.md`](./SESSION_CSRF_IMPLEMENTATION.md)

Frontend examples: [`examples/frontendIntegration.md`](../examples/frontendIntegration.md)

---

**Happy coding! 🚀**
