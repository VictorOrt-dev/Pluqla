const axios = require('axios');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion in bank integrations
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

/**
 * Bank Integration Service
 * Handles secure connection to bank APIs and data synchronization
 * Supports multiple providers with fallback to manual entry
 */
class BankIntegrationService {
  constructor() {
    this.encryptionKey = process.env.BANK_ENCRYPTION_KEY || crypto.randomBytes(32);
    this.supportedProviders = {
      'bnp_paribas': {
        name: 'BNP Paribas',
        apiUrl: process.env.BNP_API_URL,
        authType: 'oauth2',
        features: ['accounts', 'transactions', 'balances']
      },
      'credit_agricole': {
        name: 'Crédit Agricole',
        apiUrl: process.env.CA_API_URL,
        authType: 'oauth2',
        features: ['accounts', 'transactions', 'balances']
      },
      'bridge_api': {
        name: 'Bridge API (Multi-bank)',
        apiUrl: 'https://api.bridgeapi.io',
        authType: 'api_key',
        features: ['accounts', 'transactions', 'balances', 'investments']
      },
      'budget_insight': {
        name: 'Budget Insight (Aggregator)',
        apiUrl: 'https://api.budget-insight.com',
        authType: 'oauth2',
        features: ['accounts', 'transactions', 'balances', 'investments']
      }
    };
  }

