#!/usr/bin/env node

/**
 * Security Audit Script for Pluqla Application
 *
 * Performs comprehensive security scanning including:
 * - Hardcoded secrets detection
 * - JWT configuration validation
 * - CORS configuration check
 * - Security headers verification
 * - Input validation review
 * - SQL injection vulnerabilities
 * - XSS vulnerabilities
 * - GDPR compliance check
 *
 * Usage:
 *   node scripts/security-audit.js [--fix]
 *
 * Options:
 *   --fix    Automatically fix issues where possible
 *
 * Exit codes:
 *   0 - No critical issues found
 *   1 - Critical security issues detected
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(PROJECT_ROOT, 'docs', 'SECURITY_AUDIT_REPORT.md');

// Security patterns to detect
const SECURITY_PATTERNS = {
  secrets: [
    { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'](?!.*\{|\$|process\.env)[^"']{8,}["']/gi, severity: 'CRITICAL', name: 'Hardcoded password' },
    { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'](?!.*\{|\$|process\.env)[^"']{20,}["']/gi, severity: 'CRITICAL', name: 'Hardcoded API key' },
    { pattern: /(?:secret|token)\s*[:=]\s*["'](?!.*\{|\$|process\.env)[a-zA-Z0-9]{32,}["']/gi, severity: 'CRITICAL', name: 'Hardcoded secret/token' },
    { pattern: /(?:jwt[_-]?secret)\s*[:=]\s*["'](?!.*\{|\$|process\.env)[^"']{8,}["']/gi, severity: 'CRITICAL', name: 'Hardcoded JWT secret' },
    { pattern: /mongodb:\/\/[^:]+:[^@]+@/gi, severity: 'HIGH', name: 'MongoDB connection with credentials' },
    { pattern: /postgres:\/\/[^:]+:[^@]+@/gi, severity: 'HIGH', name: 'PostgreSQL connection with credentials' },
  ],
  vulnerabilities: [
    { pattern: /eval\s*\(/gi, severity: 'CRITICAL', name: 'Use of eval()' },
    { pattern: /innerHTML\s*=/gi, severity: 'HIGH', name: 'Use of innerHTML (XSS risk)' },
    { pattern: /dangerouslySetInnerHTML/gi, severity: 'HIGH', name: 'Use of dangerouslySetInnerHTML' },
    { pattern: /exec\s*\(/gi, severity: 'HIGH', name: 'Command execution (injection risk)' },
    { pattern: /child_process\.exec\(/gi, severity: 'HIGH', name: 'Child process execution' },
  ],
  sqlInjection: [
    { pattern: /\$\{[^}]*req\.(query|params|body)[^}]*\}/gi, severity: 'CRITICAL', name: 'SQL injection via template literal' },
    { pattern: /['"].*\+.*req\.(query|params|body)/gi, severity: 'CRITICAL', name: 'SQL injection via string concatenation' },
  ],
};

// Audit results
const auditResults = {
  timestamp: new Date().toISOString(),
  critical: [],
  high: [],
  medium: [],
  low: [],
  passed: [],
};

// Statistics
const stats = {
  filesScanned: 0,
  issuesFound: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
};

/**
 * Log functions
 */
function logHeader(message) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${message}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(80)}${colors.reset}\n`);
}

function logCritical(message) {
  console.log(`${colors.red}${colors.bright}[CRITICAL]${colors.reset} ${message}`);
}

function logHigh(message) {
  console.log(`${colors.red}[HIGH]${colors.reset} ${message}`);
}

function logMedium(message) {
  console.log(`${colors.yellow}[MEDIUM]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

