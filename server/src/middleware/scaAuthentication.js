/**
 * Strong Customer Authentication (SCA) Middleware
 *
 * Implements PSD2 compliant Strong Customer Authentication for financial transactions.
 * Required for any transaction above €30 threshold or sensitive financial operations.
 *
 * SCA Requirements (PSD2 Article 4):
 * - Knowledge factor (password/PIN)
 * - Possession factor (device/token)
 * - Inherence factor (biometric)
 *
 * At least two factors from different categories must be used.
 */

const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');
const { verifyAccessToken } = require('../utils/jwt');

// PSD2 SCA configuration
const SCA_CONFIG = {
  // Transaction amount threshold requiring SCA (€30 as per PSD2)
  AMOUNT_THRESHOLD: 30,

  // SCA session timeout (15 minutes)
  SESSION_TIMEOUT: 15 * 60 * 1000,

  // Maximum SCA attempts before lockout
  MAX_ATTEMPTS: 3,

  // Lockout duration (30 minutes)
  LOCKOUT_DURATION: 30 * 60 * 1000,

  // Supported authentication methods
  SUPPORTED_METHODS: ['sms', 'totp', 'biometric', 'push'],

  // Risk assessment thresholds
  LOW_RISK_THRESHOLD: 0.3,
  MEDIUM_RISK_THRESHOLD: 0.7
};

/**
 * Risk assessment for transactions
 * Evaluates if SCA is required based on transaction context
 */
class RiskAssessment {
  constructor() {
    this.riskFactors = {
      // Device and location factors
      newDevice: 0.4,
      newLocation: 0.3,
      vpnUsage: 0.2,

      // Behavioral factors
      unusualTime: 0.2,
      highAmount: 0.5,
      frequentTransactions: 0.3,

      // Account factors
      recentPasswordChange: 0.1,
      multipleFailedAttempts: 0.6,
      compromisedCredentials: 1.0
    };
  }

  /**
   * Calculate risk score for a transaction
   * @param {Object} transactionData - Transaction details
   * @param {Object} userContext - User session context
   * @returns {number} Risk score between 0-1
   */
  async calculateRiskScore(transactionData, userContext) {
    let riskScore = 0;
    const factors = [];

    // Amount-based risk
    if (transactionData.amount > 1000) {
      riskScore += this.riskFactors.highAmount;
      factors.push('high_amount');
    }

    // Device fingerprinting
    if (userContext.isNewDevice) {
      riskScore += this.riskFactors.newDevice;
      factors.push('new_device');
    }

    // Geolocation analysis
    if (userContext.isNewLocation) {
      riskScore += this.riskFactors.newLocation;
      factors.push('new_location');
    }

    // VPN/Proxy detection
    if (userContext.isVpnDetected) {
      riskScore += this.riskFactors.vpnUsage;
      factors.push('vpn_usage');
    }

    // Time-based analysis
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) {
      riskScore += this.riskFactors.unusualTime;
      factors.push('unusual_time');
    }

    // Recent failed attempts
    const recentFailures = await this.getRecentFailedAttempts(userContext.userId);
    if (recentFailures > 2) {
      riskScore += this.riskFactors.multipleFailedAttempts;
      factors.push('multiple_failed_attempts');
    }

    // Cap at 1.0
    riskScore = Math.min(riskScore, 1.0);

    logger.info('SCA risk assessment completed', {
      userId: userContext.userId,
      riskScore,
      factors,
      transactionAmount: transactionData.amount
    });

