#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  outputDir: './audit-reports',
  lighthouse: {
    desktop: {
      formFactor: 'desktop',
      screenEmulation: { width: 1350, height: 940, deviceScaleFactor: 1, mobile: false }
    },
    mobile: {
      formFactor: 'mobile',
      screenEmulation: { width: 360, height: 640, deviceScaleFactor: 2, mobile: true }
    }
  },
  pages: [
    { name: 'landing', path: '', title: 'Landing Page' },
    { name: 'login', path: '?screen=login', title: 'Login Screen' },
    { name: 'home', path: '?screen=home', title: 'Home Screen' },
    { name: 'profile', path: '?screen=profile', title: 'Profile Screen' }
  ]
};

class AuditRunner {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.reportDir = path.join(CONFIG.outputDir, this.timestamp);
    this.setupDirectories();
  }

  setupDirectories() {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async checkServerRunning() {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get('http://localhost:3000', (res) => {
        resolve(true);
      });
      req.on('error', () => {
        resolve(false);
      });
      req.setTimeout(5000, () => {
        resolve(false);
      });
    });
  }

  async runLighthouseAudit(page, device) {
    const url = `${CONFIG.baseUrl}${page.path}`;
    const fileName = `lighthouse-${page.name}-${device}-${this.timestamp}`;

    const lighthouseArgs = [
      url,
      '--output=html,json',
      `--output-path=${path.join(this.reportDir, fileName)}`,
      `--form-factor=${CONFIG.lighthouse[device].formFactor}`,
      '--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"',
      '--throttling-method=devtools',
      '--quiet'
    ];

    if (device === 'mobile') {
      lighthouseArgs.push('--emulated-user-agent="Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36"');
    }

    console.log(`🚀 Running Lighthouse audit: ${page.title} (${device})`);

    return new Promise((resolve, reject) => {
      const lighthouse = spawn('lighthouse', lighthouseArgs, { shell: true });

      lighthouse.stdout.on('data', (data) => {
        // Console silencieuse pour Lighthouse
      });

      lighthouse.stderr.on('data', (data) => {
        if (!data.toString().includes('Chrome')) {
          console.warn(`Lighthouse warning: ${data}`);
        }
      });

      lighthouse.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Lighthouse audit completed: ${page.title} (${device})`);
          resolve();
        } else {
          console.error(`❌ Lighthouse audit failed: ${page.title} (${device}) - Exit code: ${code}`);
          reject(new Error(`Lighthouse failed with exit code ${code}`));
        }
      });
    });
  }

  async runAccessibilityTest() {
    console.log('🔍 Running Axe accessibility tests...');

    return new Promise((resolve, reject) => {
      const axe = spawn('npx', ['playwright', 'test', 'tests/accessibility.test.js'], {
        cwd: './client',
        shell: true
      });

      axe.stdout.on('data', (data) => {
        console.log(data.toString());
      });

      axe.stderr.on('data', (data) => {
        console.warn(data.toString());
      });

      axe.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Accessibility tests completed');
          resolve();
        } else {
          console.warn(`⚠️ Accessibility tests completed with warnings (exit code: ${code})`);
          resolve(); // Continue même en cas d'avertissements
        }
      });
    });
  }

  async generateSummaryReport() {
    console.log('📊 Generating summary report...');

    const summary = {
      timestamp: this.timestamp,
      auditType: 'Complete Quality Audit',
      pages: CONFIG.pages.length,
      devices: ['desktop', 'mobile'],
      reports: []
    };

    // Lire les rapports Lighthouse
    const files = fs.readdirSync(this.reportDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('lighthouse'));

    for (const file of jsonFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(this.reportDir, file), 'utf8'));
        summary.reports.push({
          file: file,
          url: content.finalUrl,
          device: file.includes('mobile') ? 'mobile' : 'desktop',
          scores: {
            performance: Math.round(content.categories.performance.score * 100),
            accessibility: Math.round(content.categories.accessibility.score * 100),
            bestPractices: Math.round(content.categories['best-practices'].score * 100),
            seo: Math.round(content.categories.seo.score * 100),
            pwa: content.categories.pwa ? Math.round(content.categories.pwa.score * 100) : null
          },
          metrics: {
            fcp: content.audits['first-contentful-paint'].displayValue,
            lcp: content.audits['largest-contentful-paint'].displayValue,
            cls: content.audits['cumulative-layout-shift'].displayValue,
            fid: content.audits['max-potential-fid'] ? content.audits['max-potential-fid'].displayValue : 'N/A'
          }
        });
      } catch (error) {
        console.warn(`Warning: Could not parse ${file}:`, error.message);
      }
    }

    // Sauvegarder le résumé
    fs.writeFileSync(
      path.join(this.reportDir, 'audit-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Générer rapport HTML simple
    const htmlReport = this.generateHTMLReport(summary);
    fs.writeFileSync(path.join(this.reportDir, 'audit-summary.html'), htmlReport);

    console.log(`\\n📈 Summary Report Generated:`);
    console.log(`📁 Reports saved in: ${this.reportDir}`);
    console.log(`🌐 Open: ${path.join(this.reportDir, 'audit-summary.html')}`);

    return summary;
  }

  generateHTMLReport(summary) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pluqla - Audit Quality Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .score { display: inline-block; margin: 10px; padding: 15px; border-radius: 8px; text-align: center; color: white; font-weight: bold; }
        .score.excellent { background: #28a745; }
        .score.good { background: #ffc107; color: #333; }
        .score.poor { background: #dc3545; }
        .report-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .report-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .device-mobile { border-left: 4px solid #007bff; }
        .device-desktop { border-left: 4px solid #28a745; }
        .metrics { font-size: 0.9em; color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Pluqla - Quality Audit Report</h1>
            <p>Generated on: ${new Date(summary.timestamp).toLocaleString('fr-FR')}</p>
            <p>Pages audited: ${summary.pages} | Devices: ${summary.devices.join(', ')}</p>
        </div>

        <div class="report-grid">
            ${summary.reports.map(report => `
                <div class="report-card device-${report.device}">
                    <h3>${report.url} (${report.device})</h3>
                    <div>
                        <div class="score ${this.getScoreClass(report.scores.performance)}">
                            Performance: ${report.scores.performance}%
                        </div>
                        <div class="score ${this.getScoreClass(report.scores.accessibility)}">
                            Accessibility: ${report.scores.accessibility}%
                        </div>
                        <div class="score ${this.getScoreClass(report.scores.bestPractices)}">
                            Best Practices: ${report.scores.bestPractices}%
                        </div>
                        <div class="score ${this.getScoreClass(report.scores.seo)}">
                            SEO: ${report.scores.seo}%
                        </div>
                    </div>
                    <div class="metrics">
                        📊 FCP: ${report.metrics.fcp} | LCP: ${report.metrics.lcp} | CLS: ${report.metrics.cls}
                    </div>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h3>📝 Next Steps</h3>
            <ul>
                <li>Review individual Lighthouse reports for detailed recommendations</li>
                <li>Check accessibility test results in client/accessibility-reports/</li>
                <li>Focus on scores below 85% for optimization priorities</li>
                <li>Re-run audit after implementing improvements</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  }

  getScoreClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    return 'poor';
  }

  async run() {
    console.log('🚀 Starting Complete Quality Audit for Pluqla\\n');

    try {
      // Vérifier que le serveur tourne
      console.log('🔍 Checking if development server is running...');
      const serverRunning = await this.checkServerRunning();

      if (!serverRunning) {
        console.error('❌ Development server not running at http://localhost:3000');
        console.log('💡 Please start the server first with: npm start');
        process.exit(1);
      }

      console.log('✅ Development server is running\\n');

      // Audits Lighthouse pour toutes les pages et devices
      for (const page of CONFIG.pages) {
        for (const device of ['desktop', 'mobile']) {
          await this.runLighthouseAudit(page, device);
        }
      }

      // Tests d'accessibilité
      await this.runAccessibilityTest();

      // Générer rapport de synthèse
      const summary = await this.generateSummaryReport();

      console.log('\\n🎉 Complete audit finished successfully!');
      console.log(`📊 ${summary.reports.length} Lighthouse reports generated`);
      console.log(`📁 All reports saved in: ${this.reportDir}`);

    } catch (error) {
      console.error('❌ Audit failed:', error.message);
      process.exit(1);
    }
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const runner = new AuditRunner();
  runner.run();
}

module.exports = AuditRunner;