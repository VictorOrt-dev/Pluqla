# Global CSRF Protection Setup Guide

## Overview

The global CSRF enforcement middleware automatically protects all state-changing HTTP methods (POST, PUT, DELETE, PATCH) from Cross-Site Request Forgery attacks. This eliminates the need to manually add CSRF protection to each route.

## Quick Start

### 1. Server Setup

Add to your main server file (`src/server.js` or `src/app.js`):

```javascript
const {
  globalCsrfEnforcement,
  csrfTokenMiddleware,
  csrfTokenRoute
} = require('./middleware/globalCsrfEnforcement');

// ... other middleware ...

// Step 1: Generate CSRF tokens for all requests
app.use(csrfTokenMiddleware);

// Step 2: Add CSRF token endpoint for frontend
app.get('/csrf-token', csrfTokenRoute);

// Step 3: Apply global CSRF protection to all mutating methods
app.use(globalCsrfEnforcement);

// ... your routes ...
```

### 2. Frontend Integration

#### Fetch CSRF Token on App Init

```javascript
// At app initialization or login
async function initCsrf() {
  const response = await fetch('/csrf-token');
  const data = await response.json();

  // Store token for subsequent requests
  window.csrfToken = data.csrfToken;
}
```

#### Include Token in Requests

**Option A: HTTP Header (Recommended)**

```javascript
fetch('/api/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': window.csrfToken
  },
  body: JSON.stringify({ amount: 100 })
});
```

**Option B: Request Body**

```javascript
fetch('/api/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    _csrf: window.csrfToken
  })
});
```

**Option C: Query Parameter (Fallback)**

```javascript
fetch(`/api/transactions?_csrf=${window.csrfToken}`, {
  method: 'POST',
  // ...
});
```

## Automatic Exemptions

The following paths are **automatically exempted** from CSRF protection:

- `/health` - Liveness probe
- `/ready` - Readiness probe
- `/metrics` - Prometheus metrics
- `/webhook/*` - Generic webhook endpoints
- `/api/webhooks/*` - API webhook endpoints

## Manual Exemptions

### Exempt Specific Route

Use `csrfExempt` middleware for routes that should skip CSRF checks:

```javascript
const { csrfExempt } = require('./middleware/globalCsrfEnforcement');

// Webhook with signature verification
router.post('/webhook/stripe', csrfExempt, stripeWebhookController);
```

### Exempt with Custom Reason

For better logging and auditing:

```javascript
const { createCsrfExempt } = require('./middleware/globalCsrfEnforcement');

router.post(
  '/webhook/github',
  createCsrfExempt('github_webhook_signature_verified'),
  githubWebhookController
);
```

## Safe Methods

The following HTTP methods are **always exempt** (no CSRF check):

- `GET` - Read operations
- `HEAD` - Metadata requests
- `OPTIONS` - CORS preflight

## Error Responses

### Missing CSRF Token

**Request:**
```http
POST /api/transactions HTTP/1.1
Content-Type: application/json

{"amount": 100}
```

**Response:**
```json
HTTP/1.1 403 Forbidden

{
  "success": false,
  "error": "CSRF token missing from request",
  "code": "CSRF_TOKEN_MISSING",
  "message": "Security token required. Please include X-CSRF-Token header."
}
```

### Invalid CSRF Token

**Request:**
```http
POST /api/transactions HTTP/1.1
X-CSRF-Token: invalid-token-123
Cookie: XSRF-TOKEN=valid-token-456

{"amount": 100}
```

**Response:**
```json
HTTP/1.1 403 Forbidden

{
  "success": false,
  "error": "CSRF token validation failed",
  "code": "CSRF_TOKEN_INVALID",
  "message": "Security token mismatch. Please refresh and try again."
}
```

## Best Practices

### 1. Refresh Token After Login/Logout

```javascript
// After login
await login(username, password);
await initCsrf(); // Get fresh CSRF token

// After logout
await logout();
window.csrfToken = null; // Clear old token
```

### 2. Handle Token Expiry

```javascript
async function fetchWithCsrf(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': window.csrfToken
    }
  });

  // Token expired or invalid
  if (response.status === 403) {
    const data = await response.json();
    if (data.code && data.code.includes('CSRF')) {
      // Refresh token and retry
      await initCsrf();
      return fetchWithCsrf(url, options);
    }
  }

  return response;
}
```

### 3. Secure Webhook Endpoints

Even exempt endpoints should verify request authenticity:

```javascript
router.post('/webhook/stripe', csrfExempt, async (req, res) => {
  // Verify Stripe signature
  const signature = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  // Process event...
});
```

## Testing

### Test CSRF Protection

```javascript
const request = require('supertest');
const app = require('./app');

test('should reject POST without CSRF token', async () => {
  const response = await request(app)
    .post('/api/transactions')
    .send({ amount: 100 });

  expect(response.status).toBe(403);
  expect(response.body.code).toMatch(/CSRF/i);
});

test('should accept POST with valid CSRF token', async () => {
  // Get token
  const tokenRes = await request(app).get('/csrf-token');
  const token = tokenRes.body.csrfToken;
  const cookies = tokenRes.headers['set-cookie'];

  // Make request
  const response = await request(app)
    .post('/api/transactions')
    .set('Cookie', cookies)
    .set('X-CSRF-Token', token)
    .send({ amount: 100 });

  expect(response.status).toBe(200);
});
```

## Troubleshooting

### "CSRF token missing" on valid requests

**Cause:** Token not included in request.

**Solution:**
1. Verify `window.csrfToken` is set
2. Check request headers/body includes token
3. Ensure token endpoint returns successfully

### "CSRF token mismatch" errors

**Cause:** Cookie and header tokens don't match.

**Solution:**
1. Verify cookie is sent with request
2. Check token hasn't been modified
3. Ensure frontend reads from correct cookie (`XSRF-TOKEN`)

### Webhook endpoints returning 403

**Cause:** Webhook route not exempted.

**Solution:**
```javascript
// Add exemption
router.post('/webhook/provider', csrfExempt, handler);
```

## Migration from Manual CSRF

If you previously added CSRF middleware to individual routes:

### Before (Manual)
```javascript
const { csrfProtection } = require('./middleware/csrfProtection');

router.post('/transactions', csrfProtection, controller.create);
router.put('/transactions/:id', csrfProtection, controller.update);
router.delete('/transactions/:id', csrfProtection, controller.delete);
// ... repeat for every mutating route
```

### After (Global)
```javascript
// In server.js - apply once globally
app.use(globalCsrfEnforcement);

// In routes - no CSRF middleware needed
router.post('/transactions', controller.create);
router.put('/transactions/:id', controller.update);
router.delete('/transactions/:id', controller.delete);
// ✅ All protected automatically
```

## Security Considerations

1. **HTTPS Required:** CSRF protection requires HTTPS in production for `Secure` cookies
2. **SameSite Cookies:** Set to `Strict` for additional protection
3. **Token Rotation:** Tokens refresh on session changes (login/logout)
4. **Double-Submit Cookie:** Uses double-submit pattern (stateless)
5. **Timing-Safe Comparison:** Prevents timing attacks on token validation

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [Express CSRF Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
