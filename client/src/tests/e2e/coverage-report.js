#!/usr/bin/env node

/**
 * E2E Test Coverage Report Generator
 *
 * Parses Playwright test results and generates coverage metrics
 * Usage: node coverage-report.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const RESULTS_PATH = path.join(__dirname, '../../../test-results/results.json');
const SUMMARY_PATH = path.join(__dirname, '../../../test-results/coverage-summary.json');

// ANSI color codes for terminal
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
 * Parse test results JSON
 */
function parseResults() {
  try {
    if (!fs.existsSync(RESULTS_PATH)) {
      console.error(`${colors.red}❌ Results file not found: ${RESULTS_PATH}${colors.reset}`);
      console.log(`${colors.yellow}💡 Run 'npm run test:e2e' first to generate results${colors.reset}`);
      process.exit(1);
    }

    const rawData = fs.readFileSync(RESULTS_PATH, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`${colors.red}❌ Error parsing results: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Calculate coverage metrics
 */
function calculateMetrics(results) {
  const suites = results.suites || [];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  let duration = 0;

  const suiteMetrics = [];

  function processSuite(suite) {
    const suiteData = {
      title: suite.title,
      file: suite.file || '',
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
    };

    // Process tests in this suite
    if (suite.specs) {
      suite.specs.forEach(spec => {
        const tests = spec.tests || [];
        tests.forEach(test => {
          totalTests++;
          suiteData.total++;

          const result = test.results?.[0];
          if (result) {
            suiteData.duration += result.duration || 0;
            duration += result.duration || 0;

            if (result.status === 'passed') {
              passedTests++;
              suiteData.passed++;
            } else if (result.status === 'failed') {
              failedTests++;
              suiteData.failed++;
            } else if (result.status === 'skipped') {
              skippedTests++;
              suiteData.skipped++;
            }
          }
        });
      });
    }

    // Process nested suites
    if (suite.suites) {
      suite.suites.forEach(processSuite);
    }

    if (suiteData.total > 0) {
      suiteMetrics.push(suiteData);
    }
  }

  suites.forEach(processSuite);

  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;

  return {
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    passRate: parseFloat(passRate),
    duration,
    suiteMetrics,
  };
}

/**
 * Generate coverage summary
 */
function generateSummary(metrics) {
  const summary = {
    timestamp: new Date().toISOString(),
    overall: {
      total: metrics.totalTests,
      passed: metrics.passedTests,
      failed: metrics.failedTests,
      skipped: metrics.skippedTests,
      passRate: metrics.passRate,
      duration: metrics.duration,
    },
    suites: metrics.suiteMetrics,
    status: metrics.passRate >= 85 ? 'PASS' : 'NEEDS_IMPROVEMENT',
    thresholds: {
      target: 85,
      current: metrics.passRate,
      met: metrics.passRate >= 85,
    },
  };

  // Write summary to file
  try {
    const dir = path.dirname(SUMMARY_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
    console.log(`${colors.cyan}📊 Coverage summary saved to: ${SUMMARY_PATH}${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Error writing summary: ${error.message}${colors.reset}`);
  }

  return summary;
}

/**
 * Print coverage report to console
 */
function printReport(metrics, summary) {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}${colors.blue}E2E TEST COVERAGE REPORT${colors.reset}`);
  console.log('='.repeat(80) + '\n');

  // Overall metrics
  console.log(`${colors.bright}OVERALL RESULTS:${colors.reset}`);
  console.log(`  Total Tests:    ${metrics.totalTests}`);
  console.log(`  ${colors.green}✓ Passed:${colors.reset}       ${metrics.passedTests}`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset}       ${metrics.failedTests}`);
  console.log(`  ${colors.yellow}⊘ Skipped:${colors.reset}      ${metrics.skippedTests}`);
  console.log(`  Duration:       ${(metrics.duration / 1000).toFixed(2)}s`);

  // Pass rate with color coding
  const passRateColor = metrics.passRate >= 85 ? colors.green :
                        metrics.passRate >= 70 ? colors.yellow : colors.red;
  console.log(`  Pass Rate:      ${passRateColor}${metrics.passRate}%${colors.reset}\n`);

  // Suite breakdown
  console.log(`${colors.bright}SUITE BREAKDOWN:${colors.reset}`);
  console.log('─'.repeat(80));
  console.log(`${'Suite'.padEnd(40)} ${'Tests'.padEnd(8)} ${'Passed'.padEnd(8)} ${'Failed'.padEnd(8)} ${'Duration'.padEnd(10)}`);
  console.log('─'.repeat(80));

  metrics.suiteMetrics.forEach(suite => {
    const suiteName = suite.title || path.basename(suite.file);
    const suitePassRate = suite.total > 0 ? ((suite.passed / suite.total) * 100).toFixed(0) : 0;
    const statusColor = suite.failed === 0 ? colors.green : colors.red;

    console.log(
      `${suiteName.substring(0, 39).padEnd(40)} ` +
      `${String(suite.total).padEnd(8)} ` +
      `${statusColor}${String(suite.passed).padEnd(8)}${colors.reset} ` +
      `${suite.failed > 0 ? colors.red : ''}${String(suite.failed).padEnd(8)}${colors.reset} ` +
      `${(suite.duration / 1000).toFixed(2)}s`
    );
  });

  console.log('─'.repeat(80) + '\n');

  // Threshold check
  console.log(`${colors.bright}COVERAGE THRESHOLD:${colors.reset}`);
  console.log(`  Target:         ${summary.thresholds.target}%`);
  console.log(`  Current:        ${summary.thresholds.current}%`);

  if (summary.thresholds.met) {
    console.log(`  Status:         ${colors.green}✓ PASSED${colors.reset}\n`);
  } else {
    const gap = (summary.thresholds.target - summary.thresholds.current).toFixed(2);
    console.log(`  Status:         ${colors.yellow}⚠ NEEDS IMPROVEMENT${colors.reset}`);
    console.log(`  Gap:            ${gap}% below target\n`);
  }

  // Critical user flows coverage
  console.log(`${colors.bright}CRITICAL USER FLOWS:${colors.reset}`);
  const criticalFlows = [
    { name: 'Authentication', suite: 'Authentication Flow' },
    { name: 'Finance Dashboard', suite: 'Finance Dashboard' },
    { name: 'Transport Optimization', suite: 'Transport Feature' },
    { name: 'Alimentation/Recipes', suite: 'Alimentation Feature' },
    { name: 'Premium Features', suite: 'Premium Features' },
  ];

  criticalFlows.forEach(flow => {
    const suite = metrics.suiteMetrics.find(s => s.title.includes(flow.suite));
    if (suite) {
      const coverage = suite.total > 0 ? ((suite.passed / suite.total) * 100).toFixed(0) : 0;
      const icon = suite.failed === 0 ? '✓' : '✗';
      const color = suite.failed === 0 ? colors.green : colors.red;
      console.log(`  ${color}${icon}${colors.reset} ${flow.name.padEnd(30)} ${coverage}% (${suite.passed}/${suite.total})`);
    } else {
      console.log(`  ${colors.yellow}⊘${colors.reset} ${flow.name.padEnd(30)} Not found`);
    }
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // Exit with error code if threshold not met
  if (!summary.thresholds.met) {
    console.log(`${colors.yellow}⚠ Coverage is below 85% threshold${colors.reset}`);
    console.log(`${colors.yellow}💡 Add more tests or fix failing tests to improve coverage${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✓ All coverage thresholds met!${colors.reset}\n`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.cyan}🔍 Analyzing E2E test results...${colors.reset}\n`);

  const results = parseResults();
  const metrics = calculateMetrics(results);
  const summary = generateSummary(metrics);
  printReport(metrics, summary);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { parseResults, calculateMetrics, generateSummary };
