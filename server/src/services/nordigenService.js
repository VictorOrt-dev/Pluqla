/**
 * Nordigen/GoCardless Bank Account Data Service
 * Free Open Banking API integration for bank account connections
 */

const NordigenClient = require('nordigen-node');
const prisma = require('../lib/prisma');
const crypto = require('crypto');

class NordigenService {
  constructor() {
    this.client = new NordigenClient({
      secretId: process.env.NORDIGEN_SECRET_ID,
      secretKey: process.env.NORDIGEN_SECRET_KEY,
    });
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  /**
   * Get or refresh access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.tokenCache && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.tokenCache;
    }

    try {
      const tokenData = await this.client.generateToken();
      this.tokenCache = tokenData.access;
      // Nordigen tokens expire in 24 hours (86400 seconds)
      this.tokenExpiry = new Date(Date.now() + (tokenData.access_expires - 60) * 1000);
      return this.tokenCache;
    } catch (error) {
      console.error('[Nordigen] Token generation failed:', error.message);
      throw new Error('Failed to authenticate with Nordigen');
    }
  }

  /**
   * Get list of supported banks by country
   * @param {string} country - ISO 3166 two-letter country code (e.g., 'FR', 'DE', 'GB')
   */
  async getInstitutions(country = 'FR') {
    try {
      await this.getAccessToken();
      const institutions = await this.client.institution.getInstitutions({ country });

      return institutions.map(inst => ({
        id: inst.id,
        name: inst.name,
        bic: inst.bic,
        logo: inst.logo,
        countries: inst.countries,
        transactionTotalDays: inst.transaction_total_days,
      }));
    } catch (error) {
      console.error('[Nordigen] Get institutions failed:', error.message);
      throw new Error('Failed to fetch banks list');
    }
  }

  /**
   * Create requisition (bank connection authorization link)
   * @param {string} institutionId - Bank institution ID from Nordigen
   * @param {string} userId - User ID from Pluqla
   * @param {string} redirectUrl - URL to redirect after authorization
   */
  async createRequisition(institutionId, userId, redirectUrl = process.env.NORDIGEN_REDIRECT_URL) {
    try {
      await this.getAccessToken();

      // Create a reference ID to link requisition to our user
      const reference = crypto.randomBytes(16).toString('hex');

      const requisition = await this.client.initSession({
        redirectUrl,
        institutionId,
        referenceId: reference,
        userLanguage: 'FR',
        // Store userId in reference for callback
        reference: JSON.stringify({ userId, timestamp: Date.now() }),
      });

      // Store requisition metadata
      await prisma.oauthState.create({
        data: {
          state: requisition.id,
          data: JSON.stringify({
            userId,
            institutionId,
            reference,
            createdAt: new Date().toISOString(),
          }),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
      });

      return {
        requisitionId: requisition.id,
        authLink: requisition.link,
        reference,
      };
    } catch (error) {
      console.error('[Nordigen] Create requisition failed:', error.message);
      throw new Error('Failed to create bank authorization link');
    }
  }

  /**
   * Get requisition details and accounts
   * @param {string} requisitionId - Requisition ID from Nordigen
   */
  async getRequisition(requisitionId) {
    try {
      await this.getAccessToken();
      const requisition = await this.client.requisition.getRequisitionById(requisitionId);

      return {
        id: requisition.id,
        status: requisition.status,
        institutionId: requisition.institution_id,
        accounts: requisition.accounts || [],
        link: requisition.link,
        created: requisition.created,
      };
    } catch (error) {
      console.error('[Nordigen] Get requisition failed:', error.message);
      throw new Error('Failed to fetch bank authorization status');
    }
  }

  /**
   * Get account details
   * @param {string} accountId - Account ID from Nordigen
   */
  async getAccountDetails(accountId) {
    try {
      await this.getAccessToken();
      const account = this.client.account(accountId);

      const [metadata, balances, details] = await Promise.all([
        account.getMetadata(),
        account.getBalances(),
        account.getDetails(),
      ]);

      return {
        accountId,
        iban: details.account?.iban || null,
        name: details.account?.name || details.account?.product || 'Compte bancaire',
        currency: details.account?.currency || 'EUR',
        balances: balances.balances.map(b => ({
          amount: parseFloat(b.balanceAmount?.amount || 0),
          type: b.balanceType,
          currency: b.balanceAmount?.currency || 'EUR',
        })),
        institution: metadata.institution_id,
      };
    } catch (error) {
      console.error('[Nordigen] Get account details failed:', error.message);
      throw new Error('Failed to fetch account details');
    }
  }

  /**
   * Get account transactions
   * @param {string} accountId - Account ID from Nordigen
   * @param {Date} dateFrom - Start date
   * @param {Date} dateTo - End date
   */
  async getTransactions(accountId, dateFrom = null, dateTo = null) {
    try {
      await this.getAccessToken();
      const account = this.client.account(accountId);

      // Default to last 90 days if no dates provided
      if (!dateFrom) {
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 90);
      }
      if (!dateTo) {
        dateTo = new Date();
      }

      const formatDate = (date) => date.toISOString().split('T')[0];

      const transactions = await account.getTransactions({
        dateFrom: formatDate(dateFrom),
        dateTo: formatDate(dateTo),
      });

      const booked = transactions.transactions?.booked || [];
      const pending = transactions.transactions?.pending || [];

      return {
        booked: booked.map(t => this.formatTransaction(t, 'booked')),
        pending: pending.map(t => this.formatTransaction(t, 'pending')),
      };
    } catch (error) {
      console.error('[Nordigen] Get transactions failed:', error.message);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Format Nordigen transaction to Pluqla format
   */
  formatTransaction(transaction, status) {
    const amount = parseFloat(transaction.transactionAmount?.amount || 0);
    const isCredit = amount > 0;

    return {
      externalId: transaction.transactionId || transaction.internalTransactionId,
      amount: Math.abs(amount),
      description: transaction.remittanceInformationUnstructured ||
                   transaction.creditorName ||
                   transaction.debtorName ||
                   'Transaction',
      date: new Date(transaction.bookingDate || transaction.valueDate),
      type: isCredit ? 'income' : 'expense',
      status,
      merchant: transaction.creditorName || transaction.debtorName || null,
      category: this.categorizeTransaction(transaction),
      metadata: JSON.stringify({
        currency: transaction.transactionAmount?.currency,
        creditorAccount: transaction.creditorAccount?.iban,
        debtorAccount: transaction.debtorAccount?.iban,
      }),
    };
  }

  /**
   * Simple transaction categorization
   * Can be enhanced with AI or rule-based categorization
   */
  categorizeTransaction(transaction) {
    const description = (transaction.remittanceInformationUnstructured ||
                        transaction.creditorName ||
                        transaction.debtorName || '').toLowerCase();

    // Simple keyword matching
    if (description.includes('carrefour') || description.includes('casino') || description.includes('leclerc')) {
      return 'alimentation';
    }
    if (description.includes('essence') || description.includes('total') || description.includes('uber')) {
      return 'transport';
    }
    if (description.includes('netflix') || description.includes('spotify') || description.includes('cinema')) {
      return 'loisirs';
    }
    if (description.includes('loyer') || description.includes('edf') || description.includes('eau')) {
      return 'logement';
    }
    if (description.includes('salaire') || description.includes('virement')) {
      return 'salary';
    }

    return 'other';
  }

  /**
   * Sync account data (balance + transactions)
   * @param {string} accountId - Pluqla account ID
   */
  async syncAccount(accountId) {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { user: true },
      });

      if (!account || !account.nordigenAccountId) {
        throw new Error('Account not found or not linked to Nordigen');
      }

      // Get fresh account details
      const accountDetails = await this.getAccountDetails(account.nordigenAccountId);

      // Get transactions from last sync or last 90 days
      const dateFrom = account.lastSyncAt || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const transactionsData = await this.getTransactions(account.nordigenAccountId, dateFrom);

      // Update account balance
      const currentBalance = accountDetails.balances.find(b => b.type === 'expected' || b.type === 'interimAvailable');

      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: currentBalance?.amount || account.balance,
          lastSyncAt: new Date(),
          syncError: null,
        },
      });

      // Save transactions
      const allTransactions = [...transactionsData.booked, ...transactionsData.pending];

      for (const transaction of allTransactions) {
        // Check if transaction already exists
        const exists = await prisma.accountTransaction.findFirst({
          where: {
            accountId,
            externalId: transaction.externalId,
          },
        });

        if (!exists) {
          await prisma.accountTransaction.create({
            data: {
              accountId,
              ...transaction,
            },
          });
        }
      }

      return {
        success: true,
        balance: currentBalance?.amount || account.balance,
        newTransactions: allTransactions.length,
      };
    } catch (error) {
      // Log sync error
      await prisma.account.update({
        where: { id: accountId },
        data: {
          syncError: error.message,
        },
      });

      console.error('[Nordigen] Sync account failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete requisition (disconnect bank)
   * @param {string} requisitionId - Requisition ID
   */
  async deleteRequisition(requisitionId) {
    try {
      await this.getAccessToken();
      await this.client.requisition.deleteRequisition(requisitionId);
      return { success: true };
    } catch (error) {
      console.error('[Nordigen] Delete requisition failed:', error.message);
      throw new Error('Failed to disconnect bank account');
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getNordigenService: () => {
    if (!instance) {
      instance = new NordigenService();
    }
    return instance;
  },
  NordigenService,
};
