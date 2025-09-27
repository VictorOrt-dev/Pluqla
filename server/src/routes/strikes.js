const express = require('express');
const strikeController = require('../controllers/strikeController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const {
  validateCurrentStrike,
  validateStrikeStats,
  validateCheckReset
} = require('../middleware/validation/strikeValidation');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes des strikes avec validation et sécurité
router.get('/current',
  rateLimit.standard, // Standard rate limit
  validateCurrentStrike, // Input validation
  strikeController.getCurrentStrike
);

router.get('/stats',
  rateLimit.standard, // Standard rate limit
  validateStrikeStats, // Input validation
  strikeController.getStrikeStats
);

router.post('/check-reset',
  rateLimit.strict, // Strict rate limit for critical operations
  validateCheckReset, // Input validation
  strikeController.checkAndResetStrike
);

module.exports = router;