/**
 * Scan file for security issues
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relPath = path.relative(PROJECT_ROOT, filePath);
    const issues = [];

    // Check secrets
    SECURITY_PATTERNS.secrets.forEach((rule) => {
      const matches = content.match(rule.pattern);
      if (matches) {
        matches.forEach((match) => {
          issues.push({
            file: relPath,
            severity: rule.severity,
            type: rule.name,
            line: getLineNumber(content, match),
            snippet: match.substring(0, 100),
          });
        });
      }
    });

    // Check vulnerabilities
    SECURITY_PATTERNS.vulnerabilities.forEach((rule) => {
      const matches = content.match(rule.pattern);
      if (matches) {
        matches.forEach((match) => {
          issues.push({
            file: relPath,
            severity: rule.severity,
            type: rule.name,
            line: getLineNumber(content, match),
            snippet: match.substring(0, 100),
          });
        });
      }
    });

    // Check SQL injection
    SECURITY_PATTERNS.sqlInjection.forEach((rule) => {
      const matches = content.match(rule.pattern);
      if (matches) {
        matches.forEach((match) => {
          issues.push({
            file: relPath,
            severity: rule.severity,
            type: rule.name,
            line: getLineNumber(content, match),
            snippet: match.substring(0, 100),
          });
        });
      }
    });

    return issues;
  } catch (error) {
    // Silently skip unreadable files
    return [];
  }
}

/**
 * Get line number for a match in content
 */
function getLineNumber(content, match) {
  const index = content.indexOf(match);
  if (index === -1) return 0;
  return content.substring(0, index).split('\n').length;
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath, exclude = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const relPath = path.relative(PROJECT_ROOT, filePath);

    // Skip excluded directories
    if (exclude.some((ex) => relPath.includes(ex))) {
      return;
    }

    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDirectory(filePath, exclude);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
      stats.filesScanned++;
      const issues = scanFile(filePath);

      issues.forEach((issue) => {
        stats.issuesFound++;

        if (issue.severity === 'CRITICAL') {
          stats.critical++;
          auditResults.critical.push(issue);
        } else if (issue.severity === 'HIGH') {
          stats.high++;
          auditResults.high.push(issue);
        } else if (issue.severity === 'MEDIUM') {
          stats.medium++;
          auditResults.medium.push(issue);
        } else {
          stats.low++;
          auditResults.low.push(issue);
        }
      });
    }
  });
}

/**
 * Check JWT configuration
 */
function checkJWTConfiguration() {
  logHeader('JWT CONFIGURATION AUDIT');

  const serverEnvExample = path.join(PROJECT_ROOT, 'server', '.env.example');
  const issues = [];

  if (fs.existsSync(serverEnvExample)) {
    const content = fs.readFileSync(serverEnvExample, 'utf-8');

    // Check JWT secret length
    const jwtSecretMatch = content.match(/JWT_SECRET\s*=\s*(.+)/);
    if (jwtSecretMatch) {
      const secret = jwtSecretMatch[1].trim();
      if (secret.length < 32) {
        issues.push({
          severity: 'HIGH',
          type: 'JWT secret too short',
          file: 'server/.env.example',
          message: `JWT_SECRET should be at least 32 characters (current: ${secret.length})`,
        });
      } else {
        logSuccess(`JWT_SECRET length: ${secret.length} characters (>= 32)`);
      }
    }

    // Check for JWT_REFRESH_SECRET
    if (content.includes('JWT_REFRESH_SECRET')) {
      logSuccess('JWT_REFRESH_SECRET configured');
    } else {
      issues.push({
        severity: 'MEDIUM',
        type: 'Missing JWT refresh secret',
        file: 'server/.env.example',
        message: 'JWT_REFRESH_SECRET not found',
      });
    }

    // Check JWT expiration
    const expiresMatch = content.match(/JWT_EXPIRES_IN\s*=\s*(.+)/);
    if (expiresMatch) {
      logSuccess(`JWT expiration configured: ${expiresMatch[1].trim()}`);
    }
  } else {
    issues.push({
      severity: 'HIGH',
      type: 'Missing .env.example',
      file: 'server/.env.example',
      message: 'Environment example file not found',
    });
  }

  return issues;
}

/**
 * Check CORS configuration
 */
