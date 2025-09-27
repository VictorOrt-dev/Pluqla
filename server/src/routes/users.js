const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const {
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateStatsQuery,
  validateAccountDeletion,
  validateDataExport,
  validateProfilePictureUpload,
  validateQuestionnaireSubmission
} = require('../middleware/validation/userValidation');
const {
  validateChangePassword
} = require('../middleware/validation/authValidation');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// User profile routes with enhanced security validation
router.get('/profile',
  userController.getProfile
);

router.put('/profile',
  rateLimit.standard,
  validateProfileUpdate,
  userController.updateProfile
);

router.delete('/profile',
  rateLimit.strict, // More restrictive for account deletion
  validateAccountDeletion,
  userController.deleteAccount
);

router.post('/change-password',
  rateLimit.auth,
  validateChangePassword,
  userController.changePassword
);

// User preferences routes
router.get('/preferences',
  userController.getPreferences
);

router.put('/preferences',
  rateLimit.standard,
  validatePreferencesUpdate,
  userController.updatePreferences
);

// Questionnaire routes with enhanced validation
router.post('/questionnaire',
  rateLimit.standard,
  validateQuestionnaireSubmission,
  userController.submitQuestionnaire
);

router.get('/questionnaire',
  userController.getQuestionnaireAnswers
);

// User statistics routes
router.get('/stats',
  validateStatsQuery,
  userController.getUserStats
);

router.get('/savings-summary',
  userController.getSavingsSummary
);

// Data export route with GDPR compliance validation
router.get('/export',
  rateLimit.slow,
  validateDataExport,
  userController.exportUserData
);

// Avatar route (no validation needed for GET)
router.get('/avatar',
  userController.getAvatar
);

// Profile picture upload route (if needed)
router.post('/profile-picture',
  rateLimit.upload, // Special rate limit for uploads
  validateProfilePictureUpload,
  userController.uploadProfilePicture
);

module.exports = router;