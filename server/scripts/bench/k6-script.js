/**
 * K6 Load Testing Script for Pluqla API
 *
 * Advanced load testing with scenarios and thresholds
 * Tests various user journeys and system behavior under load
 *
 * Installation: https://k6.io/docs/getting-started/installation/
 * Run: k6 run scripts/bench/k6-script.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const dbQueryLatency = new Trend('db_query_latency');
const aiRequestsCounter = new Counter('ai_requests_total');

// Configuration
const BASE_URL = __ENV.BENCHMARK_URL || 'http://localhost:3004';
const TEST_JWT = __ENV.BENCHMARK_JWT || '';

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],

  // Thresholds (SLA requirements)
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.01'],                 // Error rate < 1%
    'errors': ['rate<0.05'],                          // Custom error rate < 5%
    'auth_latency': ['p(95)<200'],                    // Auth should be fast
    'db_query_latency': ['p(95)<300'],                // DB queries under 300ms
  },

  // HTTP configuration
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0',
};

/**
 * Setup function - runs once before all tests
 */
export function setup() {
  console.log('🚀 Starting K6 load test for Pluqla API');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test JWT: ${TEST_JWT ? 'Provided' : 'Not provided (some tests will be skipped)'}`);

  // Verify API is accessible
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    console.error('❌ API health check failed. Is the server running?');
    return { apiAvailable: false };
  }

  console.log('✅ API is accessible');
  return {
    apiAvailable: true,
    testJwt: TEST_JWT
  };
}

/**
 * Main test function - runs for each virtual user
 */
export default function (data) {
  if (!data.apiAvailable) {
    console.error('Skipping tests - API not available');
    return;
  }

  // Test 1: Health Check (Baseline)
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has status field': (r) => JSON.parse(r.body).hasOwnProperty('status'),
    });

    errorRate.add(!success);
  });

  sleep(1);

  // Test 2: Metrics Endpoint
  group('Metrics Endpoint', () => {
    const res = http.get(`${BASE_URL}/metrics`);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'content-type is text/plain': (r) => r.headers['Content-Type']?.includes('text/plain'),
    });

    errorRate.add(!success);
  });

  sleep(1);

  // Test 3: Authenticated Endpoints (if JWT available)
  if (data.testJwt) {
    group('JWT Verification', () => {
      const headers = {
        'Authorization': `Bearer ${data.testJwt}`,
        'Content-Type': 'application/json',
      };

      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/user/profile`, { headers });
      const duration = Date.now() - startTime;

      authLatency.add(duration);

      const success = check(res, {
        'status is 200 or 401': (r) => [200, 401].includes(r.status),
        'response time < 300ms': (r) => r.timings.duration < 300,
      });

      errorRate.add(!success);
    });

    sleep(1);
  }

  // Test 4: Database Query Load
  if (data.testJwt) {
    group('Database Queries', () => {
      const headers = {
        'Authorization': `Bearer ${data.testJwt}`,
        'Content-Type': 'application/json',
      };

      const startTime = Date.now();
      const res = http.get(`${BASE_URL}/api/transactions?page=1&limit=20`, { headers });
      const duration = Date.now() - startTime;

      dbQueryLatency.add(duration);

      const success = check(res, {
        'status is 200 or 401': (r) => [200, 401].includes(r.status),
        'response time < 500ms': (r) => r.timings.duration < 500,
      });

      errorRate.add(!success);
    });

    sleep(1);
  }

  // Test 5: POST Request (Registration)
  group('POST Requests', () => {
    const payload = JSON.stringify({
      email: `load-test-${Date.now()}-${Math.random()}@example.com`,
      password: 'SecurePassword123!',
      name: 'Load Test User',
    });

    const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const success = check(res, {
      'status is 201 or 400 or 409': (r) => [201, 400, 409].includes(r.status),
      'response time < 800ms': (r) => r.timings.duration < 800,
    });

    errorRate.add(!success);
  });

  sleep(1);

  // Test 6: AI Endpoint Load (if authenticated)
  if (data.testJwt) {
    group('AI Suggestions', () => {
      const headers = {
        'Authorization': `Bearer ${data.testJwt}`,
        'Content-Type': 'application/json',
      };

      const payload = JSON.stringify({
        category: 'groceries',
        amount: Math.floor(Math.random() * 100) + 10,
      });

      const res = http.post(`${BASE_URL}/api/ai/suggestions`, payload, { headers });

      aiRequestsCounter.add(1);

      const success = check(res, {
        'status is 200 or 401 or 503': (r) => [200, 401, 503].includes(r.status),
        'response time < 2000ms': (r) => r.timings.duration < 2000, // AI can be slower
      });

      errorRate.add(!success);
    });

    sleep(2);
  }

  // Test 7: Session Concurrency Limits
  if (data.testJwt) {
    group('Session Concurrency', () => {
      const headers = {
        'Authorization': `Bearer ${data.testJwt}`,
        'Content-Type': 'application/json',
      };

      const res = http.post(`${BASE_URL}/api/auth/session`, {}, { headers });

      const success = check(res, {
        'status is 200 or 401 or 429': (r) => [200, 401, 429].includes(r.status),
        'handles concurrency limit': (r) => {
          if (r.status === 429) {
            const body = JSON.parse(r.body);
            return body.error === 'TOO_MANY_SESSIONS';
          }
          return true;
        },
      });

      errorRate.add(!success);
    });

    sleep(1);
  }

  // Test 8: Rate Limiting
  group('Rate Limiting', () => {
    const requests = [];

    // Send rapid requests to trigger rate limiting
    for (let i = 0; i < 30; i++) {
      requests.push(http.get(`${BASE_URL}/health`));
    }

    // Check if rate limiting is enforced
    const rateLimited = requests.some(r => r.status === 429);

    check(rateLimited, {
      'rate limiting enforced': (limited) => limited || requests.length < 30,
    });
  });

  sleep(1);
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('\n📊 K6 Load Test Completed');
  console.log('Check the summary above for detailed metrics');
  console.log('\n💡 Review these key metrics:');
  console.log('  - http_req_duration: Overall response times');
  console.log('  - http_req_failed: Request failure rate');
  console.log('  - errors: Custom error rate');
  console.log('  - auth_latency: JWT verification performance');
  console.log('  - db_query_latency: Database query performance');
}

