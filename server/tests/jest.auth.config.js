/**
 * Jest Configuration for Better Auth Tests
 *
 * Specialized Jest configuration for authentication and AI endpoint testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test files
  testMatch: [
    '**/tests/auth/**/*.test.js',
    '**/tests/integration/auth/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/authTestSetup.js'
  ],

  // Global setup/teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',

  // Test timeout (auth tests can be slower)
  testTimeout: 30000,

  // Coverage configuration
  collectCoverageFrom: [
    'src/auth/**/*.js',
    'src/controllers/secureAiController.js',
    'src/routes/secureAi.js',
    'src/middleware/auth.js',
    '!src/**/*.test.js',
    '!src/**/index.js'
  ],

  coverageDirectory: 'coverage/auth',

  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Coverage thresholds for auth components
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/auth/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Module paths
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Test environment variables
  testEnvironment: 'node',

  // Verbose output for auth tests
  verbose: true,

  // Fail fast on first error in CI
  bail: process.env.CI ? 1 : 0,

  // Maximum worker processes
  maxWorkers: process.env.CI ? 2 : '50%',

  // Silent mode configuration
  silent: process.env.SILENT_TESTS === 'true',

  // Database and cleanup
  testSequencer: '<rootDir>/tests/setup/testSequencer.js'
};