/**
 * GDPR Controller
 *
 * Endpoints pour conformité RGPD:
 * - Export données personnelles (Article 15)
 * - Suppression compte (Article 17 - Droit à l'oubli)
 * - Audit trail des actions
 */

const { PrismaClient } = require('@prisma/client');
const { hashRequestIP } = require('../services/ipDeduplicationService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Export toutes les données personnelles d'un utilisateur
 * GET /api/gdpr/export
 *
 * Rate limited: 3 exports/jour (voir rateLimiting.js)
 */
async function exportUserData(req, res) {
  const userId = req.user.id;
  const ipHash = req.ipHash || hashRequestIP(req);

  try {
    logger.info('GDPR data export requested', {
      userId,
      ipHash
    });

    // 1. Données utilisateur de base
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        savedAmount: true,
        monthlyGoal: true,
        streak: true,
        level: true,
        isPremium: true,
        subscriptionTier: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
        gamificationPoints: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // 2. UserProfile (préférences recettes)
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    // 3. Interactions recettes
    const recipeInteractions = await prisma.recipeInteraction.findMany({
      where: { userId },
      select: {
        id: true,
        recipeId: true,
        interactionType: true,
        createdAt: true,
        recipe: {
          select: {
            title: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Recettes favorites
    const favoriteRecipes = await prisma.favoriteRecipe.findMany({
      where: { userId },
      select: {
        recipeId: true,
        createdAt: true,
        recipe: {
          select: {
            title: true,
            category: true,
            difficulty: true
          }
        }
      }
    });

    // 5. Transactions financières
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        category: true,
        description: true,
        date: true,
        type: true,
        createdAt: true
      },
      orderBy: { date: 'desc' }
    });

    // 6. Dépenses
    const expenses = await prisma.expense.findMany({
      where: { userId },
      select: {
        id: true,
        category: true,
        subcategory: true,
        amount: true,
        description: true,
        date: true,
        merchant: true,
        createdAt: true
      },
      orderBy: { date: 'desc' }
    });

    // 7. Revenus
    const incomes = await prisma.income.findMany({
      where: { userId },
      select: {
        id: true,
        source: true,
        amount: true,
        description: true,
        date: true,
        isRecurring: true,
        createdAt: true
      },
      orderBy: { date: 'desc' }
    });

    // 8. Objectifs financiers
    const financialGoals = await prisma.financialGoal.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentAmount: true,
        deadline: true,
        category: true,
        status: true,
        createdAt: true
      }
    });

    // 9. Plans de repas
    const weeklyMealPlans = await prisma.weeklyMealPlan.findMany({
      where: { userId },
      select: {
        id: true,
        weekStartDate: true,
        weekEndDate: true,
        status: true,
        totalBudget: true,
        actualCost: true,
        mealsCount: true,
        createdAt: true
      },
      orderBy: { weekStartDate: 'desc' },
      take: 50 // Limiter à 50 derniers plans
    });

    // 10. Audit logs (actions GDPR passées)
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Construire le JSON d'export
    const exportData = {
      exportDate: new Date().toISOString(),
      dataSubject: {
        userId: user.id,
        email: user.email
      },
      personalData: {
        user,
        userProfile,
        statistics: {
          totalRecipeInteractions: recipeInteractions.length,
          totalFavoriteRecipes: favoriteRecipes.length,
          totalTransactions: transactions.length,
          totalExpenses: expenses.length,
          totalIncomes: incomes.length,
          totalFinancialGoals: financialGoals.length,
          totalMealPlans: weeklyMealPlans.length
        }
      },
      recipeData: {
        interactions: recipeInteractions,
        favorites: favoriteRecipes
      },
      financialData: {
        transactions,
        expenses,
        incomes,
        goals: financialGoals
      },
      mealPlanningData: {
        weeklyPlans: weeklyMealPlans
      },
      auditTrail: {
        logs: auditLogs
      },
      legalNotice: {
        regulation: 'RGPD/GDPR Article 15 - Droit d\'accès',
        controller: 'Pluqla',
        retentionPolicy: 'Les données sont conservées tant que le compte est actif',
        rights: [
          'Droit de rectification (Article 16)',
          'Droit à l\'effacement (Article 17)',
          'Droit à la limitation du traitement (Article 18)',
          'Droit à la portabilité (Article 20)'
        ]
      }
    };

    // Logger l'export dans audit trail
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'data_export',
        entityType: 'User',
        entityId: userId,
        metadata: {
          ipHash,
          exportSize: JSON.stringify(exportData).length,
          userAgent: req.headers['user-agent']
        }
      }
    });

    // Retourner le JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="pluqla-export-${userId}-${Date.now()}.json"`);
    res.status(200).json(exportData);

    logger.info('GDPR data export completed', {
      userId,
      dataSize: JSON.stringify(exportData).length
    });

  } catch (error) {
    logger.error('Error exporting user data', {
      userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Export failed',
      message: 'Une erreur est survenue lors de l\'export de vos données.'
    });
  }
}

