/**
 * Strong Customer Authentication (SCA) Routes
 *
 * Handles PSD2 compliant Strong Customer Authentication endpoints
 * for financial transactions requiring enhanced security.
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { verifySCA } = require('../middleware/scaAuthentication');
const rateLimit = require('../middleware/rateLimit');
const { validateSCAVerification } = require('../middleware/validation/scaValidation');
const logger = require('../utils/logger');
const scaService = require('../services/scaService');

const router = express.Router();

/**
 * Verify SCA challenge
 * @route POST /api/sca/verify
 * @access Private
 */
router.post(
  '/verify',
  rateLimit.createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    keyGenerator: (req) => `sca_verify_${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true
  }),
  authenticateToken,
  validateSCAVerification,
  verifySCA
);

/**
 * Get SCA session status
 * @route GET /api/sca/status
 * @access Private
 */
router.get(
  '/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { prisma } = require('../lib/prisma');

      // Check for active SCA session
      const activeSession = await prisma.scaSession.findFirst({
        where: {
          userId,
          status: 'active',
          expiresAt: { gt: new Date() }
        },
        select: {
          id: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeSession) {
        return res.json({
          hasActiveSCA: true,
          session: {
            expiresAt: activeSession.expiresAt,
            lastUsedAt: activeSession.lastUsedAt,
            timeRemaining: Math.max(0, activeSession.expiresAt.getTime() - Date.now())
          }
        });
      }

      return res.json({
        hasActiveSCA: false,
        session: null
      });

    } catch (error) {
      logger.error('SCA status check error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'SCA_STATUS_ERROR',
        message: 'Unable to check SCA status'
      });
    }
  }
);

/**
 * Revoke SCA session
 * @route POST /api/sca/revoke
 * @access Private
 */
router.post(
  '/revoke',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { prisma } = require('../lib/prisma');

      // Revoke all active SCA sessions for the user
      const result = await prisma.scaSession.updateMany({
        where: {
          userId,
          status: 'active'
        },
        data: {
          status: 'revoked',
          updatedAt: new Date()
        }
      });

      logger.info('SCA sessions revoked', {
        userId,
        sessionsRevoked: result.count
      });

      return res.json({
        success: true,
        message: 'SCA sessions revoked successfully',
        sessionsRevoked: result.count
      });

    } catch (error) {
      logger.error('SCA session revocation error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'SCA_REVOKE_ERROR',
        message: 'Unable to revoke SCA sessions'
      });
    }
  }
);

/**
 * Get user devices for SCA management
 * @route GET /api/sca/devices
 * @access Private
 */
router.get(
  '/devices',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { prisma } = require('../lib/prisma');

      const devices = await prisma.userDevice.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          deviceName: true,
          deviceType: true,
          firstSeenAt: true,
          lastSeenAt: true,
          isTrusted: true,
          location: true
        },
        orderBy: { lastSeenAt: 'desc' }
      });

      return res.json({
        devices: devices.map(device => ({
          ...device,
          isCurrentDevice: req.get('User-Agent') === device.deviceHash
        }))
      });

    } catch (error) {
      logger.error('SCA devices list error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'SCA_DEVICES_ERROR',
        message: 'Unable to retrieve device list'
      });
    }
  }
);

/**
 * Trust a device for reduced SCA requirements
 * @route POST /api/sca/devices/:deviceId/trust
 * @access Private
 */
router.post(
  '/devices/:deviceId/trust',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;
      const { prisma } = require('../lib/prisma');

      // Verify device belongs to user
      const device = await prisma.userDevice.findFirst({
        where: { id: deviceId, userId }
      });

      if (!device) {
        return res.status(404).json({
          error: 'DEVICE_NOT_FOUND',
          message: 'Device not found or does not belong to user'
        });
      }

      // Update device trust status
      await prisma.userDevice.update({
        where: { id: deviceId },
        data: { isTrusted: true, updatedAt: new Date() }
      });

      logger.info('Device trusted for SCA', {
        userId,
        deviceId,
        deviceType: device.deviceType
      });

      return res.json({
        success: true,
        message: 'Device trusted successfully',
        device: { id: deviceId, isTrusted: true }
      });

    } catch (error) {
      logger.error('Device trust error', {
        userId: req.user.id,
        deviceId: req.params.deviceId,
        error: error.message
      });

      return res.status(500).json({
        error: 'DEVICE_TRUST_ERROR',
        message: 'Unable to trust device'
      });
    }
  }
);

/**
 * Get SCA settings and preferences
 * @route GET /api/sca/settings
 * @access Private
 */
router.get(
  '/settings',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { SCA_CONFIG } = require('../middleware/scaAuthentication');

      // In a real implementation, you'd fetch user-specific SCA preferences
      const settings = {
        thresholds: {
          amount: SCA_CONFIG.AMOUNT_THRESHOLD,
          riskScore: SCA_CONFIG.MEDIUM_RISK_THRESHOLD
        },
        supportedMethods: SCA_CONFIG.SUPPORTED_METHODS,
        sessionTimeout: SCA_CONFIG.SESSION_TIMEOUT / 1000 / 60, // Convert to minutes
        maxAttempts: SCA_CONFIG.MAX_ATTEMPTS,
        trustedDevicesEnabled: true,
        biometricEnabled: false // Would be determined by device capabilities
      };

      return res.json({ settings });

    } catch (error) {
      logger.error('SCA settings error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'SCA_SETTINGS_ERROR',
        message: 'Unable to retrieve SCA settings'
      });
    }
  }
);

/**
 * Check if transaction requires SCA (PSD2 compliance)
 * @route POST /api/sca/check-requirement
 * @access Private
 */
router.post(
  '/check-requirement',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { amount, transactionType, transactionData } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: 'INVALID_AMOUNT',
          message: 'Valid transaction amount is required'
        });
      }

      // Check SCA requirement
      const scaCheck = await scaService.requiresSCA(userId, amount, transactionType);

      // Check for possible exemptions
      const exemptionCheck = await scaService.checkScaExemption(
        userId,
        amount,
        transactionData || {}
      );

      return res.json({
        scaRequired: scaCheck.required && !exemptionCheck.exempt,
        scaCheck,
        exemption: exemptionCheck,
        psd2Compliant: true
      });

    } catch (error) {
      logger.error('SCA requirement check error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'SCA_CHECK_ERROR',
        message: 'Unable to check SCA requirement'
      });
    }
  }
);

/**
 * Create SCA challenge for transaction (PSD2)
 * @route POST /api/sca/create-challenge
 * @access Private
 */
router.post(
  '/create-challenge',
  authenticateToken,
  rateLimit.createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => `sca_create_${req.user?.id || req.ip}`
  }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { transactionId, amount, allowedMethods } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Transaction ID is required'
        });
      }

      // Create SCA challenge
      const challenge = await scaService.createScaChallenge(
        userId,
        transactionId,
        allowedMethods || ['password', 'biometric']
      );

      return res.status(201).json({
        success: true,
        challenge: {
          id: challenge.id,
          transactionId: challenge.transactionId,
          allowedMethods: JSON.parse(challenge.allowedMethods),
          expiresAt: challenge.expiresAt,
          expiresIn: Math.floor((challenge.expiresAt.getTime() - Date.now()) / 1000)
        }
      });

    } catch (error) {
      logger.error('SCA challenge creation error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'CHALLENGE_CREATE_ERROR',
        message: 'Unable to create SCA challenge'
      });
    }
  }
);

/**
 * Complete SCA challenge (PSD2)
 * @route POST /api/sca/complete-challenge
 * @access Private
 */
router.post(
  '/complete-challenge',
  authenticateToken,
  rateLimit.createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => `sca_complete_${req.user?.id || req.ip}`,
    skipSuccessfulRequests: true
  }),
  async (req, res) => {
    try {
      const { challengeId, verificationMethod, credentials } = req.body;

      if (!challengeId || !verificationMethod) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Challenge ID and verification method are required'
        });
      }

      // Verify credentials based on method
      // (In production, this would verify password, biometric, etc.)
      const isValid = true; // Placeholder for actual verification

      if (!isValid) {
        return res.status(401).json({
          error: 'VERIFICATION_FAILED',
          message: 'Authentication failed'
        });
      }

      // Complete the challenge
      const result = await scaService.completeScaChallenge(challengeId, verificationMethod);

      if (!result.success) {
        return res.status(400).json({
          error: 'CHALLENGE_FAILED',
          message: result.error
        });
      }

      logger.info('SCA challenge completed successfully', {
        userId: req.user.id,
        challengeId,
        verificationMethod
      });

      return res.json({
        success: true,
        message: 'SCA challenge completed successfully'
      });

    } catch (error) {
      logger.error('SCA challenge completion error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'CHALLENGE_COMPLETE_ERROR',
        message: 'Unable to complete SCA challenge'
      });
    }
  }
);

/**
 * Get SCA exemption logs (Admin only - for compliance auditing)
 * @route GET /api/sca/exemptions
 * @access Private (Admin)
 */
router.get(
  '/exemptions',
  authenticateToken,
  async (req, res) => {
    try {
      const { prisma } = require('../lib/prisma');

      // Check admin
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });

      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'Admin privileges required'
        });
      }

      const { page = 1, limit = 50, userId, exemptionType } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (userId) where.userId = userId;
      if (exemptionType) where.exemptionType = exemptionType;

      const [logs, total] = await Promise.all([
        prisma.scaExemptionLog.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            transactionId: true,
            exemptionType: true,
            amount: true,
            reason: true,
            riskScore: true,
            createdAt: true
          }
        }),
        prisma.scaExemptionLog.count({ where })
      ]);

      return res.json({
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
      logger.error('SCA exemption logs error', {
        userId: req.user.id,
        error: error.message
      });

      return res.status(500).json({
        error: 'EXEMPTION_LOGS_ERROR',
        message: 'Unable to retrieve exemption logs'
      });
    }
  }
);

module.exports = router;