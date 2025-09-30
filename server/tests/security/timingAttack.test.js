/**
 * Timing Attack Mitigation Tests
 *
 * Verifies that login response times are consistent regardless of:
 * - Username/email existence
 * - Password correctness
 * - Account status
 *
 * This prevents attackers from using timing differences to enumerate users
 */

const request = require('supertest');
const { prisma } = require('../../src/lib/prisma');
const app = require('../../src/app');

describe('Timing Attack Mitigation', () => {
  let validUser;
  const validEmail = `timingattack.${Date.now()}@test.com`;
  const validPassword = 'SecurePassword123!@#';
  const nonExistentEmail = `nonexistent.${Date.now()}@test.com`;

  beforeAll(async () => {
    // Create a valid test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: validEmail,
        password: validPassword,
        name: 'Timing Attack Test User',
      });

    validUser = response.body.data.user;
  });

  afterAll(async () => {
    // Cleanup
    if (validUser) {
      await prisma.refreshToken.deleteMany({
        where: { userId: validUser.id },
      });
      await prisma.user.delete({
        where: { id: validUser.id },
      });
    }
  });

  /**
   * Measure response time for a login attempt
   */
  async function measureLoginTime(email, password) {
    const startTime = process.hrtime.bigint();

    await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6; // Convert nanoseconds to milliseconds

    return durationMs;
  }

  describe('Response Time Consistency', () => {
    it('should have similar response times for valid vs invalid users', async () => {
      const iterations = 5;
      const validUserTimes = [];
      const invalidUserTimes = [];

      // Measure valid user login times (wrong password)
      for (let i = 0; i < iterations; i++) {
        const time = await measureLoginTime(validEmail, 'WrongPassword123!');
        validUserTimes.push(time);
      }

      // Measure invalid user login times
      for (let i = 0; i < iterations; i++) {
        const time = await measureLoginTime(nonExistentEmail, 'SomePassword123!');
        invalidUserTimes.push(time);
      }

      // Calculate averages
      const avgValidTime = validUserTimes.reduce((a, b) => a + b) / validUserTimes.length;
      const avgInvalidTime = invalidUserTimes.reduce((a, b) => a + b) / invalidUserTimes.length;

      // Calculate difference
      const timeDifference = Math.abs(avgValidTime - avgInvalidTime);

      // Log for analysis
      console.log(`\n  ⏱️  Timing Analysis:`);
      console.log(`    Valid user (wrong password):   ${avgValidTime.toFixed(2)}ms (avg)`);
      console.log(`    Invalid user:                   ${avgInvalidTime.toFixed(2)}ms (avg)`);
      console.log(`    Difference:                     ${timeDifference.toFixed(2)}ms`);
      console.log(`    Times (valid):                  ${validUserTimes.map(t => t.toFixed(2)).join(', ')}`);
      console.log(`    Times (invalid):                ${invalidUserTimes.map(t => t.toFixed(2)).join(', ')}`);

      // CRITICAL: Time difference should be minimal
      // Threshold: 50ms (accounting for network/system variance)
      expect(timeDifference).toBeLessThan(50);
    }, 60000); // 60 second timeout for this test

    it('should have response times within acceptable variance', async () => {
      const iterations = 10;
      const times = [];

      // Measure multiple login attempts for the same scenario
      for (let i = 0; i < iterations; i++) {
        const time = await measureLoginTime(validEmail, 'WrongPassword123!');
        times.push(time);
      }

      // Calculate standard deviation
      const avg = times.reduce((a, b) => a + b) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      console.log(`\n  📊 Variance Analysis:`);
      console.log(`    Average:        ${avg.toFixed(2)}ms`);
      console.log(`    Std Deviation:  ${stdDev.toFixed(2)}ms`);
      console.log(`    Min:            ${Math.min(...times).toFixed(2)}ms`);
      console.log(`    Max:            ${Math.max(...times).toFixed(2)}ms`);

      // Standard deviation should be low (consistent timing)
      // Allow some variance due to system load
      expect(stdDev).toBeLessThan(30);
    }, 60000);

    it('should normalize timing for successful vs failed logins', async () => {
      const iterations = 5;
      const successTimes = [];
      const failureTimes = [];

      // Measure successful login times
      for (let i = 0; i < iterations; i++) {
        const time = await measureLoginTime(validEmail, validPassword);
        successTimes.push(time);
      }

      // Measure failed login times (wrong password)
      for (let i = 0; i < iterations; i++) {
        const time = await measureLoginTime(validEmail, 'WrongPassword123!');
        failureTimes.push(time);
      }

      const avgSuccess = successTimes.reduce((a, b) => a + b) / successTimes.length;
      const avgFailure = failureTimes.reduce((a, b) => a + b) / failureTimes.length;
      const difference = Math.abs(avgSuccess - avgFailure);

      console.log(`\n  🔐 Success vs Failure Timing:`);
      console.log(`    Success:    ${avgSuccess.toFixed(2)}ms (avg)`);
      console.log(`    Failure:    ${avgFailure.toFixed(2)}ms (avg)`);
      console.log(`    Difference: ${difference.toFixed(2)}ms`);

      // Both should be close to the normalized baseline (200ms)
      // Allow reasonable variance
      expect(avgSuccess).toBeGreaterThan(180); // At least 180ms (normalized baseline)
      expect(avgFailure).toBeGreaterThan(180);
      expect(difference).toBeLessThan(50); // Difference should be minimal
    }, 60000);
  });

  describe('Baseline Response Time', () => {
    it('should have minimum response time of ~200ms (normalized baseline)', async () => {
      const time = await measureLoginTime(validEmail, 'WrongPassword123!');

      console.log(`\n  ⏱️  Single request time: ${time.toFixed(2)}ms`);

      // Should be at least 200ms due to timing normalization
      expect(time).toBeGreaterThan(180);
    });
  });

  describe('Timing Attack Prevention - User Enumeration', () => {
    it('should not reveal user existence through timing', async () => {
      const existingUserTime = await measureLoginTime(validEmail, 'WrongPassword');
      const nonExistentUserTime = await measureLoginTime(nonExistentEmail, 'WrongPassword');

      const difference = Math.abs(existingUserTime - nonExistentUserTime);

      console.log(`\n  👤 User Enumeration Timing:`);
      console.log(`    Existing user:     ${existingUserTime.toFixed(2)}ms`);
      console.log(`    Non-existent user: ${nonExistentUserTime.toFixed(2)}ms`);
      console.log(`    Difference:        ${difference.toFixed(2)}ms`);

      // CRITICAL: Attacker should not be able to determine user existence from timing
      expect(difference).toBeLessThan(50);
    });
  });

  describe('Statistical Analysis', () => {
    it('should pass statistical timing attack test', async () => {
      // Perform multiple measurements for both scenarios
      const validUserSamples = 20;
      const invalidUserSamples = 20;

      const validUserTimes = [];
      const invalidUserTimes = [];

      console.log(`\n  📈 Running ${validUserSamples + invalidUserSamples} samples...`);

      for (let i = 0; i < validUserSamples; i++) {
        const time = await measureLoginTime(validEmail, 'WrongPassword123!');
        validUserTimes.push(time);
      }

      for (let i = 0; i < invalidUserSamples; i++) {
        const time = await measureLoginTime(nonExistentEmail, 'WrongPassword123!');
        invalidUserTimes.push(time);
      }

      // Calculate statistics
      const avgValid = validUserTimes.reduce((a, b) => a + b) / validUserTimes.length;
      const avgInvalid = invalidUserTimes.reduce((a, b) => a + b) / invalidUserTimes.length;

      const stdDevValid = Math.sqrt(
        validUserTimes.reduce((sum, t) => sum + Math.pow(t - avgValid, 2), 0) / validUserTimes.length
      );
      const stdDevInvalid = Math.sqrt(
        invalidUserTimes.reduce((sum, t) => sum + Math.pow(t - avgInvalid, 2), 0) / invalidUserTimes.length
      );

      console.log(`\n  📊 Statistical Analysis:`);
      console.log(`    Valid user:   avg=${avgValid.toFixed(2)}ms, stdDev=${stdDevValid.toFixed(2)}ms`);
      console.log(`    Invalid user: avg=${avgInvalid.toFixed(2)}ms, stdDev=${stdDevInvalid.toFixed(2)}ms`);
      console.log(`    Avg difference: ${Math.abs(avgValid - avgInvalid).toFixed(2)}ms`);

      // Statistical test: averages should be close
      const avgDifference = Math.abs(avgValid - avgInvalid);
      expect(avgDifference).toBeLessThan(50);

      // Both should have reasonable consistency
      expect(stdDevValid).toBeLessThan(50);
      expect(stdDevInvalid).toBeLessThan(50);
    }, 120000); // 2 minute timeout for statistical test
  });
});
