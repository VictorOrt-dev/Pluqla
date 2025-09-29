#!/usr/bin/env node
/**
 * Migration Script: SQLite to PostgreSQL
 *
 * This script handles the migration from SQLite to PostgreSQL
 * for production-ready security and compliance.
 *
 * USAGE:
 *   node scripts/migrate-to-postgresql.js
 *
 * PREREQUISITES:
 *   1. PostgreSQL server running
 *   2. Database created: CREATE DATABASE pluqla_production;
 *   3. User created with permissions
 *   4. DATABASE_URL updated in .env
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting PostgreSQL Migration...\n');

// Step 1: Validate environment
console.log('📋 Step 1: Validating environment...');
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FINANCIAL_ENCRYPTION_KEY'
];

const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Please copy .env.example to .env and configure it.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const missingVars = requiredEnvVars.filter(varName =>
  !envContent.includes(`${varName}=`) || envContent.includes(`${varName}="CHANGE_ME`)
);

if (missingVars.length > 0) {
  console.error(`❌ Missing or invalid environment variables: ${missingVars.join(', ')}`);
  console.error('Please update your .env file with secure values.');
  process.exit(1);
}

console.log('✅ Environment validation passed\n');

// Step 2: Generate Prisma client
console.log('📋 Step 2: Generating Prisma client for PostgreSQL...');
try {
  execSync('npx prisma generate', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('✅ Prisma client generated\n');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

// Step 3: Create database schema
console.log('📋 Step 3: Creating database schema...');
try {
  execSync('npx prisma db push', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('✅ Database schema created\n');
} catch (error) {
  console.error('❌ Failed to create database schema:', error.message);
  console.error('\nTroubleshooting:');
  console.error('1. Ensure PostgreSQL is running');
  console.error('2. Verify DATABASE_URL is correct');
  console.error('3. Check that the database exists');
  console.error('4. Verify user has permissions');
  process.exit(1);
}

// Step 4: Verify migration
console.log('📋 Step 4: Verifying migration...');
try {
  const { getPrismaClient, getDatabaseHealth } = require('../src/lib/prisma');

  (async () => {
    try {
      const health = await getDatabaseHealth();
      if (health.healthy) {
        console.log(`✅ Database connection verified (${health.latency}ms)\n`);
      } else {
        throw new Error(health.error);
      }

      // Test basic operations
      const prisma = getPrismaClient();
      const userCount = await prisma.user.count();
      console.log(`📊 Current user count: ${userCount}`);

      console.log('\n🎉 PostgreSQL migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Run tests: npm test');
      console.log('2. Start the server: npm start');
      console.log('3. Verify all functionality works');

    } catch (error) {
      console.error('❌ Migration verification failed:', error.message);
      process.exit(1);
    }
  })();

} catch (error) {
  console.error('❌ Failed to verify migration:', error.message);
  process.exit(1);
}