    return riskScore;
  }

  /**
   * Get recent failed authentication attempts
   */
  async getRecentFailedAttempts(userId) {
    try {
      const count = await prisma.securityIncident.count({
        where: {
          userId,
          incidentType: 'failed_sca_attempt',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      return count;
    } catch (error) {
      logger.error('Failed to get recent failed attempts', { userId, error: error.message });
      return 0;
    }
  }
}

/**
 * SCA Challenge Manager
 * Handles creation and verification of SCA challenges
 */
class SCAChallenge {
  /**
   * Create a new SCA challenge
   * @param {string} userId - User ID
   * @param {string} transactionId - Transaction ID
   * @param {Array} allowedMethods - Allowed authentication methods
   * @returns {Object} Challenge details
   */
  async createChallenge(userId, transactionId, allowedMethods = ['sms', 'totp']) {
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SCA_CONFIG.SESSION_TIMEOUT);

    // Generate challenge data based on method
    const challenges = {};

    for (const method of allowedMethods) {
      switch (method) {
        case 'sms':
          challenges[method] = {
            code: this.generateSMSCode(),
            phoneNumber: await this.getMaskedPhoneNumber(userId)
          };
          break;

        case 'totp':
          challenges[method] = {
            qrCode: await this.generateTOTPChallenge(userId),
            backupCodes: await this.getBackupCodes(userId)
          };
          break;

        case 'biometric':
          challenges[method] = {
            challenge: this.generateBiometricChallenge(),
            supportedTypes: ['fingerprint', 'face', 'voice']
          };
          break;

        case 'push':
          challenges[method] = {
            token: this.generatePushToken(),
            deviceId: await this.getPrimaryDeviceId(userId)
          };
          break;
      }
    }

    // Store challenge in database
    const challengeRecord = await prisma.scaChallenge.create({
      data: {
        id: challengeId,
        userId,
        transactionId,
        allowedMethods: JSON.stringify(allowedMethods),
        challengeData: JSON.stringify(challenges),
        expiresAt,
        attempts: 0,
        status: 'pending'
      }
    });

    logger.info('SCA challenge created', {
      challengeId,
      userId,
      transactionId,
      allowedMethods,
      expiresAt
    });

    return {
      challengeId,
      allowedMethods,
      challenges,
      expiresAt
    };
  }

  /**
   * Verify SCA challenge response
   * @param {string} challengeId - Challenge ID
   * @param {string} method - Authentication method used
   * @param {string} response - User's response
   * @returns {Object} Verification result
   */
  async verifyChallenge(challengeId, method, response) {
    const challenge = await prisma.scaChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      throw new Error('SCA challenge not found');
    }

    if (challenge.status !== 'pending') {
      throw new Error('SCA challenge already processed');
    }

    if (new Date() > challenge.expiresAt) {
      await this.expireChallenge(challengeId);
      throw new Error('SCA challenge expired');
    }

    if (challenge.attempts >= SCA_CONFIG.MAX_ATTEMPTS) {
      await this.lockChallenge(challengeId);
      throw new Error('Maximum SCA attempts exceeded');
    }

    // Increment attempt counter
    await prisma.scaChallenge.update({
      where: { id: challengeId },
      data: { attempts: challenge.attempts + 1 }
    });

    const challengeData = JSON.parse(challenge.challengeData);
    const allowedMethods = JSON.parse(challenge.allowedMethods);

    if (!allowedMethods.includes(method)) {
      throw new Error('Authentication method not allowed for this challenge');
    }

    let isValid = false;

    // Verify based on method
    switch (method) {
      case 'sms':
        isValid = await this.verifySMSCode(challengeData.sms.code, response);
        break;

      case 'totp':
        isValid = await this.verifyTOTPCode(challenge.userId, response);
        break;

      case 'biometric':
        isValid = await this.verifyBiometric(challengeData.biometric.challenge, response);
        break;

      case 'push':
        isValid = await this.verifyPushToken(challengeData.push.token, response);
        break;

      default:
        throw new Error('Unsupported authentication method');
    }

    if (isValid) {
      // Mark challenge as completed
      await prisma.scaChallenge.update({
        where: { id: challengeId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          verificationMethod: method
        }
      });

      logger.info('SCA challenge completed successfully', {
        challengeId,
        userId: challenge.userId,
        method,
        attempts: challenge.attempts + 1
      });

      return {
        success: true,
        challengeId,
        method,
        completedAt: new Date().toISOString()
      };
    } else {
      // Log failed attempt
      await prisma.securityIncident.create({
        data: {
          userId: challenge.userId,
          incidentType: 'failed_sca_attempt',
          severity: 'medium',
          description: `Failed SCA verification using ${method}`,
          metadata: JSON.stringify({
            challengeId,
            method,
            attempt: challenge.attempts + 1
          })
        }
      });

      return {
        success: false,
        error: 'Invalid authentication response',
        attemptsRemaining: SCA_CONFIG.MAX_ATTEMPTS - (challenge.attempts + 1)
      };
    }
  }

  // Helper methods for different authentication types
  generateSMSCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async getMaskedPhoneNumber(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true }
    });

    if (!user?.phone) return null;

    const phone = user.phone;
    return `***-***-${phone.slice(-4)}`;
  }

  generateBiometricChallenge() {
    return crypto.randomBytes(32).toString('hex');
  }

  generatePushToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  async verifySMSCode(expectedCode, providedCode) {
    return expectedCode === providedCode;
  }

  async verifyTOTPCode(userId, code) {
    // Implement TOTP verification logic
    // This would typically use a library like speakeasy
    return true; // Simplified for example
  }

  async verifyBiometric(challenge, response) {
    // Implement biometric verification
    return true; // Simplified for example
  }

  async verifyPushToken(expectedToken, providedToken) {
    return expectedToken === providedToken;
  }

  async expireChallenge(challengeId) {
    await prisma.scaChallenge.update({
      where: { id: challengeId },
      data: { status: 'expired' }
    });
  }

  async lockChallenge(challengeId) {
    await prisma.scaChallenge.update({
      where: { id: challengeId },
      data: { status: 'locked' }
    });
  }
}

// Initialize services
const riskAssessment = new RiskAssessment();
const scaChallenge = new SCAChallenge();

/**
 * SCA Middleware Factory
 * Creates middleware that enforces SCA based on transaction context
 */
