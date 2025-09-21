const express = require('express');
const { param, query } = require('express-validator');
const uploadController = require('../controllers/uploadController');
const { handleValidationErrors } = require('../middleware/validateInput');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const upload = require('../middleware/upload');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Validation schemas
const fileIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID de fichier invalide'),
];

const imageQueryValidation = [
  query('width')
    .optional()
    .isInt({ min: 50, max: 2000 })
    .withMessage('Largeur entre 50 et 2000 pixels'),
  query('height')
    .optional()
    .isInt({ min: 50, max: 2000 })
    .withMessage('Hauteur entre 50 et 2000 pixels'),
  query('quality')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('Qualité entre 10 et 100'),
  query('format')
    .optional()
    .isIn(['jpeg', 'png', 'webp'])
    .withMessage('Format non supporté'),
];

// Routes pour l'upload d'images
router.post('/avatar',
  rateLimit.upload,
  upload.single('avatar'),
  uploadController.uploadAvatar
);

router.post('/receipt',
  rateLimit.upload,
  upload.single('receipt'),
  uploadController.uploadReceipt
);

router.post('/clothing',
  rateLimit.upload,
  upload.single('clothing'),
  uploadController.uploadClothingImage
);

router.post('/general',
  rateLimit.upload,
  upload.single('image'),
  uploadController.uploadGeneral
);

// Routes pour l'upload multiple
router.post('/multiple',
  rateLimit.upload,
  upload.array('images', 5), // Maximum 5 images
  uploadController.uploadMultiple
);

// Routes pour récupérer les fichiers
router.get('/:id',
  fileIdValidation,
  handleValidationErrors,
  uploadController.getFile
);

router.get('/:id/download',
  fileIdValidation,
  handleValidationErrors,
  uploadController.downloadFile
);

// Routes pour les images avec transformation
router.get('/:id/image',
  fileIdValidation,
  imageQueryValidation,
  handleValidationErrors,
  uploadController.getResizedImage
);

router.get('/:id/thumbnail',
  fileIdValidation,
  handleValidationErrors,
  uploadController.getThumbnail
);

// Routes pour la gestion des fichiers
router.delete('/:id',
  rateLimit.standard,
  fileIdValidation,
  handleValidationErrors,
  uploadController.deleteFile
);

router.get('/user/files',
  query('type').optional().isIn(['image', 'document', 'receipt']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors,
  uploadController.getUserFiles
);

// Routes pour les métadonnées des fichiers
router.get('/:id/metadata',
  fileIdValidation,
  handleValidationErrors,
  uploadController.getFileMetadata
);

router.put('/:id/metadata',
  rateLimit.standard,
  fileIdValidation,
  handleValidationErrors,
  uploadController.updateFileMetadata
);

// Routes pour la validation et l'analyse des fichiers
router.post('/:id/analyze',
  rateLimit.ai,
  fileIdValidation,
  handleValidationErrors,
  uploadController.analyzeFile
);

router.get('/:id/analysis',
  fileIdValidation,
  handleValidationErrors,
  uploadController.getFileAnalysis
);

// Routes pour les statistiques d'upload
router.get('/stats/usage',
  uploadController.getUploadStats
);

router.get('/stats/storage',
  uploadController.getStorageStats
);

// Routes pour le nettoyage et la maintenance
router.delete('/cleanup/temp',
  rateLimit.admin,
  uploadController.cleanupTempFiles
);

router.delete('/cleanup/orphaned',
  rateLimit.admin,
  uploadController.cleanupOrphanedFiles
);

// Routes pour la configuration d'upload
router.get('/config',
  uploadController.getUploadConfig
);

// Routes pour les liens de partage temporaires
router.post('/:id/share',
  rateLimit.standard,
  fileIdValidation,
  handleValidationErrors,
  uploadController.createShareLink
);

router.get('/share/:token',
  param('token').isAlphanumeric(),
  handleValidationErrors,
  uploadController.getSharedFile
);

// Route pour vérifier l'espace de stockage disponible
router.get('/storage/quota',
  uploadController.getStorageQuota
);

module.exports = router;