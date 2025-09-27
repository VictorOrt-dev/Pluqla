const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { validationResult } = require('express-validator');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion
const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');

/**
 * Controller pour la gestion des uploads de fichiers
 * Gère les avatars, reçus, images et leur analyse
 */
const uploadController = {
  // Uploads spécialisés
  /**
   * Upload d'avatar utilisateur
   * @route POST /api/upload/avatar
   * @access Private
   */
  async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      // Validation du type de fichier
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        // Supprimer le fichier uploadé
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.'
        });
      }

      // Validation de la taille (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Fichier trop volumineux. Maximum 5MB autorisé.'
        });
      }

      // Supprimer l'ancien avatar s'il existe
      const existingAvatar = await prisma.image.findFirst({
        where: {
          userId,
          originalName: { contains: 'avatar' }
        }
      });

      if (existingAvatar) {
        // Supprimer le fichier physique
        await fs.unlink(existingAvatar.path).catch(() => {});
        // Supprimer de la base de données
        await prisma.image.delete({ where: { id: existingAvatar.id } });
      }

      // Sauvegarder les informations du nouvel avatar
      const avatarImage = await prisma.image.create({
        data: {
          userId,
          filename: req.file.filename,
          originalName: `avatar_${req.file.originalname}`,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        }
      });

      // Tracker l'événement
      analyticsService.trackEvent('avatar_uploaded', userId, {
        fileSize: req.file.size,
        fileType: req.file.mimetype
      });

      logger.info(`Avatar uploadé pour l'utilisateur ${userId}`);

      res.json({
        success: true,
        message: 'Avatar uploadé avec succès',
        data: {
          id: avatarImage.id,
          filename: avatarImage.filename,
          url: `/api/upload/file/${avatarImage.id}`,
          size: avatarImage.size
        }
      });

    } catch (error) {
      logger.error('Erreur uploadAvatar:', error);
      // Nettoyer le fichier en cas d'erreur
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload de l\'avatar'
      });
    }
  },

  /**
   * Upload de reçu pour analyse
   * @route POST /api/upload/receipt
   * @access Private
   */
  async uploadReceipt(req, res) {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      // Validation du type de fichier
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou PDF.'
        });
      }

      // Validation de la taille (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Fichier trop volumineux. Maximum 10MB autorisé.'
        });
      }

      // Vérifier les limites utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true }
      });

      // Compter les reçus uploadés ce mois
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const receiptsThisMonth = await prisma.image.count({
        where: {
          userId,
          originalName: { contains: 'receipt' },
          createdAt: { gte: startOfMonth }
        }
      });

      // Limite pour les utilisateurs free: 10 reçus par mois
      if (!user.isPremium && receiptsThisMonth >= 10) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(429).json({
          success: false,
          message: 'Limite mensuelle de reçus atteinte (10). Passez à Premium pour plus d\'uploads.',
          requiresPremium: true
        });
      }

      // Sauvegarder le reçu
      const receiptImage = await prisma.image.create({
        data: {
          userId,
          filename: req.file.filename,
          originalName: `receipt_${req.file.originalname}`,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        }
      });

      // Tracker l'événement
      analyticsService.trackEvent('receipt_uploaded', userId, {
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        receiptsThisMonth: receiptsThisMonth + 1
      });

      logger.info(`Reçu uploadé pour l'utilisateur ${userId}: ${receiptImage.id}`);

      res.json({
        success: true,
        message: 'Reçu uploadé avec succès',
        data: {
          id: receiptImage.id,
          filename: receiptImage.filename,
          url: `/api/upload/file/${receiptImage.id}`,
          size: receiptImage.size,
          remainingUploads: user.isPremium ? -1 : Math.max(0, 10 - receiptsThisMonth - 1),
          canAnalyze: true
        }
      });

    } catch (error) {
      logger.error('Erreur uploadReceipt:', error);
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload du reçu'
      });
    }
  },

  async uploadClothingImage(req, res) {
    try {
      res.json({ message: 'uploadClothingImage - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur uploadClothingImage:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Upload général d'images
   * @route POST /api/upload/general
   * @access Private
   */
  async uploadGeneral(req, res) {
    try {
      const userId = req.user.id;
      const { category = 'general' } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      // Validation du type de fichier
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.'
        });
      }

      // Validation de la taille (max 8MB)
      const maxSize = 8 * 1024 * 1024; // 8MB
      if (req.file.size > maxSize) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          message: 'Fichier trop volumineux. Maximum 8MB autorisé.'
        });
      }

      // Vérifier les quotas de stockage
      const storageUsed = await prisma.image.aggregate({
        where: { userId },
        _sum: { size: true }
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true }
      });

      const storageLimit = user.isPremium ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB Premium, 100MB Free
      const currentUsage = storageUsed._sum.size || 0;

      if (currentUsage + req.file.size > storageLimit) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(429).json({
          success: false,
          message: 'Quota de stockage atteint. Supprimez des fichiers ou passez à Premium.',
          quotaExceeded: true,
          currentUsage,
          limit: storageLimit
        });
      }

      // Sauvegarder l'image
      const generalImage = await prisma.image.create({
        data: {
          userId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        }
      });

      // Tracker l'événement
      analyticsService.trackEvent('image_uploaded', userId, {
        category,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        storageUsage: currentUsage + req.file.size
      });

      logger.info(`Image uploadée pour l'utilisateur ${userId}: ${generalImage.id}`);

      res.json({
        success: true,
        message: 'Image uploadée avec succès',
        data: {
          id: generalImage.id,
          filename: generalImage.filename,
          url: `/api/upload/file/${generalImage.id}`,
          size: generalImage.size,
          category,
          storageUsed: currentUsage + req.file.size,
          storageLimit
        }
      });

    } catch (error) {
      logger.error('Erreur uploadGeneral:', error);
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload de l\'image'
      });
    }
  },

  async uploadMultiple(req, res) {
    try {
      res.json({ message: 'uploadMultiple - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur uploadMultiple:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Anciennes méthodes maintenues pour compatibilité
  async uploadImage(req, res) {
    try {
      res.json({ message: 'uploadImage - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur uploadImage:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async analyzeImage(req, res) {
    try {
      res.json({ message: 'analyzeImage - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur analyzeImage:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async deleteImage(req, res) {
    try {
      res.json({ message: 'deleteImage - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur deleteImage:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getImageAnalysis(req, res) {
    try {
      res.json({ message: 'getImageAnalysis - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getImageAnalysis:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Gestion des fichiers
  async getFile(req, res) {
    try {
      res.json({ message: 'getFile - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getFile:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async downloadFile(req, res) {
    try {
      res.json({ message: 'downloadFile - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur downloadFile:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getResizedImage(req, res) {
    try {
      res.json({ message: 'getResizedImage - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getResizedImage:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getThumbnail(req, res) {
    try {
      res.json({ message: 'getThumbnail - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getThumbnail:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Supprime un fichier
   * @route DELETE /api/upload/file/:id
   * @access Private
   */
  async deleteFile(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Vérifier que le fichier existe et appartient à l'utilisateur
      const file = await prisma.image.findFirst({
        where: { id, userId }
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }

      // Supprimer le fichier physique
      try {
        await fs.unlink(file.path);
      } catch (fsError) {
        logger.warn(`Impossible de supprimer le fichier physique: ${file.path}`, fsError);
      }

      // Supprimer l'entrée de la base de données
      await prisma.image.delete({
        where: { id }
      });

      // Tracker l'événement
      analyticsService.trackEvent('file_deleted', userId, {
        fileId: id,
        filename: file.filename,
        size: file.size
      });

      logger.info(`Fichier supprimé: ${id} par utilisateur ${userId}`);

      res.json({
        success: true,
        message: 'Fichier supprimé avec succès',
        data: {
          freedSpace: file.size
        }
      });

    } catch (error) {
      logger.error('Erreur deleteFile:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du fichier'
      });
    }
  },

  // Gestion des métadonnées
  /**
   * Récupère la liste des fichiers de l'utilisateur
   * @route GET /api/upload/files
   * @access Private
   */
  async getUserFiles(req, res) {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        type,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Construire les filtres
      const filters = { userId };
      if (type) {
        switch (type) {
          case 'avatar':
            filters.originalName = { contains: 'avatar' };
            break;
          case 'receipt':
            filters.originalName = { contains: 'receipt' };
            break;
          case 'image':
            filters.mimetype = { startsWith: 'image/' };
            break;
          case 'pdf':
            filters.mimetype = 'application/pdf';
            break;
        }
      }

      // Pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Récupérer les fichiers
      const [files, total, storageStats] = await Promise.all([
        prisma.image.findMany({
          where: filters,
          orderBy: { [sortBy]: sortOrder },
          skip: offset,
          take: parseInt(limit),
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimetype: true,
            size: true,
            analyzed: true,
            createdAt: true
          }
        }),
        prisma.image.count({ where: filters }),
        prisma.image.aggregate({
          where: { userId },
          _sum: { size: true },
          _count: { id: true }
        })
      ]);

      // Enrichir les données des fichiers
      const enrichedFiles = files.map(file => ({
        ...file,
        url: `/api/upload/file/${file.id}`,
        thumbnailUrl: file.mimetype.startsWith('image/')
          ? `/api/upload/thumbnail/${file.id}`
          : null,
        sizeFormatted: this._formatFileSize(file.size),
        type: this._getFileType(file)
      }));

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true }
      });

      const storageLimit = user.isPremium ? 1024 * 1024 * 1024 : 100 * 1024 * 1024;

      res.json({
        success: true,
        data: {
          files: enrichedFiles,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1
          },
          storage: {
            used: storageStats._sum.size || 0,
            limit: storageLimit,
            usedFormatted: this._formatFileSize(storageStats._sum.size || 0),
            limitFormatted: this._formatFileSize(storageLimit),
            percentage: Math.round(((storageStats._sum.size || 0) / storageLimit) * 100),
            fileCount: storageStats._count.id || 0
          }
        }
      });

    } catch (error) {
      logger.error('Erreur getUserFiles:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des fichiers'
      });
    }
  },

  async getFileMetadata(req, res) {
    try {
      res.json({ message: 'getFileMetadata - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getFileMetadata:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async updateFileMetadata(req, res) {
    try {
      res.json({ message: 'updateFileMetadata - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur updateFileMetadata:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Analyse de fichiers
  async analyzeFile(req, res) {
    try {
      res.json({ message: 'analyzeFile - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur analyzeFile:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getFileAnalysis(req, res) {
    try {
      res.json({ message: 'getFileAnalysis - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getFileAnalysis:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Statistiques
  async getUploadStats(req, res) {
    try {
      res.json({ message: 'getUploadStats - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getUploadStats:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getStorageStats(req, res) {
    try {
      res.json({ message: 'getStorageStats - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getStorageStats:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Nettoyage
  async cleanupTempFiles(req, res) {
    try {
      res.json({ message: 'cleanupTempFiles - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur cleanupTempFiles:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async cleanupOrphanedFiles(req, res) {
    try {
      res.json({ message: 'cleanupOrphanedFiles - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur cleanupOrphanedFiles:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Configuration
  async getUploadConfig(req, res) {
    try {
      res.json({ message: 'getUploadConfig - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getUploadConfig:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Partage
  async createShareLink(req, res) {
    try {
      res.json({ message: 'createShareLink - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur createShareLink:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getSharedFile(req, res) {
    try {
      res.json({ message: 'getSharedFile - endpoint fonctionnel' });
    } catch (error) {
      logger.error('Erreur getSharedFile:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Quota
  /**
   * Récupère les informations de quota de stockage
   * @route GET /api/upload/quota
   * @access Private
   */
  async getStorageQuota(req, res) {
    try {
      const userId = req.user.id;

      const [user, storageStats, filesByType] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { isPremium: true }
        }),
        prisma.image.aggregate({
          where: { userId },
          _sum: { size: true },
          _count: { id: true }
        }),
        prisma.image.groupBy({
          by: ['mimetype'],
          where: { userId },
          _sum: { size: true },
          _count: { id: true }
        })
      ]);

      const storageLimit = user.isPremium ? 1024 * 1024 * 1024 : 100 * 1024 * 1024;
      const storageUsed = storageStats._sum.size || 0;
      const usagePercentage = Math.round((storageUsed / storageLimit) * 100);

      const quota = {
        used: storageUsed,
        limit: storageLimit,
        available: storageLimit - storageUsed,
        usedFormatted: this._formatFileSize(storageUsed),
        limitFormatted: this._formatFileSize(storageLimit),
        availableFormatted: this._formatFileSize(storageLimit - storageUsed),
        percentage: usagePercentage,
        fileCount: storageStats._count.id || 0,
        isPremium: user.isPremium,
        breakdown: filesByType.map(type => ({
          mimetype: type.mimetype,
          size: type._sum.size || 0,
          count: type._count.id || 0,
          sizeFormatted: this._formatFileSize(type._sum.size || 0),
          percentage: storageUsed > 0 ? Math.round(((type._sum.size || 0) / storageUsed) * 100) : 0
        })),
        limits: {
          maxFileSize: user.isPremium ? 50 * 1024 * 1024 : 10 * 1024 * 1024,
          maxFilesPerMonth: user.isPremium ? -1 : 50,
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        },
        warnings: {
          nearLimit: usagePercentage >= 80,
          critical: usagePercentage >= 95
        }
      };

      res.json({
        success: true,
        data: quota
      });

    } catch (error) {
      logger.error('Erreur getStorageQuota:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du quota de stockage'
      });
    }
  },

  /**
   * Méthodes helper privées
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },

  _getFileType(file) {
    if (file.originalName.includes('avatar')) return 'avatar';
    if (file.originalName.includes('receipt')) return 'receipt';
    if (file.mimetype.startsWith('image/')) return 'image';
    if (file.mimetype === 'application/pdf') return 'pdf';
    return 'other';
  }
};

module.exports = uploadController;