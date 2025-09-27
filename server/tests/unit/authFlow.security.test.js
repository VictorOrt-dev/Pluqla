/**
 * SECURITY TEST: Complete Authentication Flow
 *
 * Tests the entire authentication pipeline including:
 * - Registration security
 * - Login rate limiting
 * - Token validation
 * - Refresh token rotation
 * - Password reset security
 */

const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Test database setup
const testUser = {
  email: 'security.test@pluqla.com',
  password: 'SecureTestPassword123!',
  name: 'Security Test User'
};

describe('Authentication Security Flow', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.refreshToken.deleteMany({});
    await prisma.passwordReset.deleteMany({});
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  describe('Registration Security', () => {
    test('should hash password with bcrypt before storing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Verify user was created
      const user = await prisma.user.findUnique({
        where: { email: testUser.email }
      });

      expect(user).toBeTruthy();
      expect(user.password).not.toBe(testUser.password); // Should be hashed
      expect(user.password.startsWith('$2b$')).toBe(true); // bcrypt hash format
      
      // Verify password can be verified
      const isValid = await bcrypt.compare(testUser.password, user.password);
      expect(isValid).toBe(true);
    });

    test('should prevent duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('email_already_used');
    });

    test('should generate secure JWT tokens on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify JWT structure
      const decoded = jwt.decode(response.body.data.token, { complete: true });
      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.payload.type).toBe('access');
      expect(decoded.payload.userId).toBeDefined();
    });
  });

  describe('Login Security', () => {
    beforeEach(async () => {
      // Create user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    test('should authenticate with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.password).toBeUndefined(); // Should not return password
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('invalid_credentials');
    });

    test('should apply rate limiting on repeated failed attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          });
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(429);

      expect(response.body.error).toContain('Trop de tentatives');
    });
  });

  describe('Token Security', () => {
    let authToken;
    let refreshToken;
    let userId;

    beforeEach(async () => {
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      authToken = loginResponse.body.data.token;
      refreshToken = loginResponse.body.data.refreshToken;
      userId = loginResponse.body.data.user.id;
    });

    test('should validate JWT token correctly', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.id).toBe(userId);
    });

    test('should reject expired/invalid tokens', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.error).toBe('Token invalide');
    });

    test('should rotate refresh tokens securely', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken); // Should be different

      // Old refresh token should be invalid
      const oldTokenResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(oldTokenResponse.body.error).toBe('invalid_refresh_token');
    });
  });

  describe('Password Reset Security', () => {
    beforeEach(async () => {
      // Create user for reset tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    test('should initiate password reset without revealing user existence', async () => {
      // Valid email
      const response1 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Invalid email
      const response2 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Both should return same message to prevent enumeration
      expect(response1.body.message).toBe(response2.body.message);
      expect(response1.body.message).toContain('Si cet email existe');
    });

    test('should create secure password reset token', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Check reset token was created
      const resetRecord = await prisma.passwordReset.findFirst({
        where: {
          user: { email: testUser.email },
          used: false
        }
      });

      expect(resetRecord).toBeTruthy();
      expect(resetRecord.tokenHash).toBeDefined();
      expect(resetRecord.tokenHash.startsWith('$2b$')).toBe(true); // bcrypt hash
      expect(resetRecord.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
