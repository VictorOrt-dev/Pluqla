/**
 * Global CSRF Protection Tests
 *
 * Tests that CSRF protection is enforced globally on all mutating endpoints
 * and that exemptions work correctly.
 *
 * Run: npm test -- tests/csrfGlobal.test.js
 */

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const {
  globalCsrfEnforcement,
  csrfTokenMiddleware,
  csrfTokenRoute,
  csrfExempt,
  createCsrfExempt,
  isExemptPath
} = require('../src/middleware/globalCsrfEnforcement');

describe('Global CSRF Protection', () => {
  let app;

  beforeEach(() => {
    // Create minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false } // Test env
    }));

    // Apply CSRF token generation
    app.use(csrfTokenMiddleware);

    // Add CSRF token endpoint
    app.get('/csrf-token', csrfTokenRoute);

    // Apply global CSRF enforcement
    app.use(globalCsrfEnforcement);

    // Test routes
    app.get('/test-get', (req, res) => res.json({ method: 'GET' }));
    app.post('/test-post', (req, res) => res.json({ method: 'POST' }));
    app.put('/test-put', (req, res) => res.json({ method: 'PUT' }));
    app.delete('/test-delete', (req, res) => res.json({ method: 'DELETE' }));
    app.patch('/test-patch', (req, res) => res.json({ method: 'PATCH' }));

    // Exempt route
    app.post('/webhook/test', csrfExempt, (req, res) => res.json({ exempt: true }));

    // Custom exempt
    app.post('/custom-exempt', createCsrfExempt('test_reason'), (req, res) =>
      res.json({ customExempt: true })
    );
  });

  describe('CSRF Token Endpoint', () => {
    test('should provide CSRF token via /csrf-token endpoint', async () => {
      const response = await request(app).get('/csrf-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        csrfToken: expect.any(String)
      });

      // Token should be 64 characters (32 bytes hex)
      expect(response.body.csrfToken.length).toBe(64);
    });

    test('should set CSRF token in cookie', async () => {
      const response = await request(app).get('/csrf-token');

      expect(response.headers['set-cookie']).toBeDefined();
      const csrfCookie = response.headers['set-cookie'].find(c =>
        c.startsWith('XSRF-TOKEN=')
      );
      expect(csrfCookie).toBeDefined();
    });
  });

  describe('Safe Methods (GET, HEAD, OPTIONS)', () => {
    test('should allow GET without CSRF token', async () => {
      const response = await request(app).get('/test-get');

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('GET');
    });

    test('should allow HEAD without CSRF token', async () => {
      const response = await request(app).head('/test-get');

      expect(response.status).toBe(200);
    });

    test('should allow OPTIONS without CSRF token', async () => {
      const response = await request(app).options('/test-post');

      // OPTIONS should pass through (204 or 404 depending on route)
      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Mutating Methods (POST, PUT, DELETE, PATCH)', () => {
    test('should reject POST without CSRF token', async () => {
      const response = await request(app)
        .post('/test-post')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringMatching(/CSRF/i),
        code: expect.stringMatching(/CSRF/i)
      });
    });

    test('should reject PUT without CSRF token', async () => {
      const response = await request(app)
        .put('/test-put')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.code).toMatch(/CSRF/i);
    });

    test('should reject DELETE without CSRF token', async () => {
      const response = await request(app).delete('/test-delete');

      expect(response.status).toBe(403);
      expect(response.body.code).toMatch(/CSRF/i);
    });

    test('should reject PATCH without CSRF token', async () => {
      const response = await request(app)
        .patch('/test-patch')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.code).toMatch(/CSRF/i);
    });
  });

  describe('CSRF Token Validation', () => {
    test('should accept POST with valid CSRF token in header', async () => {
      // Get token first
      const tokenResponse = await request(app).get('/csrf-token');
      const token = tokenResponse.body.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      // Make POST with token
      const response = await request(app)
        .post('/test-post')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', token)
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('POST');
    });

    test('should accept PUT with valid CSRF token', async () => {
      const tokenResponse = await request(app).get('/csrf-token');
      const token = tokenResponse.body.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      const response = await request(app)
        .put('/test-put')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', token)
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('PUT');
    });

    test('should accept DELETE with valid CSRF token', async () => {
      const tokenResponse = await request(app).get('/csrf-token');
      const token = tokenResponse.body.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      const response = await request(app)
        .delete('/test-delete')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', token);

      expect(response.status).toBe(200);
      expect(response.body.method).toBe('DELETE');
    });

    test('should reject POST with invalid CSRF token', async () => {
      const tokenResponse = await request(app).get('/csrf-token');
      const cookies = tokenResponse.headers['set-cookie'];

      const response = await request(app)
        .post('/test-post')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', 'invalid-token-1234567890')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.code).toMatch(/CSRF/i);
    });

    test('should reject POST with token in header but no cookie', async () => {
      const tokenResponse = await request(app).get('/csrf-token');
      const token = tokenResponse.body.csrfToken;

      const response = await request(app)
        .post('/test-post')
        .set('X-CSRF-Token', token) // Token but no cookie
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.code).toMatch(/CSRF/i);
    });
  });

  describe('Automatic Exemptions', () => {
    test('should exempt /health endpoint', async () => {
      app.get('/health', (req, res) => res.json({ status: 'ok' }));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    test('should exempt /metrics endpoint', async () => {
      app.get('/metrics', (req, res) => res.send('metrics'));

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
    });

    test('should exempt webhook paths', async () => {
      const response = await request(app)
        .post('/webhook/test')
        .send({ event: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.exempt).toBe(true);
    });
  });

  describe('Explicit Exemptions', () => {
    test('should respect csrfExempt middleware', async () => {
      const response = await request(app)
        .post('/webhook/test')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.exempt).toBe(true);
    });

    test('should respect createCsrfExempt middleware', async () => {
      const response = await request(app)
        .post('/custom-exempt')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.customExempt).toBe(true);
    });
  });

  describe('isExemptPath Utility', () => {
    test('should identify exempt paths correctly', () => {
      expect(isExemptPath('/health')).toBe(true);
      expect(isExemptPath('/ready')).toBe(true);
      expect(isExemptPath('/metrics')).toBe(true);
      expect(isExemptPath('/webhook/stripe')).toBe(true);
      expect(isExemptPath('/api/webhooks/github')).toBe(true);
    });

    test('should not exempt non-exempt paths', () => {
      expect(isExemptPath('/api/users')).toBe(false);
      expect(isExemptPath('/api/transactions')).toBe(false);
      expect(isExemptPath('/test-post')).toBe(false);
    });
  });

  describe('Error Responses', () => {
    test('should return consistent error format for CSRF failures', async () => {
      const response = await request(app)
        .post('/test-post')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        code: expect.stringMatching(/CSRF/i)
      });
    });

    test('should include helpful error message', async () => {
      const response = await request(app)
        .post('/test-post')
        .send({ data: 'test' });

      expect(response.body.error).toMatch(/token/i);
      expect(response.body.message || response.body.error).toMatch(/token|CSRF|security/i);
    });
  });
});
