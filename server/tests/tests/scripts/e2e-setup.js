const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

/**
 * GLOBAL E2E TEST SETUP
 *
 * This script runs once before all E2E tests to:
 * 1. Ensure test database exists and is clean
 * 2. Apply database migrations
 * 3. Verify backend services are accessible
 * 4. Initialize mock services
 */

let prisma;

async function globalSetup() {
  console.log('🚀 Starting E2E Test Global Setup...');

  try {
    // 1. Initialize Prisma with test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL
        }
      }
    });

    console.log('✅ Connected to test database');

    // 2. Clean test database (remove all test data)
    await cleanTestDatabase();

    // 3. Apply database migrations
    await applyMigrations();

    // 4. Verify database schema
    await verifyDatabaseSchema();

    // 5. Initialize mock email service
    await initializeMockEmailService();

    // 6. Verify API server connectivity
    await verifyAPIServer();

    console.log('✅ E2E Test Global Setup Complete');

  } catch (error) {
    console.error('❌ E2E Test Global Setup Failed:', error.message);
    console.error('Stack:', error.stack);

    // Cleanup on failure
    if (prisma) {
      await prisma.$disconnect();
    }

    process.exit(1);
  }
}

/**
 * Clean test database by removing all test-generated data
 */
async function cleanTestDatabase() {
  console.log('🧹 Cleaning test database...');

  try {
    // Delete in reverse dependency order to avoid foreign key constraints
    const tables = [
      'analytics_events',
      'cache_entries',
      'daily_challenges',
      'user_badges',
      'favorite_recipes',
      'user_answers',
      'account_transactions',
      'financial_suggestions',
      'budget_plans',
      'expenses',
      'net_worth_snapshots',
      'financial_goals',
      'incomes',
      'liabilities',
      'assets',
      'accounts',
      'security_incidents',
      'data_processing_logs',
      'user_consents',
      'category_mappings',
      'images',
      'feature_flags',
      'refresh_tokens',
      'token_blacklist',
      'password_resets',
      'recipes',
      'badges',
      'transactions',
      'users'
    ];

    // Delete all data from each table
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id LIKE 'e2e-%' OR id LIKE 'test-%' OR email LIKE '%@e2etest.com'`);
      } catch (error) {
        // Table might not exist or have different structure - continue
        console.log(`⚠️  Skipped cleaning table ${table}: ${error.message}`);
      }
    }

    // Reset sequences if they exist (PostgreSQL)
    try {
      const sequences = await prisma.$queryRaw`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
      `;

      for (const seq of sequences) {
        await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${seq.sequence_name}" RESTART WITH 1`);
      }
    } catch (error) {
      console.log('⚠️  Could not reset sequences (this is usually fine)');
    }

    console.log('✅ Test database cleaned');

  } catch (error) {
    console.error('❌ Failed to clean test database:', error.message);
    throw error;
  }
}

/**
 * Apply database migrations to test database
 */
async function applyMigrations() {
  console.log('🔄 Applying database migrations...');

  try {
    // Run Prisma migrations
    const migrationCommand = process.platform === 'win32'
      ? 'npx.cmd prisma migrate deploy'
      : 'npx prisma migrate deploy';

    const migrationResult = execSync(migrationCommand, {
      cwd: path.join(__dirname, '../../backend'),
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL
      },
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    console.log('📋 Migration output:', migrationResult);

    // Generate Prisma client for test database
    const generateCommand = process.platform === 'win32'
      ? 'npx.cmd prisma generate'
      : 'npx prisma generate';

    execSync(generateCommand, {
      cwd: path.join(__dirname, '../../backend'),
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL
      },
      encoding: 'utf-8'
    });

    console.log('✅ Database migrations applied successfully');

  } catch (error) {
    console.error('❌ Failed to apply migrations:', error.message);
    console.error('Migration stdout:', error.stdout?.toString());
    console.error('Migration stderr:', error.stderr?.toString());
    throw error;
  }
}

/**
 * Verify database schema is correctly applied
 */
async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema...');

  try {
    // Check critical tables exist
    const criticalTables = ['users', 'transactions', 'refresh_tokens', 'password_resets'];

    for (const table of criticalTables) {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${table}
        ) as table_exists
      `;

      if (!result[0].table_exists) {
        throw new Error(`Critical table '${table}' does not exist`);
      }
    }

    // Check critical indexes exist
    const criticalIndexes = [
      'idx_transaction_user_id',
      'idx_user_status',
      'idx_refresh_token_user_active'
    ];

    for (const index of criticalIndexes) {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE indexname = ${index}
        ) as index_exists
      `;

      if (!result[0].index_exists) {
        console.log(`⚠️  Index '${index}' not found - may impact performance`);
      }
    }

    console.log('✅ Database schema verification passed');

  } catch (error) {
    console.error('❌ Database schema verification failed:', error.message);
    throw error;
  }
}

/**
 * Initialize mock email service for password reset testing
 */
async function initializeMockEmailService() {
  console.log('📧 Initializing mock email service...');

  try {
    // Create a simple in-memory email store
    global.mockEmailStore = {
      emails: [],
      clear: () => { global.mockEmailStore.emails = []; },
      getEmails: () => global.mockEmailStore.emails,
      getLatestEmail: () => global.mockEmailStore.emails[global.mockEmailStore.emails.length - 1]
    };

    console.log('✅ Mock email service initialized');

  } catch (error) {
    console.error('❌ Failed to initialize mock email service:', error.message);
    throw error;
  }
}

/**
 * Verify API server is accessible
 */
async function verifyAPIServer() {
  console.log('🌐 Verifying API server accessibility...');

  try {
    const testUrl = process.env.TEST_API_URL || 'http://localhost:3004';

    // Simple fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${testUrl}/health`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API server returned ${response.status}: ${response.statusText}`);
    }

    const health = await response.json().catch(() => ({}));
    console.log('📊 API server health:', health);

    console.log('✅ API server is accessible');

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('API server connection timeout - ensure server is running');
    }
    console.error('❌ Failed to verify API server:', error.message);
    throw error;
  }
}

module.exports = globalSetup;

// Run setup if called directly
if (require.main === module) {
  globalSetup()
    .then(() => {
      console.log('🎉 E2E Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 E2E Setup failed:', error);
      process.exit(1);
    });
}