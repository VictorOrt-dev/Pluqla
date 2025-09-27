const { defineConfig, devices } = require('@playwright/test');

/**
 * PLAYWRIGHT E2E CONFIGURATION FOR PLUQLA
 *
 * Optimized for:
 * - Fast API testing (< 2 minutes total)
 * - Financial application security
 * - CI/CD integration
 * - Database isolation
 */

module.exports = defineConfig({
  // Test directory
  testDir: './server/tests/e2e',

  // Global test timeout (2 minutes for entire suite)
  timeout: 120000,

  // Individual test timeout (30 seconds max)
  expect: {
    timeout: 30000,
  },

  // Fail fast on CI, run all locally for debugging
  fullyParallel: process.env.CI ? false : true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Parallel workers for speed (limited on CI for database safety)
  workers: process.env.CI ? 1 : 2,

  // Test reporter - detailed for CI, concise locally
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    process.env.CI ? ['github'] : ['line']
  ],

  // Global setup and teardown
  globalSetup: './server/tests/scripts/e2e-setup.js',
  globalTeardown: './server/tests/scripts/e2e-cleanup.js',

  // Test configuration
  use: {
    // API testing configuration
    baseURL: process.env.TEST_API_URL || 'http://localhost:3004',

    // Headers for all API requests
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Pluqla-E2E-Tests/1.0'
    },

    // Security and debugging
    ignoreHTTPSErrors: true,
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: 'retain-on-failure',
  },

  // Test environment setup
  projects: [
    {
      name: 'API Tests',
      use: {
        ...devices['Desktop Chrome'],
        // API testing doesn't need browser, but keep for potential UI tests
      },
    },
  ],

  // Development server (optional - tests can run against existing server)
  webServer: process.env.SKIP_SERVER_START ? undefined : {
    command: 'cd server && npm run dev',
    url: 'http://localhost:3004/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pluqla_test',
      JWT_SECRET: 'test_jwt_secret_for_e2e_at_least_32_characters_long_secure',
      JWT_REFRESH_SECRET: 'test_refresh_secret_for_e2e_at_least_32_characters_long',
      JWT_EMAIL_SECRET: 'test_email_secret_for_e2e_at_least_32_characters_long',
      JWT_PASSWORD_RESET_SECRET: 'test_reset_secret_for_e2e_at_least_32_characters_long',
      PORT: '3004',
      LOG_LEVEL: 'error', // Minimize logs during testing
      EMAIL_HOST: 'mock', // Use mock email service
    }
  },

  // Output directories
  outputDir: 'test-results/e2e-artifacts/',

  // Test file patterns
  testMatch: [
    'server/tests/e2e/**/*.test.js',
    'server/tests/e2e/**/*.spec.js'
  ],

  // Test ignore patterns
  testIgnore: [
    'server/tests/e2e/helpers/**',
    'server/tests/e2e/fixtures/**'
  ]
});