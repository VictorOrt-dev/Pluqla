#!/usr/bin/env node

/**
 * Auth Admin CLI Tool
 *
 * Secure CLI for authentication administration:
 * - Session management
 * - Key rotation
 * - Metrics and health checks
 *
 * Usage: node server/src/cli/auth-admin.js <command> [options]
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const jwtManager = require('../lib/jwtManager');
const path = require('path');

// Initialize Prisma client (singleton)
const prisma = require('../lib/prismaClient');

// Utilities
const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.error(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  data: (obj) => console.log(chalk.gray(JSON.stringify(obj, null, 2)))
};

// Command: list-sessions
async function listSessions(argv) {
  try {
    const { userId, status = 'active', page = 1, limit = 50 } = argv;

    log.info('Listing sessions...');

    const where = {};
    if (userId) {
      where.userId = userId;
    }

    if (status === 'active') {
      where.expires = { gt: new Date() };
    } else if (status === 'expired') {
      where.expires = { lte: new Date() };
    }

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.betterAuthSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionToken: true,
          userId: true,
          expires: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
              role: true,
              status: true
            }
          }
        }
      }),
      prisma.betterAuthSession.count({ where })
    ]);

    log.success(`Found ${sessions.length} sessions (Total: ${total})`);
    console.log();

    if (sessions.length > 0) {
      sessions.forEach((session, index) => {
        const isActive = session.expires > new Date();
        const statusColor = isActive ? chalk.green : chalk.red;
        const statusText = isActive ? 'ACTIVE' : 'EXPIRED';

        console.log(chalk.bold(`Session ${index + 1}:`));
        console.log(`  Token: ${session.sessionToken.slice(0, 12)}...${session.sessionToken.slice(-8)}`);
        console.log(`  User: ${session.user.email} (${session.user.name})`);
        console.log(`  Role: ${session.user.role}`);
        console.log(`  Status: ${statusColor(statusText)}`);
        console.log(`  Expires: ${session.expires.toISOString()}`);
        console.log(`  Created: ${session.createdAt.toISOString()}`);
        console.log();
      });

      log.info(`Page ${page} of ${Math.ceil(total / limit)}`);
    } else {
      log.warn('No sessions found matching criteria');
    }

  } catch (error) {
    log.error(`Failed to list sessions: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Command: revoke-session
async function revokeSession(argv) {
  try {
    const { sessionToken, userId, all = false } = argv;

    if (!sessionToken && !userId && !all) {
      log.error('Either --sessionToken, --userId, or --all is required');
      process.exit(1);
    }

    if (all) {
      log.warn('⚠️  WARNING: This will revoke ALL sessions!');
      log.info('Revoking all sessions in 3 seconds... (Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    log.info('Revoking session(s)...');

    let result;

    if (all) {
      result = await prisma.betterAuthSession.deleteMany({});
    } else if (sessionToken) {
      result = await prisma.betterAuthSession.deleteMany({
        where: { sessionToken }
      });
    } else if (userId) {
      result = await prisma.betterAuthSession.deleteMany({
        where: { userId }
      });
    }

    if (result.count === 0) {
      log.warn('No sessions found to revoke');
    } else {
      log.success(`Successfully revoked ${result.count} session(s)`);
    }

  } catch (error) {
    log.error(`Failed to revoke session: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Command: rotate-keys
async function rotateKeys(argv) {
  try {
    const { generate = true, secret } = argv;

    log.info('Rotating JWT keys...');

    let newSecret;

    if (generate) {
      newSecret = jwtManager.generateSecret();
      log.info('Generated new secure secret');
    } else if (secret) {
      newSecret = secret;
      log.info('Using provided secret');
    } else {
      log.error('Either --generate or --secret is required');
      process.exit(1);
    }

    const result = jwtManager.rotateSecret(newSecret);

    log.success('JWT keys rotated successfully');
    console.log();
    log.info('Key Rotation Details:');
    console.log(`  Active Secrets: ${result.activeSecrets}`);
    console.log(`  Grace Period: ${result.gracePeriodHours} hours`);
    console.log(`  Timestamp: ${result.timestamp}`);
    console.log();

    if (generate) {
      console.log(chalk.yellow('📝 New Secret (save securely):'));
      console.log(chalk.bold(newSecret));
      console.log();
      log.warn('Store this secret securely. It will not be shown again.');
      log.info('Update your .env file: JWT_SECRETS=<new_secret>,<old_secrets>');
    }

  } catch (error) {
    log.error(`Failed to rotate keys: ${error.message}`);
    process.exit(1);
  }
}

// Command: metrics
async function getMetrics(argv) {
  try {
    log.info('Fetching authentication metrics...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeSessions,
      totalSessions,
      activeUsers,
      totalUsers,
      refreshTokens,
      revokedTokens
    ] = await Promise.all([
      prisma.betterAuthSession.count({
        where: { expires: { gt: now } }
      }),
      prisma.betterAuthSession.count(),
      prisma.user.count({
        where: {
          status: 'active',
          lastLoginAt: { gte: oneDayAgo }
        }
      }),
      prisma.user.count({
        where: { status: 'active' }
      }),
      prisma.refreshToken.count({
        where: {
          revoked: false,
          expiresAt: { gt: now }
        }
      }),
      prisma.refreshToken.count({
        where: { revoked: true }
      })
    ]);

    const jwtStats = jwtManager.getStats();

    log.success('Metrics retrieved successfully');
    console.log();

    console.log(chalk.bold('📊 Authentication Metrics'));
    console.log();
    console.log(chalk.bold('Sessions:'));
    console.log(`  Active: ${chalk.green(activeSessions)}`);
    console.log(`  Total: ${totalSessions}`);
    console.log(`  Active %: ${((activeSessions / totalSessions) * 100).toFixed(2)}%`);
    console.log();
    console.log(chalk.bold('Users:'));
    console.log(`  Active (24h): ${chalk.green(activeUsers)}`);
    console.log(`  Total Active: ${totalUsers}`);
    console.log(`  Engagement: ${((activeUsers / totalUsers) * 100).toFixed(2)}%`);
    console.log();
    console.log(chalk.bold('Tokens:'));
    console.log(`  Refresh Tokens: ${refreshTokens}`);
    console.log(`  Revoked: ${chalk.red(revokedTokens)}`);
    console.log();
    console.log(chalk.bold('JWT Manager:'));
    console.log(`  Active Secrets: ${jwtStats.activeSecrets}`);
    console.log(`  Algorithm: ${jwtStats.algorithm}`);
    console.log(`  Grace Period: ${jwtStats.gracePeriodHours}h`);
    console.log(`  Revoked JTIs (in memory): ${jwtStats.revokedTokensInMemory}`);

  } catch (error) {
    log.error(`Failed to fetch metrics: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Command: health
async function healthCheck(argv) {
  try {
    log.info('Running health checks...');

    const checks = {
      database: false,
      jwtManager: false,
      sessions: false
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
      log.success('Database: OK');
    } catch (error) {
      log.error(`Database: FAILED - ${error.message}`);
    }

    // Check JWT manager
    try {
      const stats = jwtManager.getStats();
      checks.jwtManager = stats.activeSecrets > 0;
      log.success(`JWT Manager: OK (${stats.activeSecrets} active secrets)`);
    } catch (error) {
      log.error(`JWT Manager: FAILED - ${error.message}`);
    }

    // Check sessions
    try {
      const count = await prisma.betterAuthSession.count();
      checks.sessions = true;
      log.success(`Sessions: OK (${count} total)`);
    } catch (error) {
      log.error(`Sessions: FAILED - ${error.message}`);
    }

    console.log();
    const healthy = Object.values(checks).every(check => check === true);

    if (healthy) {
      log.success('All health checks passed ✓');
      process.exit(0);
    } else {
      log.error('Some health checks failed ✗');
      process.exit(1);
    }

  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Command: stats
async function getStats(argv) {
  try {
    const jwtStats = jwtManager.getStats();

    log.success('JWT Manager Statistics:');
    log.data(jwtStats);

  } catch (error) {
    log.error(`Failed to get stats: ${error.message}`);
    process.exit(1);
  }
}

// Main CLI
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('auth-admin')
    .usage('$0 <command> [options]')
    .command(
      'list-sessions',
      'List active sessions',
      (yargs) => {
        return yargs
          .option('userId', {
            alias: 'u',
            type: 'string',
            description: 'Filter by user ID'
          })
          .option('status', {
            alias: 's',
            type: 'string',
            choices: ['active', 'expired', 'all'],
            default: 'active',
            description: 'Session status filter'
          })
          .option('page', {
            alias: 'p',
            type: 'number',
            default: 1,
            description: 'Page number'
          })
          .option('limit', {
            alias: 'l',
            type: 'number',
            default: 50,
            description: 'Results per page'
          });
      },
      listSessions
    )
    .command(
      'revoke-session',
      'Revoke one or more sessions',
      (yargs) => {
        return yargs
          .option('sessionToken', {
            alias: 't',
            type: 'string',
            description: 'Specific session token to revoke'
          })
          .option('userId', {
            alias: 'u',
            type: 'string',
            description: 'Revoke all sessions for user ID'
          })
          .option('all', {
            alias: 'a',
            type: 'boolean',
            default: false,
            description: 'Revoke ALL sessions (use with caution)'
          });
      },
      revokeSession
    )
    .command(
      'rotate-keys',
      'Rotate JWT signing keys',
      (yargs) => {
        return yargs
          .option('generate', {
            alias: 'g',
            type: 'boolean',
            default: true,
            description: 'Generate new secure key'
          })
          .option('secret', {
            alias: 's',
            type: 'string',
            description: 'Provide custom secret (hex)'
          });
      },
      rotateKeys
    )
    .command('metrics', 'Show authentication metrics', {}, getMetrics)
    .command('health', 'Run health checks', {}, healthCheck)
    .command('stats', 'Show JWT manager statistics', {}, getStats)
    .demandCommand(1, 'You must provide a command')
    .help('h')
    .alias('h', 'help')
    .version('1.0.0')
    .alias('v', 'version')
    .epilogue('For more information, see docs/AUTH_ADMIN.md')
    .argv;
}

// Run CLI
if (require.main === module) {
  main().catch((error) => {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { listSessions, revokeSession, rotateKeys, getMetrics, healthCheck, getStats };
