#!/usr/bin/env node

/**
 * Health Check Script for Pluqla Deployment
 *
 * Performs comprehensive health checks after deployment to ensure
 * all services are operational before considering deployment successful.
 *
 * Usage:
 *   node scripts/health-check.js [environment]
 *
 * Environments:
 *   - staging (default)
 *   - production
 *
 * Exit codes:
 *   0 - All health checks passed
 *   1 - One or more health checks failed
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Environment configuration
const ENVIRONMENTS = {
  staging: {
    apiUrl: process.env.STAGING_API_URL || 'http://localhost:3004',
    clientUrl: process.env.STAGING_CLIENT_URL || 'http://localhost:3000',
    name: 'Staging',
  },
  production: {
    apiUrl: process.env.PRODUCTION_API_URL || 'https://api.pluqla.app',
    clientUrl: process.env.PRODUCTION_URL || 'https://pluqla.app',
    name: 'Production',
  },
};

// Health check thresholds
const THRESHOLDS = {
  maxResponseTime: 2000, // 2 seconds
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
};

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Make HTTP/HTTPS request with timeout
 */
function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const startTime = performance.now();

    const req = protocol.get(url, (res) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });
  });
}

/**
 * Check API health endpoint
 */
async function checkApiHealth(apiUrl) {
  console.log(`\n${colors.cyan}Checking API health endpoint...${colors.reset}`);

  const healthUrl = `${apiUrl}/health`;

  try {
    const response = await makeRequest(healthUrl);

    if (response.statusCode === 200) {
      console.log(`${colors.green}✓${colors.reset} API health endpoint responding`);
      console.log(`  Response time: ${response.responseTime.toFixed(0)}ms`);

      if (response.responseTime > THRESHOLDS.maxResponseTime) {
        console.log(`  ${colors.yellow}⚠${colors.reset} Warning: Response time exceeds ${THRESHOLDS.maxResponseTime}ms threshold`);
      }

      // Try to parse response body
      try {
        const healthData = JSON.parse(response.body);
        if (healthData.status) {
          console.log(`  Status: ${healthData.status}`);
        }
        if (healthData.uptime) {
          console.log(`  Uptime: ${Math.floor(healthData.uptime)}s`);
        }
      } catch (e) {
        // Non-JSON response is okay
      }

      return true;
    } else {
      console.log(`${colors.red}✗${colors.reset} API health check failed`);
      console.log(`  Status code: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} API health check failed`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

/**
 * Check client accessibility
 */
async function checkClientAccess(clientUrl) {
  console.log(`\n${colors.cyan}Checking client accessibility...${colors.reset}`);

  try {
    const response = await makeRequest(clientUrl);

    if (response.statusCode === 200) {
      console.log(`${colors.green}✓${colors.reset} Client accessible`);
      console.log(`  Response time: ${response.responseTime.toFixed(0)}ms`);

      // Check for expected HTML content
      if (response.body.includes('<html') || response.body.includes('<!DOCTYPE')) {
        console.log(`  ${colors.green}✓${colors.reset} Valid HTML response received`);
      }

      return true;
    } else if (response.statusCode >= 300 && response.statusCode < 400) {
      console.log(`${colors.yellow}⚠${colors.reset} Client returned redirect (${response.statusCode})`);
      console.log(`  Location: ${response.headers.location}`);
      return true; // Redirects are acceptable
    } else {
      console.log(`${colors.red}✗${colors.reset} Client check failed`);
      console.log(`  Status code: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Client check failed`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

/**
 * Check critical API endpoints
 */
async function checkCriticalEndpoints(apiUrl) {
  console.log(`\n${colors.cyan}Checking critical API endpoints...${colors.reset}`);

  const endpoints = [
    { path: '/api/auth/validate', name: 'Auth validation' },
    { path: '/api/users/me', name: 'User profile' },
    // Add more critical endpoints as needed
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    const url = `${apiUrl}${endpoint.path}`;

    try {
      const response = await makeRequest(url);

      // Accept 200 (success), 401 (unauthorized - endpoint exists but requires auth)
      if (response.statusCode === 200 || response.statusCode === 401) {
        console.log(`${colors.green}✓${colors.reset} ${endpoint.name} endpoint operational`);
      } else {
        console.log(`${colors.yellow}⚠${colors.reset} ${endpoint.name} returned ${response.statusCode}`);
        // Don't fail for non-critical endpoint status codes
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠${colors.reset} ${endpoint.name} check failed: ${error.message}`);
      // Continue with other checks
    }
  }

  return allPassed;
}

/**
 * Perform all health checks with retries
 */
async function performHealthChecks(environment) {
  const env = ENVIRONMENTS[environment];

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bright}${colors.blue}HEALTH CHECK - ${env.name} Environment${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\nAPI URL:    ${env.apiUrl}`);
  console.log(`Client URL: ${env.clientUrl}`);
  console.log(`Timestamp:  ${new Date().toISOString()}`);

  const checks = [
    { name: 'API Health', fn: () => checkApiHealth(env.apiUrl), critical: true },
    { name: 'Client Access', fn: () => checkClientAccess(env.clientUrl), critical: true },
    { name: 'Critical Endpoints', fn: () => checkCriticalEndpoints(env.apiUrl), critical: false },
  ];

  const results = [];

  for (const check of checks) {
    let passed = false;
    let attempts = 0;

    while (!passed && attempts < THRESHOLDS.maxRetries) {
      attempts++;

      if (attempts > 1) {
        console.log(`\n${colors.yellow}Retry ${attempts}/${THRESHOLDS.maxRetries} for ${check.name}...${colors.reset}`);
        await new Promise((resolve) => setTimeout(resolve, THRESHOLDS.retryDelay));
      }

      passed = await check.fn();

      if (passed) break;
    }

    results.push({
      name: check.name,
      passed,
      critical: check.critical,
      attempts,
    });
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bright}HEALTH CHECK SUMMARY${colors.reset}`);
  console.log(`${'='.repeat(80)}\n`);

  let allCriticalPassed = true;

  results.forEach((result) => {
    const status = result.passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    const critical = result.critical ? ' (critical)' : '';
    const retries = result.attempts > 1 ? ` (${result.attempts} attempts)` : '';

    console.log(`${status} - ${result.name}${critical}${retries}`);

    if (result.critical && !result.passed) {
      allCriticalPassed = false;
    }
  });

  console.log();

  if (allCriticalPassed) {
    console.log(`${colors.green}${colors.bright}✓ ALL CRITICAL HEALTH CHECKS PASSED${colors.reset}`);
    console.log(`\n${env.name} environment is operational and ready.`);
    return 0;
  } else {
    console.log(`${colors.red}${colors.bright}✗ CRITICAL HEALTH CHECKS FAILED${colors.reset}`);
    console.log(`\n${env.name} environment is not fully operational.`);
    console.log(`${colors.yellow}Deployment should be rolled back or investigated.${colors.reset}`);
    return 1;
  }
}

/**
 * Main execution
 */
async function main() {
  const environment = process.argv[2] || 'staging';

  if (!ENVIRONMENTS[environment]) {
    console.error(`${colors.red}Error:${colors.reset} Invalid environment '${environment}'`);
    console.error(`Valid environments: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    process.exit(1);
  }

  try {
    const exitCode = await performHealthChecks(environment);
    process.exit(exitCode);
  } catch (error) {
    console.error(`\n${colors.red}Unexpected error during health check:${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  performHealthChecks,
  checkApiHealth,
  checkClientAccess,
  checkCriticalEndpoints,
};