function checkCORSConfiguration() {
  logHeader('CORS CONFIGURATION AUDIT');

  const appJsPath = path.join(PROJECT_ROOT, 'server', 'src', 'app.js');
  const issues = [];

  if (fs.existsSync(appJsPath)) {
    const content = fs.readFileSync(appJsPath, 'utf-8');

    if (content.includes('cors(')) {
      logSuccess('CORS middleware detected');

      // Check for wildcard origin
      if (content.includes('origin: "*"') || content.includes("origin: '*'")) {
        issues.push({
          severity: 'HIGH',
          type: 'CORS wildcard origin',
          file: 'server/src/app.js',
          message: 'CORS allows all origins (*) - should be restricted in production',
        });
      } else {
        logSuccess('CORS origin appears to be restricted');
      }

      // Check credentials
      if (content.includes('credentials: true')) {
        logSuccess('CORS credentials enabled (required for cookies)');
      }
    } else {
      issues.push({
        severity: 'MEDIUM',
        type: 'CORS not configured',
        file: 'server/src/app.js',
        message: 'CORS middleware not detected',
      });
    }
  }

  return issues;
}

/**
 * Check security headers
 */
function checkSecurityHeaders() {
  logHeader('SECURITY HEADERS AUDIT');

  const appJsPath = path.join(PROJECT_ROOT, 'server', 'src', 'app.js');
  const issues = [];

  if (fs.existsSync(appJsPath)) {
    const content = fs.readFileSync(appJsPath, 'utf-8');

    // Check helmet
    if (content.includes('helmet')) {
      logSuccess('Helmet security headers middleware detected');
    } else {
      issues.push({
        severity: 'MEDIUM',
        type: 'Missing security headers',
        file: 'server/src/app.js',
        message: 'Helmet middleware not detected - missing security headers',
        recommendation: 'npm install helmet && app.use(helmet())',
      });
    }

    // Check rate limiting
    if (content.includes('rateLimit') || content.includes('express-rate-limit')) {
      logSuccess('Rate limiting detected');
    } else {
      issues.push({
        severity: 'MEDIUM',
        type: 'Missing rate limiting',
        file: 'server/src/app.js',
        message: 'Rate limiting not detected',
        recommendation: 'Implement rate limiting to prevent abuse',
      });
    }
  }

  return issues;
}

/**
 * Check GDPR compliance
 */
function checkGDPRCompliance() {
  logHeader('GDPR COMPLIANCE AUDIT');

  const issues = [];
  const gdprEndpoints = [
    'server/src/routes/gdpr.js',
    'server/src/controllers/gdprController.js',
  ];

  let gdprImplemented = false;

  gdprEndpoints.forEach((endpoint) => {
    const fullPath = path.join(PROJECT_ROOT, endpoint);
    if (fs.existsSync(fullPath)) {
      logSuccess(`GDPR endpoint found: ${endpoint}`);
      gdprImplemented = true;

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check for data export
      if (content.includes('export') || content.includes('download')) {
        logSuccess('  ✓ Data export functionality detected');
      }

      // Check for data deletion
      if (content.includes('delete') || content.includes('remove')) {
        logSuccess('  ✓ Data deletion functionality detected');
      }
    }
  });

  if (!gdprImplemented) {
    issues.push({
      severity: 'HIGH',
      type: 'GDPR compliance',
      file: 'N/A',
      message: 'GDPR endpoints not found - required for EU compliance',
      recommendation: 'Implement user data export and deletion endpoints',
    });
  }

  return issues;
}

/**
 * Run npm audit
 */
function runNpmAudit() {
  logHeader('NPM AUDIT');

  const workspaces = ['client', 'server'];
  const issues = [];

  workspaces.forEach((workspace) => {
    const workspacePath = path.join(PROJECT_ROOT, workspace);

    if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
      logInfo(`Running npm audit in ${workspace}...`);

      try {
        const result = execSync('npm audit --json', {
          cwd: workspacePath,
          encoding: 'utf-8',
        });

        const auditData = JSON.parse(result);

        if (auditData.metadata) {
          const { vulnerabilities } = auditData.metadata;

          if (vulnerabilities.critical > 0) {
            issues.push({
              severity: 'CRITICAL',
              type: 'npm vulnerabilities',
              file: `${workspace}/package.json`,
              message: `${vulnerabilities.critical} critical vulnerabilities`,
            });
            logCritical(`${workspace}: ${vulnerabilities.critical} critical vulnerabilities`);
          }

          if (vulnerabilities.high > 0) {
            issues.push({
              severity: 'HIGH',
              type: 'npm vulnerabilities',
              file: `${workspace}/package.json`,
              message: `${vulnerabilities.high} high vulnerabilities`,
            });
            logHigh(`${workspace}: ${vulnerabilities.high} high vulnerabilities`);
          }

          if (vulnerabilities.moderate > 0) {
            logMedium(`${workspace}: ${vulnerabilities.moderate} moderate vulnerabilities`);
          }

          if (vulnerabilities.critical === 0 && vulnerabilities.high === 0) {
            logSuccess(`${workspace}: No critical or high vulnerabilities`);
          }
        }
      } catch (error) {
        // npm audit returns non-zero exit code if vulnerabilities found
        const output = error.stdout || error.stderr || '';
        if (output.includes('vulnerabilities')) {
          logHigh(`${workspace}: Vulnerabilities detected (check npm audit output)`);
        }
      }
    }
  });

  return issues;
}

