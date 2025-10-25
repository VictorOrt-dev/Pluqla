/**
 * GDPR Routes
 *
 * Routes pour conformité RGPD
 * Protégées par authentification + rate limiting
 */

const express = require('express');
const router = express.Router();

// Middlewares
const { authenticateToken } = require('../middleware/auth');
const { attachIPHash } = require('../services/ipDeduplicationService');
const { gdprExportLimiter } = require('../middleware/rateLimiting');

// Controllers
const {
  exportUserData,
  deleteUserAccount,
  getAuditTrail,
  requestDataCorrection
} = require('../controllers/gdprController');

// Appliquer IP hash à toutes les routes
router.use(attachIPHash);

/**
 * @route   GET /api/gdpr/export
 * @desc    Export toutes les données personnelles (Article 15 RGPD)
 * @access  Private + Rate Limited (3/jour)
 */
router.get('/export', authenticateToken, gdprExportLimiter, exportUserData);

/**
 * @route   DELETE /api/gdpr/delete-account
 * @desc    Suppression compte + droit à l'oubli (Article 17 RGPD)
 * @access  Private
 * @body    { password: string, confirmation: "DELETE MY ACCOUNT" }
 */
router.delete('/delete-account', authenticateToken, deleteUserAccount);

/**
 * @route   GET /api/gdpr/audit-trail
 * @desc    Historique des actions GDPR sur le compte
 * @access  Private
 */
router.get('/audit-trail', authenticateToken, getAuditTrail);

/**
 * @route   POST /api/gdpr/request-correction
 * @desc    Demander rectification données (Article 16 RGPD)
 * @access  Private
 * @body    { field: string, currentValue: any, requestedValue: any, reason: string }
 */
router.post('/request-correction', authenticateToken, requestDataCorrection);

module.exports = router;
