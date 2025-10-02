/**
 * K6 Load Test Script for Rate Limiting
 *
 * Run with: k6 run tests/load/k6-rate-limit.js
 *
 * Test Strategy:
 * - Ramp up to 100 VUs over 30s
 * - Sustain 100 VUs for 60s
 * - Burst to 200 VUs for 30s
 * - Ramp down to 0 over 30s
 *
 * Metrics:
 * - Rate limit enforcement (429 responses)
 * - Response time under load
 * - Throughput capacity
 * - Error rate distribution
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const successfulRequests = new Counter('successful_requests');
const requestDuration = new Trend('request_duration');
const rateLimitRate = new Rate('rate_limit_rate');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp-up
    { duration: '60s', target: 100 },  // Sustained load
    { duration: '30s', target: 200 },  // Burst
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    // Rate limit should trigger for >15% of requests at high load
    'rate_limit_rate': ['rate>=0.15'],

    // 95% of requests should complete within 200ms
    'http_req_duration': ['p(95)<200'],

    // 99% of requests should complete within 500ms
    'http_req_duration': ['p(99)<500'],

    // Request failure rate should be low (excluding 429s)
    'http_req_failed{status:!429}': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';

// Auth token (replace with actual login flow in production)
let authToken = '';

export function setup() {
  // Login to get auth token
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'test@k6load.com',
    password: 'TestPassword123!'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    return { authToken: body.token };
  }

  return { authToken: '' };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
    'Content-Type': 'application/json',
  };

  group('Standard API Endpoints', () => {
    // Test 1: User profile endpoint
    const profileResponse = http.get(`${BASE_URL}/api/users/me`, { headers });

    const profileCheck = check(profileResponse, {
      'profile status is 200 or 429': (r) => r.status === 200 || r.status === 429,
      'profile response time < 200ms': (r) => r.timings.duration < 200,
    });

    if (profileResponse.status === 429) {
      rateLimitHits.add(1);
      rateLimitRate.add(1);
    } else if (profileResponse.status === 200) {
      successfulRequests.add(1);
      rateLimitRate.add(0);
    }

    requestDuration.add(profileResponse.timings.duration);

    // Test 2: Transactions endpoint
    const transactionsResponse = http.get(`${BASE_URL}/api/transactions`, { headers });

    check(transactionsResponse, {
      'transactions status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    });

    if (transactionsResponse.status === 429) {
      rateLimitHits.add(1);
      rateLimitRate.add(1);
    } else if (transactionsResponse.status === 200) {
      successfulRequests.add(1);
      rateLimitRate.add(0);
    }

    // Test 3: Categories endpoint
    const categoriesResponse = http.get(`${BASE_URL}/api/categories`, { headers });

    check(categoriesResponse, {
      'categories status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    });

    if (categoriesResponse.status === 429) {
      rateLimitHits.add(1);
      rateLimitRate.add(1);
    } else if (categoriesResponse.status === 200) {
      successfulRequests.add(1);
      rateLimitRate.add(0);
    }
  });

  group('AI Endpoints (Stricter Limits)', () => {
    // Test 4: AI suggestions endpoint
    const aiResponse = http.post(`${BASE_URL}/api/ai/suggestions`, JSON.stringify({
      category: 'financial'
    }), { headers });

    check(aiResponse, {
      'AI status is 200, 429, 500, or 503': (r) =>
        r.status === 200 || r.status === 429 || r.status === 500 || r.status === 503,
      'AI response has correct headers': (r) =>
        r.headers['X-Ratelimit-Limit'] !== undefined || r.status === 429,
    });

    if (aiResponse.status === 429) {
      rateLimitHits.add(1);
      rateLimitRate.add(1);
    } else if (aiResponse.status === 200) {
      successfulRequests.add(1);
      rateLimitRate.add(0);
    }

    // Verify rate limit headers
    if (aiResponse.headers['X-Ratelimit-Remaining']) {
      const remaining = parseInt(aiResponse.headers['X-Ratelimit-Remaining']);
      check(aiResponse, {
        'rate limit remaining is non-negative': () => remaining >= 0,
      });
    }
  });

  group('Public Endpoints (IP-based)', () => {
    // Test 5: Health check (should always succeed)
    const healthResponse = http.get(`${BASE_URL}/health/live`);

    check(healthResponse, {
      'health check is 200': (r) => r.status === 200,
    });

    // Test 6: AI status (public, IP-based rate limit)
    const statusResponse = http.get(`${BASE_URL}/api/ai/status`);

    check(statusResponse, {
      'AI status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    });

    if (statusResponse.status === 429) {
      rateLimitHits.add(1);
      rateLimitRate.add(1);
    }
  });

  // Simulate realistic user behavior (not hammering continuously)
  sleep(0.5 + Math.random() * 1); // Random delay 0.5-1.5s
}

export function teardown(data) {
  // Summary statistics
  console.log(`Total rate limit hits: ${rateLimitHits.value}`);
  console.log(`Total successful requests: ${successfulRequests.value}`);
  console.log(`Rate limit enforcement rate: ${(rateLimitRate.value * 100).toFixed(2)}%`);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'rate-limit-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;

  let summary = `\n${indent}Rate Limit Load Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  summary += `${indent}Request Statistics:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Successful (200): ${successfulRequests.value}\n`;
  summary += `${indent}  Rate Limited (429): ${rateLimitHits.value}\n`;
  summary += `${indent}  Rate Limit Rate: ${(rateLimitRate.value * 100).toFixed(2)}%\n\n`;

  summary += `${indent}Performance Metrics:\n`;
  summary += `${indent}  Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  summary += `${indent}Threshold Status:\n`;
  summary += `${indent}  P95 < 200ms: ${data.metrics.http_req_duration.values['p(95)'] < 200 ? 'PASS' : 'FAIL'}\n`;
  summary += `${indent}  P99 < 500ms: ${data.metrics.http_req_duration.values['p(99)'] < 500 ? 'PASS' : 'FAIL'}\n`;
  summary += `${indent}  Rate Limit Enforced: ${rateLimitRate.value >= 0.15 ? 'PASS' : 'FAIL'}\n`;

  return summary;
}