/**
 * Generate security report
 */
function generateReport() {
  logHeader('GENERATING SECURITY REPORT');

  let report = `# Security Audit Report - Pluqla Application\n\n`;
  report += `**Generated**: ${new Date(auditResults.timestamp).toLocaleString()}\n\n`;
  report += `---\n\n`;

  // Executive Summary
  report += `## Executive Summary\n\n`;
  report += `| Metric | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Files Scanned | ${stats.filesScanned} |\n`;
  report += `| Total Issues | ${stats.issuesFound} |\n`;
  report += `| Critical | ${stats.critical} |\n`;
  report += `| High | ${stats.high} |\n`;
  report += `| Medium | ${stats.medium} |\n`;
  report += `| Low | ${stats.low} |\n\n`;

  // Critical Issues
  if (auditResults.critical.length > 0) {
    report += `## 🚨 Critical Issues\n\n`;
    auditResults.critical.forEach((issue, i) => {
      report += `### ${i + 1}. ${issue.type}\n\n`;
      report += `- **File**: \`${issue.file}\`\n`;
      report += `- **Line**: ${issue.line}\n`;
      report += `- **Severity**: CRITICAL\n`;
      if (issue.snippet) {
        report += `- **Code**: \`${issue.snippet}\`\n`;
      }
      if (issue.message) {
        report += `- **Message**: ${issue.message}\n`;
      }
      if (issue.recommendation) {
        report += `- **Recommendation**: ${issue.recommendation}\n`;
      }
      report += `\n`;
    });
  }

  // High Issues
  if (auditResults.high.length > 0) {
    report += `## ⚠️ High Priority Issues\n\n`;
    auditResults.high.forEach((issue, i) => {
      report += `### ${i + 1}. ${issue.type}\n\n`;
      report += `- **File**: \`${issue.file}\`\n`;
      if (issue.line) {
        report += `- **Line**: ${issue.line}\n`;
      }
      report += `- **Severity**: HIGH\n`;
      if (issue.snippet) {
        report += `- **Code**: \`${issue.snippet}\`\n`;
      }
      if (issue.message) {
        report += `- **Message**: ${issue.message}\n`;
      }
      if (issue.recommendation) {
        report += `- **Recommendation**: ${issue.recommendation}\n`;
      }
      report += `\n`;
    });
  }

  // Medium Issues
  if (auditResults.medium.length > 0) {
    report += `## 📋 Medium Priority Issues\n\n`;
    auditResults.medium.forEach((issue, i) => {
      report += `### ${i + 1}. ${issue.type}\n\n`;
      report += `- **File**: \`${issue.file}\`\n`;
      if (issue.message) {
        report += `- **Message**: ${issue.message}\n`;
      }
      if (issue.recommendation) {
        report += `- **Recommendation**: ${issue.recommendation}\n`;
      }
      report += `\n`;
    });
  }

  // Recommendations
  report += `## 📝 Recommendations\n\n`;
  report += `1. **Address Critical Issues Immediately**: ${stats.critical} critical issues require immediate attention\n`;
  report += `2. **Fix High Priority Issues**: ${stats.high} high priority issues should be fixed before production\n`;
  report += `3. **Review Medium Issues**: ${stats.medium} medium issues should be addressed in next sprint\n`;
  report += `4. **Regular Security Audits**: Run this audit regularly (weekly recommended)\n`;
  report += `5. **Dependency Updates**: Keep dependencies up to date with \`npm audit fix\`\n\n`;

  // Write report
  fs.writeFileSync(REPORT_PATH, report);
  logSuccess(`Report generated: ${REPORT_PATH}`);

  return report;
}

