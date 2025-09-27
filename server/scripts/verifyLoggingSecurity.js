#!/usr/bin/env node

/**
 * LOGGING SECURITY VERIFICATION SCRIPT
 *
 * This script simulates real error scenarios to verify that sensitive information
 * is never logged to console, files, or any other output.
 *
 * CRITICAL VERIFICATION:
 * - API keys (OpenAI, Anthropic, generic)
 * - JWT tokens (access, refresh, reset, email verification)
 * - Database credentials and connection strings
 * - Email service credentials (SMTP passwords, etc.)
 * - Authorization headers and user passwords
 * - Any other PII or sensitive information
 *
 * Usage: node scripts/verifyLoggingSecurity.js
 */

const path = require('path');
const fs = require('fs');

// Override console methods to capture all output
let allLogs = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = (...args) => {
  const logString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  allLogs.push(['log', logString]);
  originalConsoleLog(...args);
};

console.error = (...args) => {
  const logString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  allLogs.push(['error', logString]);
  originalConsoleError(...args);
};

console.warn = (...args) => {
  const logString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  allLogs.push(['warn', logString]);
  originalConsoleWarn(...args);
};

console.info = (...args) => {
  const logString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  allLogs.push(['info', logString]);
  originalConsoleInfo(...args);
};

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secure_jwt_secret_at_least_32_characters_long_for_security';
process.env.JWT_REFRESH_SECRET = 'test_secure_refresh_secret_at_least_32_characters_long_for_testing';
process.env.JWT_EMAIL_SECRET = 'test_secure_email_secret_at_least_32_characters_long_for_testing';
process.env.JWT_PASSWORD_RESET_SECRET = 'test_secure_reset_secret_at_least_32_characters_long_for_testing';

const secureLogger = require('../src/utils/logger');

console.log('🔐 Starting Logging Security Verification...\n');

/**
 * Test scenarios that could expose sensitive information
 */
const TEST_SECRETS = {
  openaiApiKey: 'sk-abcd1234efgh5678ijkl9012mnop3456qrstuvwxyz7890ABCDEFGHIJ',
  anthropicApiKey: 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE1MTYyMzkwMjJ9.different-signature-for-refresh',
  databaseUrl: 'postgresql://admin:super-secret-db-password@prod-db.company.com:5432/pluqla_production',
  emailPassword: 'super-secret-smtp-password-2023',
  userPassword: 'user-secret-password-123456',
  genericApiKey: 'abcdef123456ghijkl789012mnopqr345678stuvwxyz90',
  authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature'
};

/**
 * Run verification tests
 */
