const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * Test helper utilities for rate limiting tests
 */

/**
 * Generate a test JWT token for a user
 * @param {Object} user - User object with id and subscription
 * @returns {string} JWT token
 */
const generateTestToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    subscription: user.subscription || { plan: 'free', tier: 'free' }
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
};

/**
 * Create a test user object with subscription
 * @param {Object} overrides - Properties to override
 * @returns {Object} User object
 */
const createTestUser = (overrides = {}) => {
  const defaultUser = {
    id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    subscription: {
      plan: 'free',
      tier: 'free',
      status: 'active'
    }
  };

  return { ...defaultUser, ...overrides };
};

/**
 * Create multiple test users with different subscription tiers
 * @param {number} count - Number of users to create
 * @returns {Array} Array of user objects
 */
const createTestUsers = (count = 5) => {
  const plans = ['free', 'premium', 'enterprise'];
  const users = [];

  for (let i = 0; i < count; i++) {
    const plan = plans[i % plans.length];
    users.push(createTestUser({
      subscription: {
        plan: plan,
        tier: plan,
        status: 'active'
      }
    }));
  }

  return users;
};

/**
 * Hash a password for testing
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate random transaction data for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Transaction data
 */
const generateTransactionData = (overrides = {}) => {
  const categories = ['alimentation', 'transport', 'logement', 'loisirs', 'sante', 'habits', 'autres'];
  const types = ['expense', 'income'];

  const defaultTransaction = {
    amount: Math.round((Math.random() * 200 + 10) * 100) / 100, // Random amount between 10-210
    category: categories[Math.floor(Math.random() * categories.length)],
    type: types[Math.floor(Math.random() * types.length)],
    description: `Test transaction ${Date.now()}`,
    date: new Date().toISOString()
  };

  return { ...defaultTransaction, ...overrides };
};

/**
 * Generate random financial account data for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Account data
 */
const generateAccountData = (overrides = {}) => {
  const types = ['checking', 'savings', 'investment', 'crypto', 'loan'];
  const providers = ['Bank A', 'Bank B', 'Crypto Exchange', 'Investment Firm'];

  const defaultAccount = {
    name: `Test Account ${Date.now()}`,
    type: types[Math.floor(Math.random() * types.length)],
    provider: providers[Math.floor(Math.random() * providers.length)],
    balance: Math.round((Math.random() * 10000) * 100) / 100,
    currency: 'EUR'
  };

  return { ...defaultAccount, ...overrides };
};

/**
 * Create a mock Express request object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
const createMockRequest = (overrides = {}) => {
  const defaultReq = {
    user: null,
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Test Client/1.0',
      'content-type': 'application/json'
    },
    body: {},
    query: {},
    params: {},
    method: 'GET',
    path: '/test',
    get: function(header) {
      return this.headers[header.toLowerCase()];
    }
  };

  return { ...defaultReq, ...overrides };
};

/**
 * Create a mock Express response object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock response object
 */
const createMockResponse = (overrides = {}) => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = data;
      return this;
    },
    set: function(header, value) {
      if (typeof header === 'object') {
        Object.assign(this.headers, header);
      } else {
        this.headers[header] = value;
      }
      return this;
    },
    get: function(header) {
      return this.headers[header];
    }
  };

  return { ...res, ...overrides };
};

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<boolean>} True if condition was met, false if timeout
 */
const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await sleep(interval);
  }

  return false;
};

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: any, duration: number}>} Result and duration in milliseconds
 */
const measureExecutionTime = async (fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds

  return { result, duration };
};

/**
 * Generate a batch of concurrent requests for testing
 * @param {Function} requestFn - Function that returns a promise for a single request
 * @param {number} count - Number of concurrent requests
 * @returns {Promise<Array>} Array of request results
 */
const generateConcurrentRequests = async (requestFn, count) => {
  const requests = [];
  for (let i = 0; i < count; i++) {
    requests.push(requestFn(i));
  }

  return Promise.allSettled(requests);
};

/**
 * Analyze rate limiting response patterns
 * @param {Array} responses - Array of HTTP responses
 * @returns {Object} Analysis results
 */
const analyzeRateLimitResponses = (responses) => {
  const analysis = {
    total: responses.length,
    successful: 0,
    rateLimited: 0,
    errors: 0,
    avgResponseTime: 0,
    rateLimitHeaders: {
      limit: null,
      remaining: null,
      reset: null
    }
  };

  let totalResponseTime = 0;

  responses.forEach(response => {
    if (response.status === 'fulfilled') {
      const res = response.value;

      if ([200, 201].includes(res.status)) {
        analysis.successful++;
      } else if (res.status === 429) {
        analysis.rateLimited++;

        // Extract rate limit headers from first rate limited response
        if (!analysis.rateLimitHeaders.limit) {
          analysis.rateLimitHeaders.limit = res.headers['x-ratelimit-limit'];
          analysis.rateLimitHeaders.remaining = res.headers['x-ratelimit-remaining'];
          analysis.rateLimitHeaders.reset = res.headers['x-ratelimit-reset'];
        }
      } else {
        analysis.errors++;
      }

      // Measure response time if available
      if (res.duration) {
        totalResponseTime += res.duration;
      }
    } else {
      analysis.errors++;
    }
  });

  if (analysis.total > 0) {
    analysis.avgResponseTime = totalResponseTime / analysis.total;
    analysis.successRate = (analysis.successful / analysis.total) * 100;
    analysis.rateLimitRate = (analysis.rateLimited / analysis.total) * 100;
    analysis.errorRate = (analysis.errors / analysis.total) * 100;
  }

  return analysis;
};

/**
 * Clean up test data and resources
 * @param {Object} resources - Resources to clean up
 * @returns {Promise<void>}
 */
const cleanupTestResources = async (resources) => {
  const { users, transactions, accounts } = resources;

  try {
    // Delete test transactions
    if (transactions && transactions.length > 0) {
      // Implementation depends on your database structure
      console.log(`Cleaning up ${transactions.length} test transactions`);
    }

    // Delete test accounts
    if (accounts && accounts.length > 0) {
      console.log(`Cleaning up ${accounts.length} test accounts`);
    }

    // Delete test users
    if (users && users.length > 0) {
      console.log(`Cleaning up ${users.length} test users`);
    }
  } catch (error) {
    console.warn('Error during test cleanup:', error.message);
  }
};

module.exports = {
  generateTestToken,
  createTestUser,
  createTestUsers,
  hashPassword,
  sleep,
  generateTransactionData,
  generateAccountData,
  createMockRequest,
  createMockResponse,
  waitForCondition,
  measureExecutionTime,
  generateConcurrentRequests,
  analyzeRateLimitResponses,
  cleanupTestResources
};