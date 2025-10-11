#!/usr/bin/env node

/**
 * Premium Subscription Verification Script
 *
 * Tests premium middleware enforcement across all protected endpoints
 *
 * Usage:
 *   node scripts/verify-premium.js
 *
 * Prerequisites:
 *   - Server must be running (npm run dev)
 *   - Database seeded with test users (npm run db:seed)
 *   - Test credentials: free@pluqla.com, premium@pluqla.com, admin@pluqla.com
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3004';
const TEST_TIMEOUT = 30000;

// Test credentials (from seed.js)
const CREDENTIALS = {
  free: { email: 'free@pluqla.com', password: 'Password123!' },
  premium: { email: 'premium@pluqla.com', password: 'Password123!' },
  admin: { email: 'admin@pluqla.com', password: 'AdminPass123!' }
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Logger utilities
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
  passedTests++;
  totalTests++;
}

function logFailure(message, error) {
  log(`❌ ${message}`, colors.red);
  if (error) {
    log(`   Error: ${error}`, colors.gray);
  }
  failedTests++;
  totalTests++;
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`  ${title}`, colors.blue);
  log('='.repeat(60), colors.blue);
}

// API client
async function apiCall(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {}
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data,
        status: error.response.status
      };
    }
    throw error;
  }
}

// Authentication helpers
async function login(credentials) {
  const result = await apiCall('POST', '/api/auth/login', credentials);
  if (result.success && result.data.tokens) {
    return result.data.tokens.accessToken;
  }
  throw new Error(`Login failed: ${JSON.stringify(result.error)}`);
}

async function getTokens() {
  logInfo('Authenticating test users...');

  try {
    const tokens = {};

    tokens.free = await login(CREDENTIALS.free);
    logSuccess('Free user authenticated');

    tokens.premium = await login(CREDENTIALS.premium);
    logSuccess('Premium user authenticated');

    tokens.admin = await login(CREDENTIALS.admin);
    logSuccess('Admin user authenticated');

    return tokens;
  } catch (error) {
    logFailure('Authentication failed', error.message);
    throw error;
  }
}

// Test suites
async function testAuthenticationRequired() {
  logSection('Test Suite 1: Authentication Requirements');

  const premiumEndpoints = [
    '/api/ai/suggestions/alimentation',
    '/api/ai/suggestions/activite',
    '/api/ai/suggestions/deplacement'
  ];

  for (const endpoint of premiumEndpoints) {
    try {
      const result = await apiCall('POST', endpoint, { category: 'test' });

      if (result.status === 401) {
        logSuccess(`${endpoint} - Returns 401 without authentication`);
      } else {
        logFailure(`${endpoint} - Expected 401, got ${result.status}`);
      }
    } catch (error) {
      logFailure(`${endpoint} - Request failed`, error.message);
    }
  }
}

async function testFreeUserBlocked(token) {
  logSection('Test Suite 2: Free User Access Control');

  const premiumEndpoints = [
    { path: '/api/ai/suggestions/alimentation', data: { category: 'fruits' } },
    { path: '/api/ai/suggestions/activite', data: { type: 'sport' } },
    { path: '/api/ai/suggestions/deplacement', data: { from: 'Paris', to: 'Lyon' } }
  ];

  for (const endpoint of premiumEndpoints) {
    try {
      const result = await apiCall('POST', endpoint.path, endpoint.data, token);

      if (result.status === 403) {
        logSuccess(`${endpoint.path} - Free user blocked (403)`);

        // Validate response format
        if (result.error.error === 'Premium subscription required') {
          logSuccess(`${endpoint.path} - Correct error message`);
        } else {
          logFailure(`${endpoint.path} - Wrong error message`);
        }

        if (result.error.details?.upgradeUrl === '/subscription') {
          logSuccess(`${endpoint.path} - Includes upgrade URL`);
        } else {
          logFailure(`${endpoint.path} - Missing upgrade URL`);
        }

        if (result.error.details?.pricing?.monthly === '5€') {
          logSuccess(`${endpoint.path} - Includes correct pricing`);
        } else {
          logFailure(`${endpoint.path} - Missing or incorrect pricing`);
        }

        if (Array.isArray(result.error.details?.benefits) && result.error.details.benefits.length === 8) {
          logSuccess(`${endpoint.path} - Includes benefits list (8 items)`);
        } else {
          logFailure(`${endpoint.path} - Missing or incorrect benefits`);
        }
      } else {
        logFailure(`${endpoint.path} - Expected 403, got ${result.status}`);
      }
    } catch (error) {
      logFailure(`${endpoint.path} - Request failed`, error.message);
    }
  }
}

async function testPremiumUserAllowed(token) {
  logSection('Test Suite 3: Premium User Access');

  const premiumEndpoints = [
    { path: '/api/ai/suggestions/alimentation', data: { category: 'fruits' } },
    { path: '/api/ai/suggestions/activite', data: { type: 'sport' } },
    { path: '/api/ai/suggestions/deplacement', data: { from: 'Paris', to: 'Lyon' } }
  ];

  for (const endpoint of premiumEndpoints) {
    try {
      const result = await apiCall('POST', endpoint.path, endpoint.data, token);

      // Accept either 200 or 429 (rate limit) or 402 (quota exceeded)
      if ([200, 429, 402].includes(result.status)) {
        logSuccess(`${endpoint.path} - Premium user allowed (${result.status})`);
      } else if (result.status === 403) {
        logFailure(`${endpoint.path} - Premium user blocked (403 - should allow)`);
      } else {
        logWarning(`${endpoint.path} - Unexpected status ${result.status}`);
      }
    } catch (error) {
      logFailure(`${endpoint.path} - Request failed`, error.message);
    }
  }
}

async function testAdminBypass(token) {
  logSection('Test Suite 4: Admin Bypass');

  const premiumEndpoints = [
    { path: '/api/ai/suggestions/alimentation', data: { category: 'fruits' } },
    { path: '/api/ai/suggestions/activite', data: { type: 'sport' } }
  ];

  for (const endpoint of premiumEndpoints) {
    try {
      const result = await apiCall('POST', endpoint.path, endpoint.data, token);

      // Accept either 200 or 429 (rate limit) or 402 (quota) - but NOT 403
      if ([200, 429, 402].includes(result.status)) {
        logSuccess(`${endpoint.path} - Admin bypasses premium check (${result.status})`);
      } else if (result.status === 403) {
        logFailure(`${endpoint.path} - Admin blocked (403 - should bypass)`);
      } else {
        logWarning(`${endpoint.path} - Unexpected status ${result.status}`);
      }
    } catch (error) {
      logFailure(`${endpoint.path} - Request failed`, error.message);
    }
  }
}

async function testResponseFormat(token) {
  logSection('Test Suite 5: Response Format Validation');

  try {
    const result = await apiCall('POST', '/api/ai/suggestions/alimentation',
      { category: 'test' }, token);

    if (result.status === 403) {
      const error = result.error;

      // Check required fields
      if (error.error) {
        logSuccess('Response includes error field');
      } else {
        logFailure('Response missing error field');
      }

      if (error.message) {
        logSuccess('Response includes message field');
      } else {
        logFailure('Response missing message field');
      }

      if (error.details) {
        logSuccess('Response includes details object');

        const details = error.details;
        const requiredFields = ['currentTier', 'requiredTier', 'upgradeUrl', 'pricing', 'benefits'];

        for (const field of requiredFields) {
          if (details[field]) {
            logSuccess(`Details includes ${field}`);
          } else {
            logFailure(`Details missing ${field}`);
          }
        }
      } else {
        logFailure('Response missing details object');
      }
    } else {
      logWarning(`Expected 403 for format validation, got ${result.status}`);
    }
  } catch (error) {
    logFailure('Response format test failed', error.message);
  }
}

async function testPublicEndpointsNotAffected(token) {
  logSection('Test Suite 6: Public Endpoints Unaffected');

  const publicEndpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/auth/login', method: 'POST', data: CREDENTIALS.free }
  ];

  for (const endpoint of publicEndpoints) {
    try {
      const result = await apiCall(endpoint.method, endpoint.path, endpoint.data);

      if (result.success && [200, 201].includes(result.status)) {
        logSuccess(`${endpoint.path} - Public endpoint accessible`);
      } else {
        logFailure(`${endpoint.path} - Public endpoint failed (${result.status})`);
      }
    } catch (error) {
      logFailure(`${endpoint.path} - Request failed`, error.message);
    }
  }
}

// Main verification flow
async function runVerification() {
  console.clear();
  logSection('🔐 PREMIUM SUBSCRIPTION VERIFICATION');

  logInfo(`Target: ${BASE_URL}`);
  logInfo(`Timeout: ${TEST_TIMEOUT}ms`);
  logInfo('Starting verification...\n');

  try {
    // Health check
    logSection('Pre-flight: Server Health Check');
    try {
      const health = await apiCall('GET', '/api/health');
      if (health.success) {
        logSuccess('Server is running');
      } else {
        logFailure('Server health check failed');
        process.exit(1);
      }
    } catch (error) {
      logFailure('Cannot connect to server', error.message);
      logInfo('Please ensure server is running: npm run dev');
      process.exit(1);
    }

    // Get authentication tokens
    const tokens = await getTokens();

    // Run test suites
    await testAuthenticationRequired();
    await testFreeUserBlocked(tokens.free);
    await testPremiumUserAllowed(tokens.premium);
    await testAdminBypass(tokens.admin);
    await testResponseFormat(tokens.free);
    await testPublicEndpointsNotAffected();

    // Summary
    logSection('📊 VERIFICATION SUMMARY');
    log(`Total Tests: ${totalTests}`);
    log(`Passed: ${passedTests}`, colors.green);
    log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    log(`Success Rate: ${successRate}%`, successRate === '100.0' ? colors.green : colors.yellow);

    if (failedTests === 0) {
      log('\n✅ ALL TESTS PASSED - Premium enforcement working correctly!', colors.green);
      process.exit(0);
    } else {
      log(`\n❌ ${failedTests} TEST(S) FAILED - Please review failures above`, colors.red);
      process.exit(1);
    }

  } catch (error) {
    logFailure('Verification failed with error', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runVerification().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runVerification };
