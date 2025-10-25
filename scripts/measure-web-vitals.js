#!/usr/bin/env node

/**
 * WEB VITALS BASELINE MEASUREMENT
 *
 * Measures Web Vitals in production-like environment to establish baselines
 * Uses Playwright to simulate real user interactions
 *
 * Usage: node scripts/measure-web-vitals.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '../docs/WEB_VITALS_BASELINE.md');
const NUM_RUNS = 5; // Multiple runs for statistical significance
const WAIT_BETWEEN_RUNS = 2000; // 2 seconds

// URLs to test
const URLS = [
  { name: 'Homepage', url: 'http://localhost:3000' },
  { name: 'Login', url: 'http://localhost:3000/#/login' },
  { name: 'Home Screen', url: 'http://localhost:3000/#/home' },
];

// Web Vitals thresholds (from Google)
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 600, needsImprovement: 1500 },
};

console.log('🔍 Starting Web Vitals baseline measurement...\n');
console.log(`📊 Running ${NUM_RUNS} measurements per URL\n`);

async function measureWebVitals() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  for (const urlConfig of URLS) {
    console.log(`📍 Measuring: ${urlConfig.name} (${urlConfig.url})`);
    results[urlConfig.name] = [];

    for (let run = 1; run <= NUM_RUNS; run++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Collect Web Vitals
      const vitals = {
        LCP: null,
        FID: null,
        INP: null,
        CLS: null,
        FCP: null,
        TTFB: null,
      };

      // Inject Web Vitals library
      await page.addInitScript(() => {
        window.webVitalsData = {};

        // Simplified Web Vitals tracking
        window.addEventListener('load', () => {
          // TTFB
          const navTiming = performance.getEntriesByType('navigation')[0];
          if (navTiming) {
            window.webVitalsData.TTFB = navTiming.responseStart - navTiming.requestStart;
          }

          // FCP
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            window.webVitalsData.FCP = fcpEntry.startTime;
          }

          // LCP (simplified - use performance observer in real implementation)
          setTimeout(() => {
            const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
            if (lcpEntries.length > 0) {
              window.webVitalsData.LCP = lcpEntries[lcpEntries.length - 1].renderTime ||
                                          lcpEntries[lcpEntries.length - 1].loadTime;
            }
          }, 3000);

          // CLS (simplified)
          let cls = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
            window.webVitalsData.CLS = cls;
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        });
      });

      try {
        // Navigate to page
        await page.goto(urlConfig.url, { waitUntil: 'networkidle' });

        // Wait for page to settle
        await page.waitForTimeout(3000);

        // Extract vitals
        const collectedVitals = await page.evaluate(() => window.webVitalsData || {});

        vitals.TTFB = collectedVitals.TTFB || null;
        vitals.FCP = collectedVitals.FCP || null;
        vitals.LCP = collectedVitals.LCP || null;
        vitals.CLS = collectedVitals.CLS || null;

        // Performance metrics from Playwright
        const metrics = await page.evaluate(() => {
          const perf = performance.getEntriesByType('navigation')[0];
          return {
            domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
            loadComplete: perf.loadEventEnd - perf.loadEventStart,
            totalLoadTime: perf.loadEventEnd - perf.fetchStart,
          };
        });

        results[urlConfig.name].push({
          run,
          vitals,
          metrics,
          timestamp: new Date().toISOString(),
        });

        console.log(`  Run ${run}/${NUM_RUNS}: LCP=${vitals.LCP?.toFixed(0) || 'N/A'}ms, FCP=${vitals.FCP?.toFixed(0) || 'N/A'}ms, TTFB=${vitals.TTFB?.toFixed(0) || 'N/A'}ms`);

      } catch (error) {
        console.error(`  ❌ Error on run ${run}:`, error.message);
      }

      await context.close();

      if (run < NUM_RUNS) {
        await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_RUNS));
      }
    }

    console.log('');
  }

  await browser.close();
  return results;
}

function calculateStats(values) {
  if (values.length === 0) return null;

  const validValues = values.filter(v => v !== null && !isNaN(v));
  if (validValues.length === 0) return null;

  const sorted = validValues.sort((a, b) => a - b);

  return {
    min: Math.round(Math.min(...validValues)),
    max: Math.round(Math.max(...validValues)),
    avg: Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length),
    median: Math.round(sorted[Math.floor(sorted.length / 2)]),
    p75: Math.round(sorted[Math.floor(sorted.length * 0.75)]),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
  };
}

function getRating(metric, value) {
  if (!value || !THRESHOLDS[metric]) return 'unknown';

  const thresholds = THRESHOLDS[metric];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function generateReport(results) {
  let report = `# Web Vitals Baseline Report\n\n`;
  report += `**Generated**: ${new Date().toISOString()}\n`;
  report += `**Runs per URL**: ${NUM_RUNS}\n`;
  report += `**Environment**: Local (production build)\n\n`;
  report += `---\n\n`;

  report += `## 📊 Core Web Vitals Summary\n\n`;

  Object.entries(results).forEach(([urlName, runs]) => {
    report += `### ${urlName}\n\n`;

    // Aggregate vitals
    const aggregated = {
      LCP: calculateStats(runs.map(r => r.vitals.LCP)),
      FCP: calculateStats(runs.map(r => r.vitals.FCP)),
      TTFB: calculateStats(runs.map(r => r.vitals.TTFB)),
      CLS: calculateStats(runs.map(r => r.vitals.CLS)),
    };

    report += `| Metric | Min | Avg | Median | P75 | P95 | Max | Rating |\n`;
    report += `|--------|-----|-----|--------|-----|-----|-----|--------|\n`;

    ['LCP', 'FCP', 'TTFB', 'CLS'].forEach(metric => {
      const stats = aggregated[metric];
      if (stats) {
        const rating = getRating(metric, stats.p75);
        const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
        const unit = metric === 'CLS' ? '' : 'ms';

        report += `| **${metric}** | ${stats.min}${unit} | ${stats.avg}${unit} | ${stats.median}${unit} | ${stats.p75}${unit} | ${stats.p95}${unit} | ${stats.max}${unit} | ${emoji} ${rating} |\n`;
      } else {
        report += `| **${metric}** | - | - | - | - | - | - | ⚠️ N/A |\n`;
      }
    });

    report += `\n`;
  });

  report += `## 🎯 Thresholds Reference\n\n`;
  report += `| Metric | Good | Needs Improvement | Poor |\n`;
  report += `|--------|------|-------------------|------|\n`;
  report += `| **LCP** | ≤ 2.5s | 2.5s - 4.0s | > 4.0s |\n`;
  report += `| **FID/INP** | ≤ 100ms / 200ms | 100-300ms / 200-500ms | > 300ms / 500ms |\n`;
  report += `| **CLS** | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |\n`;
  report += `| **FCP** | ≤ 1.8s | 1.8s - 3.0s | > 3.0s |\n`;
  report += `| **TTFB** | ≤ 600ms | 600ms - 1.5s | > 1.5s |\n\n`;

  report += `## 📝 Recommendations\n\n`;
  report += `Based on the measurements above:\n\n`;

  Object.entries(results).forEach(([urlName, runs]) => {
    const aggregated = {
      LCP: calculateStats(runs.map(r => r.vitals.LCP)),
      FCP: calculateStats(runs.map(r => r.vitals.FCP)),
      TTFB: calculateStats(runs.map(r => r.vitals.TTFB)),
    };

    const recommendations = [];

    if (aggregated.LCP && aggregated.LCP.p75 > 2500) {
      recommendations.push(`- **${urlName}**: Optimize LCP (P75: ${aggregated.LCP.p75}ms) - Consider lazy loading images, preloading critical resources`);
    }

    if (aggregated.FCP && aggregated.FCP.p75 > 1800) {
      recommendations.push(`- **${urlName}**: Improve FCP (P75: ${aggregated.FCP.p75}ms) - Reduce render-blocking resources, optimize critical CSS`);
    }

    if (aggregated.TTFB && aggregated.TTFB.p75 > 600) {
      recommendations.push(`- **${urlName}**: Reduce TTFB (P75: ${aggregated.TTFB.p75}ms) - Optimize server response time, use CDN`);
    }

    if (recommendations.length === 0) {
      report += `### ${urlName}\n✅ All metrics within acceptable range!\n\n`;
    } else {
      report += `### ${urlName}\n`;
      recommendations.forEach(rec => report += `${rec}\n`);
      report += `\n`;
    }
  });

  report += `## 🔄 Next Steps\n\n`;
  report += `1. Deploy to staging environment\n`;
  report += `2. Re-run measurements in staging (closer to production)\n`;
  report += `3. Use Lighthouse CI for automated tracking\n`;
  report += `4. Setup Datadog RUM for real user monitoring\n`;
  report += `5. Establish alert thresholds based on P75 values + 20% margin\n\n`;

  report += `---\n\n`;
  report += `**Note**: These measurements are from a local environment. Production results may vary based on:\n`;
  report += `- Network conditions\n`;
  report += `- Server location and latency\n`;
  report += `- CDN performance\n`;
  report += `- User device capabilities\n\n`;

  return report;
}

// Main execution
(async () => {
  try {
    console.log('⚠️  Make sure the app is running on http://localhost:3000\n');
    console.log('   Start with: cd client && npm start\n');

    // Check if Playwright is installed
    try {
      require.resolve('playwright');
    } catch (e) {
      console.error('❌ Playwright not installed. Installing...\n');
      require('child_process').execSync('npm install --save-dev playwright', { stdio: 'inherit' });
      console.log('\n✅ Playwright installed. Re-run the script.\n');
      process.exit(0);
    }

    const results = await measureWebVitals();

    console.log('📊 Generating report...\n');
    const report = generateReport(results);

    fs.writeFileSync(REPORT_PATH, report);
    console.log(`✅ Report generated: ${REPORT_PATH}\n`);

    // Summary
    console.log('📈 Summary:\n');
    Object.entries(results).forEach(([urlName, runs]) => {
      const lcpValues = runs.map(r => r.vitals.LCP).filter(v => v !== null);
      if (lcpValues.length > 0) {
        const avgLCP = lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length;
        const rating = getRating('LCP', avgLCP);
        const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
        console.log(`  ${emoji} ${urlName}: LCP avg ${avgLCP.toFixed(0)}ms (${rating})`);
      }
    });

    console.log('\n✅ Baseline measurement complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
