const express = require('express');
const { body, param, query } = require('express-validator');
const transactionController = require('../controllers/transactionController');
const { handleValidationErrors } = require('../middleware/validateInput');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation schemas
const createTransactionValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Montant doit être positif'),
  body('category')
    .isIn(['alimentation', 'habits', 'activite', 'deplacement'])
    .withMessage('Catégorie invalide'),
  body('type')
    .isIn(['saving', 'expense', 'goal'])
    .withMessage('Type de transaction invalide'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description entre 1 et 255 caractères'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date invalide'),
];

const updateTransactionValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de transaction invalide'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Montant doit être positif'),
  body('category')
    .optional()
    .isIn(['alimentation', 'habits', 'activite', 'deplacement'])
    .withMessage('Catégorie invalide'),
  body('type')
    .optional()
    .isIn(['economy', 'expense', 'income'])
    .withMessage('Type de transaction invalide'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description entre 1 et 255 caractères'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date invalide'),
];

const transactionFiltersValidation = [
  query('category')
    .optional()
    .isIn(['alimentation', 'habits', 'activite', 'deplacement'])
    .withMessage('Catégorie invalide'),
  query('type')
    .optional()
    .isIn(['economy', 'expense', 'income'])
    .withMessage('Type invalide'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Date de début invalide'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Date de fin invalide'),
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Montant minimum invalide'),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Montant maximum invalide'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite invalide (1-100)'),
];

// Routes pour les transactions
router.get('/',
  transactionFiltersValidation,
  handleValidationErrors,
  transactionController.getTransactions
);

router.get('/recent',
  query('limit').optional().isInt({ min: 1, max: 20 }),
  handleValidationErrors,
  transactionController.getRecentTransactions
);

router.get('/:id',
  param('id').isUUID(),
  handleValidationErrors,
  transactionController.getTransactionById
);

router.post('/',
  rateLimit.standard,
  createTransactionValidation,
  handleValidationErrors,
  transactionController.createTransaction
);

router.put('/:id',
  rateLimit.standard,
  updateTransactionValidation,
  handleValidationErrors,
  transactionController.updateTransaction
);

router.delete('/:id',
  rateLimit.standard,
  param('id').isUUID(),
  handleValidationErrors,
  transactionController.deleteTransaction
);

// Routes pour les statistiques de transactions
router.get('/stats/summary',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('category').optional().isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  handleValidationErrors,
  transactionController.getTransactionSummary
);

router.get('/stats/monthly',
  query('year').optional().isInt({ min: 2020, max: 2030 }),
  query('category').optional().isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  handleValidationErrors,
  transactionController.getMonthlyStats
);

router.get('/stats/category',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors,
  transactionController.getCategoryStats
);

// Routes pour les rapports
router.get('/reports/export',
  rateLimit.slow,
  query('format').optional().isIn(['csv', 'json']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  handleValidationErrors,
  transactionController.exportTransactions
);

// Routes pour les objectifs d'épargne
router.post('/goals',
  rateLimit.standard,
  body('category').isIn(['alimentation', 'habits', 'activite', 'deplacement']),
  body('targetAmount').isFloat({ min: 0.01 }),
  body('targetDate').isISO8601(),
  body('description').optional().trim().isLength({ max: 255 }),
  handleValidationErrors,
  transactionController.createSavingsGoal
);

router.get('/goals',
  transactionController.getSavingsGoals
);

router.put('/goals/:id',
  rateLimit.standard,
  param('id').isUUID(),
  body('targetAmount').optional().isFloat({ min: 0.01 }),
  body('targetDate').optional().isISO8601(),
  body('description').optional().trim().isLength({ max: 255 }),
  handleValidationErrors,
  transactionController.updateSavingsGoal
);

router.delete('/goals/:id',
  rateLimit.standard,
  param('id').isUUID(),
  handleValidationErrors,
  transactionController.deleteSavingsGoal
);

module.exports = router;