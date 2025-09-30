/**
 * Test Database Setup Script
 *
 * Creates and configures the test database before running tests.
 * Ensures complete isolation from development and production databases.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Load test environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

const TEST_DB_URL = process.env.DATABASE_URL;
const DB_NAME = 'pluqla_test';

/**
 * Parse PostgreSQL connection URL
 */
function parseDbUrl(url) {
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
  const match = url.match(regex);

  if (!match) {
    throw new Error(`Invalid DATABASE_URL format: ${url}`);
  }

  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5]
  };
}

/**
 * Check if PostgreSQL is running
 */
async function checkPostgresRunning() {
  try {
    const { user, host, port } = parseDbUrl(TEST_DB_URL);
    await execAsync(`psql -h ${host} -p ${port} -U ${user} -c "SELECT 1" postgres`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create test database if it doesn't exist
 */
async function createTestDatabase() {
  const { user, host, port, password } = parseDbUrl(TEST_DB_URL);

  console.log(`\n🔧 Setting up test database: ${DB_NAME}`);

  try {
    // Set password environment variable for psql
    process.env.PGPASSWORD = password;

    // Check if database exists
    const checkDb = await execAsync(
      `psql -h ${host} -p ${port} -U ${user} -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" postgres`
    );

    if (checkDb.stdout.trim() === '1') {
      console.log(`✅ Test database '${DB_NAME}' already exists`);

      // Drop and recreate for clean slate
      console.log(`🧹 Dropping existing test database for clean slate...`);
      await execAsync(`psql -h ${host} -p ${port} -U ${user} -c "DROP DATABASE ${DB_NAME}" postgres`);
      console.log(`✅ Dropped existing test database`);
    }

    // Create database
    console.log(`📦 Creating test database '${DB_NAME}'...`);
    await execAsync(`psql -h ${host} -p ${port} -U ${user} -c "CREATE DATABASE ${DB_NAME}" postgres`);
    console.log(`✅ Test database created successfully`);

    return true;
  } catch (error) {
    console.error(`❌ Failed to create test database:`, error.message);
    throw error;
  }
}

/**
 * Run Prisma migrations on test database
 */
async function runPrismaMigrations() {
  console.log(`\n🔄 Running Prisma migrations on test database...`);

  try {
    // Generate Prisma Client
    console.log(`📝 Generating Prisma Client...`);
    await execAsync('npx prisma generate', {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL }
    });
    console.log(`✅ Prisma Client generated`);

    // Deploy migrations
    console.log(`📤 Deploying migrations...`);
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL }
    });

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);

    console.log(`✅ Migrations deployed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to run migrations:`, error.message);
    throw error;
  }
}

/**
 * Seed test database with minimal test data
 */
async function seedTestData() {
  console.log(`\n🌱 Seeding test database with test data...`);

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DB_URL
        }
      }
    });

    // Create test user for integration tests
    const bcrypt = require('bcryptjs');
    const testPassword = await bcrypt.hash('TestPassword123!', 12);

    await prisma.user.upsert({
      where: { email: 'test@pluqla.com' },
      update: {},
      create: {
        email: 'test@pluqla.com',
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isEmailVerified: true,
        isPremium: false,
        monthlyGoal: 500,
        savedAmount: 0,
        level: 1,
        gamificationPoints: 0
      }
    });

    // Create premium test user
    await prisma.user.upsert({
      where: { email: 'premium@pluqla.com' },
      update: {},
      create: {
        email: 'premium@pluqla.com',
        password: testPassword,
        firstName: 'Premium',
        lastName: 'User',
        role: 'user',
        isEmailVerified: true,
        isPremium: true,
        monthlyGoal: 1000,
        savedAmount: 5000,
        level: 5,
        gamificationPoints: 1000
      }
    });

    // Create admin test user
    await prisma.user.upsert({
      where: { email: 'admin@pluqla.com' },
      update: {},
      create: {
        email: 'admin@pluqla.com',
        password: testPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isEmailVerified: true,
        isPremium: true,
        monthlyGoal: 0,
        savedAmount: 0,
        level: 1,
        gamificationPoints: 0
      }
    });

    await prisma.$disconnect();

    console.log(`✅ Test data seeded successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to seed test data:`, error.message);
    // Non-fatal error - tests can continue
    return false;
  }
}

/**
 * Main setup function
 */
async function setupTestDatabase() {
  console.log(`\n╔════════════════════════════════════╗`);
  console.log(`║   Test Database Setup Starting     ║`);
  console.log(`╚════════════════════════════════════╝\n`);

  try {
    // 1. Check PostgreSQL is running
    console.log(`🔍 Checking PostgreSQL connection...`);
    const isRunning = await checkPostgresRunning();

    if (!isRunning) {
      console.error(`\n❌ PostgreSQL is not running!`);
      console.error(`\n📝 Start PostgreSQL:`);
      console.error(`   - Windows: Start PostgreSQL service`);
      console.error(`   - macOS: brew services start postgresql`);
      console.error(`   - Linux: sudo service postgresql start\n`);
      process.exit(1);
    }

    console.log(`✅ PostgreSQL is running`);

    // 2. Create test database
    await createTestDatabase();

    // 3. Run migrations
    await runPrismaMigrations();

    // 4. Seed test data
    await seedTestData();

    console.log(`\n╔════════════════════════════════════╗`);
    console.log(`║   Test Database Setup Complete ✅  ║`);
    console.log(`╚════════════════════════════════════╝\n`);

    console.log(`📊 Test database is ready at: ${DB_NAME}`);
    console.log(`🧪 You can now run tests with: npm test\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Test database setup failed:`, error.message);
    console.error(`\n💡 Troubleshooting:`);
    console.error(`   1. Ensure PostgreSQL is running`);
    console.error(`   2. Check DATABASE_URL in .env.test`);
    console.error(`   3. Verify PostgreSQL user has CREATE DATABASE permission`);
    console.error(`   4. Check logs above for specific errors\n`);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupTestDatabase();
}

module.exports = { setupTestDatabase, createTestDatabase, runPrismaMigrations, seedTestData };