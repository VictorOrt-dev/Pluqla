const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Configuration de stockage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    // Générer un nom unique pour le fichier
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// Filtre pour les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  try {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : ['image/jpeg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error(`Type de fichier non autorisé: ${file.mimetype}`);
      error.status = 400;
      cb(error, false);
    }
  } catch (error) {
    logger.error('Erreur dans le filtre de fichier:', error);
    cb(error, false);
  }
};

// Configuration multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE?.replace('mb', ''), 10) * 1024 * 1024 || 10 * 1024 * 1024, // 10MB par défaut
    files: 5 // Maximum 5 fichiers
  }
});

// Middleware pour gérer les erreurs d'upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    logger.warn('Erreur Multer:', error);

    switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return res.status(400).json({
        error: 'Fichier trop volumineux',
        message: `La taille du fichier ne doit pas dépasser ${process.env.UPLOAD_MAX_SIZE || '10mb'}`
      });
    case 'LIMIT_FILE_COUNT':
      return res.status(400).json({
        error: 'Trop de fichiers',
        message: 'Vous ne pouvez télécharger que 5 fichiers à la fois'
      });
    case 'LIMIT_UNEXPECTED_FILE':
      return res.status(400).json({
        error: 'Champ inattendu',
        message: 'Le nom du champ de fichier n\'est pas autorisé'
      });
    default:
      return res.status(400).json({
        error: 'Erreur de téléchargement',
        message: error.message
      });
    }
  }

  if (error.status === 400) {
    return res.status(400).json({
      error: 'Type de fichier non autorisé',
      message: error.message
    });
  }

  logger.error('Erreur d\'upload non gérée:', error);
  return res.status(500).json({
    error: 'Erreur serveur',
    message: 'Impossible de traiter le fichier'
  });
};

// Middleware pour nettoyer les fichiers temporaires en cas d'erreur
const cleanupFiles = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  const cleanup = () => {
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      files.forEach((file) => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            logger.debug(`Fichier temporaire supprimé: ${file.path}`);
          }
        } catch (error) {
          logger.error(`Impossible de supprimer le fichier temporaire ${file.path}:`, error);
        }
      });
    } else if (req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          logger.debug(`Fichier temporaire supprimé: ${req.file.path}`);
        }
      } catch (error) {
        logger.error(`Impossible de supprimer le fichier temporaire ${req.file.path}:`, error);
      }
    }
  };

  // Override des méthodes de réponse pour nettoyer en cas d'erreur
  res.send = function (data) {
    if (res.statusCode >= 400) {
      cleanup();
    }
    return originalSend.call(this, data);
  };

  res.json = function (data) {
    if (res.statusCode >= 400) {
      cleanup();
    }
    return originalJson.call(this, data);
  };

  next();
};

// Middleware de validation des fichiers uploadés
const validateUpload = (req, res, next) => {
  try {
    // Vérifier qu'au moins un fichier a été uploadé
    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        error: 'Aucun fichier fourni',
        message: 'Vous devez fournir au moins un fichier'
      });
    }

    // Valider les métadonnées des fichiers
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

    for (const file of files) {
      if (!file || !file.filename) {
        return res.status(400).json({
          error: 'Fichier invalide',
          message: 'Un des fichiers est corrompu ou invalide'
        });
      }

      // Log du fichier uploadé
      logger.info(`Fichier uploadé: ${file.originalname} -> ${file.filename}`, {
        size: file.size,
        mimetype: file.mimetype,
        userId: req.user?.id
      });
    }

    next();
  } catch (error) {
    logger.error('Erreur de validation d\'upload:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de valider le fichier uploadé'
    });
  }
};

// Exportation des middlewares configurés
module.exports = {
  // Upload d'un seul fichier
  single: (fieldName) => [
    cleanupFiles,
    upload.single(fieldName),
    handleUploadError,
    validateUpload
  ],

  // Upload de plusieurs fichiers avec le même nom de champ
  array: (fieldName, maxCount = 5) => [
    cleanupFiles,
    upload.array(fieldName, maxCount),
    handleUploadError,
    validateUpload
  ],

  // Upload de plusieurs fichiers avec des noms de champs différents
  fields: (fields) => [
    cleanupFiles,
    upload.fields(fields),
    handleUploadError,
    validateUpload
  ],

  // Upload générique sans validation (pour des cas spéciaux)
  raw: upload,

  // Middlewares utilitaires
  handleUploadError,
  cleanupFiles,
  validateUpload
};