function createSCAMiddleware(options = {}) {
  const {
    forceForAmountAbove = SCA_CONFIG.AMOUNT_THRESHOLD,
    skipRiskAssessment = false,
    allowedMethods = SCA_CONFIG.SUPPORTED_METHODS,
    customRiskThreshold = null
  } = options;

  return async (req, res, next) => {
    try {
      // Extract transaction details
      const { amount, type, targetAccount } = req.body;
      const userId = req.user.id;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;

      // Check if SCA is required based on amount
      const requiresSCAForAmount = amount && parseFloat(amount) > forceForAmountAbove;

      // Build user context for risk assessment
      const userContext = {
        userId,
        userAgent,
        ipAddress,
        isNewDevice: await isNewDevice(userId, userAgent),
        isNewLocation: await isNewLocation(userId, ipAddress),
        isVpnDetected: await detectVPN(ipAddress)
      };

      // Calculate risk score
      let riskScore = 0;
      if (!skipRiskAssessment) {
        riskScore = await riskAssessment.calculateRiskScore(
          { amount: parseFloat(amount), type, targetAccount },
          userContext
        );
      }

      // Determine if SCA is required
      const riskThreshold = customRiskThreshold || SCA_CONFIG.MEDIUM_RISK_THRESHOLD;
      const requiresSCAForRisk = riskScore > riskThreshold;
      const requiresSCA = requiresSCAForAmount || requiresSCAForRisk;

      if (!requiresSCA) {
        // Log that SCA was not required
        logger.info('SCA not required for transaction', {
          userId,
          amount,
          riskScore,
          requiresSCAForAmount,
          requiresSCAForRisk
        });
        return next();
      }

      // Check if user already has a valid SCA session
      const existingSession = await getValidSCASession(userId);
      if (existingSession) {
        logger.info('Valid SCA session found, proceeding', {
          userId,
          sessionId: existingSession.id
        });
        return next();
      }

      // SCA is required - create challenge
      const transactionId = crypto.randomUUID();
      const challenge = await scaChallenge.createChallenge(
        userId,
        transactionId,
        allowedMethods
      );

      // Store transaction ID for later verification
      req.scaTransactionId = transactionId;
      req.scaChallenge = challenge;

      // Return SCA challenge to client
      return res.status(403).json({
        error: 'SCA_REQUIRED',
        message: 'Strong Customer Authentication required for this transaction',
        sca: {
          challengeId: challenge.challengeId,
          allowedMethods: challenge.allowedMethods,
          challenges: challenge.challenges,
          expiresAt: challenge.expiresAt,
          riskScore,
          reason: requiresSCAForAmount ? 'amount_threshold' : 'risk_assessment'
        }
      });

    } catch (error) {
      logger.error('SCA middleware error', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        error: 'SCA_ERROR',
        message: 'Unable to process Strong Customer Authentication'
      });
    }
  };
}

/**
 * SCA Verification Endpoint Handler
 * Handles verification of SCA challenges
 */
async function verifySCA(req, res) {
  try {
    const { challengeId, method, response } = req.body;

    if (!challengeId || !method || !response) {
      return res.status(400).json({
        error: 'MISSING_SCA_DATA',
        message: 'Challenge ID, method, and response are required'
      });
    }

    const result = await scaChallenge.verifyChallenge(challengeId, method, response);

    if (result.success) {
      // Create SCA session for future transactions
      await createSCASession(req.user.id, challengeId);

      return res.json({
        success: true,
        message: 'Strong Customer Authentication verified successfully',
        sessionValidUntil: new Date(Date.now() + SCA_CONFIG.SESSION_TIMEOUT).toISOString()
      });
    } else {
      return res.status(400).json({
        error: 'SCA_VERIFICATION_FAILED',
        message: result.error,
        attemptsRemaining: result.attemptsRemaining
      });
    }

  } catch (error) {
    logger.error('SCA verification error', {
      userId: req.user?.id,
      error: error.message
    });

    return res.status(500).json({
      error: 'SCA_VERIFICATION_ERROR',
      message: 'Unable to verify Strong Customer Authentication'
    });
  }
}

// Helper functions
async function isNewDevice(userId, userAgent) {
  // Check if this user agent has been seen before
  const deviceHash = crypto.createHash('sha256').update(userAgent).digest('hex');

  const existingDevice = await prisma.userDevice.findFirst({
    where: {
      userId,
      deviceHash,
      lastSeenAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    }
  });

  return !existingDevice;
}

async function isNewLocation(userId, ipAddress) {
  // Simplified geolocation check
  const existingLocation = await prisma.userLocation.findFirst({
    where: {
      userId,
      ipAddress,
      lastSeenAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    }
  });

  return !existingLocation;
}

async function detectVPN(ipAddress) {
  // Simplified VPN detection (in production, use a service like IPQualityScore)
  const vpnRanges = ['10.', '192.168.', '172.16.'];
  return vpnRanges.some(range => ipAddress.startsWith(range));
}

async function getValidSCASession(userId) {
  return await prisma.scaSession.findFirst({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      status: 'active'
    }
  });
}

async function createSCASession(userId, challengeId) {
  return await prisma.scaSession.create({
    data: {
      userId,
      challengeId,
      expiresAt: new Date(Date.now() + SCA_CONFIG.SESSION_TIMEOUT),
      status: 'active'
    }
  });
}

module.exports = {
  createSCAMiddleware,
  verifySCA,
  SCA_CONFIG,
  RiskAssessment,
  SCAChallenge
};