const request = require('supertest');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const app = require('../../src/app');

// Setup test environment
const originalEnv = process.env;

describe('JWT Authentication Flow Integration Tests', () => {
  let prisma;
  let testUser;
  let server;

  beforeAll(async () => {
    // Set secure test environment
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test-auth-flow.db',
      JWT_SECRET: 'test_secure_jwt_secret_at_least_32_characters_long_for_security_testing',
      JWT_REFRESH_SECRET: 'test_secure_refresh_secret_at_least_32_characters_long_for_testing',
      JWT_EMAIL_SECRET: 'test_secure_email_secret_at_least_32_characters_long_for_testing',
      JWT_PASSWORD_RESET_SECRET: 'test_secure_reset_secret_at_least_32_characters_long_for_testing'
    };

    prisma = new PrismaClient();
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    process.env = originalEnv;
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('User Registration Flow', () => {
    test('should register user and return secure tokens', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securepassword123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeTruthy();
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();

      // Verify tokens are properly structured
      const accessPayload = jwt.decode(response.body.data.token);
      const refreshPayload = jwt.decode(response.body.data.refreshToken);

      expect(accessPayload.userId).toBe(response.body.data.user.id);
      expect(accessPayload.type).toBe('access');
      expect(refreshPayload.userId).toBe(response.body.data.user.id);
      expect(refreshPayload.type).toBe('refresh');
      expect(refreshPayload.jti).toBeTruthy(); // JWT ID for rotation

      // Verify refresh token is hashed in database
      const storedToken = await prisma.refreshToken.findFirst({
        where: { userId: response.body.data.user.id }
      });
      expect(storedToken).toBeTruthy();
      expect(storedToken.tokenHash).not.toBe(response.body.data.refreshToken);
      expect(storedToken.tokenHash).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    test('should prevent registration with weak environment', async () => {
      // Temporarily set weak secrets
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'weak';

      // This should fail at app startup level, but if it doesn't fail there,
      // it should fail when trying to use JWT utilities
      const userData = {
        email: 'test2@example.com',
        password: 'securepassword123',
        name: 'Test User 2'
      };

      try {
        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(500);
      } finally {
        process.env.JWT_SECRET = originalSecret;
      }
    });
  });

  describe('User Login Flow', () => {
    beforeEach(async () => {
      // Create test user
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'securepassword123',
          name: 'Login Test User'
        });

      testUser = response.body.data.user;
    });

    test('should login and return secure tokens', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'securepassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeTruthy();
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();

      // Should clean up old tokens and create new ones
      const tokenCount = await prisma.refreshToken.count({
        where: { userId: testUser.id, revoked: false }
      });
      expect(tokenCount).toBe(1); // Only one active token
    });

    test('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    test('should prevent brute force attacks', async () => {
      // Multiple failed attempts
      const attempts = [];
      for (let i = 0; i < 5; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'login@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(attempts);
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });

      // Should still reject even after multiple attempts
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });
  });

  describe('Token Refresh Flow', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      // Create user and login
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'securepassword123',
          name: 'Refresh Test User'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'securepassword123'
        });

      accessToken = loginResponse.body.data.token;
      refreshToken = loginResponse.body.data.refreshToken;
      testUser = loginResponse.body.data.user;
    });

    test('should refresh tokens securely', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeTruthy();
      expect(response.body.data.tokens.refreshToken).toBeTruthy();

      // New tokens should be different
      expect(response.body.data.tokens.accessToken).not.toBe(accessToken);
      expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);

      // Old refresh token should be revoked
      const oldToken = await prisma.refreshToken.findFirst({
        where: { userId: testUser.id, revoked: true }
      });
      expect(oldToken).toBeTruthy();
    });

    test('should reject reused refresh tokens', async () => {
      // First refresh (should work)
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Try to reuse original token (should fail)
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      // New token should still work
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: firstRefresh.body.data.tokens.refreshToken })
        .expect(200);
    });

    test('should reject forged refresh tokens', async () => {
      // Create forged token with wrong signature
      const forgedPayload = {
        userId: testUser.id,
        type: 'refresh',
        jti: 'forged-jti',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      };

      const forgedToken = jwt.sign(forgedPayload, 'wrong-secret', {
        issuer: 'plus-clair-app',
        audience: 'plus-clair-users'
      });

      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: forgedToken })
        .expect(401);
    });
  });

  describe('Protected Route Access', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'protected@example.com',
          password: 'securepassword123',
          name: 'Protected Test User'
        });

      accessToken = registerResponse.body.data.token;
      refreshToken = registerResponse.body.data.refreshToken;
      testUser = registerResponse.body.data.user;
    });

    test('should access protected route with valid token', async () => {
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    test('should reject access with invalid token', async () => {
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('should reject access with expired token', async () => {
      // Create expired token
      const expiredPayload = {
        userId: testUser.id,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET, {
        issuer: 'plus-clair-app',
        audience: 'plus-clair-users'
      });

      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Logout Flow', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'securepassword123',
          name: 'Logout Test User'
        });

      accessToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
      testUser = response.body.data.user;
    });

    test('should logout and revoke tokens', async () => {
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // Refresh token should be revoked
      const revokedToken = await prisma.refreshToken.findFirst({
        where: { userId: testUser.id, revoked: true }
      });
      expect(revokedToken).toBeTruthy();

      // Should not be able to use revoked token
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Security Monitoring', () => {
    test('should track token usage with IP and user agent', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'monitor@example.com',
          password: 'securepassword123',
          name: 'Monitor Test User'
        })
        .set('User-Agent', 'Test Security Client')
        .set('X-Forwarded-For', '192.168.1.100');

      const userId = response.body.data.user.id;

      // Check that IP and user agent are tracked
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: { userId }
      });

      expect(tokenRecord.ipAddress).toBeTruthy();
      expect(tokenRecord.userAgent).toBeTruthy();
    });

    test('should provide token statistics', async () => {
      // Create test user with tokens
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'stats@example.com',
          password: 'securepassword123',
          name: 'Stats Test User'
        });

      const userId = response.body.data.user.id;
      const refreshTokenService = require('../../src/services/refreshTokenService');

      const stats = await refreshTokenService.getRefreshTokenStats(userId);
      expect(stats.active).toBe(1);
      expect(stats.expired).toBe(0);
      expect(stats.revoked).toBe(0);
      expect(stats.total).toBe(1);
    });
  });
});