async function runSecurityVerification() {
  let testsPassed = 0;
  let testsTotal = 0;
  const violations = [];

  console.log('📋 Running security verification tests...\n');

  // Test 1: OpenAI API Error Simulation
  testsTotal++;
  console.log('🧪 Test 1: OpenAI API Error Simulation');
  allLogs = []; // Clear logs

  try {
    const openaiError = new Error('OpenAI API request failed');
    openaiError.response = {
      config: {
        headers: {
          'Authorization': `Bearer ${TEST_SECRETS.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      },
      data: {
        error: {
          message: `Invalid API key: ${TEST_SECRETS.openaiApiKey}`,
          type: 'invalid_request_error'
        }
      }
    };

    secureLogger.logError(openaiError, { context: 'ai_service' });

    const logContent = allLogs.map(log => log[1]).join(' ');

    if (logContent.includes(TEST_SECRETS.openaiApiKey)) {
      violations.push('Test 1 FAILED: OpenAI API key exposed in logs');
    } else {
      testsPassed++;
      console.log('✅ Test 1 PASSED: OpenAI API key properly masked');
    }
  } catch (error) {
    violations.push(`Test 1 ERROR: ${error.message}`);
  }

  // Test 2: JWT Token Error Simulation
  testsTotal++;
  console.log('🧪 Test 2: JWT Token Error Simulation');
  allLogs = []; // Clear logs

  try {
    const jwtError = new Error(`Token verification failed: ${TEST_SECRETS.jwtToken}`);
    jwtError.token = TEST_SECRETS.jwtToken;

    secureLogger.logSecurity('jwt_verification_failed', {
      error: jwtError,
      token: TEST_SECRETS.jwtToken
    });

    const logContent = allLogs.map(log => log[1]).join(' ');

    if (logContent.includes(TEST_SECRETS.jwtToken)) {
      violations.push('Test 2 FAILED: JWT token exposed in logs');
    } else {
      testsPassed++;
      console.log('✅ Test 2 PASSED: JWT token properly masked');
    }
  } catch (error) {
    violations.push(`Test 2 ERROR: ${error.message}`);
  }

  // Test 3: Database Connection Error Simulation
  testsTotal++;
  console.log('🧪 Test 3: Database Connection Error Simulation');
  allLogs = []; // Clear logs

  try {
    const dbError = new Error('Database connection failed');
    dbError.meta = {
      database_url: TEST_SECRETS.databaseUrl,
      connectionString: TEST_SECRETS.databaseUrl
    };

    secureLogger.logError(dbError, { context: 'database' });

    const logContent = allLogs.map(log => log[1]).join(' ');

    if (logContent.includes('super-secret-db-password') || logContent.includes(TEST_SECRETS.databaseUrl)) {
      violations.push('Test 3 FAILED: Database credentials exposed in logs');
    } else {
      testsPassed++;
      console.log('✅ Test 3 PASSED: Database credentials properly masked');
    }
  } catch (error) {
    violations.push(`Test 3 ERROR: ${error.message}`);
  }

  // Test 4: Email Service Error Simulation
  testsTotal++;
  console.log('🧪 Test 4: Email Service Error Simulation');
  allLogs = []; // Clear logs

  try {
    const emailError = new Error('SMTP authentication failed');
    emailError.config = {
      auth: {
        user: 'noreply@pluqla.com',
        pass: TEST_SECRETS.emailPassword
      }
    };

    secureLogger.logError(emailError, { context: 'email_service' });

    const logContent = allLogs.map(log => log[1]).join(' ');

    if (logContent.includes(TEST_SECRETS.emailPassword)) {
      violations.push('Test 4 FAILED: Email password exposed in logs');
    } else {
      testsPassed++;
      console.log('✅ Test 4 PASSED: Email credentials properly masked');
    }
  } catch (error) {
    violations.push(`Test 4 ERROR: ${error.message}`);
  }

  // Test 5: Authentication Request Simulation
  testsTotal++;
  console.log('🧪 Test 5: Authentication Request Simulation');
  allLogs = []; // Clear logs

  try {
    const mockReq = {
      method: 'POST',
      originalUrl: '/api/auth/login',
      ip: '192.168.1.100',
      get: (header) => {
        const headers = {
          'Authorization': TEST_SECRETS.authHeader,
          'User-Agent': 'Mozilla/5.0'
        };
        return headers[header];
      },
      headers: {
        'authorization': TEST_SECRETS.authHeader,
        'user-agent': 'Mozilla/5.0'
      },
      body: {
        email: 'user@example.com',
        password: TEST_SECRETS.userPassword
      },
      user: { id: 'user123' }
    };

    const mockRes = { statusCode: 200 };

    secureLogger.logRequest(mockReq, mockRes, 150);

    const logContent = allLogs.map(log => log[1]).join(' ');

    const hasAuthToken = logContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature');
    const hasPassword = logContent.includes(TEST_SECRETS.userPassword);

    if (hasAuthToken || hasPassword) {
      violations.push('Test 5 FAILED: Authentication data exposed in request logs');
    } else {
      testsPassed++;
      console.log('✅ Test 5 PASSED: Authentication data properly sanitized');
    }
  } catch (error) {
    violations.push(`Test 5 ERROR: ${error.message}`);
  }

  // Test 6: Complex Nested Object with Secrets
  testsTotal++;
  console.log('🧪 Test 6: Complex Nested Object Simulation');
  allLogs = []; // Clear logs

  try {
    const complexObject = {
      user: {
        profile: {
          auth: {
            accessToken: TEST_SECRETS.jwtToken,
            refreshToken: TEST_SECRETS.refreshToken,
            apiKeys: {
              openai: TEST_SECRETS.openaiApiKey,
              anthropic: TEST_SECRETS.anthropicApiKey
            }
          }
        }
      },
      config: {
        database: {
          url: TEST_SECRETS.databaseUrl,
          password: 'super-secret-db-password'
        },
        email: {
          smtp_pass: TEST_SECRETS.emailPassword
        }
      }
    };

    secureLogger.info('Complex configuration', complexObject);

    const logContent = allLogs.map(log => log[1]).join(' ');

    const hasSecrets = [
      TEST_SECRETS.jwtToken,
      TEST_SECRETS.refreshToken,
      TEST_SECRETS.openaiApiKey,
      TEST_SECRETS.anthropicApiKey,
      TEST_SECRETS.databaseUrl,
      TEST_SECRETS.emailPassword,
      'super-secret-db-password'
    ].some(secret => logContent.includes(secret));

    if (hasSecrets) {
      violations.push('Test 6 FAILED: Sensitive data in complex object exposed');
    } else {
      testsPassed++;
      console.log('✅ Test 6 PASSED: Complex nested secrets properly sanitized');
    }
  } catch (error) {
    violations.push(`Test 6 ERROR: ${error.message}`);
  }

  // Test 7: Anthropic API Key Exposure Test
  testsTotal++;
  console.log('🧪 Test 7: Anthropic API Error Simulation');
  allLogs = []; // Clear logs

  try {
    const anthropicError = new Error('Anthropic API rate limit exceeded');
    anthropicError.config = {
      headers: {
        'x-api-key': TEST_SECRETS.anthropicApiKey
      }
    };

    secureLogger.logError(anthropicError, { context: 'ai_service', provider: 'anthropic' });

    const logContent = allLogs.map(log => log[1]).join(' ');

    if (logContent.includes(TEST_SECRETS.anthropicApiKey)) {
      violations.push('Test 7 FAILED: Anthropic API key exposed in logs');
    } else {
      testsPassed++;
      console.log('✅ Test 7 PASSED: Anthropic API key properly masked');
    }
  } catch (error) {
    violations.push(`Test 7 ERROR: ${error.message}`);
  }

  // Test 8: Password Reset Token Simulation
  testsTotal++;
  console.log('🧪 Test 8: Password Reset Token Simulation');
  allLogs = []; // Clear logs

  try {
    const resetError = new Error('Password reset failed');
    resetError.token = 'secure-reset-token-abcd1234efgh5678';
    resetError.user = {
      email: 'user@example.com',
      resetToken: 'secure-reset-token-abcd1234efgh5678'
    };

    secureLogger.logSecurity('password_reset_failed', {
      error: resetError,
      userId: 'user123'
    });

    const logContent = allLogs.map(log => log[1]).join(' ');

    if (logContent.includes('secure-reset-token-abcd1234efgh5678')) {
      violations.push('Test 8 FAILED: Password reset token exposed in logs');
    } else {
      testsPassed++;
      console.log('✅ Test 8 PASSED: Password reset token properly sanitized');
    }
  } catch (error) {
    violations.push(`Test 8 ERROR: ${error.message}`);
  }

  console.log('\n📊 Security Verification Results:');
  console.log('==================================');
  console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Tests Failed: ${testsTotal - testsPassed}/${testsTotal}`);

  if (violations.length > 0) {
    console.log('\n🚨 SECURITY VIOLATIONS DETECTED:');
    violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation}`);
    });

    console.log('\n❌ SECURITY VERIFICATION FAILED!');
    console.log('🚨 Sensitive information is being logged. Review the violations above.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL SECURITY TESTS PASSED!');
    console.log('🔐 No sensitive information detected in logs.');
    console.log('🎉 Logging system is secure and ready for production.');
  }

  // Additional verification: Check if log files contain secrets
  console.log('\n🔍 Checking log files for sensitive data...');

  const logDir = path.join(__dirname, '..', 'logs');
  if (fs.existsSync(logDir)) {
    const logFiles = fs.readdirSync(logDir).filter(file => file.endsWith('.log'));

    for (const logFile of logFiles) {
      const logPath = path.join(logDir, logFile);
      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf8');

        const hasSecrets = Object.values(TEST_SECRETS).some(secret => logContent.includes(secret));

        if (hasSecrets) {
          console.log(`🚨 WARNING: Log file ${logFile} contains sensitive data!`);
          process.exit(1);
        } else {
          console.log(`✅ Log file ${logFile} is clean`);
        }
      }
    }
  }

  console.log('\n🎯 Security verification completed successfully!');
  console.log('📋 Summary:');
  console.log('- All sensitive data patterns are properly masked');
  console.log('- API keys are not exposed in error logs');
  console.log('- JWT tokens are sanitized before logging');
  console.log('- Database credentials are protected');
  console.log('- Email service passwords are masked');
  console.log('- User passwords are redacted from logs');
  console.log('- Authorization headers are sanitized');
  console.log('- Complex nested objects are properly cleaned');

  console.log('\n🔐 The Pluqla backend logging system is SECURE! 🔐');
}

// Run the verification
runSecurityVerification().catch(error => {
  console.error('🚨 VERIFICATION SCRIPT FAILED:', error);
  process.exit(1);
});