  /**
   * Connect a new bank account via API
   */
  async connectAccount(userId, provider, credentials, accountInfo) {
    try {
      // Validate provider
      if (!this.supportedProviders[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // Encrypt sensitive credentials
      const encryptedCredentials = this.encryptCredentials(credentials);

      // Test connection first
      const connectionTest = await this.testConnection(provider, credentials);
      if (!connectionTest.success) {
        throw new Error(`Connection failed: ${connectionTest.error}`);
      }

      // Fetch account data
      const accountData = await this.fetchAccountData(provider, credentials);

      // Create account in database
      const account = await prisma.account.create({
        data: {
          userId,
          name: accountInfo.name || accountData.name,
          type: this.mapAccountType(accountData.type),
          subtype: accountData.subtype,
          provider,
          balance: accountData.balance,
          currency: accountData.currency || 'EUR',
          encryptedCredentials,
          accountNumber: this.maskAccountNumber(accountData.accountNumber),
          lastSyncAt: new Date(),
          metadata: JSON.stringify({
            externalId: accountData.id,
            bankName: accountData.bankName,
            iban: accountData.iban ? this.maskIban(accountData.iban) : null
          })
        }
      });

      logger.info(`Bank account connected: ${account.id} for user ${userId} via ${provider}`);
      return { success: true, account };

    } catch (error) {
      logger.error('Bank account connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchronize account data from bank API
   */
  async syncAccount(accountId) {
    try {
      const account = await prisma.account.findUnique({
        where: { id: accountId }
      });

      if (!account || account.provider === 'manual') {
        return { success: false, error: 'Account not found or is manual' };
      }

      // Decrypt credentials
      const credentials = this.decryptCredentials(account.encryptedCredentials);

      // Fetch latest data
      const [accountData, transactions] = await Promise.all([
        this.fetchAccountData(account.provider, credentials),
        this.fetchTransactions(account.provider, credentials, account.lastSyncAt)
      ]);

      // Update account balance
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: accountData.balance,
          lastSyncAt: new Date(),
          syncError: null
        }
      });

      // Process new transactions
      const processedTransactions = await this.processTransactions(accountId, transactions);

      // Update assets if this is an investment account
      if (account.type === 'investment' && accountData.positions) {
        await this.updateInvestmentPositions(account.userId, accountId, accountData.positions);
      }

      logger.info(`Account synced: ${accountId}, ${processedTransactions.length} new transactions`);
      return {
        success: true,
        transactionsCount: processedTransactions.length,
        newBalance: accountData.balance
      };

    } catch (error) {
      logger.error(`Account sync failed for ${accountId}:`, error);

      // Update sync error in database
      await prisma.account.update({
        where: { id: accountId },
        data: { syncError: error.message }
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all active accounts for a user
   */
  async syncAllUserAccounts(userId) {
    try {
      const accounts = await prisma.account.findMany({
        where: {
          userId,
          isActive: true,
          provider: { not: 'manual' }
        }
      });

      const results = await Promise.allSettled(
        accounts.map(account => this.syncAccount(account.id))
      );

      const summary = {
        total: accounts.length,
        successful: 0,
        failed: 0,
        totalTransactions: 0,
        errors: []
      };

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          summary.successful++;
          summary.totalTransactions += result.value.transactionsCount || 0;
        } else {
          summary.failed++;
          summary.errors.push({
            accountId: accounts[index].id,
            error: result.reason || result.value?.error
          });
        }
      });

      logger.info(`User ${userId} sync completed: ${summary.successful}/${summary.total} accounts`);
      return summary;

    } catch (error) {
      logger.error(`User sync failed for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to bank API
   */
  async testConnection(provider, credentials) {
    try {
      const providerConfig = this.supportedProviders[provider];
      if (!providerConfig) {
        return { success: false, error: 'Unsupported provider' };
      }

      // Mock implementation - replace with actual API calls
      switch (provider) {
        case 'bridge_api':
          return await this.testBridgeConnection(credentials);
        case 'budget_insight':
          return await this.testBudgetInsightConnection(credentials);
        default:
          // For specific banks, implement their auth flow
          return { success: true, message: 'Connection test passed' };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch account data from provider
   */
  async fetchAccountData(provider, credentials) {
    const cacheKey = `bank_account_${provider}_${crypto.createHash('md5').update(JSON.stringify(credentials)).digest('hex')}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    let accountData;

    switch (provider) {
      case 'bridge_api':
        accountData = await this.fetchBridgeAccountData(credentials);
        break;
      case 'budget_insight':
        accountData = await this.fetchBudgetInsightAccountData(credentials);
        break;
      default:
        // Mock data for development
        accountData = {
          id: `ext_${Date.now()}`,
          name: 'Compte Courant',
          type: 'checking',
          balance: Math.random() * 10000,
          currency: 'EUR',
          accountNumber: '12345678901234567890',
          bankName: this.supportedProviders[provider].name
        };
    }

    // Cache for 5 minutes
    await cacheService.set(cacheKey, accountData, 300);
    return accountData;
  }

  /**
   * Fetch transactions from provider
   */
  async fetchTransactions(provider, credentials, since = null) {
    try {
      const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

      switch (provider) {
        case 'bridge_api':
          return await this.fetchBridgeTransactions(credentials, sinceDate);
        case 'budget_insight':
          return await this.fetchBudgetInsightTransactions(credentials, sinceDate);
        default:
          // Mock transactions for development
          return this.generateMockTransactions(10);
      }

    } catch (error) {
      logger.error(`Failed to fetch transactions from ${provider}:`, error);
      return [];
    }
  }

  /**
   * Process and categorize transactions
   */
  async processTransactions(accountId, rawTransactions) {
    const processedTransactions = [];

    for (const rawTransaction of rawTransactions) {
      try {
        // Check if transaction already exists
        const existing = await prisma.accountTransaction.findFirst({
          where: {
            accountId,
            externalId: rawTransaction.id
          }
        });

        if (existing) continue;

        // Categorize transaction
        const category = await this.categorizeTransaction(rawTransaction);

        // Create transaction
        const transaction = await prisma.accountTransaction.create({
          data: {
            accountId,
            externalId: rawTransaction.id,
            amount: rawTransaction.amount,
            description: rawTransaction.description,
            category: category.category,
            subcategory: category.subcategory,
            date: new Date(rawTransaction.date),
            type: rawTransaction.amount < 0 ? 'debit' : 'credit',
            merchant: rawTransaction.merchant,
            location: rawTransaction.location,
            metadata: JSON.stringify(rawTransaction.metadata || {})
          }
        });

        processedTransactions.push(transaction);

      } catch (error) {
        logger.error(`Failed to process transaction ${rawTransaction.id}:`, error);
      }
    }

    return processedTransactions;
  }

  /**
   * Categorize transaction using AI and rules
   */
  async categorizeTransaction(transaction) {
    try {
      // First try rule-based categorization
      const ruleBasedCategory = await this.getRuleBasedCategory(transaction);
      if (ruleBasedCategory) {
        return ruleBasedCategory;
      }

      // Fall back to AI categorization
      const aiCategory = await this.getAICategory(transaction);
      return aiCategory || { category: 'other', subcategory: 'uncategorized' };

    } catch (error) {
      logger.error('Transaction categorization failed:', error);
      return { category: 'other', subcategory: 'uncategorized' };
    }
  }

  /**
   * Rule-based transaction categorization
   */
  async getRuleBasedCategory(transaction) {
    const mappings = await prisma.categoryMapping.findMany({
      where: {
        OR: [
          { merchantPattern: { contains: transaction.merchant?.toLowerCase() || '' } },
          { description: { contains: transaction.description.toLowerCase() } }
        ]
      },
      orderBy: { confidence: 'desc' }
    });

    if (mappings.length > 0) {
      const mapping = mappings[0];

      // Update usage count
      await prisma.categoryMapping.update({
        where: { id: mapping.id },
        data: { usageCount: { increment: 1 } }
      });

      return {
        category: mapping.category,
        subcategory: mapping.subcategory
      };
    }

    return null;
  }

  /**
   * AI-powered transaction categorization
   */
  async getAICategory(transaction) {
    // This would integrate with the existing AI service
    // For now, return basic categorization
    const description = transaction.description.toLowerCase();

    if (description.includes('supermarket') || description.includes('grocery')) {
      return { category: 'alimentation', subcategory: 'grocery' };
    }
    if (description.includes('gas') || description.includes('fuel')) {
      return { category: 'deplacement', subcategory: 'fuel' };
    }
    if (description.includes('restaurant') || description.includes('cafe')) {
      return { category: 'alimentation', subcategory: 'restaurant' };
    }

    return { category: 'other', subcategory: 'uncategorized' };
  }

  /**
   * Encryption utilities
   */
  encryptCredentials(credentials) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptCredentials(encryptedCredentials) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedCredentials, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  /**
   * Utility functions
   */
  mapAccountType(externalType) {
    const typeMapping = {
      'current': 'checking',
      'savings': 'savings',
      'investment': 'investment',
      'loan': 'loan',
      'credit_card': 'credit'
    };
    return typeMapping[externalType] || 'checking';
  }

  maskAccountNumber(accountNumber) {
    if (!accountNumber) return null;
    return `****${accountNumber.slice(-4)}`;
  }

  maskIban(iban) {
    if (!iban) return null;
    return `${iban.slice(0, 4)}****${iban.slice(-4)}`;
  }

  generateMockTransactions(count = 10) {
    const transactions = [];
    const merchants = ['CARREFOUR', 'SHELL', 'AMAZON', 'SALAIRE', 'EDF', 'NETFLIX'];

    for (let i = 0; i < count; i++) {
      transactions.push({
        id: `mock_${Date.now()}_${i}`,
        amount: (Math.random() - 0.3) * 1000, // Mix of positive and negative
        description: merchants[Math.floor(Math.random() * merchants.length)],
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        merchant: merchants[Math.floor(Math.random() * merchants.length)],
        metadata: { mock: true }
      });
    }

    return transactions;
  }

  /**
   * Provider-specific implementations (stubs for now)
   */
  async testBridgeConnection(credentials) {
    // Implement Bridge API connection test
    return { success: true, message: 'Bridge API connection successful' };
  }

  async fetchBridgeAccountData(credentials) {
    // Implement Bridge API account data fetch
    throw new Error('Bridge API integration not implemented');
  }

  async fetchBridgeTransactions(credentials, since) {
    // Implement Bridge API transaction fetch
    return this.generateMockTransactions(5);
  }

  async testBudgetInsightConnection(credentials) {
    // Implement Budget Insight connection test
    return { success: true, message: 'Budget Insight connection successful' };
  }

  async fetchBudgetInsightAccountData(credentials) {
    // Implement Budget Insight account data fetch
    throw new Error('Budget Insight integration not implemented');
  }

  async fetchBudgetInsightTransactions(credentials, since) {
    // Implement Budget Insight transaction fetch
    return this.generateMockTransactions(3);
  }

  async updateInvestmentPositions(userId, accountId, positions) {
    // Update investment assets based on account positions
    for (const position of positions) {
      await prisma.asset.upsert({
        where: {
          userId_accountId_symbol: {
            userId,
            accountId,
            symbol: position.symbol
          }
        },
        update: {
          quantity: position.quantity,
          unitValue: position.unitValue,
          totalValue: position.quantity * position.unitValue,
          lastUpdateAt: new Date()
        },
        create: {
          userId,
          accountId,
          name: position.name,
          type: position.type,
          symbol: position.symbol,
          quantity: position.quantity,
          unitValue: position.unitValue,
          totalValue: position.quantity * position.unitValue,
          currency: position.currency || 'EUR'
        }
      });
    }
  }
}

module.exports = new BankIntegrationService();