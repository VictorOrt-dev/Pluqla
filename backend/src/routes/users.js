const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { handleValidationErrors } = require('../middleware/validateInput');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation schemas
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nom entre 2 et 100 caractères'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date de naissance invalide'),
  body('phoneNumber')
    .optional()
    .isMobilePhone('fr-FR')
    .withMessage('Numéro de téléphone français invalide'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nouveau mot de passe minimum 6 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nouveau mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
];

const updatePreferencesValidation = [
  body('currency')
    .optional()
    .isIn(['EUR', 'USD', 'GBP'])
    .withMessage('Devise non supportée'),
  body('language')
    .optional()
    .isIn(['fr', 'en'])
    .withMessage('Langue non supportée'),
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Paramètres de notifications invalides'),
  body('savingsGoals')
    .optional()
    .isObject()
    .withMessage('Objectifs d\'épargne invalides'),
];

const questionnaireValidation = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Réponses requises'),
  body('answers.*.questionId')
    .notEmpty()
    .withMessage('ID de question requis'),
  body('answers.*.answer')
    .notEmpty()
    .withMessage('Réponse requise'),
];

// Routes pour le profil utilisateur
router.get('/profile',
  userController.getProfile
);

router.put('/profile',
  rateLimit.standard,
  updateProfileValidation,
  handleValidationErrors,
  userController.updateProfile
);

router.delete('/profile',
  rateLimit.standard,
  userController.deleteAccount
);

router.post('/change-password',
  rateLimit.auth,
  changePasswordValidation,
  handleValidationErrors,
  userController.changePassword
);

// Routes pour les préférences utilisateur
router.get('/preferences',
  userController.getPreferences
);

router.put('/preferences',
  rateLimit.standard,
  updatePreferencesValidation,
  handleValidationErrors,
  userController.updatePreferences
);

// Routes pour le questionnaire d'onboarding
router.post('/questionnaire',
  rateLimit.standard,
  questionnaireValidation,
  handleValidationErrors,
  userController.submitQuestionnaire
);

router.get('/questionnaire',
  userController.getQuestionnaireAnswers
);

// Routes pour les statistiques utilisateur
router.get('/stats',
  userController.getUserStats
);

router.get('/savings-summary',
  userController.getSavingsSummary
);

// Routes pour l'export des données
router.get('/export',
  rateLimit.slow,
  userController.exportUserData
);

// Route pour récupérer l'avatar utilisateur
router.get('/avatar',
  userController.getAvatar
);

module.exports = router;