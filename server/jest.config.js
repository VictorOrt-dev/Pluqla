/**
 * Jest Configuration for Pluqla Backend
 *
 * Configured for:
 * - Prisma integration with PostgreSQL
 * - Better Auth testing
 * - AI Service testing
 * - High coverage thresholds (90%+)
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/globalSetup.js'],

  // Global setup (runs once before all tests)
  globalSetup: '<rootDir>/tests/setup/jestGlobalSetup.js',

  // Global teardown (runs once after all tests)
  globalTeardown: '<rootDir>/tests/setup/jestGlobalTeardown.js',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/tests/setup/',
    '/tests/helpers/',
    '/tests/utils/'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Entry point
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],

  coverageDirectory: 'coverage',

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage thresholds (90%+ for production readiness)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90
    },
    // Critical paths require higher coverage
    './src/middleware/**/*.js': {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95
    },
    './src/services/ai/**/*.js': {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95
    }
  },

  // Module name mapper (for aliases)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@prisma/client$': '<rootDir>/node_modules/@prisma/client',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // No transform needed for plain Node.js JavaScript
  // transform: {},

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],

  // Timeout for tests (30 seconds for database operations)
  testTimeout: 30000,

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,

  // Detect open handles (Prisma connections, etc.)
  detectOpenHandles: true,
  forceExit: true,

  // Bail after first test suite failure (optional, disable for CI)
  bail: false,

  // Error on deprecated APIs
  errorOnDeprecated: false,

  // Display individual test results
  notify: false,
  notifyMode: 'failure',

  // Roots (where Jest should scan for tests)
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@prisma)/)'
  ]
};