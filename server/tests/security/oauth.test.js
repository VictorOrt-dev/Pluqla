/**
 * Security Tests for OAuth State Persistence
 * Tests OAuth state management across distributed systems
 */

const OAuthStateService = require('../../src/services/oauthStateService');
const crypto = require('crypto');

// Mock Prisma for testing
const mockPrisma = {
  oauthState: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn()
  }
};

// Mock Redis for testing
const mockRedis = {
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  connect: jest.fn().mockResolvedValue(true)
};

jest.mock('redis', () => ({
  createClient: () => mockRedis
}));

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma
}));

describe('OAuth State Persistence Service', () => {
  let stateService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create new instance for each test
    stateService = new (require('../../src/services/oauthStateService').constructor)();

    // Override the prisma client for testing
    stateService.prisma = mockPrisma;
  });

  describe('State Generation', () => {
    test('should generate secure random states', () => {
      const state1 = stateService.generateSecureState('oauth');
      const state2 = stateService.generateSecureState('oauth');

      expect(state1).toMatch(/^oauth_[0-9a-z]+_[0-9a-f]{32}$/);
      expect(state2).toMatch(/^oauth_[0-9a-z]+_[0-9a-f]{32}$/);
      expect(state1).not.toBe(state2);
    });

    test('should validate state format', () => {
      const validState = 'oauth_1a2b3c_' + crypto.randomBytes(16).toString('hex');
      const invalidStates = [
        'short',
        'contains spaces',
        'has-special-chars!',
        'x'.repeat(101) // Too long
      ];

      expect(stateService.isValidStateFormat(validState)).toBe(true);
      invalidStates.forEach(state => {
        expect(stateService.isValidStateFormat(state)).toBe(false);
      });
    });
  });

  describe('Database Storage', () => {
    beforeEach(() => {
      // Force database storage for these tests
      stateService.redisClient = null;
    });

    test('should store OAuth state in database', async () => {
      const state = 'test_state_123';
      const data = { userId: 'user123', provider: 'bridge' };
      const expiresAt = new Date(Date.now() + 300000);

      mockPrisma.oauthState.upsert.mockResolvedValue({ id: 'state-id' });

      const result = await stateService.storeState(state, data, 300);

      expect(result).toBe(true);
      expect(mockPrisma.oauthState.upsert).toHaveBeenCalledWith({
        where: { state },
        update: {
          data: expect.stringContaining('"userId":"user123"'),
          expiresAt: expect.any(Date)
        },
        create: {
          state,
          data: expect.stringContaining('"userId":"user123"'),
          expiresAt: expect.any(Date)
        }
      });
    });

    test('should retrieve valid OAuth state from database', async () => {
      const state = 'test_state_123';
      const storedData = {
        userId: 'user123',
        provider: 'bridge',
        expiresAt: new Date(Date.now() + 300000).toISOString()
      };

      mockPrisma.oauthState.findUnique.mockResolvedValue({
        state,
        data: JSON.stringify(storedData),
        expiresAt: new Date(Date.now() + 300000)
      });

      const result = await stateService.getState(state);

      expect(result).toMatchObject({
        userId: 'user123',
        provider: 'bridge'
      });
      expect(mockPrisma.oauthState.findUnique).toHaveBeenCalledWith({
        where: { state }
      });
    });

    test('should handle expired state cleanup', async () => {
      const state = 'expired_state_123';

      mockPrisma.oauthState.findUnique.mockResolvedValue({
        state,
        data: JSON.stringify({ userId: 'user123' }),
        expiresAt: new Date(Date.now() - 1000) // Expired
      });

      mockPrisma.oauthState.delete.mockResolvedValue({ id: 'deleted' });

      const result = await stateService.getState(state);

      expect(result).toBeNull();
      expect(mockPrisma.oauthState.delete).toHaveBeenCalledWith({
        where: { state }
      });
    });

    test('should delete OAuth state from database', async () => {
      const state = 'test_state_123';

      mockPrisma.oauthState.delete.mockResolvedValue({ id: 'deleted' });

      const result = await stateService.deleteState(state);

      expect(result).toBe(true);
      expect(mockPrisma.oauthState.delete).toHaveBeenCalledWith({
        where: { state }
      });
    });
  });

  describe('Redis Storage', () => {
    beforeEach(() => {
      // Force Redis storage for these tests
      stateService.redisClient = mockRedis;
    });

    test('should store OAuth state in Redis', async () => {
      const state = 'test_state_123';
      const data = { userId: 'user123', provider: 'bridge' };

      mockRedis.setEx.mockResolvedValue('OK');

      const result = await stateService.storeState(state, data, 300);

      expect(result).toBe(true);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `oauth_state:${state}`,
        300,
        expect.stringContaining('"userId":"user123"')
      );
    });

    test('should retrieve OAuth state from Redis', async () => {
      const state = 'test_state_123';
      const storedData = {
        userId: 'user123',
        provider: 'bridge',
        expiresAt: new Date(Date.now() + 300000).toISOString()
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(storedData));

      const result = await stateService.getState(state);

      expect(result).toMatchObject({
        userId: 'user123',
        provider: 'bridge'
      });
      expect(mockRedis.get).toHaveBeenCalledWith(`oauth_state:${state}`);
    });

    test('should delete OAuth state from Redis', async () => {
      const state = 'test_state_123';

      mockRedis.del.mockResolvedValue(1);

      const result = await stateService.deleteState(state);

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(`oauth_state:${state}`);
    });
  });

  describe('PKCE Verifier Management', () => {
    test('should store and retrieve PKCE verifier', async () => {
      const state = 'test_state_123';
      const codeVerifier = crypto.randomBytes(32).toString('base64url');

      stateService.prisma = mockPrisma;
      stateService.redisClient = null;

      mockPrisma.oauthState.upsert.mockResolvedValue({ id: 'state-id' });
      mockPrisma.oauthState.findUnique.mockResolvedValue({
        state,
        data: JSON.stringify({
          codeVerifier,
          type: 'pkce',
          expiresAt: new Date(Date.now() + 300000).toISOString()
        }),
        expiresAt: new Date(Date.now() + 300000)
      });

      await stateService.storePKCEVerifier(state, codeVerifier);
      const retrievedVerifier = await stateService.getPKCEVerifier(state);

      expect(retrievedVerifier).toBe(codeVerifier);
    });

    test('should store user context with state', async () => {
      const state = 'test_state_123';
      const userId = 'user123';
      const provider = 'bridge';

      stateService.prisma = mockPrisma;
      stateService.redisClient = null;

      mockPrisma.oauthState.upsert.mockResolvedValue({ id: 'state-id' });
      mockPrisma.oauthState.findUnique.mockResolvedValue({
        state,
        data: JSON.stringify({
          userId,
          provider,
          type: 'user_auth',
          expiresAt: new Date(Date.now() + 300000).toISOString()
        }),
        expiresAt: new Date(Date.now() + 300000)
      });

      await stateService.storeUserState(state, userId, provider);
      const userContext = await stateService.getUserFromState(state);

      expect(userContext).toMatchObject({
        userId,
        provider
      });
    });
  });

  describe('Multiple Instance Consistency', () => {
    test('should handle concurrent access across instances', async () => {
      const state = 'concurrent_state_123';
      const data = { userId: 'user123', provider: 'bridge' };

      // Simulate multiple service instances
      const instance1 = new (require('../../src/services/oauthStateService').constructor)();
      const instance2 = new (require('../../src/services/oauthStateService').constructor)();

      instance1.prisma = mockPrisma;
      instance2.prisma = mockPrisma;
      instance1.redisClient = null;
      instance2.redisClient = null;

      mockPrisma.oauthState.upsert.mockResolvedValue({ id: 'state-id' });
      mockPrisma.oauthState.findUnique.mockResolvedValue({
        state,
        data: JSON.stringify({
          ...data,
          expiresAt: new Date(Date.now() + 300000).toISOString()
        }),
        expiresAt: new Date(Date.now() + 300000)
      });

      // Store with instance1
      await instance1.storeState(state, data);

      // Retrieve with instance2
      const retrievedData = await instance2.getState(state);

      expect(retrievedData).toMatchObject(data);
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup expired states', async () => {
      stateService.redisClient = null;
      mockPrisma.oauthState.deleteMany.mockResolvedValue({ count: 5 });

      const cleanedCount = await stateService.cleanupExpiredStates();

      expect(cleanedCount).toBe(5);
      expect(mockPrisma.oauthState.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });

  describe('Health Checks', () => {
    test('should perform health check successfully', async () => {
      stateService.redisClient = null;

      mockPrisma.oauthState.upsert.mockResolvedValue({ id: 'health-test' });
      mockPrisma.oauthState.findUnique.mockResolvedValue({
        state: expect.any(String),
        data: expect.stringContaining('"test":true'),
        expiresAt: expect.any(Date)
      });
      mockPrisma.oauthState.delete.mockResolvedValue({ id: 'deleted' });

      const health = await stateService.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.storage).toBe('database');
    });

    test('should get storage statistics', async () => {
      stateService.redisClient = null;
      mockPrisma.oauthState.count.mockResolvedValue(42);

      const stats = await stateService.getStats();

      expect(stats.activeStates).toBe(42);
      expect(stats.storage).toBe('database');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      stateService.redisClient = null;
      mockPrisma.oauthState.upsert.mockRejectedValue(new Error('Database connection failed'));

      await expect(stateService.storeState('test', {})).rejects.toThrow('Failed to store OAuth state');
    });

    test('should return null for non-existent states', async () => {
      stateService.redisClient = null;
      mockPrisma.oauthState.findUnique.mockResolvedValue(null);

      const result = await stateService.getState('non_existent_state');

      expect(result).toBeNull();
    });
  });
});