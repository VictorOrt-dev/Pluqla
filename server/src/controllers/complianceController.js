const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GDPR Article 17 - Right to Erasure (Right to be Forgotten)
 * Anonymizes user data instead of hard deletion for legal/audit purposes
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const timestamp = new Date().toISOString();

    // Log data deletion request for GDPR compliance
    await prisma.dataProcessingLog.create({
      data: {
        userId,
        operation: 'DELETE',
        dataType: 'personal',
        description: 'User requested account deletion',
        legalBasis: 'user_request',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true
      }
    });

    // Anonymize user data instead of hard deletion (for audit trail)
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${timestamp}@anonymized.local`,
        password: 'DELETED',
        name: 'Deleted User',
        status: 'deleted',
        emailVerified: false,
        emailVerificationToken: null,
        lastLoginAt: null,
        lastScaAt: null
      }
    });

    // Delete all active sessions
    await prisma.betterAuthSession.deleteMany({
      where: { userId }
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });

    logger.info('User account deleted successfully', {
      userId,
      timestamp,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully. All personal data has been anonymized.'
    });
  } catch (error) {
    logger.error('Account deletion failed', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    // Log failed deletion attempt
    try {
      await prisma.dataProcessingLog.create({
        data: {
          userId: req.user?.id,
          operation: 'DELETE',
          dataType: 'personal',
          description: 'Account deletion failed',
          legalBasis: 'user_request',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          success: false,
          errorMessage: error.message
        }
      });
    } catch (logError) {
      logger.error('Failed to log deletion error', { error: logError.message });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: 'An error occurred while processing your deletion request'
    });
  }
};

/**
 * GDPR Article 20 - Right to Data Portability
 * Exports all user data in a machine-readable format
 */
const exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const format = req.query.format || 'json';

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          select: {
            id: true,
            amount: true,
            category: true,
            description: true,
            type: true,
            date: true,
            createdAt: true
          }
        },
        answers: {
          select: {
            key: true,
            value: true,
            createdAt: true
          }
        },
        badges: {
          include: {
            badge: {
              select: {
                name: true,
                title: true,
                description: true,
                points: true
              }
            }
          }
        },
        dailyChallenges: {
          select: {
            title: true,
            description: true,
            points: true,
            date: true,
            completed: true,
            completedAt: true
          }
        },
        favoriteRecipes: {
          include: {
            recipe: {
              select: {
                title: true,
                description: true,
                category: true
              }
            }
          }
        },
        consents: {
          select: {
            consentType: true,
            purpose: true,
            legalBasis: true,
            granted: true,
            grantedAt: true,
            withdrawnAt: true,
            version: true
          }
        },
        refreshTokens: {
          where: { revoked: false },
          select: {
            createdAt: true,
            expiresAt: true,
            ipAddress: true
          }
        },
        betterAuthSessions: {
          select: {
            createdAt: true,
            expires: true
          }
        },
        expenses: {
          select: {
            category: true,
            subcategory: true,
            amount: true,
            description: true,
            date: true,
            merchant: true,
            isRecurring: true
          }
        },
        budgetPlans: {
          select: {
            name: true,
            type: true,
            totalBudget: true,
            startDate: true,
            endDate: true,
            isActive: true
          }
        },
        accounts: {
          select: {
            name: true,
            type: true,
            provider: true,
            balance: true,
            currency: true,
            isActive: true
          }
        },
        assets: {
          select: {
            name: true,
            type: true,
            symbol: true,
            quantity: true,
            totalValue: true,
            currency: true
          }
        },
        liabilities: {
          select: {
            name: true,
            type: true,
            balance: true,
            interestRate: true,
            monthlyPayment: true
          }
        },
        incomes: {
          select: {
            name: true,
            type: true,
            amount: true,
            frequency: true,
            isActive: true
          }
        },
        financialGoals: {
          select: {
            name: true,
            type: true,
            targetAmount: true,
            currentAmount: true,
            targetDate: true,
            status: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Remove sensitive fields
    const { password, emailVerificationToken, ...userData } = user;

    // Prepare export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'JSON',
      gdprCompliant: true,
      dataController: 'Pluqla',
      userData
    };

    // Log data export for GDPR compliance
    await prisma.dataProcessingLog.create({
      data: {
        userId,
        operation: 'EXPORT',
        dataType: 'personal',
        description: 'User exported personal data',
        legalBasis: 'user_request',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true
      }
    });

    logger.info('User data exported', {
      userId,
      format,
      ip: req.ip
    });

    // Send response
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="pluqla-data-export-${userId}-${Date.now()}.json"`);
      res.status(200).json(exportData);
    } else {
      // For future: support other formats (CSV, ZIP, etc.)
      res.status(400).json({
        success: false,
        error: 'Unsupported format',
        message: 'Currently only JSON format is supported'
      });
    }
  } catch (error) {
    logger.error('Data export failed', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    // Log failed export attempt
    try {
      await prisma.dataProcessingLog.create({
        data: {
          userId: req.user?.id,
          operation: 'EXPORT',
          dataType: 'personal',
          description: 'Data export failed',
          legalBasis: 'user_request',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          success: false,
          errorMessage: error.message
        }
      });
    } catch (logError) {
      logger.error('Failed to log export error', { error: logError.message });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to export data',
      message: 'An error occurred while exporting your data'
    });
  }
};

/**
 * Admin endpoint to view data processing logs
 * For GDPR Article 30 - Records of processing activities
 */
const getProcessingLogs = async (req, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Admin privileges required'
      });
    }

    const { page = 1, limit = 50, userId, operation, dataType } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (userId) where.userId = userId;
    if (operation) where.operation = operation;
    if (dataType) where.dataType = dataType;

    const [logs, total] = await Promise.all([
      prisma.dataProcessingLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          userId: true,
          operation: true,
          dataType: true,
          description: true,
          legalBasis: true,
          success: true,
          errorMessage: true,
          timestamp: true
        }
      }),
      prisma.dataProcessingLog.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch processing logs', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch processing logs'
    });
  }
};

module.exports = {
  deleteAccount,
  exportUserData,
  getProcessingLogs
};
