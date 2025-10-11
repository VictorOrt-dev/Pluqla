const express = require('express');
const complianceController = require('../controllers/complianceController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// GDPR Compliance Routes
router.delete(
  '/user/delete-account',
  authenticateToken,
  rateLimit.strictLimiter, // FIXED: Very strict rate limiting for account deletion
  complianceController.deleteAccount
);

router.get(
  '/user/export-data',
  authenticateToken,
  rateLimit.standardLimiter, // FIXED: Standard rate limiting
  complianceController.exportUserData
);

// Data processing log (admin only)
router.get(
  '/admin/processing-logs',
  authenticateToken,
  rateLimit.standardLimiter, // FIXED: Standard rate limiting
  complianceController.getProcessingLogs
);

module.exports = router;
