/**
 * Session and CSRF Protection Integration Tests
 *
 * Tests verify:
 * ✅ Session creation and rotation
 * ✅ Session expiration and TTL
 * ✅ Session destruction on logout
 * ✅ CSRF token generation
 * ✅ CSRF protection for state-changing requests
 * ✅ CSRF exemption for safe methods
 * ✅ 403 responses for invalid/missing CSRF tokens
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const {
  sessionMiddleware,
  rotateSession,
  destroySession,
  trackSessionActivity,
  requireSession
} = require('../src/middleware/sessionMiddleware');
const {
  csrfTokenMiddleware,
  csrfProtection,
  csrfExempt,
  getCsrfToken,
  refreshCsrfToken
} = require('../src/middleware/csrfProtection');

// Test app setup
function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use(csrfTokenMiddleware);
  app.use(trackSessionActivity);

  // Test routes
  app.get('/api/csrf-token', getCsrfToken);

  app.post('/api/login', async (req, res) => {
    try {
      await rotateSession(req, {
        userId: 'test-user-123',
        email: 'test@pluqla.com',
        role: 'user'
      });

      // Refresh CSRF token after login
      refreshCsrfToken(req, res);

      res.json({
        success: true,
        message: 'Login successful',
        user: req.session
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/logout', requireSession, async (req, res) => {
    try {
      await destroySession(req, res);
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/profile', requireSession, (req, res) => {
    res.json({
      success: true,
      user: {
        userId: req.session.userId,
        email: req.session.email,
        role: req.session.role
      }
    });
  });

  // Protected route with CSRF
  app.post('/api/data', csrfProtection, requireSession, (req, res) => {
    res.json({
      success: true,
      message: 'Data created',
      data: req.body
    });
  });

  app.put('/api/data/:id', csrfProtection, requireSession, (req, res) => {
    res.json({
      success: true,
      message: `Data ${req.params.id} updated`,
      data: req.body
    });
  });

  app.delete('/api/data/:id', csrfProtection, requireSession, (req, res) => {
    res.json({
      success: true,
      message: `Data ${req.params.id} deleted`
    });
  });

  // Exempt route
  app.post('/api/webhook', csrfExempt, (req, res) => {
    res.json({
      success: true,
      message: 'Webhook received'
    });
  });

  // Safe method (no CSRF required)
  app.get('/api/public', (req, res) => {
    res.json({
      success: true,
      message: 'Public endpoint'
    });
  });

  return app;
}

describe('Session Management', () => {
  let app;
  let agent;

  beforeEach(() => {
    app = createTestApp();
    agent = request.agent(app); // Maintains cookies across requests
  });

  describe('Session Creation and Rotation', () => {
    it('should create session on login', async () => {
      const response = await agent
        .post('/api/login')
        .send({ email: 'test@pluqla.com', password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.userId).toBe('test-user-123');
      expect(response.body.user.email).toBe('test@pluqla.com');

      // Check session cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.startsWith('pluqla.sid='))).toBe(true);
    });

    it('should rotate session ID on login', async () => {
      // First request to get initial session
      const initial = await agent.get('/api/csrf-token');
      const initialCookie = initial.headers['set-cookie']
        ?.find(c => c.startsWith('pluqla.sid='));

      // Login (should rotate session)
      const login = await agent.post('/api/login').send({});
      const loginCookie = login.headers['set-cookie']
        ?.find(c => c.startsWith('pluqla.sid='));

      // Session ID should be different
      expect(initialCookie).not.toBe(loginCookie);
    });

    it('should persist session data across requests', async () => {
      // Login
      await agent.post('/api/login').send({});

      // Access protected route
      const response = await agent.get('/api/profile').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.userId).toBe('test-user-123');
    });
  });

  describe('Session Destruction', () => {
    it('should destroy session on logout', async () => {
      // Login
      await agent.post('/api/login').send({}).expect(200);

      // Logout
      const logout = await agent.post('/api/logout').expect(200);
      expect(logout.body.success).toBe(true);

      // Session cookie should be cleared
      const cookies = logout.headers['set-cookie'];
      const sessionCookie = cookies?.find(c => c.startsWith('pluqla.sid='));
      expect(sessionCookie).toMatch(/Expires|Max-Age=0/);

      // Accessing protected route should fail
      await agent.get('/api/profile').expect(401);
    });
  });

  describe('Session Protection', () => {
    it('should reject requests without session on protected routes', async () => {
      const response = await agent.get('/api/profile').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NO_SESSION');
    });

    it('should allow requests with valid session', async () => {
      await agent.post('/api/login').send({});
      await agent.get('/api/profile').expect(200);
    });
  });
});

describe('CSRF Protection', () => {
  let app;
  let agent;
  let csrfToken;

  beforeEach(async () => {
    app = createTestApp();
    agent = request.agent(app);

    // Get CSRF token
    const tokenResponse = await agent.get('/api/csrf-token');
    csrfToken = tokenResponse.body.csrfToken;

    // Login to get session
    await agent.post('/api/login').send({});
  });

  describe('CSRF Token Generation', () => {
    it('should generate CSRF token on request', async () => {
      const response = await agent.get('/api/csrf-token').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.csrfToken).toBeDefined();
      expect(response.body.csrfToken).toHaveLength(64);
    });

    it('should set CSRF token in cookie', async () => {
      const response = await agent.get('/api/csrf-token');

      const cookies = response.headers['set-cookie'];
      const csrfCookie = cookies?.find(c => c.startsWith('XSRF-TOKEN='));

      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).not.toContain('HttpOnly'); // Cookie must be readable by JS
    });

    it('should set CSRF token in response header', async () => {
      const response = await agent.get('/api/csrf-token');

      expect(response.headers['x-csrf-token']).toBeDefined();
      expect(response.headers['x-csrf-token']).toHaveLength(64);
    });
  });

  describe('CSRF Protection for State-Changing Requests', () => {
    it('should reject POST without CSRF token', async () => {
      const response = await agent
        .post('/api/data')
        .send({ name: 'Test' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should accept POST with valid CSRF token', async () => {
      const response = await agent
        .post('/api/data')
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data created');
    });

    it('should reject POST with invalid CSRF token', async () => {
      const response = await agent
        .post('/api/data')
        .set('X-CSRF-Token', 'invalid-token-1234567890')
        .send({ name: 'Test' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should reject PUT without CSRF token', async () => {
      const response = await agent
        .put('/api/data/123')
        .send({ name: 'Updated' })
        .expect(403);

      expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should accept PUT with valid CSRF token', async () => {
      const response = await agent
        .put('/api/data/123')
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject DELETE without CSRF token', async () => {
      const response = await agent
        .delete('/api/data/123')
        .expect(403);

      expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should accept DELETE with valid CSRF token', async () => {
      const response = await agent
        .delete('/api/data/123')
        .set('X-CSRF-Token', csrfToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('CSRF Exemption for Safe Methods', () => {
    it('should allow GET without CSRF token', async () => {
      const response = await agent.get('/api/public').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow OPTIONS without CSRF token', async () => {
      await agent.options('/api/data').expect(200);
    });

    it('should allow HEAD without CSRF token', async () => {
      await agent.head('/api/public').expect(200);
    });
  });

  describe('CSRF Exemption for Specific Routes', () => {
    it('should allow exempt routes without CSRF token', async () => {
      const response = await agent
        .post('/api/webhook')
        .send({ event: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook received');
    });
  });

  describe('Alternative CSRF Token Headers', () => {
    it('should accept X-XSRF-Token header', async () => {
      const response = await agent
        .post('/api/data')
        .set('X-XSRF-Token', csrfToken)
        .send({ name: 'Test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('Session and CSRF Integration', () => {
  let app;
  let agent;

  beforeEach(() => {
    app = createTestApp();
    agent = request.agent(app);
  });

  it('should refresh CSRF token after login', async () => {
    // Get initial CSRF token
    const initial = await agent.get('/api/csrf-token');
    const initialToken = initial.body.csrfToken;

    // Login (should rotate CSRF)
    const login = await agent.post('/api/login').send({});
    const loginToken = login.headers['x-csrf-token'];

    // Tokens should be different
    expect(initialToken).not.toBe(loginToken);
  });

  it('should require both session and CSRF for protected routes', async () => {
    // Get CSRF token but don't login
    const tokenResponse = await agent.get('/api/csrf-token');
    const token = tokenResponse.body.csrfToken;

    // Should fail due to missing session
    const response = await agent
      .post('/api/data')
      .set('X-CSRF-Token', token)
      .send({ name: 'Test' })
      .expect(401);

    expect(response.body.code).toBe('NO_SESSION');
  });

  it('should require both session and CSRF - missing CSRF fails', async () => {
    // Login (creates session)
    await agent.post('/api/login').send({});

    // Should fail due to missing CSRF token
    const response = await agent
      .post('/api/data')
      .send({ name: 'Test' })
      .expect(403);

    expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
  });

  it('should succeed with both session and CSRF', async () => {
    // Login
    await agent.post('/api/login').send({});

    // Get CSRF token
    const tokenResponse = await agent.get('/api/csrf-token');
    const token = tokenResponse.body.csrfToken;

    // Should succeed with both
    const response = await agent
      .post('/api/data')
      .set('X-CSRF-Token', token)
      .send({ name: 'Test' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('Session TTL and Expiration', () => {
  let app;
  let agent;

  beforeEach(() => {
    // Create app with short TTL for testing
    process.env.SESSION_MAX_AGE = '100'; // 100ms for testing
    app = createTestApp();
    agent = request.agent(app);
  });

  afterEach(() => {
    delete process.env.SESSION_MAX_AGE;
  });

  it('should expire session after TTL', async (done) => {
    // Login
    await agent.post('/api/login').send({});

    // Wait for session to expire
    setTimeout(async () => {
      // Session should be expired
      const response = await agent.get('/api/profile');

      expect(response.status).toBe(401);
      expect(response.body.code).toMatch(/SESSION_EXPIRED|NO_SESSION/);

      done();
    }, 150); // Wait longer than TTL
  }, 1000);
});
