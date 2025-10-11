/**
 * AI Usage Quota Verification Script
 *
 * Simulates 100 AI calls to verify quota enforcement:
 * - Free user: 50 calls should succeed, rest should fail
 * - Premium user: All 100 calls should succeed
 *
 * Run: node scripts/verify-ai-quotas.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const {
  checkQuota,
  consumeTokens,
  resetQuota,
  getUserStats,
  getDailyQuota
} = require('../src/services/aiUsageService');

const prisma = new PrismaClient();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function createTestUsers() {
  logSection('Creating Test Users');

  const password = await bcrypt.hash('TestPassword123!', 12);

  // Create or get free user
  const freeUser = await prisma.user.upsert({
    where: { email: 'verify-free@pluqla.com' },
    update: { isPremium: false },
    create: {
      email: 'verify-free@pluqla.com',
      password,
      name: 'Verification Free User',
      isPremium: false,
      emailVerified: true,
      status: 'active'
    }
  });

  // Create or get premium user
  const premiumUser = await prisma.user.upsert({
    where: { email: 'verify-premium@pluqla.com' },
    update: { isPremium: true },
    create: {
      email: 'verify-premium@pluqla.com',
      password,
      name: 'Verification Premium User',
      isPremium: true,
      emailVerified: true,
      status: 'active'
    }
  });

  log(`✓ Free user created: ${freeUser.email} (ID: ${freeUser.id})`, 'green');
  log(`✓ Premium user created: ${premiumUser.email} (ID: ${premiumUser.id})`, 'green');

  return { freeUser, premiumUser };
}

async function testUserQuota(user, calls = 100, expectedSuccesses = null) {
  const userType = user.isPremium ? 'PREMIUM' : 'FREE';
  const quota = getDailyQuota(user.isPremium);

  logSection(`Testing ${userType} User Quota (${calls} calls)`);

  log(`User: ${user.email}`, 'cyan');
  log(`Daily Quota: ${quota} tokens`, 'cyan');
  log(`Expected successes: ${expectedSuccesses || quota}`, 'cyan');

  // Reset quota first
  await resetQuota(user.id);
  log('✓ Quota reset', 'green');

  const results = {
    successful: 0,
    blocked: 0,
    errors: 0,
    warnings: 0
  };

  // Simulate AI calls
  for (let i = 1; i <= calls; i++) {
    try {
      const result = await consumeTokens(user.id, 'suggestions', 1, {
        test: true,
        callNumber: i
      });

      if (result.success) {
        results.successful++;

        if (result.warning && results.warnings === 0) {
          log(`⚠ Warning threshold reached at call ${i} (${result.remaining} tokens remaining)`, 'yellow');
          results.warnings++;
        }

        // Log progress every 10 calls
        if (i % 10 === 0) {
          process.stdout.write(`  Progress: ${i}/${calls} calls (${result.remaining} remaining)\\r`);
        }
      } else {
        results.blocked++;

        if (results.blocked === 1) {
          log(`\\n✗ First quota exceeded at call ${i}`, 'red');
        }
      }
    } catch (error) {
      results.errors++;
      log(`✗ Error at call ${i}: ${error.message}`, 'red');
    }
  }

  console.log(''); // New line after progress

  // Display results
  log('\\nResults:', 'bright');
  log(`  ✓ Successful calls: ${results.successful}`, results.successful > 0 ? 'green' : 'red');
  log(`  ✗ Blocked calls: ${results.blocked}`, results.blocked > 0 ? 'yellow' : 'green');
  log(`  ✗ Errors: ${results.errors}`, results.errors > 0 ? 'red' : 'green');

  // Verify expectations
  const expectedBlocked = calls - (expectedSuccesses || quota);
  const success = results.successful === (expectedSuccesses || quota) &&
                  results.blocked === expectedBlocked &&
                  results.errors === 0;

  if (success) {
    log('\\n✓ QUOTA ENFORCEMENT WORKING CORRECTLY', 'green');
  } else {
    log('\\n✗ QUOTA ENFORCEMENT FAILED', 'red');
    log(`  Expected ${expectedSuccesses || quota} successes, got ${results.successful}`, 'red');
    log(`  Expected ${expectedBlocked} blocked, got ${results.blocked}`, 'red');
  }

  // Get and display stats
  const stats = await getUserStats(user.id, 1);
  log('\\nUsage Statistics:', 'bright');
  log(`  Total requests: ${stats.totalRequests}`, 'cyan');
  log(`  Total tokens: ${stats.totalTokens}`, 'cyan');
  log(`  Quota exceeded events: ${stats.quotaExceededCount}`, 'cyan');

  return { results, success };
}

async function testFeatureCosts() {
  logSection('Testing Different Feature Costs');

  const password = await bcrypt.hash('TestPassword123!', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'verify-features@pluqla.com' },
    update: {},
    create: {
      email: 'verify-features@pluqla.com',
      password,
      name: 'Feature Test User',
      isPremium: false,
      emailVerified: true,
      status: 'active'
    }
  });

  await resetQuota(testUser.id);

  const features = [
    { name: 'suggestions', cost: 1 },
    { name: 'chat', cost: 2 },
    { name: 'insights', cost: 3 },
    { name: 'image_analysis', cost: 5 }
  ];

  for (const feature of features) {
    const before = await checkQuota(testUser.id, feature.name);
    await consumeTokens(testUser.id, feature.name);
    const after = await checkQuota(testUser.id, feature.name);

    const consumed = before.remaining - after.remaining;
    const success = consumed === feature.cost;

    log(
      `  ${feature.name}: ${consumed} tokens consumed (expected ${feature.cost}) ${success ? '✓' : '✗'}`,
      success ? 'green' : 'red'
    );
  }
}

async function testQuotaReset() {
  logSection('Testing Quota Reset');

  const password = await bcrypt.hash('TestPassword123!', 12);
  const resetUser = await prisma.user.upsert({
    where: { email: 'verify-reset@pluqla.com' },
    update: {},
    create: {
      email: 'verify-reset@pluqla.com',
      password,
      name: 'Reset Test User',
      isPremium: false,
      emailVerified: true,
      status: 'active'
    }
  });

  // Consume some quota
  await resetQuota(resetUser.id);
  await consumeTokens(resetUser.id, 'suggestions', 30);

  let check = await checkQuota(resetUser.id, 'suggestions');
  log(`Before reset: ${check.remaining}/50 tokens remaining`, 'cyan');

  // Reset quota
  const resetResult = await resetQuota(resetUser.id);
  log(`Reset result: ${resetResult.recordsDeleted} records deleted`, 'cyan');

  check = await checkQuota(resetUser.id, 'suggestions');
  log(`After reset: ${check.remaining}/50 tokens remaining`, 'cyan');

  const success = check.remaining === 50;
  log(success ? '✓ Reset working correctly' : '✗ Reset failed', success ? 'green' : 'red');
}

async function cleanup(users) {
  logSection('Cleaning Up Test Data');

  try {
    // Delete all usage records for test users
    const userIds = users.map(u => u.id);
    const deletedUsage = await prisma.aiUsage.deleteMany({
      where: { userId: { in: userIds } }
    });

    log(`✓ Deleted ${deletedUsage.count} usage records`, 'green');

    // Note: Not deleting users so they can be reused
    log('✓ Test users kept for future verifications', 'green');
  } catch (error) {
    log(`✗ Cleanup error: ${error.message}`, 'red');
  }
}

async function main() {
  console.clear();
  logSection('🧪 AI Usage Quota Verification Script');
  log('This script verifies that AI quota enforcement is working correctly', 'cyan');

  try {
    // Create test users
    const { freeUser, premiumUser } = await createTestUsers();

    // Test free user (should allow 50, block rest)
    const freeResult = await testUserQuota(freeUser, 100, 50);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test premium user (should allow all 100)
    const premiumResult = await testUserQuota(premiumUser, 100, 100);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test different feature costs
    await testFeatureCosts();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test quota reset
    await testQuotaReset();

    // Cleanup
    await cleanup([freeUser, premiumUser]);

    // Final summary
    logSection('📊 Verification Summary');

    const allSuccess = freeResult.success && premiumResult.success;

    if (allSuccess) {
      log('\\n✅ ALL TESTS PASSED', 'green');
      log('AI quota system is working correctly!', 'green');
    } else {
      log('\\n❌ SOME TESTS FAILED', 'red');
      log('Please review the logs above for details.', 'red');
    }

    log('\\n📝 Test Users (credentials for manual testing):', 'cyan');
    log('  Free User: verify-free@pluqla.com (50 tokens/day)', 'cyan');
    log('  Premium User: verify-premium@pluqla.com (500 tokens/day)', 'cyan');
    log('  Password: TestPassword123!', 'cyan');

  } catch (error) {
    log(`\\n❌ VERIFICATION FAILED`, 'red');
    log(`Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
main()
  .then(() => {
    log('\\n✓ Verification complete', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log('\\n✗ Verification failed', 'red');
    console.error(error);
    process.exit(1);
  });
