/**
 * +Clair Backend Debug & Test Script
 * Comprehensive testing for all controllers and AI integration
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Test credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};

let authToken = null;
let testUserId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// API Helper
class APITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(method, endpoint, data = null, headers = {}) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        data: error.response?.data || null,
        error: error.message
      };
    }
  }

  async get(endpoint, headers = {}) {
    return this.request('GET', endpoint, null, headers);
  }

  async post(endpoint, data = {}, headers = {}) {
    return this.request('POST', endpoint, data, headers);
  }

  async put(endpoint, data = {}, headers = {}) {
    return this.request('PUT', endpoint, data, headers);
  }

  async delete(endpoint, headers = {}) {
    return this.request('DELETE', endpoint, null, headers);
  }
}

const api = new APITester(API_BASE);

// Test Functions
async function testServerHealth() {
  logInfo('Testing server health...');

  const result = await api.get('/health');

  if (result.success) {
    logSuccess('Server is running');
    return true;
  } else {
    logError(`Server health check failed: ${result.error}`);
    return false;
  }
}

async function testAuthentication() {
  logInfo('Testing authentication...');

  // Test registration
  const registerResult = await api.post('/auth/register', TEST_USER);

  if (registerResult.success || registerResult.status === 409) {
    logSuccess('Registration endpoint working');
  } else {
    logError(`Registration failed: ${registerResult.error}`);
  }

  // Test login
  const loginResult = await api.post('/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (loginResult.success) {
    authToken = loginResult.data.data?.token || loginResult.data.token;
    testUserId = loginResult.data.data?.user?.id || loginResult.data.user?.id;
    api.setToken(authToken);
    logSuccess('Authentication successful');
    return true;
  } else {
    logError(`Login failed: ${loginResult.error}`);
    return false;
  }
}

async function testAISuggestions() {
  logInfo('Testing AI suggestions endpoints...');

  const categories = ['alimentation', 'habits', 'activite', 'deplacement'];
  const results = {};

  // Test general suggestions
  const generalResult = await api.get('/ai/suggestions?category=general&limit=3');
  results.general = generalResult;

  if (generalResult.success) {
    const suggestions = generalResult.data.data?.suggestions;
    if (Array.isArray(suggestions)) {
      logSuccess(`General suggestions: ${suggestions.length} items received`);
    } else {
      logWarning('General suggestions: response is not an array');
    }
  } else {
    logError(`General suggestions failed: ${generalResult.error}`);
  }

  // Test category-specific suggestions
  for (const category of categories) {
    const result = await api.get(`/ai/suggestions?category=${category}&limit=2`);
    results[category] = result;

    if (result.success) {
      const suggestions = result.data.data?.suggestions;
      if (Array.isArray(suggestions)) {
        logSuccess(`${category} suggestions: ${suggestions.length} items received`);
      } else {
        logWarning(`${category} suggestions: response is not an array`);
      }
    } else {
      logError(`${category} suggestions failed: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Test personalized suggestions
  const personalizedResult = await api.get('/ai/personalized-suggestions?categories=all&includeAnalysis=true');
  results.personalized = personalizedResult;

  if (personalizedResult.success) {
    logSuccess('Personalized suggestions working');
  } else {
    logError(`Personalized suggestions failed: ${personalizedResult.error}`);
  }

  return results;
}

async function testUserEndpoints() {
  logInfo('Testing user endpoints...');

  // Test profile
  const profileResult = await api.get('/users/profile');
  if (profileResult.success) {
    logSuccess('User profile endpoint working');
  } else {
    logError(`User profile failed: ${profileResult.error}`);
  }

  // Test preferences
  const preferencesResult = await api.get('/users/preferences');
  if (preferencesResult.success) {
    logSuccess('User preferences endpoint working');
  } else {
    logError(`User preferences failed: ${preferencesResult.error}`);
  }

  // Test stats
  const statsResult = await api.get('/users/stats');
  if (statsResult.success) {
    logSuccess('User stats endpoint working');
  } else {
    logError(`User stats failed: ${statsResult.error}`);
  }

  return { profile: profileResult, preferences: preferencesResult, stats: statsResult };
}

async function testTransactionEndpoints() {
  logInfo('Testing transaction endpoints...');

  // Create a test transaction
  const createResult = await api.post('/transactions', {
    amount: 25.50,
    category: 'alimentation',
    description: 'Test transaction for debugging',
    type: 'saving'
  });

  let transactionId = null;

  if (createResult.success) {
    transactionId = createResult.data.data?.transaction?.id;
    logSuccess('Transaction creation working');
  } else {
    logError(`Transaction creation failed: ${createResult.error}`);
  }

  // Test getting transactions
  const getResult = await api.get('/transactions?limit=5');
  if (getResult.success) {
    const transactions = getResult.data.data?.transactions;
    if (Array.isArray(transactions)) {
      logSuccess(`Transactions list: ${transactions.length} items received`);
    } else {
      logWarning('Transactions list: response is not an array');
    }
  } else {
    logError(`Get transactions failed: ${getResult.error}`);
  }

  // Test transaction stats
  const statsResult = await api.get('/transactions/stats');
  if (statsResult.success) {
    logSuccess('Transaction stats working');
  } else {
    logError(`Transaction stats failed: ${statsResult.error}`);
  }

  return { create: createResult, get: getResult, stats: statsResult };
}

async function testCategoryEndpoints() {
  logInfo('Testing category endpoints...');

  // Test all categories
  const allCategoriesResult = await api.get('/categories');
  if (allCategoriesResult.success) {
    logSuccess('All categories endpoint working');
  } else {
    logError(`All categories failed: ${allCategoriesResult.error}`);
  }

  // Test specific category
  const categoryResult = await api.get('/categories/alimentation');
  if (categoryResult.success) {
    logSuccess('Specific category endpoint working');
  } else {
    logError(`Specific category failed: ${categoryResult.error}`);
  }

  // Test recipes
  const recipesResult = await api.get('/categories/alimentation/recipes?limit=3');
  if (recipesResult.success) {
    const recipes = recipesResult.data.data?.recipes;
    if (Array.isArray(recipes)) {
      logSuccess(`Recipes: ${recipes.length} items received`);
    } else {
      logWarning('Recipes: response is not an array');
    }
  } else {
    logError(`Recipes failed: ${recipesResult.error}`);
  }

  return { all: allCategoriesResult, specific: categoryResult, recipes: recipesResult };
}

async function testAnalyticsEndpoints() {
  logInfo('Testing analytics endpoints...');

  // Test dashboard
  const dashboardResult = await api.get('/analytics/dashboard');
  if (dashboardResult.success) {
    logSuccess('Analytics dashboard working');
  } else {
    logError(`Analytics dashboard failed: ${dashboardResult.error}`);
  }

  // Test engagement
  const engagementResult = await api.get('/analytics/engagement');
  if (engagementResult.success) {
    logSuccess('Analytics engagement working');
  } else {
    logError(`Analytics engagement failed: ${engagementResult.error}`);
  }

  return { dashboard: dashboardResult, engagement: engagementResult };
}

async function testArraySafety() {
  logInfo('Testing array safety checks...');

  const endpoints = [
    '/ai/suggestions?category=alimentation',
    '/ai/food-suggestions',
    '/ai/habit-suggestions',
    '/transactions?limit=5',
    '/categories',
    '/categories/alimentation/recipes'
  ];

  const results = {};

  for (const endpoint of endpoints) {
    const result = await api.get(endpoint);
    results[endpoint] = result;

    if (result.success) {
      const data = result.data.data;
      let hasArrays = false;

      // Check for arrays in common response fields
      const arrayFields = ['suggestions', 'transactions', 'recipes', 'categories'];

      for (const field of arrayFields) {
        if (data[field] !== undefined) {
          if (Array.isArray(data[field])) {
            logSuccess(`${endpoint}: ${field} is properly an array`);
            hasArrays = true;
          } else {
            logError(`${endpoint}: ${field} is NOT an array: ${typeof data[field]}`);
          }
        }
      }

      if (!hasArrays) {
        logWarning(`${endpoint}: no array fields found to test`);
      }
    } else {
      logError(`${endpoint}: failed to test - ${result.error}`);
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Generate comprehensive test report
async function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: BASE_URL,
      nodeVersion: process.version,
      platform: process.platform
    },
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    },
    results,
    recommendations: []
  };

  // Count results
  function countResults(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (obj[key].success !== undefined) {
          report.summary.totalTests++;
          if (obj[key].success) {
            report.summary.passed++;
          } else {
            report.summary.failed++;
          }
        } else {
          countResults(obj[key]);
        }
      }
    }
  }

  countResults(results);

  // Add recommendations
  if (report.summary.failed > 0) {
    report.recommendations.push('Fix failing endpoints before deploying to production');
  }

  if (results.aiSuggestions) {
    report.recommendations.push('Monitor AI service performance and fallback usage');
  }

  report.recommendations.push('Set up monitoring for array safety in production');
  report.recommendations.push('Implement rate limiting monitoring');

  // Save report
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  logInfo(`Test report saved to: ${reportPath}`);

  return report;
}

// Main test runner
async function runAllTests() {
  log('\n🚀 Starting +Clair Backend Debug & Test Suite', 'cyan');
  log('='.repeat(50), 'cyan');

  const results = {};

  try {
    // Basic health check
    const healthOk = await testServerHealth();
    if (!healthOk) {
      logError('Server is not responding. Please start the backend server first.');
      process.exit(1);
    }

    // Authentication
    const authOk = await testAuthentication();
    if (!authOk) {
      logError('Authentication failed. Cannot proceed with authenticated tests.');
      process.exit(1);
    }

    // Run all tests
    results.aiSuggestions = await testAISuggestions();
    results.userEndpoints = await testUserEndpoints();
    results.transactionEndpoints = await testTransactionEndpoints();
    results.categoryEndpoints = await testCategoryEndpoints();
    results.analyticsEndpoints = await testAnalyticsEndpoints();
    results.arraySafety = await testArraySafety();

    // Generate report
    const report = await generateTestReport(results);

    // Summary
    log('\n📊 Test Summary:', 'cyan');
    log('='.repeat(30), 'cyan');
    logInfo(`Total Tests: ${report.summary.totalTests}`);
    logSuccess(`Passed: ${report.summary.passed}`);
    if (report.summary.failed > 0) {
      logError(`Failed: ${report.summary.failed}`);
    }

    if (report.summary.failed === 0) {
      logSuccess('\n🎉 All tests passed! Backend is ready for frontend integration.');
    } else {
      logWarning(`\n⚠️  ${report.summary.failed} tests failed. Please review the issues above.`);
    }

  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testAISuggestions,
  testArraySafety,
  APITester
};