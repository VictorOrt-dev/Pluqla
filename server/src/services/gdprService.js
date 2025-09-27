const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion in GDPR operations
const logger = require('../utils/logger');
const { encryptionService } = require('../middleware/securityMiddleware');

/**
 * GDPR Compliance Service
 * Handles user data rights, consent management, and data protection
 */
class GDPRService {
  constructor() {
    this.dataCategories = {
      PERSONAL: 'personal',
      FINANCIAL: 'financial',
      BEHAVIORAL: 'behavioral',
      TECHNICAL: 'technical'
    };

    this.legalBases = {
      CONSENT: 'consent',
      CONTRACT: 'contract',
      LEGAL_OBLIGATION: 'legal_obligation',
      VITAL_INTERESTS: 'vital_interests',
      PUBLIC_TASK: 'public_task',
      LEGITIMATE_INTERESTS: 'legitimate_interests'
    };
  }

  /**
   * Record user consent for data processing
   */
  async recordConsent(userId, consentData) {
    try {
      const consent = await prisma.userConsent.create({
        data: {
          userId,
          consentType: consentData.type,
          purpose: consentData.purpose,
          legalBasis: consentData.legalBasis || this.legalBases.CONSENT,
          granted: consentData.granted,
          grantedAt: consentData.granted ? new Date() : null,
          ipAddress: consentData.ipAddress,
          userAgent: consentData.userAgent,
          version: consentData.version || '1.0',
          metadata: JSON.stringify(consentData.metadata || {})
        }
      });

      logger.info('User consent recorded', {
        userId,
        consentId: consent.id,
        type: consentData.type,
        granted: consentData.granted
      });

      return consent;
    } catch (error) {
      logger.error('Failed to record consent:', error);
      throw new Error('Failed to record user consent');
    }
  }

  /**
   * Get user's current consent status
   */
  async getConsentStatus(userId) {
    try {
      const consents = await prisma.userConsent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      const consentStatus = {};
      consents.forEach(consent => {
        if (!consentStatus[consent.consentType] ||
            consent.createdAt > consentStatus[consent.consentType].createdAt) {
          consentStatus[consent.consentType] = consent;
        }
      });

      return consentStatus;
    } catch (error) {
      logger.error('Failed to get consent status:', error);
      throw new Error('Failed to retrieve consent status');
    }
  }

  /**
   * Export all user data (GDPR Article 20 - Data Portability)
   */
  async exportUserData(userId) {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        personal: {},
        financial: {},
        behavioral: {},
        technical: {}
      };

