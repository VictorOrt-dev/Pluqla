const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const {
  validateRegistration,
  validateLogin,
  validateTokenRefresh,
  validateForgotPassword,
  validatePasswordReset,
  validateEmailVerification,
  validateLogout,
  validateChangePassword,
  authRateLimit
} = require('../middleware/validation/authValidation');

const router = express.Router();

// Authentication routes with enhanced security validation
router.post('/register',
  authRateLimit.registration, // More restrictive rate limiting for registration
  validateRegistration,
  authController.register
);

router.post('/login',
  authRateLimit.standard,
  validateLogin,
  authController.login
);

router.post('/logout',
  validateLogout,
  authController.logout
);

router.post('/refresh',
  authRateLimit.standard,
  validateTokenRefresh,
  authController.refreshToken
);

router.post('/forgot-password',
  authRateLimit.strict,
  validateForgotPassword,
  authController.forgotPassword
);

router.post('/reset-password',
  authRateLimit.strict,
  validatePasswordReset,
  authController.resetPassword
);

router.get('/verify-email/:token',
  validateEmailVerification,
  authController.verifyEmail
);

router.post('/resend-verification',
  authRateLimit.standard,
  validateForgotPassword, // Same validation as forgot password (just email)
  authController.resendVerification
);

router.post('/change-password',
  authenticateToken,
  authRateLimit.standard,
  validateChangePassword,
  authController.changePassword
);

router.get('/verify',
  authenticateToken,
  authController.verifyToken
);

module.exports = router;