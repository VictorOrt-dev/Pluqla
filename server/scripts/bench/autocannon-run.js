#!/usr/bin/env node

/**
 * Autocannon Benchmark Script
 *
 * HTTP load testing tool to benchmark API performance
 * Tests various endpoints and measures throughput, latency
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BENCHMARK_URL || 'http://localhost:3004';
const DURATION = parseInt(process.env.BENCHMARK_DURATION || '30', 10); // seconds
const CONNECTIONS = parseInt(process.env.BENCHMARK_CONNECTIONS || '10', 10);
const PIPELINING = parseInt(process.env.BENCHMARK_PIPELINING || '1', 10);

// Test JWT token (generate one for testing or use from env)
const TEST_JWT = process.env.BENCHMARK_JWT || '';

// Results directory
const RESULTS_DIR = path.join(__dirname, '..', '..', 'bench', 'results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Run a single benchmark test
 */
async function runBenchmark(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking: ${config.name}`);
  console.log(`Endpoint: ${config.url}`);
  console.log(`Method: ${config.method || 'GET'}`);
  console.log(`Duration: ${DURATION}s | Connections: ${CONNECTIONS}`);
  console.log('='.repeat(60));

  const opts = {
    url: `${BASE_URL}${config.url}`,
    method: config.method || 'GET',
    connections: CONNECTIONS,
    pipelining: PIPELINING,
    duration: DURATION,
    headers: config.headers || {},
    body: config.body ? JSON.stringify(config.body) : undefined,
    ...config.options
  };

  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    // Progress tracking
    autocannon.track(instance, { renderProgressBar: true });
  });
}

/**
 * Display benchmark results
 */
function displayResults(result, testName) {
  console.log('\n📊 RESULTS:');
  console.log('─'.repeat(60));

  // Throughput
  console.log(`\n✅ Requests:`);
  console.log(`   Total:     ${result.requests.total}`);
  console.log(`   Avg/sec:   ${result.requests.average.toFixed(2)}`);
  console.log(`   Min/sec:   ${result.requests.min}`);
  console.log(`   Max/sec:   ${result.requests.max}`);

  // Latency
  console.log(`\n⏱️  Latency:`);
  console.log(`   Avg:       ${result.latency.mean.toFixed(2)} ms`);
  console.log(`   Median:    ${result.latency.p50.toFixed(2)} ms`);
  console.log(`   P95:       ${result.latency.p95.toFixed(2)} ms`);
  console.log(`   P99:       ${result.latency.p99.toFixed(2)} ms`);
  console.log(`   Max:       ${result.latency.max.toFixed(2)} ms`);

  // Throughput
  console.log(`\n🚀 Throughput:`);
  console.log(`   Avg:       ${formatBytes(result.throughput.average)}/sec`);
  console.log(`   Total:     ${formatBytes(result.throughput.total)}`);

  // Errors
  console.log(`\n❌ Errors:    ${result.errors}`);
  console.log(`⏱️  Timeouts:  ${result.timeouts}`);

  // Status codes
  if (result.statusCodeStats) {
    console.log(`\n📈 Status Codes:`);
    Object.keys(result.statusCodeStats).forEach(code => {
      console.log(`   ${code}: ${result.statusCodeStats[code]}`);
    });
  }

  console.log('\n' + '─'.repeat(60));
}

/**
 * Save results to JSON file
 */
function saveResults(results, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join(RESULTS_DIR, `${filename}_${timestamp}.json`);

  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${filepath}`);
}

/**
 * Main benchmark execution
 */
