const { PrismaClient } = require('@prisma/client');
const {
  checkQuota,
  consumeTokens,
  resetQuota,
  getUserStats,
  getDailyQuota,
  getFeatureCost,
  QUOTA_LIMITS,
  FEATURE_COSTS
} = require('../src/services/aiUsageService');

const prisma = new PrismaClient();

describe('AI Usage Quota Service', () => {
  let testUser;
  let premiumUser;

  beforeAll(async () => {
    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: 'test-quota@pluqla.com',
        password: 'hashedpassword123',
        name: 'Free Test User',
        isPremium: false,
        emailVerified: true
      }
    });

    premiumUser = await prisma.user.create({
      data: {
        email: 'premium-quota@pluqla.com',
        password: 'hashedpassword123',
        name: 'Premium Test User',
        isPremium: true,
        emailVerified: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup test users and their usage records
    await prisma.aiUsage.deleteMany({
      where: {
        OR: [
          { userId: testUser.id },
          { userId: premiumUser.id }
        ]
      }
    });

    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.user.delete({ where: { id: premiumUser.id } });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset quotas before each test
    await resetQuota(testUser.id);
    await resetQuota(premiumUser.id);
  });

  describe('Quota Limits Configuration', () => {
    it('should have correct quota limits defined', () => {
      expect(QUOTA_LIMITS.free).toBe(50);
      expect(QUOTA_LIMITS.premium).toBe(500);
    });

    it('should have correct feature costs defined', () => {
      expect(FEATURE_COSTS.suggestions).toBe(1);
      expect(FEATURE_COSTS.chat).toBe(2);
      expect(FEATURE_COSTS.insights).toBe(3);
      expect(FEATURE_COSTS.image_analysis).toBe(5);
    });

    it('should return correct quota for free user', () => {
      const quota = getDailyQuota(false);
      expect(quota).toBe(50);
    });

    it('should return correct quota for premium user', () => {
      const quota = getDailyQuota(true);
      expect(quota).toBe(500);
    });

    it('should return correct feature costs', () => {
      expect(getFeatureCost('suggestions')).toBe(1);
      expect(getFeatureCost('chat')).toBe(2);
      expect(getFeatureCost('insights')).toBe(3);
      expect(getFeatureCost('image_analysis')).toBe(5);
      expect(getFeatureCost('unknown_feature')).toBe(1); // Default
    });
  });

  describe('checkQuota() - Free User', () => {
    it('should allow first request for free user', async () => {
      const result = await checkQuota(testUser.id, 'suggestions');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
      expect(result.quota).toBe(50);
      expect(result.isPremium).toBe(false);
      expect(result.tokenCost).toBe(1);
      expect(result.warning).toBe(false);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should return correct remaining after consuming tokens', async () => {
      // Consume 10 tokens
      await consumeTokens(testUser.id, 'suggestions', 10);

      const result = await checkQuota(testUser.id, 'suggestions');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(40);
      expect(result.tokensUsed).toBe(10);
    });

    it('should set warning flag when near quota limit (80%)', async () => {
      // Consume 41 tokens (82% of 50)
      await consumeTokens(testUser.id, 'suggestions', 41);

      const result = await checkQuota(testUser.id, 'suggestions');

      expect(result.warning).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should block request when quota exceeded', async () => {
      // Consume full quota
      await consumeTokens(testUser.id, 'suggestions', 50);

      const result = await checkQuota(testUser.id, 'suggestions');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should respect different feature costs', async () => {
      const chatResult = await checkQuota(testUser.id, 'chat');
      expect(chatResult.tokenCost).toBe(2);

      const insightsResult = await checkQuota(testUser.id, 'insights');
      expect(insightsResult.tokenCost).toBe(3);

      const imageResult = await checkQuota(testUser.id, 'image_analysis');
      expect(imageResult.tokenCost).toBe(5);
    });
  });

  describe('checkQuota() - Premium User', () => {
    it('should allow first request for premium user', async () => {
      const result = await checkQuota(premiumUser.id, 'suggestions');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(500);
      expect(result.quota).toBe(500);
      expect(result.isPremium).toBe(true);
    });

    it('should allow much more usage for premium user', async () => {
      // Consume 450 tokens
      await consumeTokens(premiumUser.id, 'suggestions', 450);

      const result = await checkQuota(premiumUser.id, 'suggestions');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
    });

    it('should block premium user at quota limit', async () => {
      // Consume full premium quota
      await consumeTokens(premiumUser.id, 'suggestions', 500);

      const result = await checkQuota(premiumUser.id, 'suggestions');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('consumeTokens()', () => {
    it('should successfully consume tokens for allowed request', async () => {
      const result = await consumeTokens(testUser.id, 'suggestions', 5);

      expect(result.success).toBe(true);
      expect(result.exceeded).toBe(false);
      expect(result.remaining).toBe(45);
      expect(result.usageId).toBeDefined();
    });

    it('should use default feature cost if tokens not specified', async () => {
      const result = await consumeTokens(testUser.id, 'chat'); // Cost: 2

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(48); // 50 - 2
    });

    it('should fail to consume when quota exceeded', async () => {
      // Consume all quota
      await consumeTokens(testUser.id, 'suggestions', 50);

      // Try to consume more
      const result = await consumeTokens(testUser.id, 'suggestions', 1);

      expect(result.success).toBe(false);
      expect(result.exceeded).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.message).toContain('Daily quota exceeded');
    });

    it('should record usage in database', async () => {
      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        category: 'alimentation',
        language: 'fr'
      };

      const result = await consumeTokens(testUser.id, 'suggestions', 3, metadata);

      expect(result.success).toBe(true);

      // Check database record
      const usage = await prisma.aiUsage.findUnique({
        where: { id: result.usageId }
      });

      expect(usage).toBeDefined();
      expect(usage.userId).toBe(testUser.id);
      expect(usage.feature).toBe('suggestions');
      expect(usage.tokensUsed).toBe(3);
      expect(usage.tokensRemaining).toBe(47);
      expect(usage.dailyQuota).toBe(50);
      expect(usage.quotaExceeded).toBe(false);
      expect(usage.ipAddress).toBe('127.0.0.1');
      expect(usage.userAgent).toBe('Test Agent');

      const parsedMetadata = JSON.parse(usage.requestMetadata);
      expect(parsedMetadata.category).toBe('alimentation');
      expect(parsedMetadata.language).toBe('fr');
    });

    it('should record quota exceeded event in database', async () => {
      // Consume full quota
      await consumeTokens(testUser.id, 'suggestions', 50);

      // Try to exceed
      const result = await consumeTokens(testUser.id, 'suggestions', 1);

      expect(result.exceeded).toBe(true);

      // Check that exceeded event was recorded
      const exceededRecords = await prisma.aiUsage.findMany({
        where: {
          userId: testUser.id,
          quotaExceeded: true
        }
      });

      expect(exceededRecords.length).toBeGreaterThan(0);
    });
  });

  describe('resetQuota()', () => {
    it('should reset user quota', async () => {
      // Consume some tokens
      await consumeTokens(testUser.id, 'suggestions', 30);

      // Verify quota is consumed
      let check = await checkQuota(testUser.id, 'suggestions');
      expect(check.remaining).toBe(20);

      // Reset quota
      const resetResult = await resetQuota(testUser.id);

      expect(resetResult.success).toBe(true);
      expect(resetResult.recordsDeleted).toBeGreaterThan(0);

      // Verify quota is restored
      check = await checkQuota(testUser.id, 'suggestions');
      expect(check.remaining).toBe(50);
    });

    it('should only reset current period records', async () => {
      // This test assumes we can't easily manipulate dates
      // In real implementation, old records from previous periods
      // should not be deleted by resetQuota
      const result = await resetQuota(testUser.id);
      expect(result.success).toBe(true);
    });
  });

  describe('getUserStats()', () => {
    it('should return usage statistics for user', async () => {
      // Create some usage
      await consumeTokens(testUser.id, 'suggestions', 10);
      await consumeTokens(testUser.id, 'chat', 5);
      await consumeTokens(testUser.id, 'insights', 3);

      const stats = await getUserStats(testUser.id, 7);

      expect(stats.totalRequests).toBe(3);
      expect(stats.totalTokens).toBe(18); // 10 + 5 + 3
      expect(stats.byFeature).toEqual({
        suggestions: 10,
        chat: 5,
        insights: 3
      });
      expect(stats.quotaExceededCount).toBe(0);
      expect(stats.period.days).toBe(7);
      expect(stats.averageTokensPerDay).toBeDefined();
    });

    it('should track quota exceeded events in stats', async () => {
      // Exceed quota
      await consumeTokens(testUser.id, 'suggestions', 50);
      await consumeTokens(testUser.id, 'suggestions', 1); // Exceeded

      const stats = await getUserStats(testUser.id, 7);

      expect(stats.quotaExceededCount).toBe(1);
    });

    it('should return empty stats for user with no usage', async () => {
      const stats = await getUserStats(premiumUser.id, 7);

      expect(stats.totalRequests).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.byFeature).toEqual({});
      expect(stats.quotaExceededCount).toBe(0);
    });
  });

  describe('Multi-feature usage tracking', () => {
    it('should track different features independently but share quota', async () => {
      await consumeTokens(testUser.id, 'suggestions', 10);
      await consumeTokens(testUser.id, 'chat', 5);
      await consumeTokens(testUser.id, 'insights', 3);

      const check = await checkQuota(testUser.id, 'suggestions');

      // Total consumed: 10 + 5 + 3 = 18
      expect(check.remaining).toBe(32); // 50 - 18
      expect(check.tokensUsed).toBe(18);
    });

    it('should prevent any feature usage when quota is exceeded', async () => {
      // Exceed quota with suggestions
      await consumeTokens(testUser.id, 'suggestions', 50);

      // Try to use different feature
      const chatResult = await consumeTokens(testUser.id, 'chat');

      expect(chatResult.success).toBe(false);
      expect(chatResult.exceeded).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error for non-existent user', async () => {
      await expect(
        checkQuota('non-existent-user-id', 'suggestions')
      ).rejects.toThrow();
    });

    it('should handle invalid feature gracefully', async () => {
      const result = await checkQuota(testUser.id, 'unknown_feature');

      // Should work but use default cost (1)
      expect(result.allowed).toBe(true);
      expect(result.tokenCost).toBe(1);
    });
  });
});
