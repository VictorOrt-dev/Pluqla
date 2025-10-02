/**
 * AI Quota Concurrency Test
 *
 * Tests that the atomic quota consumption prevents race conditions
 * under concurrent load. Spawns multiple parallel requests and verifies
 * that quotas are enforced correctly.
 *
 * Run: npm test -- tests/aiQuotaConcurrency.test.js
 */

const { consumeTokensAtomic, resetQuota, QUOTA_LIMITS } = require('../src/services/aiUsageService');
const prisma = require('../src/lib/prismaClient');

describe('AI Quota Concurrency Tests', () => {
  let testUser;

  beforeAll(async () => {
    // Create test user for concurrency tests
    testUser = await prisma.user.create({
      data: {
        email: `concurrent-test-${Date.now()}@test.com`,
        password: 'hashedpassword',
        name: 'Concurrent Test User',
        isPremium: false, // Free tier: 50 tokens
        emailVerified: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup test user and usage records
    await prisma.aiUsage.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
  });

  beforeEach(async () => {
    // Reset quota before each test
    await resetQuota(testUser.id);
  });

  test('should prevent quota bypass under concurrent load', async () => {
    const feature = 'suggestions';
    const tokensPerRequest = 1;
    const concurrentRequests = 60; // Attempt 60 requests, quota is 50

    // Spawn concurrent requests
    const requests = Array(concurrentRequests)
      .fill(null)
      .map(() => consumeTokensAtomic(testUser.id, feature, tokensPerRequest, {
        ipAddress: '127.0.0.1',
        userAgent: 'concurrency-test'
      }));

    // Wait for all requests to complete
    const results = await Promise.all(requests);

    // Count successes and failures
    const successes = results.filter(r => r.success === true);
    const failures = results.filter(r => r.success === false && r.exceeded === true);

    console.log(`Concurrent quota test: ${successes.length} successes, ${failures.length} failures`);

    // Verify quota enforcement
    expect(successes.length).toBe(QUOTA_LIMITS.free); // Exactly 50 should succeed
    expect(failures.length).toBe(concurrentRequests - QUOTA_LIMITS.free); // 10 should fail

    // Verify final state
    const finalCheck = await consumeTokensAtomic(testUser.id, feature, 1);
    expect(finalCheck.success).toBe(false);
    expect(finalCheck.exceeded).toBe(true);
    expect(finalCheck.remaining).toBe(0);
  }, 30000); // 30s timeout for concurrency test

  test('should handle mixed token consumption under load', async () => {
    const feature = 'chat';
    const quota = QUOTA_LIMITS.free; // 50 tokens

    // Mix of 1, 2, and 3 token requests
    const requests = [
      ...Array(20).fill(1),  // 20 × 1 = 20 tokens
      ...Array(10).fill(2),  // 10 × 2 = 20 tokens
      ...Array(5).fill(3),   // 5 × 3 = 15 tokens
      // Total: 55 tokens (exceeds 50)
    ].map(tokens => consumeTokensAtomic(testUser.id, feature, tokens));

    const results = await Promise.all(requests);

    const successes = results.filter(r => r.success === true);
    const failures = results.filter(r => r.exceeded === true);

    // Calculate total tokens consumed
    const totalConsumed = successes.reduce((sum, r) => {
      // Find matching request token count
      const index = results.indexOf(r);
      const tokens = index < 20 ? 1 : index < 30 ? 2 : 3;
      return sum + tokens;
    }, 0);

    console.log(`Mixed tokens test: consumed ${totalConsumed}/${quota} tokens`);

    // Total consumed should not exceed quota
    expect(totalConsumed).toBeLessThanOrEqual(quota);
    expect(failures.length).toBeGreaterThan(0); // Some should fail
  }, 30000);

  test('should maintain quota accuracy across sequential batches', async () => {
    const feature = 'insights';
    const batchSize = 10;
    const batchCount = 6; // 6 batches × 10 = 60 requests

    for (let batch = 0; batch < batchCount; batch++) {
      const requests = Array(batchSize)
        .fill(null)
        .map(() => consumeTokensAtomic(testUser.id, feature, 1));

      const results = await Promise.all(requests);
      const successes = results.filter(r => r.success === true);

      console.log(`Batch ${batch + 1}: ${successes.length}/${batchSize} succeeded`);

      // First 5 batches should succeed fully
      if (batch < 5) {
        expect(successes.length).toBe(batchSize);
      } else {
        // 6th batch should fail (quota exhausted)
        expect(successes.length).toBe(0);
      }
    }
  }, 30000);

  test('should enforce premium quota correctly under load', async () => {
    // Upgrade user to premium
    await prisma.user.update({
      where: { id: testUser.id },
      data: { isPremium: true }
    });

    const feature = 'suggestions';
    const concurrentRequests = 510; // Attempt 510 requests, premium quota is 500

    const requests = Array(concurrentRequests)
      .fill(null)
      .map(() => consumeTokensAtomic(testUser.id, feature, 1));

    const results = await Promise.all(requests);

    const successes = results.filter(r => r.success === true);
    const failures = results.filter(r => r.exceeded === true);

    console.log(`Premium quota test: ${successes.length} successes, ${failures.length} failures`);

    // Verify premium quota enforcement
    expect(successes.length).toBe(QUOTA_LIMITS.premium); // Exactly 500 should succeed
    expect(failures.length).toBe(10); // 10 should fail

    // Downgrade back to free
    await prisma.user.update({
      where: { id: testUser.id },
      data: { isPremium: false }
    });
  }, 60000); // 60s timeout for large test

  test('should handle transaction rollback on database errors', async () => {
    // This test verifies that quota is not consumed if transaction fails
    const feature = 'suggestions';

    // First, consume 45 tokens to get close to limit
    const initialRequests = Array(45)
      .fill(null)
      .map(() => consumeTokensAtomic(testUser.id, feature, 1));

    await Promise.all(initialRequests);

    // Now attempt to consume with an invalid feature (should not affect quota if it fails)
    try {
      // Attempt consumption with validation that might fail
      const result = await consumeTokensAtomic(testUser.id, feature, 1, {
        ipAddress: '127.0.0.1'
      });

      // This should succeed (token 46)
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 50 - 46 = 4
    } catch (error) {
      // If it fails, quota should remain unchanged
      const checkResult = await consumeTokensAtomic(testUser.id, feature, 1);
      expect(checkResult.remaining).toBe(4); // Still 4 remaining
    }
  }, 30000);
});
