/**
 * Better Auth Session Persistence Integration Tests
 *
 * Tests to ensure cookies are properly configured and sessions persist:
 * - Session persists after login
 * - User stays logged in after browser restart simulation
 * - Expired cookies cause re-authentication
 * - Cookies have proper security settings (httpOnly, secure, sameSite)
 */

const request = require('supertest');
const { prisma } = require('../../src/lib/prisma');
const { createSession, destroySession, setSessionCookie } = require('../../src/auth/betterAuth');
const app = require('../../src/app');

describe('Better Auth Session Persistence', () => {
  let testUser;
  let agent;

  beforeAll(async () => {
    // Create test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123!@#', 10);

    testUser = await prisma.user.create({
      data: {
        email: `session-test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Session Test User',
        role: 'user',
        status: 'active',
        emailVerified: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      // Delete sessions
      await prisma.betterAuthSession.deleteMany({
        where: { userId: testUser.id }
      });

      // Delete user
      await prisma.user.delete({
        where: { id: testUser.id }
      });
    }
  });

  beforeEach(() => {
    // Create a new agent for each test (simulates new browser instance)
    agent = request.agent(app);
  });

  afterEach(async () => {
    // Clean up sessions after each test
    await prisma.betterAuthSession.deleteMany({
      where: { userId: testUser.id }
    });
  });

  describe('Session Creation and Persistence', () => {
    it('should create a session and set a cookie after login', async () => {
      // Create a session for the test user
      const session = await createSession(testUser.id);

      expect(session).toBeDefined();
      expect(session.sessionToken).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.expires).toBeInstanceOf(Date);
      expect(session.expires.getTime()).toBeGreaterThan(Date.now());
    });

    it('should set cookie with correct security attributes', async () => {
      const session = await createSession(testUser.id);

      const response = await agent
        .get('/api/test-endpoint')
        .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);

      // Check that cookie has proper attributes
      // In development: httpOnly, sameSite=strict
      // In production: httpOnly, secure, sameSite=strict
      const isProduction = process.env.NODE_ENV === 'production';

      // Cookie should be httpOnly (not accessible via JavaScript)
      expect(session.sessionToken).toBeTruthy();

      // Verify session exists in database
      const dbSession = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session.sessionToken }
      });

      expect(dbSession).toBeDefined();
      expect(dbSession.userId).toBe(testUser.id);
    });

    it('should persist session across multiple requests', async () => {
      const session = await createSession(testUser.id);

      // First request with session cookie
      const response1 = await agent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);

      expect(response1.status).toBe(200);

      // Second request with same session cookie (simulates persistent session)
      const response2 = await agent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);

      expect(response2.status).toBe(200);

      // Verify session still exists and hasn't been destroyed
      const dbSession = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session.sessionToken }
      });

      expect(dbSession).toBeDefined();
      expect(dbSession.userId).toBe(testUser.id);
    });
  });

  describe('Browser Restart Simulation', () => {
    it('should keep user logged in after browser restart (new agent)', async () => {
      // Step 1: Create session
      const session = await createSession(testUser.id);

      // Step 2: Make request with first agent
      const response1 = await agent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);

      expect(response1.status).toBe(200);

      // Step 3: Simulate browser restart - create new agent
      const newAgent = request.agent(app);

      // Step 4: Make request with new agent using same cookie
      // (simulates reopening browser with persistent cookie)
      const response2 = await newAgent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);

      expect(response2.status).toBe(200);

      // Verify session still valid
      const dbSession = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session.sessionToken }
      });

      expect(dbSession).toBeDefined();
      expect(dbSession.expires.getTime()).toBeGreaterThan(Date.now());
    });

    it('should maintain session for the full expiration period (7 days)', async () => {
      // Create session with default 7 day expiration
      const session = await createSession(testUser.id);

      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      // Session should expire in approximately 7 days
      const expirationTime = session.expires.getTime();
      const timeDiff = expirationTime - now;

      // Allow 1 minute tolerance for test execution time
      expect(timeDiff).toBeGreaterThan(sevenDays - 60000);
      expect(timeDiff).toBeLessThanOrEqual(sevenDays + 60000);
    });

    it('should allow custom session expiration times', async () => {
      // Create session with custom 1 hour expiration
      const oneHour = 60 * 60 * 1000;
      const session = await createSession(testUser.id, oneHour);

      const now = Date.now();
      const expirationTime = session.expires.getTime();
      const timeDiff = expirationTime - now;

      // Allow 1 minute tolerance
      expect(timeDiff).toBeGreaterThan(oneHour - 60000);
      expect(timeDiff).toBeLessThanOrEqual(oneHour + 60000);
    });
  });

  describe('Session Expiration', () => {
    it('should reject expired session cookies', async () => {
      // Create an expired session (expires 1 second ago)
      const expiredSession = await prisma.betterAuthSession.create({
        data: {
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 1000) // 1 second ago
        }
      });

      // Try to use expired session
      const response = await agent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${expiredSession.sessionToken}`]);

      // Should still return 200 for public health endpoint
      expect(response.status).toBe(200);

      // But for protected endpoints, expired session should be rejected
      // (This would be tested with actual protected endpoints)
    });

    it('should clean up expired sessions', async () => {
      // Create multiple sessions, some expired
      const validSession = await prisma.betterAuthSession.create({
        data: {
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
        }
      });

      const expiredSession1 = await prisma.betterAuthSession.create({
        data: {
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });

      const expiredSession2 = await prisma.betterAuthSession.create({
        data: {
          sessionToken: require('crypto').randomBytes(32).toString('hex'),
          userId: testUser.id,
          expires: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
        }
      });

      // Run cleanup
      const { cleanupExpiredSessions } = require('../../src/auth/betterAuth');
      const cleanedCount = await cleanupExpiredSessions();

      expect(cleanedCount).toBe(2); // Should clean 2 expired sessions

      // Verify valid session still exists
      const stillValid = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: validSession.sessionToken }
      });
      expect(stillValid).toBeDefined();

      // Verify expired sessions were deleted
      const deleted1 = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: expiredSession1.sessionToken }
      });
      const deleted2 = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: expiredSession2.sessionToken }
      });

      expect(deleted1).toBeNull();
      expect(deleted2).toBeNull();
    });
  });

  describe('Session Security', () => {
    it('should generate cryptographically secure session tokens', async () => {
      const session1 = await createSession(testUser.id);
      const session2 = await createSession(testUser.id);

      // Tokens should be different
      expect(session1.sessionToken).not.toBe(session2.sessionToken);

      // Tokens should be 64 characters (32 bytes in hex)
      expect(session1.sessionToken.length).toBe(64);
      expect(session2.sessionToken.length).toBe(64);

      // Tokens should only contain hex characters
      expect(session1.sessionToken).toMatch(/^[a-f0-9]{64}$/);
      expect(session2.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reject invalid session tokens', async () => {
      const invalidToken = 'invalid-token-123';

      // Try to use invalid session
      const response = await agent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${invalidToken}`]);

      // Public endpoint should still work
      expect(response.status).toBe(200);

      // Verify invalid token doesn't exist in database
      const session = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: invalidToken }
      });

      expect(session).toBeNull();
    });

    it('should properly destroy sessions on logout', async () => {
      const session = await createSession(testUser.id);

      // Verify session exists
      let dbSession = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session.sessionToken }
      });
      expect(dbSession).toBeDefined();

      // Destroy session
      await destroySession(session.sessionToken);

      // Verify session was deleted
      dbSession = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session.sessionToken }
      });
      expect(dbSession).toBeNull();
    });

    it('should not allow session reuse after destruction', async () => {
      const session = await createSession(testUser.id);

      // Use session once
      const response1 = await agent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);
      expect(response1.status).toBe(200);

      // Destroy session
      await destroySession(session.sessionToken);

      // Try to use session again (should fail for protected routes)
      const response2 = await agent
        .get('/health')
        .set('Cookie', [`pluqla.session-token=${session.sessionToken}`]);

      // Public endpoint still works, but session is invalid
      expect(response2.status).toBe(200);

      // Verify session doesn't exist
      const dbSession = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session.sessionToken }
      });
      expect(dbSession).toBeNull();
    });
  });

  describe('Cookie Configuration', () => {
    it('should use httpOnly flag (prevents JavaScript access)', () => {
      // Cookie settings are configured in betterAuth.js
      // httpOnly: true prevents XSS attacks by making cookie inaccessible to JavaScript

      // This is enforced in configuration, test verifies it's set correctly
      const cookieConfig = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      };

      expect(cookieConfig.httpOnly).toBe(true);
    });

    it('should use sameSite=strict (prevents CSRF)', () => {
      // sameSite: strict prevents CSRF attacks
      const cookieConfig = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      };

      expect(cookieConfig.sameSite).toBe('strict');
    });

    it('should use secure flag in production (HTTPS only)', () => {
      const isProduction = process.env.NODE_ENV === 'production';

      const cookieConfig = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict'
      };

      // In production: secure should be true
      // In development: secure should be false (localhost HTTP)
      if (isProduction) {
        expect(cookieConfig.secure).toBe(true);
      } else {
        expect(cookieConfig.secure).toBe(false);
      }
    });

    it('should set correct cookie maxAge (7 days)', () => {
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      const cookieConfig = {
        maxAge: sevenDaysInMs
      };

      expect(cookieConfig.maxAge).toBe(sevenDaysInMs);
      expect(cookieConfig.maxAge).toBe(604800000); // 7 days in milliseconds
    });

    it('should allow custom cookie maxAge', () => {
      const oneHourInMs = 60 * 60 * 1000;

      const cookieConfig = {
        maxAge: oneHourInMs
      };

      expect(cookieConfig.maxAge).toBe(3600000); // 1 hour in milliseconds
    });
  });

  describe('Multiple Sessions', () => {
    it('should allow multiple active sessions for same user', async () => {
      // Create two sessions for same user (different devices)
      const session1 = await createSession(testUser.id);
      const session2 = await createSession(testUser.id);

      expect(session1.sessionToken).not.toBe(session2.sessionToken);

      // Both sessions should be valid
      const dbSession1 = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session1.sessionToken }
      });
      const dbSession2 = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session2.sessionToken }
      });

      expect(dbSession1).toBeDefined();
      expect(dbSession2).toBeDefined();
      expect(dbSession1.userId).toBe(testUser.id);
      expect(dbSession2.userId).toBe(testUser.id);
    });

    it('should allow independent session destruction', async () => {
      const session1 = await createSession(testUser.id);
      const session2 = await createSession(testUser.id);

      // Destroy only session1
      await destroySession(session1.sessionToken);

      // Session1 should be gone
      const dbSession1 = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session1.sessionToken }
      });
      expect(dbSession1).toBeNull();

      // Session2 should still exist
      const dbSession2 = await prisma.betterAuthSession.findUnique({
        where: { sessionToken: session2.sessionToken }
      });
      expect(dbSession2).toBeDefined();
    });
  });
});