/**
 * Handle summary output
 */
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsPath = `bench/results/k6_results_${timestamp}.json`;

  console.log(`\n💾 Saving detailed results to: ${resultsPath}`);

  return {
    [resultsPath]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

/**
 * Helper function for text summary
 */
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n' + indent + '='.repeat(60) + '\n';
  summary += indent + '📊 K6 LOAD TEST SUMMARY\n';
  summary += indent + '='.repeat(60) + '\n\n';

  // Requests summary
  summary += indent + '✅ Total Requests:\n';
  summary += indent + `   Sent: ${data.metrics.http_reqs.values.count}\n`;
  summary += indent + `   Failed: ${data.metrics.http_req_failed.values.rate * 100}%\n\n`;

  // Response time
  summary += indent + '⏱️  Response Times:\n';
  summary += indent + `   Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += indent + `   P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += indent + `   P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += indent + `   Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;

  // Custom metrics
  if (data.metrics.auth_latency) {
    summary += indent + '🔐 Auth Latency:\n';
    summary += indent + `   P95: ${data.metrics.auth_latency.values['p(95)'].toFixed(2)}ms\n\n`;
  }

  if (data.metrics.db_query_latency) {
    summary += indent + '💾 DB Query Latency:\n';
    summary += indent + `   P95: ${data.metrics.db_query_latency.values['p(95)'].toFixed(2)}ms\n\n`;
  }

  // Threshold results
  summary += indent + '📈 Threshold Status:\n';
  Object.keys(data.metrics).forEach(metric => {
    if (data.metrics[metric].thresholds) {
      Object.keys(data.metrics[metric].thresholds).forEach(threshold => {
        const passed = data.metrics[metric].thresholds[threshold].ok;
        const status = passed ? '✅ PASS' : '❌ FAIL';
        summary += indent + `   ${metric} (${threshold}): ${status}\n`;
      });
    }
  });

  summary += '\n' + indent + '='.repeat(60) + '\n';

  return summary;
}