/**
 * Suppression complète du compte utilisateur (Droit à l'oubli)
 * DELETE /api/gdpr/delete-account
 *
 * Nécessite confirmation password
 */
async function deleteUserAccount(req, res) {
  const userId = req.user.id;
  const { password, confirmation } = req.body;
  const ipHash = req.ipHash || hashRequestIP(req);

  try {
    // 1. Vérification confirmation
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Vous devez confirmer la suppression en écrivant "DELETE MY ACCOUNT"'
      });
    }

    // 2. Vérifier le password
    const bcrypt = require('bcryptjs');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, email: true }
    });

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Mot de passe incorrect'
      });
    }

    logger.warn('Account deletion requested', {
      userId,
      email: user.email,
      ipHash
    });

    // 3. Logger l'action AVANT suppression
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'data_deletion',
        entityType: 'User',
        entityId: userId,
        metadata: {
          ipHash,
          userAgent: req.headers['user-agent'],
          deletionDate: new Date().toISOString()
        }
      }
    });

    // 4. Anonymiser les données au lieu de supprimer complètement
    // (conformité légale: garder certaines données pour comptabilité)
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.pluqla.com`,
        name: 'Utilisateur supprimé',
        password: 'DELETED',
        status: 'deleted',
        emailVerified: false,
        emailVerificationToken: null
      }
    });

    // 5. Supprimer les données personnelles sensibles
    await Promise.all([
      // Supprimer UserProfile
      prisma.userProfile.deleteMany({ where: { userId } }),

      // Supprimer interactions recettes
      prisma.recipeInteraction.deleteMany({ where: { userId } }),

      // Supprimer favoris
      prisma.favoriteRecipe.deleteMany({ where: { userId } }),

      // Garder transactions/expenses pour comptabilité légale mais anonymiser
      // (requis pour audits fiscaux pendant 7 ans en France)
      prisma.transaction.updateMany({
        where: { userId },
        data: { description: 'Anonymisé' }
      }),

      prisma.expense.updateMany({
        where: { userId },
        data: { description: 'Anonymisé', merchant: 'Anonymisé' }
      }),

      // Supprimer refresh tokens
      prisma.refreshToken.deleteMany({ where: { userId } }),

      // Supprimer sessions
      prisma.betterAuthSession.deleteMany({ where: { userId } })
    ]);

    logger.info('Account deleted successfully', {
      userId,
      anonymized: true
    });

    res.status(200).json({
      success: true,
      message: 'Votre compte a été supprimé avec succès. Vos données personnelles ont été effacées.',
      note: 'Certaines données financières ont été anonymisées pour conformité légale (obligations comptables).'
    });

  } catch (error) {
    logger.error('Error deleting user account', {
      userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Deletion failed',
      message: 'Une erreur est survenue lors de la suppression de votre compte.'
    });
  }
}

/**
 * Récupérer l'audit trail d'un utilisateur
 * GET /api/gdpr/audit-trail
 */
async function getAuditTrail(req, res) {
  const userId = req.user.id;

  try {
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        changes: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.status(200).json({
      userId,
      totalLogs: auditLogs.length,
      logs: auditLogs
    });

  } catch (error) {
    logger.error('Error fetching audit trail', {
      userId,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch audit trail'
    });
  }
}

/**
 * Demander la rectification de données (Article 16)
 * POST /api/gdpr/request-correction
 */
async function requestDataCorrection(req, res) {
  const userId = req.user.id;
  const { field, currentValue, requestedValue, reason } = req.body;
  const ipHash = req.ipHash || hashRequestIP(req);

  try {
    // Logger la demande de rectification
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'correction_request',
        entityType: 'User',
        entityId: userId,
        changes: {
          field,
          currentValue,
          requestedValue,
          reason
        },
        metadata: {
          ipHash,
          status: 'pending_review'
        }
      }
    });

    logger.info('Data correction requested', {
      userId,
      field,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Votre demande de rectification a été enregistrée. Elle sera traitée sous 72 heures.'
    });

  } catch (error) {
    logger.error('Error requesting data correction', {
      userId,
      error: error.message
    });

    res.status(500).json({
      error: 'Request failed'
    });
  }
}

module.exports = {
  exportUserData,
  deleteUserAccount,
  getAuditTrail,
  requestDataCorrection
};
