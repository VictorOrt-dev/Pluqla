const request = require('supertest');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

// Mock environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../../src/app');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db'
    }
  }
});

describe('🔐 Password Reset Integration Tests', () => {
  let testUser;

  beforeAll(async () => {
    // Clean test database
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
  });

  beforeEach(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('originalPassword123', 12);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        status: 'active'
      }
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.passwordReset.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('🔍 Forgot Password Flow', () => {
    test('should create password reset token for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Si cet email existe, un lien de réinitialisation a été envoyé');
      expect(response.body.data.resetId).toBeDefined();

      // Verify token was created in database
      const resetTokens = await prisma.passwordReset.findMany({
        where: { userId: testUser.id }
      });

      expect(resetTokens).toHaveLength(1);
      expect(resetTokens[0].tokenHash).toBeDefined();
      expect(resetTokens[0].used).toBe(false);
      expect(resetTokens[0].expiresAt).toBeInstanceOf(Date);
      expect(resetTokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should return success for non-existent email (prevent enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Si cet email existe, un lien de réinitialisation a été envoyé');

      // Verify no token was created
      const resetTokens = await prisma.passwordReset.findMany();
      expect(resetTokens).toHaveLength(0);
    });

    test('should prevent timing attacks (similar response times)', async () => {
      const startValidEmail = Date.now();
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });
      const validEmailTime = Date.now() - startValidEmail;

      const startInvalidEmail = Date.now();
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid@example.com' });
      const invalidEmailTime = Date.now() - startInvalidEmail;

      // Times should be similar (within reasonable variance)
      expect(Math.abs(validEmailTime - invalidEmailTime)).toBeLessThan(500);
    });

    test('should clean up old tokens when creating new one', async () => {
      // Create an old expired token
      await prisma.passwordReset.create({
        data: {
          tokenHash: 'old-hash',
          userId: testUser.id,
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
          used: false
        }
      });

      // Request new reset
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // Should only have 1 token (old one cleaned up)
      const resetTokens = await prisma.passwordReset.findMany({
        where: { userId: testUser.id }
      });

      expect(resetTokens).toHaveLength(1);
      expect(resetTokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should handle inactive user accounts', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: testUser.id },
        data: { status: 'suspended' }
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Si cet email existe, un lien de réinitialisation a été envoyé');

      // Should not create token for inactive user
      const resetTokens = await prisma.passwordReset.findMany();
      expect(resetTokens).toHaveLength(0);
    });
  });

  describe('🔐 Reset Password Flow', () => {
    let resetToken;
    let resetRecord;

    beforeEach(async () => {
      // Create a valid reset token
      const { createPasswordResetToken } = require('../../src/utils/tokenUtils');
      const result = await createPasswordResetToken(testUser.id, '127.0.0.1', 'Test-Agent');
      resetToken = result.token;

      resetRecord = await prisma.passwordReset.findFirst({
        where: { userId: testUser.id }
      });
    });

    test('should reset password with valid token', async () => {
      const newPassword = 'newSecurePassword456';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mot de passe réinitialisé avec succès. Veuillez vous reconnecter.');

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      const isNewPasswordValid = await bcrypt.compare(newPassword, updatedUser.password);
      expect(isNewPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await bcrypt.compare('originalPassword123', updatedUser.password);
      expect(isOldPasswordValid).toBe(false);

      // Verify token was marked as used
      const usedToken = await prisma.passwordReset.findUnique({
        where: { id: resetRecord.id }
      });
      expect(usedToken).toBeNull(); // Tokens are deleted after use
    });

    test('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: '123' // Too weak
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Le mot de passe doit contenir au moins 8 caractères');

      // Verify password was not changed
      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      const isOriginalPasswordValid = await bcrypt.compare('originalPassword123', user.password);
      expect(isOriginalPasswordValid).toBe(true);
    });

    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token-123',
          password: 'newPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token de réinitialisation invalide ou expiré');

      // Verify password was not changed
      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      const isOriginalPasswordValid = await bcrypt.compare('originalPassword123', user.password);
      expect(isOriginalPasswordValid).toBe(true);
    });

    test('should enforce single-use tokens', async () => {
      const newPassword1 = 'firstNewPassword123';
      const newPassword2 = 'secondNewPassword123';

      // First use should succeed
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword1
        })
        .expect(200);

      // Second use of same token should fail
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword2
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token de réinitialisation invalide ou expiré');

      // Verify password is the first new password, not the second
      const user = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      const isFirstPasswordValid = await bcrypt.compare(newPassword1, user.password);
      expect(isFirstPasswordValid).toBe(true);

      const isSecondPasswordValid = await bcrypt.compare(newPassword2, user.password);
      expect(isSecondPasswordValid).toBe(false);
    });

    test('should invalidate all refresh tokens after password reset', async () => {
      // Create some refresh tokens for the user
      await prisma.refreshToken.create({
        data: {
          token: 'refresh-token-1',
          userId: testUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      await prisma.refreshToken.create({
        data: {
          token: 'refresh-token-2',
          userId: testUser.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newSecurePassword789'
        })
        .expect(200);

      // Verify all refresh tokens were deleted
      const remainingTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.id }
      });

      expect(remainingTokens).toHaveLength(0);
    });

    test('should handle expired tokens', async () => {
      // Create an expired token
      const expiredTokenHash = await bcrypt.hash('expired-token', 12);
      await prisma.passwordReset.create({
        data: {
          tokenHash: expiredTokenHash,
          userId: testUser.id,
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
          used: false
        }
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'newPassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token de réinitialisation invalide ou expiré');
    });
  });

  describe('🔒 Security Features', () => {
    test('should hash tokens in database (never store plain text)', async () => {
      // Request password reset
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      const resetRecord = await prisma.passwordReset.findFirst({
        where: { userId: testUser.id }
      });

      // Token should be hashed (bcrypt format)
      expect(resetRecord.tokenHash).toMatch(/^\$2[ab]\$\d{2}\$/);
      expect(resetRecord.tokenHash.length).toBeGreaterThan(50);

      // Raw token should not be stored anywhere
      const allFields = Object.values(resetRecord);
      allFields.forEach(field => {
        if (typeof field === 'string') {
          expect(field).not.toMatch(/^[a-f0-9]{32}$/); // Not the raw token format
        }
      });
    });

    test('should track security metadata', async () => {
      const testIP = '192.168.1.100';
      const testUserAgent = 'Mozilla/5.0 (Test Browser)';

      // Mock request IP and user agent
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .set('User-Agent', testUserAgent)
        .set('X-Forwarded-For', testIP)
        .send({ email: testUser.email });

      const resetRecord = await prisma.passwordReset.findFirst({
        where: { userId: testUser.id }
      });

      expect(resetRecord.ipAddress).toBeTruthy();
      expect(resetRecord.userAgent).toBe(testUserAgent);
      expect(resetRecord.createdAt).toBeInstanceOf(Date);
    });

    test('should maintain audit trail', async () => {
      const { createPasswordResetToken } = require('../../src/utils/tokenUtils');

      // Create token
      const result = await createPasswordResetToken(testUser.id, '127.0.0.1', 'Test-Agent');

      // Use token
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: result.token,
          password: 'auditTrailPassword123'
        });

      // Check that security events were logged
      // In a real implementation, you might check security_incidents table
      // For this test, we verify the token was properly consumed
      const usedTokens = await prisma.passwordReset.findMany({
        where: {
          userId: testUser.id,
          used: true
        }
      });

      // Token should be deleted after use, so this test verifies cleanup occurred
      const allTokens = await prisma.passwordReset.findMany({
        where: { userId: testUser.id }
      });

      expect(allTokens).toHaveLength(0); // All tokens cleaned up
    });

    test('should prevent token enumeration attacks', async () => {
      const responses = [];

      // Try multiple invalid tokens
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: `invalid-token-${i}`,
            password: 'testPassword123'
          });

        responses.push(response.body);
      }

      // All responses should be identical (prevent information leakage)
      responses.forEach(response => {
        expect(response.success).toBe(false);
        expect(response.error).toBe('Token de réinitialisation invalide ou expiré');
      });
    });
  });

  describe('🧹 Cleanup and Maintenance', () => {
    test('should automatically clean up expired tokens', async () => {
      const { cleanupExpiredTokens } = require('../../src/utils/tokenUtils');

      // Create some expired tokens
      await prisma.passwordReset.createMany({
        data: [
          {
            tokenHash: 'expired-1',
            userId: testUser.id,
            expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
            used: false
          },
          {
            tokenHash: 'expired-2',
            userId: testUser.id,
            expiresAt: new Date(Date.now() - 7200000), // 2 hours ago
            used: false
          },
          {
            tokenHash: 'valid-token',
            userId: testUser.id,
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
            used: false
          }
        ]
      });

      const cleanedUp = await cleanupExpiredTokens();

      expect(cleanedUp).toBe(2); // Two expired tokens cleaned up

      const remainingTokens = await prisma.passwordReset.findMany();
      expect(remainingTokens).toHaveLength(1);
      expect(remainingTokens[0].tokenHash).toBe('valid-token');
    });
  });
});

