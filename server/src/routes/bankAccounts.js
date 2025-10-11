/**
 * Bank Accounts Routes - Nordigen/GoCardless Integration
 * Handles bank connection, account syncing, and transaction retrieval
 */

const express = require('express');
const router = express.Router();
const { getNordigenService } = require('../services/nordigenService');
const prisma = require('../lib/prisma');
// const { authenticateJWT } = require('../middleware/auth');

// All routes require authentication
// TODO: Réactiver authenticateJWT quand middleware sera créé
// router.use(authenticateJWT);

/**
 * GET /api/bank-accounts/institutions
 * Get list of supported banks by country
 */
router.get('/institutions', async (req, res) => {
  try {
    const { country = 'FR' } = req.query;
    const nordigen = getNordigenService();
    const institutions = await nordigen.getInstitutions(country);

    res.json({
      success: true,
      data: institutions,
      count: institutions.length,
    });
  } catch (error) {
    console.error('[BankAccounts] Get institutions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch banks list',
      message: error.message,
    });
  }
});

/**
 * POST /api/bank-accounts/connect
 * Create bank connection authorization link
 */
router.post('/connect', async (req, res) => {
  try {
    const { institutionId } = req.body;
    const userId = req.user.userId;

    if (!institutionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: institutionId',
      });
    }

    const nordigen = getNordigenService();
    const requisition = await nordigen.createRequisition(
      institutionId,
      userId,
      process.env.NORDIGEN_REDIRECT_URL
    );

    res.json({
      success: true,
      data: {
        authLink: requisition.authLink,
        requisitionId: requisition.requisitionId,
      },
    });
  } catch (error) {
    console.error('[BankAccounts] Connect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bank authorization',
      message: error.message,
    });
  }
});

/**
 * POST /api/bank-accounts/callback
 * Handle callback after user authorizes bank connection
 */
router.post('/callback', async (req, res) => {
  try {
    const { requisitionId } = req.body;
    const userId = req.user.userId;

    if (!requisitionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: requisitionId',
      });
    }

    const nordigen = getNordigenService();

    // Get requisition details
    const requisition = await nordigen.getRequisition(requisitionId);

    if (requisition.status !== 'LN') {
      return res.status(400).json({
        success: false,
        error: 'Bank authorization not completed',
        status: requisition.status,
      });
    }

    // Get account IDs from requisition
    const accountIds = requisition.accounts || [];

    if (accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No accounts found in authorization',
      });
    }

    // Fetch details for each account and create in database
    const createdAccounts = [];

    for (const nordigenAccountId of accountIds) {
      const accountDetails = await nordigen.getAccountDetails(nordigenAccountId);

      // Check if account already exists
      const existing = await prisma.account.findFirst({
        where: {
          userId,
          nordigenAccountId,
        },
      });

      if (existing) {
        createdAccounts.push(existing);
        continue;
      }

      // Create new account
      const account = await prisma.account.create({
        data: {
          userId,
          name: accountDetails.name,
          type: 'checking', // Default, can be enhanced
          provider: 'nordigen',
          balance: accountDetails.balances[0]?.amount || 0,
          currency: accountDetails.currency,
          iban: accountDetails.iban,
          nordigenAccountId,
          nordigenRequisitionId: requisitionId,
          nordigenInstitutionId: requisition.institutionId,
          isActive: true,
          lastSyncAt: new Date(),
        },
      });

      // Sync initial transactions
      try {
        await nordigen.syncAccount(account.id);
      } catch (syncError) {
        console.error('[BankAccounts] Initial sync failed:', syncError);
        // Continue even if sync fails
      }

      createdAccounts.push(account);
    }

    res.json({
      success: true,
      data: {
        accounts: createdAccounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          iban: acc.iban,
          balance: acc.balance,
          currency: acc.currency,
          provider: acc.provider,
        })),
      },
    });
  } catch (error) {
    console.error('[BankAccounts] Callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete bank connection',
      message: error.message,
    });
  }
});

/**
 * GET /api/bank-accounts
 * Get all connected bank accounts for user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const accounts = await prisma.account.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        provider: acc.provider,
        balance: acc.balance,
        currency: acc.currency,
        iban: acc.iban,
        lastSyncAt: acc.lastSyncAt,
        syncError: acc.syncError,
      })),
    });
  } catch (error) {
    console.error('[BankAccounts] Get accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bank accounts',
      message: error.message,
    });
  }
});

/**
 * POST /api/bank-accounts/:accountId/sync
 * Manually sync account data
 */
router.post('/:accountId/sync', async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const nordigen = getNordigenService();
    const result = await nordigen.syncAccount(accountId);

    res.json({
      success: true,
      data: {
        balance: result.balance,
        newTransactions: result.newTransactions,
        lastSyncAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[BankAccounts] Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync account',
      message: error.message,
    });
  }
});

/**
 * GET /api/bank-accounts/:accountId/transactions
 * Get transactions for a specific account
 */
router.get('/:accountId/transactions', async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    const transactions = await prisma.accountTransaction.findMany({
      where: {
        accountId,
      },
      orderBy: {
        date: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.accountTransaction.count({
      where: { accountId },
    });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('[BankAccounts] Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/bank-accounts/:accountId
 * Disconnect and delete bank account
 */
router.delete('/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.userId;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Delete requisition from Nordigen if exists
    if (account.nordigenRequisitionId) {
      try {
        const nordigen = getNordigenService();
        await nordigen.deleteRequisition(account.nordigenRequisitionId);
      } catch (error) {
        console.error('[BankAccounts] Failed to delete Nordigen requisition:', error);
        // Continue with local deletion even if Nordigen fails
      }
    }

    // Soft delete account
    await prisma.account.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Bank account disconnected successfully',
    });
  } catch (error) {
    console.error('[BankAccounts] Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect bank account',
      message: error.message,
    });
  }
});

module.exports = router;
