/**
 * Test Database Teardown Script
 *
 * Cleans up test database after tests complete.
 * Can be run manually or as part of test suite cleanup.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
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
 * Disconnect all active connections to test database
 */
async function disconnectDatabase() {
  const { user, host, port, password } = parseDbUrl(TEST_DB_URL);

  console.log(`\n🔌 Disconnecting active connections from ${DB_NAME}...`);

  try {
    process.env.PGPASSWORD = password;

    await execAsync(`psql -h ${host} -p ${port} -U ${user} -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" postgres`);

    console.log(`✅ Active connections terminated`);
    return true;
  } catch (error) {
    console.warn(`⚠️  Warning: Could not terminate connections:`, error.message);
    return false;
  }
}

/**
 * Drop test database
 */
async function dropTestDatabase() {
  const { user, host, port, password } = parseDbUrl(TEST_DB_URL);

  console.log(`\n🗑️  Dropping test database: ${DB_NAME}`);

  try {
    process.env.PGPASSWORD = password;

    // Check if database exists
    const checkDb = await execAsync(
      `psql -h ${host} -p ${port} -U ${user} -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" postgres`
    );

    if (checkDb.stdout.trim() !== '1') {
      console.log(`ℹ️  Test database '${DB_NAME}' does not exist (already cleaned up)`);
      return true;
    }

    // Drop database
    await execAsync(`psql -h ${host} -p ${port} -U ${user} -c "DROP DATABASE ${DB_NAME}" postgres`);

    console.log(`✅ Test database dropped successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to drop test database:`, error.message);
    throw error;
  }
}

/**
 * Clean up test database (truncate tables instead of dropping)
 * Faster than dropping/recreating for test isolation
 */
async function cleanTestDatabase() {
  console.log(`\n🧹 Cleaning test database tables...`);

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DB_URL
        }
      }
    });

    // Get all table names
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    // Truncate all tables except _prisma_migrations
    for (const table of tables) {
      if (table.tablename !== '_prisma_migrations') {
        try {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table.tablename}" CASCADE`);
        } catch (error) {
          console.warn(`⚠️  Warning: Could not truncate ${table.tablename}:`, error.message);
        }
      }
    }

    await prisma.$disconnect();

    console.log(`✅ Test database tables cleaned`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clean test database:`, error.message);
    return false;
  }
}

/**
 * Main teardown function
 */
async function teardownTestDatabase(options = {}) {
  const { clean = false, drop = true } = options;

  console.log(`\n╔════════════════════════════════════╗`);
  console.log(`║  Test Database Teardown Starting   ║`);
  console.log(`╚════════════════════════════════════╝\n`);

  try {
    if (clean) {
      // Just clean tables (fast, for between-test isolation)
      await cleanTestDatabase();
    } else if (drop) {
      // Full teardown (drop database)
      await disconnectDatabase();
      await dropTestDatabase();
    }

    console.log(`\n╔════════════════════════════════════╗`);
    console.log(`║  Test Database Teardown Complete ✅║`);
    console.log(`╚════════════════════════════════════╝\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Test database teardown failed:`, error.message);
    process.exit(1);
  }
}

// Run teardown if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    clean: args.includes('--clean'),
    drop: !args.includes('--clean')
  };

  teardownTestDatabase(options);
}

module.exports = { teardownTestDatabase, dropTestDatabase, cleanTestDatabase, disconnectDatabase };