async function main() {
  console.log('\n🚀 Starting Autocannon Benchmarks for Pluqla API');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Duration: ${DURATION}s per test`);
  console.log(`Connections: ${CONNECTIONS}`);
  console.log('\n');

  const allResults = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: BASE_URL,
      duration: DURATION,
      connections: CONNECTIONS,
      pipelining: PIPELINING
    },
    tests: []
  };

  // Test 1: Health endpoint (baseline)
  try {
    const healthResult = await runBenchmark({
      name: 'Health Check (Baseline)',
      url: '/health',
      method: 'GET'
    });
    displayResults(healthResult, 'Health Check');
    allResults.tests.push({
      name: 'health-check',
      result: healthResult
    });
  } catch (error) {
    console.error('❌ Health check benchmark failed:', error.message);
  }

  // Test 2: Metrics endpoint
  try {
    const metricsResult = await runBenchmark({
      name: 'Metrics Endpoint',
      url: '/metrics',
      method: 'GET'
    });
    displayResults(metricsResult, 'Metrics');
    allResults.tests.push({
      name: 'metrics',
      result: metricsResult
    });
  } catch (error) {
    console.error('❌ Metrics benchmark failed:', error.message);
  }

  // Test 3: JWT verification (if token provided)
  if (TEST_JWT) {
    try {
      const authResult = await runBenchmark({
        name: 'Authenticated Endpoint (JWT verification)',
        url: '/api/user/profile',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_JWT}`,
          'Content-Type': 'application/json'
        }
      });
      displayResults(authResult, 'Authenticated Endpoint');
      allResults.tests.push({
        name: 'auth-profile',
        result: authResult
      });
    } catch (error) {
      console.error('❌ Auth endpoint benchmark failed:', error.message);
    }
  } else {
    console.log('\n⚠️  Skipping authenticated endpoint tests (no BENCHMARK_JWT provided)');
  }

  // Test 4: POST endpoint (user registration simulation)
  try {
    const postResult = await runBenchmark({
      name: 'POST Request (Registration)',
      url: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        name: 'Benchmark User'
      }
    });
    displayResults(postResult, 'POST Registration');
    allResults.tests.push({
      name: 'post-register',
      result: postResult
    });
  } catch (error) {
    console.error('❌ POST benchmark failed:', error.message);
  }

  // Test 5: AI suggestions endpoint (if authenticated)
  if (TEST_JWT) {
    try {
      const aiResult = await runBenchmark({
        name: 'AI Suggestions Endpoint',
        url: '/api/ai/suggestions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_JWT}`,
          'Content-Type': 'application/json'
        },
        body: {
          category: 'groceries',
          amount: 50
        }
      });
      displayResults(aiResult, 'AI Suggestions');
      allResults.tests.push({
        name: 'ai-suggestions',
        result: aiResult
      });
    } catch (error) {
      console.error('❌ AI endpoint benchmark failed:', error.message);
    }
  }

  // Test 6: Database query endpoint (transactions list)
  if (TEST_JWT) {
    try {
      const dbResult = await runBenchmark({
        name: 'Database Query (Transactions)',
        url: '/api/transactions?page=1&limit=20',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_JWT}`,
          'Content-Type': 'application/json'
        }
      });
      displayResults(dbResult, 'Database Query');
      allResults.tests.push({
        name: 'db-transactions',
        result: dbResult
      });
    } catch (error) {
      console.error('❌ Database query benchmark failed:', error.message);
    }
  }

  // Save all results
  saveResults(allResults, 'autocannon_benchmark');

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 BENCHMARK SUMMARY');
  console.log('='.repeat(60));

  allResults.tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    console.log(`   Requests/sec: ${test.result.requests.average.toFixed(2)}`);
    console.log(`   Latency P95:  ${test.result.latency.p95.toFixed(2)} ms`);
    console.log(`   Errors:       ${test.result.errors}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All benchmarks completed!');
  console.log('='.repeat(60) + '\n');

  // Performance recommendations
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS:\n');

  allResults.tests.forEach(test => {
    const avgLatency = test.result.latency.mean;
    const p95Latency = test.result.latency.p95;
    const errorRate = (test.result.errors / test.result.requests.total) * 100;

    if (avgLatency > 100) {
      console.log(`⚠️  ${test.name}: High average latency (${avgLatency.toFixed(2)}ms)`);
      console.log('   → Consider caching, database indexing, or query optimization');
    }

    if (p95Latency > 500) {
      console.log(`⚠️  ${test.name}: High P95 latency (${p95Latency.toFixed(2)}ms)`);
      console.log('   → Check for slow database queries or external API calls');
    }

    if (errorRate > 1) {
      console.log(`❌ ${test.name}: Error rate ${errorRate.toFixed(2)}%`);
      console.log('   → Review error logs and fix failing requests');
    }
  });

  console.log('\n');
}

// Run benchmarks
main().catch(error => {
  console.error('\n❌ Benchmark failed:', error);
  process.exit(1);
});
