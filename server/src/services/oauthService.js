const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { encryptionService } = require('../middleware/securityMiddleware');

/**
 * OAuth2 Service for Secure Bank API Integration
 * Implements PSD2-compliant OAuth2 flows for financial data access
 */
class OAuthService {
  constructor() {
    this.providers = {
      bridge: {
        name: 'Bridge API',
        authUrl: 'https://api.bridgeapi.io/v2/authenticate',
        tokenUrl: 'https://api.bridgeapi.io/v2/token',
        apiUrl: 'https://api.bridgeapi.io/v2',
        clientId: process.env.BRIDGE_CLIENT_ID,
        clientSecret: process.env.BRIDGE_CLIENT_SECRET,
        redirectUri: process.env.BRIDGE_REDIRECT_URI || 'https://yourapp.com/auth/bridge/callback',
        scopes: ['offline_access', 'read_accounts', 'read_transactions']
      },
      budgetinsight: {
        name: 'Budget Insight',
        authUrl: 'https://biapi.pro/auth/init',
        tokenUrl: 'https://biapi.pro/auth/token',
        apiUrl: 'https://biapi.pro/2.0',
        clientId: process.env.BUDGET_INSIGHT_CLIENT_ID,
        clientSecret: process.env.BUDGET_INSIGHT_CLIENT_SECRET,
        redirectUri: process.env.BUDGET_INSIGHT_REDIRECT_URI || 'https://yourapp.com/auth/budgetinsight/callback',
        scopes: ['read']
      },
      tink: {
        name: 'Tink',
        authUrl: 'https://link.tink.com/1.0/authorize',
        tokenUrl: 'https://api.tink.com/api/v1/oauth/token',
        apiUrl: 'https://api.tink.com/api/v1',
        clientId: process.env.TINK_CLIENT_ID,
        clientSecret: process.env.TINK_CLIENT_SECRET,
        redirectUri: process.env.TINK_REDIRECT_URI || 'https://yourapp.com/auth/tink/callback',
        scopes: ['accounts:read', 'transactions:read']
      }
    };

    // Validate required environment variables
    this.validateConfig();
  }

  validateConfig() {
    const requiredEnvVars = [
      'BRIDGE_CLIENT_ID',
      'BRIDGE_CLIENT_SECRET',
      'BUDGET_INSIGHT_CLIENT_ID',
      'BUDGET_INSIGHT_CLIENT_SECRET',
      'TINK_CLIENT_ID',
      'TINK_CLIENT_SECRET'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      logger.warn('Missing OAuth configuration:', { missing });
    }
  }

  /**
   * Generate OAuth2 authorization URL with PKCE (Bridge API)
   */
  async generateAuthUrl(provider, userId, state = null) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const config = this.providers[provider];
      const stateParam = state || this.generateSecureState(userId);