      // Personal data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          answers: true,
          badges: true
        }
      });

      if (user) {
        exportData.personal = {
          name: user.name,
          email: user.email,
          status: user.status,
          isPremium: user.isPremium,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          preferences: user.answers,
          achievements: user.badges
        };
      }

      // Financial data
      const [accounts, assets, liabilities, transactions, goals, snapshots] = await Promise.all([
        prisma.account.findMany({ where: { userId } }),
        prisma.asset.findMany({ where: { userId } }),
        prisma.liability.findMany({ where: { userId } }),
        prisma.transaction.findMany({ where: { userId } }),
        prisma.financialGoal.findMany({ where: { userId } }),
        prisma.netWorthSnapshot.findMany({ where: { userId } })
      ]);

      exportData.financial = {
        accounts: accounts.map(acc => ({
          ...acc,
          // Remove encrypted credentials from export
          encryptedCredentials: '[REDACTED FOR SECURITY]'
        })),
        assets,
        liabilities,
        transactions,
        goals,
        netWorthHistory: snapshots
      };

      // Behavioral data
      const analyticsEvents = await prisma.analyticsEvent.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 1000 // Limit to last 1000 events
      });

      exportData.behavioral = {
        activityLog: analyticsEvents,
        gamification: {
          level: user.level,
          points: user.gamificationPoints,
          streak: user.streak
        }
      };

      // Technical data
      const cacheEntries = await prisma.cacheEntry.findMany({
        where: { userId }
      });

      exportData.technical = {
        cacheEntries,
        preferences: {
          language: user.language || 'fr',
          theme: user.theme || 'light'
        }
      };

      // Log the export
      logger.info('User data exported', {
        userId,
        dataSize: JSON.stringify(exportData).length,
        timestamp: new Date().toISOString()
      });

      return exportData;
    } catch (error) {
      logger.error('Failed to export user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete all user data (GDPR Article 17 - Right to Erasure)
   */
  async deleteUserData(userId, retainLegalObligations = true) {
    try {
      const deletionLog = {
        userId,
        deletionDate: new Date().toISOString(),
        retainedData: [],
        deletedData: []
      };

      // Start transaction for atomic deletion
      await prisma.$transaction(async (tx) => {
        // Delete behavioral data
        await tx.analyticsEvent.deleteMany({ where: { userId } });
        deletionLog.deletedData.push('analyticsEvents');

        await tx.cacheEntry.deleteMany({ where: { userId } });
        deletionLog.deletedData.push('cacheEntries');

        // Delete financial data (unless legal obligation to retain)
        if (!retainLegalObligations) {
          await tx.accountTransaction.deleteMany({
            where: { account: { userId } }
          });

          await tx.asset.deleteMany({ where: { userId } });
          await tx.liability.deleteMany({ where: { userId } });
          await tx.account.deleteMany({ where: { userId } });
          await tx.transaction.deleteMany({ where: { userId } });
          await tx.financialGoal.deleteMany({ where: { userId } });
          await tx.netWorthSnapshot.deleteMany({ where: { userId } });

          deletionLog.deletedData.push('financialData');
        } else {
          // Anonymize financial data instead of deleting
          await tx.account.updateMany({
            where: { userId },
            data: {
              name: 'ANONYMIZED',
              encryptedCredentials: null,
              accountNumber: null
            }
          });
          deletionLog.retainedData.push('financialData (anonymized)');
        }

        // Delete personal preferences
        await tx.userAnswer.deleteMany({ where: { userId } });
        await tx.userBadge.deleteMany({ where: { userId } });
        await tx.favoriteRecipe.deleteMany({ where: { userId } });
        await tx.dailyChallenge.deleteMany({ where: { userId } });
        deletionLog.deletedData.push('personalPreferences');

        // Delete or anonymize user account
        if (!retainLegalObligations) {
          await tx.refreshToken.deleteMany({ where: { userId } });
          await tx.user.delete({ where: { id: userId } });
          deletionLog.deletedData.push('userAccount');
        } else {
          // Anonymize user data
          await tx.user.update({
            where: { id: userId },
            data: {
              email: `deleted_user_${Date.now()}@anonymized.local`,
              name: 'DELETED USER',
              status: 'deleted',
              emailVerified: false,
              emailVerificationToken: null
            }
          });
          deletionLog.retainedData.push('userAccount (anonymized)');
        }

        // Record deletion consent withdrawal
        await tx.userConsent.create({
          data: {
            userId,
            consentType: 'data_processing',
            purpose: 'Data deletion request',
            legalBasis: this.legalBases.CONSENT,
            granted: false,
            withdrawnAt: new Date(),
            metadata: JSON.stringify({ deletionType: retainLegalObligations ? 'anonymization' : 'deletion' })
          }
        });
      });

      logger.info('User data deleted/anonymized', deletionLog);
      return deletionLog;

    } catch (error) {
      logger.error('Failed to delete user data:', error);
      throw new Error('Failed to delete user data');
    }
  }

  /**
   * Rectify user data (GDPR Article 16 - Right to Rectification)
   */
  async rectifyUserData(userId, corrections) {
    try {
      const rectificationLog = {
        userId,
        rectificationDate: new Date().toISOString(),
        changes: []
      };

      await prisma.$transaction(async (tx) => {
        // Update user personal data
        if (corrections.personal) {
          const updateData = {};
          if (corrections.personal.name) updateData.name = corrections.personal.name;
          if (corrections.personal.email) updateData.email = corrections.personal.email;

          if (Object.keys(updateData).length > 0) {
            await tx.user.update({
              where: { id: userId },
              data: updateData
            });
            rectificationLog.changes.push({ table: 'user', fields: Object.keys(updateData) });
          }
        }

        // Update financial data
        if (corrections.financial?.accounts) {
          for (const accountCorrection of corrections.financial.accounts) {
            await tx.account.update({
              where: { id: accountCorrection.id, userId },
              data: {
                name: accountCorrection.name,
                balance: accountCorrection.balance
              }
            });
            rectificationLog.changes.push({
              table: 'account',
              id: accountCorrection.id,
              fields: ['name', 'balance']
            });
          }
        }
      });

      logger.info('User data rectified', rectificationLog);
      return rectificationLog;

    } catch (error) {
      logger.error('Failed to rectify user data:', error);
      throw new Error('Failed to rectify user data');
    }
  }

  /**
   * Generate GDPR compliance report for auditing
   */
  async generateComplianceReport(startDate, endDate) {
    try {
      const report = {
        reportDate: new Date().toISOString(),
        period: { startDate, endDate },
        metrics: {}
      };

      // User consent metrics
      const consentStats = await prisma.userConsent.groupBy({
        by: ['consentType', 'granted'],
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        _count: true
      });

      report.metrics.consent = consentStats;

      // Data access logs
      const dataAccessCount = await prisma.analyticsEvent.count({
        where: {
          type: 'data_access',
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      });

      report.metrics.dataAccess = dataAccessCount;

      // Data deletion requests
      const deletionRequests = await prisma.userConsent.count({
        where: {
          consentType: 'data_processing',
          granted: false,
          withdrawnAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      });

      report.metrics.deletionRequests = deletionRequests;

      // Data security incidents
      const securityIncidents = await prisma.analyticsEvent.count({
        where: {
          type: 'security_incident',
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      });

      report.metrics.securityIncidents = securityIncidents;

      return report;

    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Check if user has given consent for specific purpose
   */
  async hasValidConsent(userId, consentType) {
    try {
      const latestConsent = await prisma.userConsent.findFirst({
        where: { userId, consentType },
        orderBy: { createdAt: 'desc' }
      });

      return latestConsent && latestConsent.granted && !latestConsent.withdrawnAt;
    } catch (error) {
      logger.error('Failed to check consent:', error);
      return false;
    }
  }

  /**
   * Data retention policy enforcement
   */
  async enforceDataRetention() {
    try {
      const retentionPeriods = {
        analyticsEvent: 730, // 2 years
        cacheEntry: 30,      // 30 days
        accountTransaction: 2555, // 7 years (legal requirement)
        userConsent: 2555    // 7 years (legal requirement)
      };

      const deletionResults = {};

      for (const [table, days] of Object.entries(retentionPeriods)) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const deleteResult = await prisma[table].deleteMany({
          where: {
            createdAt: { lt: cutoffDate }
          }
        });

        deletionResults[table] = deleteResult.count;
      }

      logger.info('Data retention policy enforced', deletionResults);
      return deletionResults;

    } catch (error) {
      logger.error('Failed to enforce data retention:', error);
      throw new Error('Failed to enforce data retention policy');
    }
  }
}

module.exports = new GDPRService();