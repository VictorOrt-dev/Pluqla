const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

/**
 * GLOBAL E2E TEST CLEANUP
 *
 * This script runs once after all E2E tests to:
 * 1. Clean up test data from database
 * 2. Close database connections
 * 3. Clear mock services
 * 4. Generate test reports
 */

let prisma;

async function globalCleanup() {
  console.log('🧹 Starting E2E Test Global Cleanup...');

  try {
    // 1. Initialize Prisma with test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL
        }
      }
    });

    console.log('✅ Connected to test database for cleanup');

    // 2. Clean up test data
    await cleanupTestData();

    // 3. Generate cleanup report
    await generateCleanupReport();

    // 4. Clear mock services
    await clearMockServices();

    // 5. Close database connections
    await prisma.$disconnect();

    console.log('✅ E2E Test Global Cleanup Complete');

  } catch (error) {
    console.error('❌ E2E Test Global Cleanup Failed:', error.message);

    // Ensure database connection is closed even on error
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️  Failed to disconnect from database:', disconnectError.message);
      }
    }

    // Don't fail CI/CD on cleanup errors (tests already passed)
    console.log('⚠️  Cleanup errors are logged but won\'t fail the pipeline');
  }
}

/**
 * Clean up all test-generated data
 */
async function cleanupTestData() {
  console.log('🗑️  Cleaning up test data...');

  try {
    // Count test records before cleanup
    const beforeCounts = await getTestDataCounts();
    console.log('📊 Test data before cleanup:', beforeCounts);

    // Delete test data in dependency order
    const cleanupQueries = [
      // Analytics and logs
      `DELETE FROM analytics_events WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM cache_entries WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM daily_challenges WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,

      // User-related data
      `DELETE FROM user_badges WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM favorite_recipes WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM user_answers WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,

      // Financial data
      `DELETE FROM account_transactions WHERE id LIKE 'e2e-%' OR "accountId" IN (SELECT id FROM accounts WHERE "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com'))`,
      `DELETE FROM financial_suggestions WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM budget_plans WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM expenses WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM net_worth_snapshots WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM financial_goals WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM incomes WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM liabilities WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM assets WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM accounts WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,

      // Security and compliance
      `DELETE FROM security_incidents WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM data_processing_logs WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM user_consents WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,

      // System data
      `DELETE FROM images WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM feature_flags WHERE id LIKE 'e2e-%'`,

      // Authentication tokens
      `DELETE FROM refresh_tokens WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM token_blacklist WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM password_resets WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,

      // Core data
      `DELETE FROM transactions WHERE id LIKE 'e2e-%' OR "userId" IN (SELECT id FROM users WHERE email LIKE '%@e2etest.com')`,
      `DELETE FROM users WHERE id LIKE 'e2e-%' OR email LIKE '%@e2etest.com'`,

      // Static data (clean up test entries only)
      `DELETE FROM recipes WHERE id LIKE 'e2e-%'`,
      `DELETE FROM badges WHERE id LIKE 'e2e-%'`,
      `DELETE FROM category_mappings WHERE id LIKE 'e2e-%'`
    ];

    // Execute cleanup queries
    let cleanedRecords = 0;
    for (const query of cleanupQueries) {
      try {
        const result = await prisma.$executeRawUnsafe(query);
        cleanedRecords += result;
      } catch (error) {
        // Log but don't fail - table might not exist or query might be invalid
        console.log(`⚠️  Cleanup query warning: ${error.message.substring(0, 100)}...`);
      }
    }

    // Count test records after cleanup
    const afterCounts = await getTestDataCounts();
    console.log('📊 Test data after cleanup:', afterCounts);

    console.log(`✅ Cleaned up ${cleanedRecords} test records`);

  } catch (error) {
    console.error('❌ Failed to clean up test data:', error.message);
    // Don't throw - cleanup errors shouldn't fail the pipeline
  }
}

/**
 * Get counts of test data across tables
 */
async function getTestDataCounts() {
  const counts = {};

  const tables = ['users', 'transactions', 'refresh_tokens', 'password_resets', 'cache_entries'];

  for (const table of tables) {
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM "${table}"
        WHERE id LIKE 'e2e-%' OR id LIKE 'test-%'
           OR (email IS NOT NULL AND email LIKE '%@e2etest.com')
      `);
      counts[table] = parseInt(result[0].count);
    } catch (error) {
      counts[table] = 'N/A';
    }
  }

  return counts;
}

/**
 * Generate cleanup report
 */
async function generateCleanupReport() {
  console.log('📋 Generating cleanup report...');

  try {
    const report = {
      timestamp: new Date().toISOString(),
      database: process.env.TEST_DATABASE_URL?.replace(/password=[^&]+/g, 'password=***'),
      environment: process.env.NODE_ENV,
      cleanupStatus: 'completed'
    };

    // Write report to test results directory
    const fs = require('fs').promises;
    const reportPath = path.join(__dirname, '../../test-results/cleanup-report.json');

    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('✅ Cleanup report generated:', reportPath);

  } catch (error) {
    console.error('⚠️  Failed to generate cleanup report:', error.message);
    // Don't throw - report generation failure shouldn't fail pipeline
  }
}

/**
 * Clear mock services
 */
async function clearMockServices() {
  console.log('🧽 Clearing mock services...');

  try {
    // Clear mock email store
    if (global.mockEmailStore) {
      global.mockEmailStore.clear();
      global.mockEmailStore = null;
    }

    console.log('✅ Mock services cleared');

  } catch (error) {
    console.error('⚠️  Failed to clear mock services:', error.message);
    // Don't throw - mock service cleanup failure is not critical
  }
}

module.exports = globalCleanup;

// Run cleanup if called directly
if (require.main === module) {
  globalCleanup()
    .then(() => {
      console.log('🎉 E2E Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('⚠️  E2E Cleanup encountered errors:', error);
      // Exit with 0 - cleanup errors shouldn't fail pipeline
      process.exit(0);
    });
}