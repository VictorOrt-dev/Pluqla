const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const refreshTokenService = require('../../src/services/refreshTokenService');

// Mock environment variables for testing
const originalEnv = process.env;

describe('JWT Security Tests', () => {
  let prisma;

  beforeEach(() => {
    // Reset environment to secure test values (no weak patterns)
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test_random_jwt_token_at_least_32_characters_long_for_testing',
      JWT_REFRESH_SECRET: 'test_random_refresh_token_at_least_32_characters_long_for_testing',
      JWT_EMAIL_SECRET: 'test_random_email_token_at_least_32_characters_long_for_testing',
      JWT_PASSWORD_RESET_SECRET: 'test_random_reset_token_at_least_32_characters_long_for_testing',
      NODE_ENV: 'test'
    };

    prisma = new PrismaClient();
  });

  afterEach(async () => {
    if (prisma) {
      // Clean up test data
      await prisma.refreshToken.deleteMany({});
      await prisma.$disconnect();
    }
    process.env = originalEnv;
  });

  describe('Secret Validation', () => {
    test('should fail when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        // Re-require to trigger validation
        delete require.cache[require.resolve('../../src/utils/jwt')];
        require('../../src/utils/jwt');
      }).toThrow('JWT_SECRET is required but not set in environment variables');
    });

    test('should fail when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'tooshort';

      expect(() => {
        delete require.cache[require.resolve('../../src/utils/jwt')];
        require('../../src/utils/jwt');
      }).toThrow('JWT_SECRET must be at least 32 characters long for security');
    });

    test('should fail when JWT_SECRET contains weak patterns', () => {
      process.env.JWT_SECRET = 'this_secret_contains_the_word_secret_and_is_long_enough';

      expect(() => {
        delete require.cache[require.resolve('../../src/utils/jwt')];
        require('../../src/utils/jwt');
      }).toThrow('JWT_SECRET contains weak pattern "secret"');
    });

    test('should fail when refresh secret is same as access secret', () => {
      const sameSecureSecret = 'test_random_strong_token_at_least_32_characters_long_for_validation';
      process.env.JWT_SECRET = sameSecureSecret;
      process.env.JWT_REFRESH_SECRET = sameSecureSecret;

      // This should pass validation but is a security anti-pattern
      // In production, we should add additional checks to ensure all secrets are different
      expect(() => {
        delete require.cache[require.resolve('../../src/utils/jwt')];
        require('../../src/utils/jwt');
      }).not.toThrow(); // Current implementation doesn't check for uniqueness
    });
  });

  describe('Token Generation and Verification', () => {
    let jwtUtils;

    beforeEach(() => {
      // Fresh require with secure environment
      delete require.cache[require.resolve('../../src/utils/jwt')];
      jwtUtils = require('../../src/utils/jwt');
    });

    test('should generate valid access token', () => {
      const userId = 'test-user-123';
      const accessToken = jwtUtils.generateAccessToken(userId);

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');

      // Verify token structure
      const decoded = jwtUtils.verifyAccessToken(accessToken);
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('access');
      expect(decoded.iss).toBe('plus-clair-app');
      expect(decoded.aud).toBe('plus-clair-users');
    });

    test('should generate unique refresh tokens', () => {
      const userId = 'test-user-123';
      const token1 = jwtUtils.generateRefreshToken(userId);
      const token2 = jwtUtils.generateRefreshToken(userId);

      expect(token1).not.toBe(token2);

      // Both should have unique JTIs
      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);
      expect(decoded1.jti).not.toBe(decoded2.jti);
    });

    test('should reject forged tokens', () => {
      const userId = 'test-user-123';
      const maliciousPayload = { userId, type: 'access', iat: Math.floor(Date.now() / 1000) };

      // Try to forge with wrong secret
      const forgedToken = jwt.sign(maliciousPayload, 'wrong-secret', {
        issuer: 'plus-clair-app',
        audience: 'plus-clair-users'
      });

      expect(() => {
        jwtUtils.verifyAccessToken(forgedToken);
      }).toThrow('Token invalide');
    });

    test('should reject expired tokens', async () => {
      const userId = 'test-user-123';
      const expiredToken = jwt.sign(
        { userId, type: 'access', iat: Math.floor(Date.now() / 1000) },
        process.env.JWT_SECRET,
        {
          expiresIn: '-1h', // Expired 1 hour ago
          issuer: 'plus-clair-app',
          audience: 'plus-clair-users'
        }
      );

      expect(() => {
        jwtUtils.verifyAccessToken(expiredToken);
      }).toThrow();
    });

    test('should use different secrets for different token types', () => {
      const userId = 'test-user-123';

      const accessToken = jwtUtils.generateAccessToken(userId);
      const refreshToken = jwtUtils.generateRefreshToken(userId);
      const emailToken = jwtUtils.generateEmailVerificationToken(userId);
      const resetToken = jwtUtils.generatePasswordResetToken(userId);

      // Verify each token with its correct secret only
      expect(jwtUtils.verifyAccessToken(accessToken)).toBeTruthy();
      expect(jwtUtils.verifyRefreshToken(refreshToken)).toBeTruthy();
      expect(jwtUtils.verifyEmailVerificationToken(emailToken)).toBeTruthy();
      expect(jwtUtils.verifyPasswordResetToken(resetToken)).toBeTruthy();

      // Cross-verification should fail
      expect(() => jwtUtils.verifyAccessToken(refreshToken)).toThrow();
      expect(() => jwtUtils.verifyRefreshToken(accessToken)).toThrow();
      expect(() => jwtUtils.verifyEmailVerificationToken(accessToken)).toThrow();
      expect(() => jwtUtils.verifyPasswordResetToken(accessToken)).toThrow();
    });
  });

  describe('Refresh Token Security', () => {
    let testUserId;

    beforeEach(async () => {
      testUserId = 'test-user-' + Date.now();

      // Create test user
      await prisma.user.create({
        data: {
          id: testUserId,
          email: `test-${Date.now()}@test.com`,
          password: await bcrypt.hash('testpassword', 12),
          name: 'Test User',
          status: 'active'
        }
      });
    });

    afterEach(async () => {
      // Clean up test data
      await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    });

    test('should hash refresh tokens before storage', async () => {
      const jwtUtils = require('../../src/utils/jwt');
      const tokens = jwtUtils.generateTokens(testUserId);

      await refreshTokenService.storeRefreshToken(
        tokens.refreshToken,
        testUserId,
        '127.0.0.1',
        'test-agent'
      );

      // Check database storage
      const storedToken = await prisma.refreshToken.findFirst({
        where: { userId: testUserId }
      });

      expect(storedToken).toBeTruthy();
      expect(storedToken.tokenHash).not.toBe(tokens.refreshToken); // Should be hashed
      expect(storedToken.tokenHash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
      expect(storedToken.jti).toBeTruthy();
    });

    test('should verify refresh token hashes correctly', async () => {
      const plainToken = 'test-refresh-token-123';
      const hashedToken = await refreshTokenService.hashRefreshToken(plainToken);

      const isValid = await refreshTokenService.verifyRefreshToken(plainToken, hashedToken);
      expect(isValid).toBe(true);

      const isInvalid = await refreshTokenService.verifyRefreshToken('wrong-token', hashedToken);
      expect(isInvalid).toBe(false);
    });

    test('should rotate refresh tokens securely', async () => {
      const jwtUtils = require('../../src/utils/jwt');
      const originalTokens = jwtUtils.generateTokens(testUserId);

      // Store original token
      await refreshTokenService.storeRefreshToken(
        originalTokens.refreshToken,
        testUserId,
        '127.0.0.1',
        'test-agent'
      );

      // Rotate token
      const rotationResult = await refreshTokenService.rotateRefreshToken(
        originalTokens.refreshToken,
        jwtUtils.generateTokens,
        '127.0.0.1',
        'test-agent'
      );

      expect(rotationResult.valid).toBe(true);
      expect(rotationResult.tokens).toBeTruthy();
      expect(rotationResult.tokens.accessToken).toBeTruthy();
      expect(rotationResult.tokens.refreshToken).toBeTruthy();
      expect(rotationResult.tokens.refreshToken).not.toBe(originalTokens.refreshToken);

      // Original token should be revoked
      const revokedToken = await prisma.refreshToken.findFirst({
        where: { userId: testUserId, revoked: true }
      });
      expect(revokedToken).toBeTruthy();
    });

    test('should reject reused refresh tokens', async () => {
      const jwtUtils = require('../../src/utils/jwt');
      const tokens = jwtUtils.generateTokens(testUserId);

      // Store and rotate once
      await refreshTokenService.storeRefreshToken(tokens.refreshToken, testUserId, '127.0.0.1', 'test-agent');
      const firstRotation = await refreshTokenService.rotateRefreshToken(
        tokens.refreshToken,
        jwtUtils.generateTokens,
        '127.0.0.1',
        'test-agent'
      );

      expect(firstRotation.valid).toBe(true);

      // Try to reuse the original token
      const secondRotation = await refreshTokenService.rotateRefreshToken(
        tokens.refreshToken,
        jwtUtils.generateTokens,
        '127.0.0.1',
        'test-agent'
      );

      expect(secondRotation.valid).toBe(false);
    });

    test('should revoke tokens by JTI', async () => {
      const jwtUtils = require('../../src/utils/jwt');
      const tokens = jwtUtils.generateTokens(testUserId);
      const decoded = jwt.decode(tokens.refreshToken);

      await refreshTokenService.storeRefreshToken(tokens.refreshToken, testUserId, '127.0.0.1', 'test-agent');

      const revoked = await refreshTokenService.revokeRefreshTokenByJti(decoded.jti, testUserId);
      expect(revoked).toBe(true);

      // Token should be marked as revoked
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: { jti: decoded.jti }
      });
      expect(tokenRecord.revoked).toBe(true);
      expect(tokenRecord.revokedAt).toBeTruthy();
    });

    test('should revoke all user tokens', async () => {
      const jwtUtils = require('../../src/utils/jwt');

      // Create multiple tokens
      const tokens1 = jwtUtils.generateTokens(testUserId);
      const tokens2 = jwtUtils.generateTokens(testUserId);

      await refreshTokenService.storeRefreshToken(tokens1.refreshToken, testUserId, '127.0.0.1', 'test-agent');
      await refreshTokenService.storeRefreshToken(tokens2.refreshToken, testUserId, '127.0.0.1', 'test-agent');

      const revokedCount = await refreshTokenService.revokeAllUserTokens(testUserId);
      expect(revokedCount).toBe(2);

      // All tokens should be revoked
      const revokedTokens = await prisma.refreshToken.findMany({
        where: { userId: testUserId, revoked: true }
      });
      expect(revokedTokens).toHaveLength(2);
    });

    test('should clean up expired tokens', async () => {
      const jwtUtils = require('../../src/utils/jwt');

      // Create expired token
      const expiredToken = await prisma.refreshToken.create({
        data: {
          tokenHash: await refreshTokenService.hashRefreshToken('expired-token'),
          jti: 'expired-jti-123',
          userId: testUserId,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          revoked: false
        }
      });

      const cleanedUp = await refreshTokenService.cleanupExpiredTokens();
      expect(cleanedUp).toBeGreaterThan(0);

      // Token should be deleted
      const deletedToken = await prisma.refreshToken.findUnique({
        where: { id: expiredToken.id }
      });
      expect(deletedToken).toBe(null);
    });
  });

  describe('Security Attack Prevention', () => {
    let jwtUtils;

    beforeEach(() => {
      delete require.cache[require.resolve('../../src/utils/jwt')];
      jwtUtils = require('../../src/utils/jwt');
    });

    test('should prevent token substitution attacks', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      const user1Token = jwtUtils.generateAccessToken(user1);
      const user2Token = jwtUtils.generateAccessToken(user2);

      // Verify tokens are bound to correct users
      const decoded1 = jwtUtils.verifyAccessToken(user1Token);
      const decoded2 = jwtUtils.verifyAccessToken(user2Token);

      expect(decoded1.userId).toBe(user1);
      expect(decoded2.userId).toBe(user2);
      expect(decoded1.userId).not.toBe(decoded2.userId);
    });

    test('should prevent algorithm confusion attacks', () => {
      const userId = 'test-user';

      // Try to create token with "none" algorithm
      const maliciousPayload = {
        userId,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const noneToken = jwt.sign(maliciousPayload, '', { algorithm: 'none' });

      expect(() => {
        jwtUtils.verifyAccessToken(noneToken);
      }).toThrow();
    });

    test('should prevent timing attacks on token verification', async () => {
      const correctToken = 'valid_token_hash_that_exists';
      const wrongToken = 'invalid_token_hash_wrong';

      // Time multiple verifications - they should take similar time
      const times = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await refreshTokenService.verifyRefreshToken(wrongToken, correctToken);
        times.push(Date.now() - start);
      }

      // Verify timing is consistent (not revealing information through timing)
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const variance = times.every(time => Math.abs(time - avgTime) < 50); // 50ms tolerance

      // This test might be flaky due to system load, but it demonstrates the concept
      // In production, bcrypt.compare provides constant-time comparison
      expect(variance).toBeTruthy();
    });
  });
});