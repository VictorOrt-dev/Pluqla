/**
 * Jest Global Teardown
 *
 * Runs once after all test suites complete.
 * Cleans up test database and disconnects connections.
 */

const path = require('path');
const { teardownTestDatabase } = require('./teardownTestDatabase');

module.exports = async () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║     Jest Global Teardown - Starting      ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  try {
    // 1. Set test environment
    process.env.NODE_ENV = 'test';

    // 2. Clean up test database
    console.log('🧹 Cleaning up test database...');
    await teardownTestDatabase({ drop: false }); // Truncate tables only
    console.log('✅ Test database cleaned');

    // 3. Optional: Drop test database completely (uncomment if needed)
    // await teardownTestDatabase({ drop: true });
    // console.log('✅ Test database dropped');

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║    Jest Global Teardown - Complete ✅     ║');
    console.log('╚═══════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Jest Global Teardown Failed:', error.message);
    console.error('   This may cause test pollution in next run');
    // Don't throw - let tests complete even if teardown fails
  }
};