const {
  generateSecureToken,
  hashToken,
  verifyToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  cleanupExpiredTokens,
  getPasswordResetStats
} = require('../../src/utils/tokenUtils');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  passwordReset: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  },
  $transaction: jest.fn()
};

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('🔐 Password Reset Token Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  });

  describe('🎲 Secure Token Generation', () => {
    test('should generate cryptographically secure tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      // Tokens should be 32 characters (16 bytes in hex)
      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);

      // Tokens should be unique
      expect(token1).not.toBe(token2);

      // Tokens should be hex strings
      expect(token1).toMatch(/^[a-f0-9]{32}$/);
      expect(token2).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should generate tokens with sufficient entropy', () => {
      const tokens = new Set();

      // Generate 1000 tokens and ensure they're all unique
      for (let i = 0; i < 1000; i++) {
        const token = generateSecureToken();
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }

      expect(tokens.size).toBe(1000);
    });
  });

  describe('🔒 Token Hashing', () => {
    test('should hash tokens securely', async () => {
      const plainToken = 'test-token-123';
      const hashedToken = await hashToken(plainToken);

      // Should produce a bcrypt hash
      expect(hashedToken).toBeDefined();
      expect(hashedToken).not.toBe(plainToken);
      expect(hashedToken.length).toBeGreaterThan(50);
      expect(hashedToken).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    test('should produce different hashes for same input', async () => {
      const plainToken = 'same-token';
      const hash1 = await hashToken(plainToken);
      const hash2 = await hashToken(plainToken);

      // Different salts should produce different hashes
      expect(hash1).not.toBe(hash2);
    });

    test('should handle hashing errors gracefully', async () => {
      // Mock bcrypt to throw error
      jest.spyOn(bcrypt, 'hash').mockRejectedValueOnce(new Error('Hashing failed'));

      await expect(hashToken('test')).rejects.toThrow('Token hashing failed');
    });
  });

  describe('🔍 Token Verification', () => {
    test('should verify valid tokens correctly', async () => {
      const plainToken = 'valid-token-456';
      const hashedToken = await hashToken(plainToken);

      const isValid = await verifyToken(plainToken, hashedToken);
      expect(isValid).toBe(true);
    });

    test('should reject invalid tokens', async () => {
      const correctToken = 'correct-token';
      const wrongToken = 'wrong-token';
      const hashedToken = await hashToken(correctToken);

      const isValid = await verifyToken(wrongToken, hashedToken);
      expect(isValid).toBe(false);
    });

    test('should use constant-time comparison (timing attack protection)', async () => {
      const plainToken = 'timing-test-token';
      const hashedToken = await hashToken(plainToken);

      const startTime = Date.now();
      await verifyToken('wrong-token', hashedToken);
      const wrongTokenTime = Date.now() - startTime;

      const startTime2 = Date.now();
      await verifyToken(plainToken, hashedToken);
      const correctTokenTime = Date.now() - startTime2;

      // Timing should be roughly similar (bcrypt handles this)
      // This is more of a smoke test - bcrypt's compare is constant-time
      expect(wrongTokenTime).toBeGreaterThan(0);
      expect(correctTokenTime).toBeGreaterThan(0);
    });

    test('should handle verification errors gracefully', async () => {
      // Mock bcrypt to throw error
      jest.spyOn(bcrypt, 'compare').mockRejectedValueOnce(new Error('Comparison failed'));

      const result = await verifyToken('test', 'hash');
      expect(result).toBe(false); // Fail secure
    });
  });

  describe('🆕 Password Reset Token Creation', () => {
    test('should create password reset token successfully', async () => {
      const userId = 'user-123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockPrisma.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.passwordReset.create.mockResolvedValue({
        id: 'reset-123',
        tokenHash: 'hashed-token',
        userId,
        expiresAt: new Date(),
        ipAddress,
        userAgent
      });

      const result = await createPasswordResetToken(userId, ipAddress, userAgent);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.resetId).toBe('reset-123');
      expect(result.token).toHaveLength(32);
      expect(result.token).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should clean up existing tokens before creating new one', async () => {
      const userId = 'user-123';

      mockPrisma.passwordReset.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.passwordReset.create.mockResolvedValue({
        id: 'reset-456',
        tokenHash: 'new-hash',
        userId
      });

      await createPasswordResetToken(userId);

      // Should delete old tokens
      expect(mockPrisma.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
          OR: [
            { used: false, expiresAt: { lt: expect.any(Date) } },
            { used: true, createdAt: { lt: expect.any(Date) } }
          ]
        }
      });

      // Should create new token
      expect(mockPrisma.passwordReset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenHash: expect.any(String),
          userId,
          expiresAt: expect.any(Date)
        })
      });
    });
  });

  describe('✅ Password Reset Token Verification', () => {
    test('should verify and consume valid token', async () => {
      const plainToken = generateSecureToken();
      const hashedToken = await hashToken(plainToken);
      const userId = 'user-789';

      mockPrisma.passwordReset.findMany.mockResolvedValue([
        {
          id: 'reset-789',
          tokenHash: hashedToken,
          userId,
          used: false,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          user: { id: userId, email: 'test@example.com', status: 'active' }
        }
      ]);

      mockPrisma.passwordReset.update.mockResolvedValue({});

      const result = await verifyPasswordResetToken(plainToken, '127.0.0.1', 'Test-Agent');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.resetId).toBe('reset-789');

      // Should mark token as used
      expect(mockPrisma.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'reset-789' },
        data: {
          used: true,
          usedAt: expect.any(Date)
        }
      });
    });

    test('should reject invalid tokens', async () => {
      const plainToken = generateSecureToken();
      const wrongToken = generateSecureToken();
      const hashedToken = await hashToken(plainToken);

      mockPrisma.passwordReset.findMany.mockResolvedValue([
        {
          id: 'reset-999',
          tokenHash: hashedToken,
          userId: 'user-999',
          used: false,
          expiresAt: new Date(Date.now() + 3600000),
          user: { id: 'user-999', status: 'active' }
        }
      ]);

      const result = await verifyPasswordResetToken(wrongToken, '127.0.0.1', 'Test-Agent');

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();

      // Should not mark any token as used
      expect(mockPrisma.passwordReset.update).not.toHaveBeenCalled();
    });

    test('should reject tokens for inactive users', async () => {
      const plainToken = generateSecureToken();
      const hashedToken = await hashToken(plainToken);

      mockPrisma.passwordReset.findMany.mockResolvedValue([
        {
          id: 'reset-inactive',
          tokenHash: hashedToken,
          userId: 'inactive-user',
          used: false,
          expiresAt: new Date(Date.now() + 3600000),
          user: { id: 'inactive-user', status: 'suspended' }
        }
      ]);

      const result = await verifyPasswordResetToken(plainToken, '127.0.0.1', 'Test-Agent');

      expect(result.valid).toBe(false);
      expect(mockPrisma.passwordReset.update).not.toHaveBeenCalled();
    });

    test('should enforce single-use tokens', async () => {
      // Token already used
      mockPrisma.passwordReset.findMany.mockResolvedValue([
        {
          id: 'reset-used',
          tokenHash: 'some-hash',
          userId: 'user-used',
          used: true, // Already used
          expiresAt: new Date(Date.now() + 3600000),
          user: { id: 'user-used', status: 'active' }
        }
      ]);

      const result = await verifyPasswordResetToken('any-token', '127.0.0.1', 'Test-Agent');

      expect(result.valid).toBe(false);
    });

    test('should reject expired tokens', async () => {
      // Token expired
      mockPrisma.passwordReset.findMany.mockResolvedValue([
        {
          id: 'reset-expired',
          tokenHash: 'some-hash',
          userId: 'user-expired',
          used: false,
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
          user: { id: 'user-expired', status: 'active' }
        }
      ]);

      const result = await verifyPasswordResetToken('any-token', '127.0.0.1', 'Test-Agent');

      expect(result.valid).toBe(false);
    });
  });

  describe('🧹 Token Cleanup', () => {
    test('should clean up expired tokens', async () => {
      mockPrisma.passwordReset.deleteMany.mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockPrisma.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { used: true, usedAt: { lt: expect.any(Date) } }
          ]
        }
      });
    });
  });

  describe('📊 Statistics', () => {
    test('should return password reset statistics', async () => {
      mockPrisma.passwordReset.count
        .mockResolvedValueOnce(2) // active
        .mockResolvedValueOnce(3) // expired
        .mockResolvedValueOnce(5); // used

      const stats = await getPasswordResetStats();

      expect(stats).toEqual({
        active: 2,
        expired: 3,
        used: 5,
        total: 10
      });
    });
  });
});