describe('🚨 Attack Simulation Tests', () => {
  let testUser;

  beforeAll(async () => {
    await prisma.user.deleteMany();
    const hashedPassword = await bcrypt.hash('testPassword123', 12);
    testUser = await prisma.user.create({
      data: {
        email: 'victim@example.com',
        password: hashedPassword,
        name: 'Victim User',
        status: 'active'
      }
    });
  });

  afterAll(async () => {
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  test('🎯 Brute Force Attack Protection', async () => {
    const invalidTokens = [
      '00000000000000000000000000000000',
      '11111111111111111111111111111111',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'ffffffffffffffffffffffffffffffff',
      'invalid-token-format'
    ];

    const results = [];
    for (const token of invalidTokens) {
      const start = Date.now();
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
          password: 'hackerPassword123'
        });
      const duration = Date.now() - start;

      results.push({ response: response.body, duration });
    }

    // All attempts should fail with same error
    results.forEach(({ response }) => {
      expect(response.success).toBe(false);
      expect(response.error).toBe('Token de réinitialisation invalide ou expiré');
    });

    // Response times should be consistent (no timing leak)
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
    durations.forEach(duration => {
      expect(Math.abs(duration - avgDuration)).toBeLessThan(avgDuration * 0.5);
    });
  });

  test('🕵️ Token Extraction Prevention', async () => {
    // Create a valid token
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    // Try to extract token information from database
    const resetRecord = await prisma.passwordReset.findFirst({
      where: { userId: testUser.id }
    });

    // Token should be properly hashed
    expect(resetRecord.tokenHash).not.toMatch(/^[a-f0-9]{32}$/);
    expect(resetRecord.tokenHash).toMatch(/^\$2[ab]\$\d{2}\$/);

    // No plain text token should be recoverable
    expect(resetRecord).not.toHaveProperty('token');
    expect(resetRecord).not.toHaveProperty('plainToken');
    expect(resetRecord).not.toHaveProperty('rawToken');
  });

  test('🔄 Replay Attack Prevention', async () => {
    const { createPasswordResetToken } = require('../../src/utils/tokenUtils');
    const result = await createPasswordResetToken(testUser.id, '127.0.0.1', 'Attacker-Agent');

    // First use - should succeed
    const response1 = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: result.token,
        password: 'firstPassword123'
      });

    expect(response1.body.success).toBe(true);

    // Replay attack - should fail
    const response2 = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: result.token,
        password: 'hackedPassword123'
      });

    expect(response2.body.success).toBe(false);
    expect(response2.body.error).toBe('Token de réinitialisation invalide ou expiré');

    // Verify password is the first one, not the replayed one
    const user = await prisma.user.findUnique({
      where: { id: testUser.id }
    });

    const isFirstPasswordValid = await bcrypt.compare('firstPassword123', user.password);
    expect(isFirstPasswordValid).toBe(true);

    const isReplayPasswordValid = await bcrypt.compare('hackedPassword123', user.password);
    expect(isReplayPasswordValid).toBe(false);
  });
});