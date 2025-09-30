const express = require('express');
const { body, param, query } = require('express-validator');
const oauthController = require('../controllers/oauthController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { validateFinancialInput, gdprCompliance, monitorSuspiciousActivity } = require('../middleware/securityMiddleware');

const router = express.Router();

/**
 * OAuth Routes for Secure Bank API Integration
 * All routes require authentication and include security measures
 */

// Apply GDPR compliance and security middleware to all routes
router.use(gdprCompliance);
router.use(monitorSuspiciousActivity);

/**
 * @route POST /api/oauth/authorize
 * @desc Initiate OAuth2 authorization flow
 * @access Private
 */
router.post(
  '/authorize',
  authenticateToken,
  rateLimit.financial.payments, // Financial-grade rate limiting for OAuth authorization
  [
    body('provider')
      .isIn(['bridge', 'budgetinsight', 'tink'])
      .withMessage('Invalid provider. Must be one of: bridge, budgetinsight, tink'),
    body('returnUrl')
      .optional()
      .isURL()
      .withMessage('Return URL must be a valid URL')
  ],
  oauthController.initiateAuthorization
);

/**
 * @route POST /api/oauth/callback
 * @desc Handle OAuth2 callback and exchange code for token
 * @access Public (but requires valid state)
 */
router.post(
  '/callback',
  rateLimit.financial.payments, // Financial-grade rate limiting for OAuth callbacks
  [
    body('code')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Authorization code is required'),
    body('state')
      .isLength({ min: 10, max: 200 })
      .withMessage('State parameter is required'),
    body('provider')
      .isIn(['bridge', 'budgetinsight', 'tink'])
      .withMessage('Invalid provider'),
    body('error')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Error parameter too long')
  ],
  oauthController.handleCallback
);

/**
 * @route DELETE /api/oauth/disconnect/:provider
 * @desc Disconnect OAuth provider and revoke tokens
 * @access Private
 */
router.delete(
  '/disconnect/:provider',
  authenticateToken,
  rateLimit.financial.transactions, // Standard financial rate limiting for disconnections
  [
    param('provider')
      .isIn(['bridge', 'budgetinsight', 'tink'])
      .withMessage('Invalid provider')
  ],
  oauthController.disconnectProvider
);

/**
 * @route GET /api/oauth/status
 * @desc Get OAuth connection status for user
 * @access Private
 */
router.get(
  '/status',
  authenticateToken,
  rateLimit.financial.apiCalls, // API call rate limiting for status checks
  oauthController.getConnectionStatus
);

/**
 * @route POST /api/oauth/refresh/:provider
 * @desc Refresh OAuth tokens for a provider
 * @access Private
 */
router.post(
  '/refresh/:provider',
  authenticateToken,
  rateLimit.financial.payments, // Financial-grade rate limiting for token refresh
  [
    param('provider')
      .isIn(['bridge', 'budgetinsight', 'tink'])
      .withMessage('Invalid provider')
  ],
  oauthController.refreshProviderTokens
);

/**
 * @route POST /api/oauth/consent
 * @desc Record user consent for financial data aggregation
 * @access Private
 */
router.post(
  '/consent',
  authenticateToken,
  rateLimit.financial.subscriptions, // Subscription-level rate limiting for consent management
  [
    body('consentType')
      .isIn(['financial_aggregation', 'transaction_categorization', 'investment_analysis'])
      .withMessage('Invalid consent type'),
    body('granted')
      .isBoolean()
      .withMessage('Granted must be a boolean'),
    body('purpose')
      .isLength({ min: 10, max: 500 })
      .withMessage('Purpose must be between 10 and 500 characters'),
    body('legalBasis')
      .optional()
      .isIn(['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'])
      .withMessage('Invalid legal basis')
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        consentType, granted, purpose, legalBasis = 'consent'
      } = req.body;

      const gdprService = require('../services/gdprService');

      const consent = await gdprService.recordConsent(userId, {
        type: consentType,
        purpose,
        legalBasis,
        granted,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        version: '1.0'
      });

      const analyticsService = require('../services/analyticsService');
      analyticsService.trackEvent('gdpr_consent_recorded', userId, {
        consentType,
        granted,
        legalBasis
      });

      res.json({
        success: true,
        message: 'Consent recorded successfully',
        data: {
          consentId: consent.id,
          type: consent.consentType,
          granted: consent.granted,
          recordedAt: consent.createdAt
        }
      });
    } catch (error) {
      console.error('Consent recording failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record consent',
        error: 'CONSENT_RECORDING_FAILED'
      });
    }
  }
);

/**
 * @route GET /api/oauth/consent
 * @desc Get user's current consent status
 * @access Private
 */
router.get(
  '/consent',
  authenticateToken,
  rateLimit.financial.apiCalls, // API call rate limiting for consent status
  async (req, res) => {
    try {
      const userId = req.user.id;
      const gdprService = require('../services/gdprService');

      const consentStatus = await gdprService.getConsentStatus(userId);

      res.json({
        success: true,
        message: 'Consent status retrieved successfully',
        data: {
          consents: consentStatus,
          hasFinancialAggregationConsent: consentStatus.financial_aggregation?.granted || false,
          lastUpdated: Math.max(...Object.values(consentStatus).map((c) => new Date(c.createdAt).getTime()))
        }
      });
    } catch (error) {
      console.error('Consent status retrieval failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve consent status',
        error: 'CONSENT_STATUS_FAILED'
      });
    }
  }
);

/**
 * @route GET /api/oauth/providers
 * @desc Get available OAuth providers and their capabilities
 * @access Private
 */
router.get(
  '/providers',
  authenticateToken,
  rateLimit.financial.apiCalls, // API call rate limiting for provider information
  (req, res) => {
    try {
      const providers = [
        {
          id: 'bridge',
          name: 'Bridge API',
          description: 'Connect to 300+ European banks',
          countries: ['FR', 'ES', 'IT', 'DE', 'BE', 'NL'],
          capabilities: ['accounts', 'transactions', 'balances'],
          psd2Compliant: true,
          logoUrl: '/images/providers/bridge.png'
        },
        {
          id: 'budgetinsight',
          name: 'Budget Insight',
          description: 'European banking aggregation platform',
          countries: ['FR', 'ES', 'IT', 'DE', 'UK'],
          capabilities: ['accounts', 'transactions', 'balances', 'investments'],
          psd2Compliant: true,
          logoUrl: '/images/providers/budget-insight.png'
        },
        {
          id: 'tink',
          name: 'Tink',
          description: 'Open banking platform for Europe',
          countries: ['SE', 'FI', 'NO', 'DK', 'DE', 'UK'],
          capabilities: ['accounts', 'transactions', 'balances', 'investments'],
          psd2Compliant: true,
          logoUrl: '/images/providers/tink.png'
        }
      ];

      res.json({
        success: true,
        message: 'Available providers retrieved successfully',
        data: {
          providers,
          totalProviders: providers.length,
          psd2Compliant: providers.every((p) => p.psd2Compliant)
        }
      });
    } catch (error) {
      console.error('Provider list retrieval failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve providers',
        error: 'PROVIDERS_FAILED'
      });
    }
  }
);

module.exports = router;
