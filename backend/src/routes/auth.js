const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { handleValidationErrors } = require('../middleware/validateInput');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Validation schemas
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email valide requis'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mot de passe minimum 6 caractères'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email valide requis'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis'),
];

const passwordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email valide requis'),
];

const passwordUpdateValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token requis'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mot de passe minimum 6 caractères'),
];

// Routes
router.post('/register',
  rateLimit.auth,
  registerValidation,
  handleValidationErrors,
  authController.register
);

router.post('/login',
  rateLimit.auth,
  loginValidation,
  handleValidationErrors,
  authController.login
);

router.post('/logout',
  authController.logout
);

router.post('/refresh',
  rateLimit.auth,
  authController.refreshToken
);

router.post('/forgot-password',
  rateLimit.auth,
  passwordResetValidation,
  handleValidationErrors,
  authController.forgotPassword
);

router.post('/reset-password',
  rateLimit.auth,
  passwordUpdateValidation,
  handleValidationErrors,
  authController.resetPassword
);

router.get('/verify-email/:token',
  authController.verifyEmail
);

router.post('/resend-verification',
  rateLimit.auth,
  body('email').isEmail().normalizeEmail(),
  handleValidationErrors,
  authController.resendVerification
);

router.get('/verify',
  authenticateToken,
  authController.verifyToken
);

module.exports = router;