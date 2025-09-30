/**
 * Jest Global Setup
 *
 * Runs once before all test suites.
 * Sets up test database and Prisma client.
 */

const path = require('path');
const { execSync } = require('child_process');

// Load test environment
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

module.exports = async () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║      Jest Global Setup - Starting        ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  try {
    // 1. Set test environment
    process.env.NODE_ENV = 'test';
    console.log('✅ Test environment set');

    // 2. Ensure PostgreSQL is running
    console.log('🔍 Checking PostgreSQL...');
    try {
      execSync('psql --version', { stdio: 'ignore' });
      console.log('✅ PostgreSQL is available');
    } catch (error) {
      console.warn('⚠️  Warning: psql command not found');
    }

    // 3. Generate Prisma Client
    console.log('📝 Generating Prisma Client...');
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '../..'),
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Prisma Client generated');

    // 4. Create and setup test database
    console.log('🔧 Setting up test database...');
    const { setupTestDatabase } = require('./setupTestDatabase');
    await setupTestDatabase();

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║    Jest Global Setup - Complete ✅        ║');
    console.log('╚═══════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Jest Global Setup Failed:', error.message);
    console.error('\n💡 Make sure PostgreSQL is running and accessible');
    console.error('   DATABASE_URL:', process.env.DATABASE_URL);
    throw error;
  }
};