      // Generate PKCE challenge for enhanced security
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);

      // Store PKCE verifier temporarily (should use Redis in production)
      await this.storePKCEVerifier(stateParam, codeVerifier);

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: stateParam,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;

      logger.info('OAuth authorization URL generated', {
        provider,
        userId,
        state: stateParam
      });

      return {
        authUrl,
        state: stateParam,
        provider
      };

    } catch (error) {
      logger.error('Failed to generate OAuth URL:', error);
      throw new Error('Failed to generate authorization URL');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(provider, code, state) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const config = this.providers[provider];

      // Retrieve and verify PKCE verifier
      const codeVerifier = await this.retrievePKCEVerifier(state);
      if (!codeVerifier) {
        throw new Error('Invalid or expired authorization state');
      }

      const tokenData = {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier
      };

      const response = await axios.post(config.tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (!response.data.access_token) {
        throw new Error('No access token received from provider');
      }

      // Clean up PKCE verifier
      await this.deletePKCEVerifier(state);

      const tokenInfo = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type || 'Bearer',
        scope: response.data.scope,
        provider,
        obtainedAt: new Date().toISOString()
      };

      logger.info('OAuth token exchange successful', {
        provider,
        expiresIn: tokenInfo.expiresIn,
        hasRefreshToken: !!tokenInfo.refreshToken
      });

      return tokenInfo;

    } catch (error) {
      logger.error('OAuth token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(provider, refreshToken) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const config = this.providers[provider];

      const refreshData = {
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken
      };

      const response = await axios.post(config.tokenUrl, refreshData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (!response.data.access_token) {
        throw new Error('No access token received during refresh');
      }

      const tokenInfo = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken, // Some providers don't return new refresh token
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type || 'Bearer',
        provider,
        refreshedAt: new Date().toISOString()
      };

      logger.info('OAuth token refresh successful', {
        provider,
        expiresIn: tokenInfo.expiresIn
      });

      return tokenInfo;

    } catch (error) {
      logger.error('OAuth token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke access token (logout from provider)
   */
  async revokeToken(provider, accessToken) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const config = this.providers[provider];

      // Not all providers support token revocation, so we handle errors gracefully
      try {
        await axios.post(`${config.apiUrl}/oauth/revoke`, {
          token: accessToken
        }, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        logger.info('OAuth token revoked successfully', { provider });
        return true;

      } catch (revokeError) {
        // Token revocation failed, but that's not always critical
        logger.warn('Token revocation failed (may not be supported)', {
          provider,
          error: revokeError.message
        });
        return false;
      }

    } catch (error) {
      logger.error('Token revocation error:', error);
      return false;
    }
  }

  /**
   * Validate access token by making a test API call
   */
  async validateToken(provider, accessToken) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const config = this.providers[provider];

      // Make a simple API call to validate token
      const response = await axios.get(`${config.apiUrl}/accounts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const isValid = response.status === 200;

      logger.debug('Token validation result', {
        provider,
        isValid,
        status: response.status
      });

      return {
        isValid,
        accountCount: response.data?.accounts?.length || 0
      };

    } catch (error) {
      logger.warn('Token validation failed', {
        provider,
        error: error.message,
        status: error.response?.status
      });

      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch accounts from provider using access token
   */
  async fetchAccounts(provider, accessToken) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const config = this.providers[provider];

      const response = await axios.get(`${config.apiUrl}/accounts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      // Normalize account data across providers
      const accounts = this.normalizeAccountData(provider, response.data);

      logger.info('Accounts fetched successfully', {
        provider,
        accountCount: accounts.length
      });

      return accounts;

    } catch (error) {
      logger.error('Failed to fetch accounts:', error);
      throw new Error(`Failed to fetch accounts from ${provider}`);
    }
  }

  /**
   * Fetch transactions from provider using access token
   */
  async fetchTransactions(provider, accessToken, accountId, options = {}) {
    try {
      if (!this.providers[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const config = this.providers[provider];
      const { since, limit = 100 } = options;

      const params = new URLSearchParams({
        limit: limit.toString()
      });

      if (since) {
        params.append('since', since);
      }

      const response = await axios.get(`${config.apiUrl}/accounts/${accountId}/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      // Normalize transaction data across providers
      const transactions = this.normalizeTransactionData(provider, response.data);

      logger.info('Transactions fetched successfully', {
        provider,
        accountId,
        transactionCount: transactions.length
      });

      return transactions;

    } catch (error) {
      logger.error('Failed to fetch transactions:', error);
      throw new Error(`Failed to fetch transactions from ${provider}`);
    }
  }

  /**
   * Utility methods for PKCE and state management
   */
  generateSecureState(userId) {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(`${userId}:${timestamp}:${random}`).digest('hex');
    return `${timestamp}:${hash}`;
  }

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  async storePKCEVerifier(state, verifier) {
    // In production, use Redis or secure session storage
    // For now, using in-memory storage (not recommended for production)
    if (!global.pkceStore) {
      global.pkceStore = new Map();
    }

    // Store with expiration (15 minutes)
    global.pkceStore.set(state, {
      verifier,
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    // Clean up expired entries (only if not in test environment)
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => {
        if (global.pkceStore && global.pkceStore.has(state)) {
          global.pkceStore.delete(state);
        }
      }, 15 * 60 * 1000);
    }
  }

  async retrievePKCEVerifier(state) {
    if (!global.pkceStore) {
      return null;
    }

    const stored = global.pkceStore.get(state);
    if (!stored || stored.expiresAt < Date.now()) {
      global.pkceStore.delete(state);
      return null;
    }

    return stored.verifier;
  }

  async deletePKCEVerifier(state) {
    if (global.pkceStore) {
      global.pkceStore.delete(state);
    }
  }

  /**
   * Normalize account data across different providers
   */
  normalizeAccountData(provider, rawData) {
    try {
      let accounts = [];

      switch (provider) {
        case 'bridge':
          accounts = rawData.resources?.map(account => ({
            externalId: account.id,
            name: account.name,
            type: this.mapAccountType(account.type),
            balance: account.balance,
            currency: account.currency_code || 'EUR',
            bankName: account.bank?.name,
            iban: account.iban,
            number: account.number
          })) || [];
          break;

        case 'budgetinsight':
          accounts = rawData.accounts?.map(account => ({
            externalId: account.id.toString(),
            name: account.name,
            type: this.mapAccountType(account.type),
            balance: account.balance / 100, // Budget Insight uses cents
            currency: account.currency?.symbol || 'EUR',
            bankName: account.bank?.name,
            iban: account.iban,
            number: account.number
          })) || [];
          break;

        case 'tink':
          accounts = rawData.accounts?.map(account => ({
            externalId: account.id,
            name: account.name,
            type: this.mapAccountType(account.type),
            balance: account.balance,
            currency: account.currencyCode || 'EUR',
            bankName: account.financialInstitutionId,
            iban: account.identifiers?.iban,
            number: account.accountNumber
          })) || [];
          break;

        default:
          throw new Error(`Unsupported provider for account normalization: ${provider}`);
      }

      return accounts;

    } catch (error) {
      logger.error('Failed to normalize account data:', error);
      return [];
    }
  }

  /**
   * Normalize transaction data across different providers
   */
  normalizeTransactionData(provider, rawData) {
    try {
      let transactions = [];

      switch (provider) {
        case 'bridge':
          transactions = rawData.resources?.map(tx => ({
            externalId: tx.id,
            amount: tx.amount,
            description: tx.description,
            date: tx.date,
            category: tx.category?.name,
            merchant: tx.merchant?.name,
            type: tx.amount < 0 ? 'debit' : 'credit'
          })) || [];
          break;

        case 'budgetinsight':
          transactions = rawData.transactions?.map(tx => ({
            externalId: tx.id.toString(),
            amount: tx.value / 100, // Budget Insight uses cents
            description: tx.simplified_wording || tx.wording,
            date: tx.date,
            category: tx.category?.name,
            merchant: tx.merchant?.name,
            type: tx.value < 0 ? 'debit' : 'credit'
          })) || [];
          break;

        case 'tink':
          transactions = rawData.transactions?.map(tx => ({
            externalId: tx.id,
            amount: tx.amount,
            description: tx.description,
            date: tx.date,
            category: tx.categoryId,
            merchant: tx.merchantName,
            type: tx.amount < 0 ? 'debit' : 'credit'
          })) || [];
          break;

        default:
          throw new Error(`Unsupported provider for transaction normalization: ${provider}`);
      }

      return transactions;

    } catch (error) {
      logger.error('Failed to normalize transaction data:', error);
      return [];
    }
  }

  mapAccountType(externalType) {
    const typeMapping = {
      // Bridge API types
      'checking': 'checking',
      'savings': 'savings',
      'investment': 'investment',
      'loan': 'loan',

      // Budget Insight types
      'bank': 'checking',
      'card': 'checking',
      'saving': 'savings',
      'deposit': 'savings',
      'loan': 'loan',
      'mortgage': 'loan',

      // Tink types
      'CHECKING': 'checking',
      'SAVINGS': 'savings',
      'INVESTMENT': 'investment',
      'CREDIT_CARD': 'checking',
      'LOAN': 'loan'
    };

    return typeMapping[externalType] || 'checking';
  }
}

module.exports = new OAuthService();