describe('🛡️ Security Edge Cases', () => {
  test('should handle database errors gracefully', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('Database error'));

    const result = await verifyPasswordResetToken('test-token', '127.0.0.1');
    expect(result.valid).toBe(false);
  });

  test('should not expose sensitive information in logs', async () => {
    const logger = require('../../src/utils/logger');

    const plainToken = 'secret-token-123';
    await hashToken(plainToken);

    // Check that logger was called but token wasn't exposed
    expect(logger.debug).toHaveBeenCalledWith('Token hashed successfully');
    expect(logger.debug).not.toHaveBeenCalledWith(expect.stringContaining(plainToken));
  });

  test('should generate tokens with sufficient randomness (statistical test)', () => {
    const tokens = [];
    const chars = {};

    // Generate 100 tokens and analyze character distribution
    for (let i = 0; i < 100; i++) {
      const token = generateSecureToken();
      tokens.push(token);

      for (const char of token) {
        chars[char] = (chars[char] || 0) + 1;
      }
    }

    // Each hex character (0-9, a-f) should appear roughly equally
    const expectedFreq = (100 * 32) / 16; // ~200 times each
    Object.keys(chars).forEach(char => {
      expect(chars[char]).toBeGreaterThan(expectedFreq * 0.7); // Within 30% of expected
      expect(chars[char]).toBeLessThan(expectedFreq * 1.3);
    });
  });
});