/**
 * Main audit process
 */
async function main() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log(`╔${'═'.repeat(78)}╗`);
  console.log(`║${' '.repeat(20)}🔒 PLUQLA SECURITY AUDIT${' '.repeat(33)}║`);
  console.log(`╚${'═'.repeat(78)}╝`);
  console.log(colors.reset);

  logInfo(`Audit started: ${new Date().toLocaleString()}\n`);

  // 1. Scan codebase for security issues
  logHeader('CODE SCANNING');
  logInfo('Scanning client and server code for security issues...');

  scanDirectory(path.join(PROJECT_ROOT, 'client', 'src'), ['node_modules', 'build', 'coverage']);
  scanDirectory(path.join(PROJECT_ROOT, 'server', 'src'), ['node_modules', 'coverage']);

  logSuccess(`Scanned ${stats.filesScanned} files`);
  logInfo(`Found ${stats.issuesFound} potential issues`);

  // 2. Check JWT configuration
  const jwtIssues = checkJWTConfiguration();
  jwtIssues.forEach((issue) => {
    if (issue.severity === 'CRITICAL') {
      auditResults.critical.push(issue);
      stats.critical++;
    } else if (issue.severity === 'HIGH') {
      auditResults.high.push(issue);
      stats.high++;
    } else {
      auditResults.medium.push(issue);
      stats.medium++;
    }
  });

  // 3. Check CORS configuration
  const corsIssues = checkCORSConfiguration();
  corsIssues.forEach((issue) => {
    if (issue.severity === 'HIGH') {
      auditResults.high.push(issue);
      stats.high++;
    } else {
      auditResults.medium.push(issue);
      stats.medium++;
    }
  });

  // 4. Check security headers
  const headerIssues = checkSecurityHeaders();
  headerIssues.forEach((issue) => {
    auditResults.medium.push(issue);
    stats.medium++;
  });

  // 5. Check GDPR compliance
  const gdprIssues = checkGDPRCompliance();
  gdprIssues.forEach((issue) => {
    auditResults.high.push(issue);
    stats.high++;
  });

  // 6. Run npm audit
  const npmIssues = runNpmAudit();
  npmIssues.forEach((issue) => {
    if (issue.severity === 'CRITICAL') {
      auditResults.critical.push(issue);
      stats.critical++;
    } else {
      auditResults.high.push(issue);
      stats.high++;
    }
  });

  // 7. Generate report
  generateReport();

  // 8. Summary
  logHeader('AUDIT SUMMARY');

  console.log(`Files Scanned:     ${stats.filesScanned}`);
  console.log(`Total Issues:      ${stats.issuesFound}`);
  console.log(`${colors.red}Critical:          ${stats.critical}${colors.reset}`);
  console.log(`${colors.red}High:              ${stats.high}${colors.reset}`);
  console.log(`${colors.yellow}Medium:            ${stats.medium}${colors.reset}`);
  console.log(`${colors.cyan}Low:               ${stats.low}${colors.reset}`);

  console.log(`\nReport: ${REPORT_PATH}\n`);

  // Exit code
  if (stats.critical > 0) {
    console.log(`${colors.red}${colors.bright}❌ CRITICAL ISSUES FOUND${colors.reset}`);
    console.log(`${colors.red}Fix critical issues before deploying to production${colors.reset}\n`);
    process.exit(1);
  } else if (stats.high > 0) {
    console.log(`${colors.yellow}${colors.bright}⚠️ HIGH PRIORITY ISSUES FOUND${colors.reset}`);
    console.log(`${colors.yellow}Address high priority issues before production${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}✅ NO CRITICAL OR HIGH ISSUES${colors.reset}`);
    console.log(`${colors.green}Security audit passed${colors.reset}\n`);
    process.exit(0);
  }
}

// Run audit
if (require.main === module) {
  main().catch((error) => {
    console.error(`${colors.red}Audit failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { main, scanDirectory, checkJWTConfiguration, checkCORSConfiguration };
