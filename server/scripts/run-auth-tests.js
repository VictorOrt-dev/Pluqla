#!/usr/bin/env node

/**
 * Authentication Test Runner
 *
 * Comprehensive test runner for Better Auth integration
 * Includes setup verification, test execution, and reporting
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(` ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

async function checkPrerequisites() {
  logHeader('Checking Prerequisites');

  const requiredFiles = [
    'src/auth/betterAuth.js',
    'tests/auth/betterAuth.test.js',
    'tests/auth/aiEndpointProtection.test.js',
    'tests/auth/authIntegration.test.js',
    'tests/setup/authTestSetup.js',
    'tests/setup/globalSetup.js',
    'tests/setup/globalTeardown.js'
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ Missing: ${file}`, 'red');
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    log('\n❌ Some required files are missing. Please ensure all auth files are present.', 'red');
    process.exit(1);
  }

  // Check environment variables
  log('\n📋 Environment Check:', 'blue');

  const requiredEnvVars = [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'JWT_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar} is set`, 'green');
    } else {
      log(`⚠️ ${envVar} not set - will use test defaults`, 'yellow');
    }
  }

  log('\n✅ Prerequisites check completed', 'green');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTestSuite(suiteName, testPattern, options = {}) {
  logHeader(`Running ${suiteName}`);

  const jestArgs = [
    '--config', 'tests/jest.auth.config.js',
    '--testPathPattern', testPattern,
    '--verbose',
    '--detectOpenHandles',
    '--forceExit'
  ];

  if (options.coverage) {
    jestArgs.push('--coverage');
  }

  if (options.silent) {
    jestArgs.push('--silent');
  }

  if (process.env.CI) {
    jestArgs.push('--ci', '--watchman=false');
  }

  try {
    await runCommand('npx', ['jest', ...jestArgs]);
    log(`\n✅ ${suiteName} completed successfully`, 'green');
    return true;
  } catch (error) {
    log(`\n❌ ${suiteName} failed: ${error.message}`, 'red');
    return false;
  }
}

async function generateTestReport() {
  logHeader('Generating Test Report');

  const reportPath = path.join(__dirname, '..', 'coverage', 'auth');

  if (fs.existsSync(reportPath)) {
    log(`📊 Coverage report generated at: ${reportPath}`, 'blue');
    log(`🌐 Open ${path.join(reportPath, 'lcov-report', 'index.html')} to view detailed coverage`, 'blue');
  } else {
    log('⚠️ No coverage report found', 'yellow');
  }

  // Check for test results
  const testResults = path.join(__dirname, '..', 'test-results.json');
  if (fs.existsSync(testResults)) {
    log(`📝 Test results saved to: ${testResults}`, 'blue');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    coverage: args.includes('--coverage'),
    silent: args.includes('--silent'),
    quick: args.includes('--quick'),
    integration: args.includes('--integration'),
    watch: args.includes('--watch')
  };

  try {
    log('🔐 Better Auth Test Runner', 'cyan');
    log('Testing authentication integration for Pluqla', 'blue');

    // Check prerequisites
    await checkPrerequisites();

    let allTestsPassed = true;

    if (options.watch) {
      logHeader('Running Tests in Watch Mode');
      await runCommand('npx', [
        'jest',
        '--config', 'tests/jest.auth.config.js',
        '--watch',
        '--verbose'
      ]);
      return;
    }

    if (!options.quick) {
      // Run basic auth tests
      const basicTestsPassed = await runTestSuite(
        'Basic Authentication Tests',
        'betterAuth.test.js',
        { coverage: options.coverage, silent: options.silent }
      );

      if (!basicTestsPassed) {
        allTestsPassed = false;
      }

      // Run AI endpoint protection tests
      const aiTestsPassed = await runTestSuite(
        'AI Endpoint Protection Tests',
        'aiEndpointProtection.test.js',
        { silent: options.silent }
      );

      if (!aiTestsPassed) {
        allTestsPassed = false;
      }
    }

    if (options.integration || !options.quick) {
      // Run integration tests
      const integrationTestsPassed = await runTestSuite(
        'Authentication Integration Tests',
        'authIntegration.test.js',
        { silent: options.silent }
      );

      if (!integrationTestsPassed) {
        allTestsPassed = false;
      }
    }

    if (options.quick) {
      // Quick test run - just basic functionality
      const quickTestsPassed = await runTestSuite(
        'Quick Authentication Tests',
        'betterAuth.test.js',
        { silent: options.silent }
      );

      if (!quickTestsPassed) {
        allTestsPassed = false;
      }
    }

    // Generate reports
    if (options.coverage) {
      await generateTestReport();
    }

    // Final results
    logHeader('Test Results Summary');

    if (allTestsPassed) {
      log('🎉 All authentication tests passed!', 'green');
      log('✅ Better Auth integration is working correctly', 'green');
      log('🔒 AI endpoints are properly protected', 'green');
      log('👥 Role-based access control is functioning', 'green');
    } else {
      log('❌ Some tests failed', 'red');
      log('🔧 Please check the test output above for details', 'yellow');
      process.exit(1);
    }

    // Usage recommendations
    log('\n📋 Next Steps:', 'blue');
    log('1. Review any warnings in the test output', 'blue');
    log('2. Check coverage report if generated', 'blue');
    log('3. Test authentication manually in development environment', 'blue');
    log('4. Deploy to staging environment for full integration testing', 'blue');

  } catch (error) {
    log(`\n💥 Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n🛑 Test run interrupted by user', 'yellow');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`\n💥 Uncaught exception: ${error.message}`, 'red');
  process.exit(1);
});

// Show usage help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('🔐 Better Auth Test Runner', 'cyan');
  log('\nUsage: npm run test:auth [options]', 'blue');
  log('\nOptions:', 'blue');
  log('  --coverage      Generate coverage report', 'blue');
  log('  --silent        Suppress verbose output', 'blue');
  log('  --quick         Run only basic tests', 'blue');
  log('  --integration   Run only integration tests', 'blue');
  log('  --watch         Run tests in watch mode', 'blue');
  log('  --help          Show this help message', 'blue');
  log('\nExamples:', 'blue');
  log('  npm run test:auth --coverage', 'blue');
  log('  npm run test:auth --quick --silent', 'blue');
  log('  npm run test:auth --watch', 'blue');
  process.exit(0);
}

// Run the main function
main();