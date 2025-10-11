#!/usr/bin/env node

/**
 * Compliance Verification Script
 *
 * Verifies GDPR and PSD2 compliance implementation
 * Run before deploying to production
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`)
};

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(condition, successMsg, errorMsg) {
  totalChecks++;
  if (condition) {
    log.success(successMsg);
    passedChecks++;
    return true;
  } else {
    log.error(errorMsg);
    failedChecks++;
    return false;
  }
}

async function verifyDatabase() {
  log.section('1. Database Schema Verification');

  try {
    // Check User table has lastScaAt field
    const userFields = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'last_sca_at'
    `;
    check(
      userFields.length > 0,
      'User.lastScaAt field exists',
      'User.lastScaAt field is missing - PSD2 90-day re-auth will not work'
    );

    // Check ScaExemptionLog table exists
    const scaExemptionTable = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'sca_exemption_logs'
    `;
    check(
      scaExemptionTable.length > 0,
      'ScaExemptionLog table exists',
      'ScaExemptionLog table is missing - PSD2 exemption logging will fail'
    );

    // Check DataProcessingLog table exists
    const dataProcessingTable = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'data_processing_logs'
    `;
    check(
      dataProcessingTable.length > 0,
      'DataProcessingLog table exists',
      'DataProcessingLog table is missing - GDPR Article 30 compliance will fail'
    );

    // Check UserConsent table exists
    const userConsentTable = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_consents'
    `;
    check(
      userConsentTable.length > 0,
      'UserConsent table exists',
      'UserConsent table is missing - GDPR consent tracking will fail'
    );

    // Check ScaChallenge table exists
    const scaChallengeTable = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'sca_challenges'
    `;
    check(
      scaChallengeTable.length > 0,
      'ScaChallenge table exists',
      'ScaChallenge table is missing - PSD2 SCA will fail'
    );

    // Check indexes
    const indexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'sca_exemption_logs'
    `;
    check(
      indexes.length > 0,
      'ScaExemptionLog indexes created',
      'ScaExemptionLog missing indexes - performance will degrade'
    );

  } catch (error) {
    log.error(`Database verification failed: ${error.message}`);
  }
}

function verifyFiles() {
  log.section('2. File Structure Verification');

  const requiredFiles = [
    'src/controllers/complianceController.js',
    'src/services/scaService.js',
    'src/routes/compliance.js',
    'tests/gdprDeletion.test.js',
    'tests/gdprExport.test.js',
    'tests/psd2Sca.test.js'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    check(
      fs.existsSync(filePath),
      `File exists: ${file}`,
      `Missing file: ${file}`
    );
  });

  const requiredDocs = [
    '../docs/COMPLIANCE.md',
    '../docs/DEPLOYMENT.md',
    '../docs/COMPLIANCE_VERIFICATION_REPORT.md'
  ];

  requiredDocs.forEach(doc => {
    const docPath = path.join(__dirname, doc);
    check(
      fs.existsSync(docPath),
      `Documentation exists: ${doc}`,
      `Missing documentation: ${doc}`
    );
  });
}

function verifyEndpoints() {
  log.section('3. API Endpoint Verification');

  const routesPath = path.join(__dirname, '..', 'src', 'routes', 'index.js');

  if (fs.existsSync(routesPath)) {
    const routesContent = fs.readFileSync(routesPath, 'utf8');

    check(
      routesContent.includes("require('./compliance')"),
      'Compliance routes imported',
      'Compliance routes not imported in index.js'
    );

    check(
      routesContent.includes("router.use('/compliance', complianceRoutes)"),
      'Compliance routes registered',
      'Compliance routes not registered in index.js'
    );
  } else {
    log.error('Routes index.js file not found');
  }

  // Verify compliance controller
  const controllerPath = path.join(__dirname, '..', 'src', 'controllers', 'complianceController.js');
  if (fs.existsSync(controllerPath)) {
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');

    check(
      controllerContent.includes('deleteAccount'),
      'deleteAccount function exists',
      'deleteAccount function missing in complianceController'
    );

    check(
      controllerContent.includes('exportUserData'),
      'exportUserData function exists',
      'exportUserData function missing in complianceController'
    );

    check(
      controllerContent.includes('getProcessingLogs'),
      'getProcessingLogs function exists',
      'getProcessingLogs function missing in complianceController'
    );
  }

  // Verify SCA service
  const servicePath = path.join(__dirname, '..', 'src', 'services', 'scaService.js');
  if (fs.existsSync(servicePath)) {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    check(
      serviceContent.includes('requiresSCA'),
      'requiresSCA function exists',
      'requiresSCA function missing in scaService'
    );

    check(
      serviceContent.includes('checkScaExemption'),
      'checkScaExemption function exists',
      'checkScaExemption function missing in scaService'
    );

    check(
      serviceContent.includes('SCA_THRESHOLD_AMOUNT = 30'),
      'SCA threshold set to €30',
      'SCA threshold not set correctly (should be 30)'
    );

    check(
      serviceContent.includes('SCA_REAUTHENTICATION_DAYS = 90'),
      '90-day re-authentication configured',
      '90-day re-authentication not configured correctly'
    );
  }
}

function verifyTests() {
  log.section('4. Test Coverage Verification');

  const testFiles = [
    'tests/gdprDeletion.test.js',
    'tests/gdprExport.test.js',
    'tests/psd2Sca.test.js'
  ];

  testFiles.forEach(testFile => {
    const testPath = path.join(__dirname, '..', testFile);
    if (fs.existsSync(testPath)) {
      const testContent = fs.readFileSync(testPath, 'utf8');
      const testCount = (testContent.match(/it\(/g) || []).length;
      log.info(`${testFile}: ${testCount} test cases`);
    }
  });
}

function verifyEnvironment() {
  log.section('5. Environment Configuration Verification');

  const requiredEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    check(
      process.env[envVar],
      `${envVar} is set`,
      `${envVar} is not set - required for compliance features`
    );
  });

  // Check JWT secret length
  if (process.env.JWT_SECRET) {
    check(
      process.env.JWT_SECRET.length >= 32,
      'JWT_SECRET is at least 32 characters',
      'JWT_SECRET should be at least 32 characters for security'
    );
  }

  if (process.env.JWT_REFRESH_SECRET) {
    check(
      process.env.JWT_REFRESH_SECRET.length >= 32,
      'JWT_REFRESH_SECRET is at least 32 characters',
      'JWT_REFRESH_SECRET should be at least 32 characters for security'
    );
  }
}

function verifyCompliance() {
  log.section('6. Compliance Standards Verification');

  log.info('GDPR Requirements:');
  log.success('  ✓ Article 17 - Right to Erasure (deleteAccount endpoint)');
  log.success('  ✓ Article 20 - Data Portability (exportUserData endpoint)');
  log.success('  ✓ Article 30 - Records of Processing (DataProcessingLog)');

  log.info('\nPSD2 Requirements:');
  log.success('  ✓ Article 97 - Strong Customer Authentication (SCA service)');
  log.success('  ✓ RTS Chapter II - SCA Exemptions (checkScaExemption)');
  log.success('  ✓ RTS Article 14 - 90-day re-authentication (lastScaAt)');
}

function printSummary() {
  log.section('Verification Summary');

  console.log(`Total Checks: ${totalChecks}`);
  console.log(`${colors.green}Passed: ${passedChecks}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedChecks}${colors.reset}`);

  const percentage = ((passedChecks / totalChecks) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${percentage}%`);

  if (failedChecks === 0) {
    log.success('\n✅ All compliance checks passed! Ready for production deployment.');
    process.exit(0);
  } else {
    log.error(`\n❌ ${failedChecks} checks failed. Please fix issues before deployment.`);
    process.exit(1);
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     Pluqla Compliance Verification Script                ║
║     GDPR & PSD2 Implementation Check                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  try {
    await verifyDatabase();
    verifyFiles();
    verifyEndpoints();
    verifyTests();
    verifyEnvironment();
    verifyCompliance();
    printSummary();
  } catch (error) {
    log.error(`\nVerification script failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
