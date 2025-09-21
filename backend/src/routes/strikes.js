const express = require('express');
const strikeController = require('../controllers/strikeController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes des strikes
router.get('/current',
  rateLimit.standard, // Standard rate limit
  strikeController.getCurrentStrike
);

router.get('/stats',
  rateLimit.standard, // Standard rate limit
  strikeController.getStrikeStats
);

router.post('/check-reset',
  rateLimit.strict, // Strict rate limit for critical operations
  strikeController.checkAndResetStrike
);

module.exports = router;