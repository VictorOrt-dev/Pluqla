const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHelper');
const oauthService = require('../services/oauthService');
const bankIntegrationService = require('../services/bankIntegrationService');
const gdprService = require('../services/gdprService');
const analyticsService = require('../services/analyticsService');

/**
 * OAuth Controller for Secure Bank API Integration
 * Handles PSD2-compliant OAuth2 flows for financial data access
 */
const oauthController = {
  /**
   * Initiate OAuth2 authorization flow
   * @route POST /api/oauth/authorize
   * @access Private
   */
  initiateAuthorization: asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid request data', 400, 'VALIDATION_ERROR', errors.array());
    }

    const userId = req.user.id;
    const { provider, returnUrl } = req.body;

    // Validate provider
    const supportedProviders = ['bridge', 'budgetinsight', 'tink'];
    if (!supportedProviders.includes(provider)) {
      return sendError(res, 'Unsupported provider', 400, 'UNSUPPORTED_PROVIDER');
    }

    // Check GDPR consent for financial data aggregation
    const hasConsent = await gdprService.hasValidConsent(userId, 'financial_aggregation');
    if (!hasConsent) {
      return sendError(res, 'User consent required for financial data aggregation', 403, 'CONSENT_REQUIRED');
    }

    try {
      // Generate OAuth authorization URL with PKCE
      const authData = await oauthService.generateAuthUrl(provider, userId);

      // Track authorization initiation
      analyticsService.trackEvent('oauth_authorization_initiated', userId, {
        provider,
        state: authData.state
      });

      logger.info('OAuth authorization initiated', {
        userId,
        provider,
        state: authData.state
      });

      return sendSuccess(res, {
        authUrl: authData.authUrl,
        state: authData.state,
        provider: authData.provider,
        expiresIn: 900 // 15 minutes
      }, 'Authorization URL generated successfully');
    } catch (error) {
      logger.error('OAuth authorization initiation failed:', error);
      return sendError(res, 'Failed to initiate authorization', 500, 'OAUTH_INIT_FAILED');
    }
  }),

  /**
   * Handle OAuth2 callback and exchange code for token
   * @route POST /api/oauth/callback
   * @access Public (but requires valid state)
   */
  handleCallback: asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Invalid callback data', 400, 'VALIDATION_ERROR', errors.array());
    }

    const {
      code, state, provider, error: oauthError
    } = req.body;

    // Handle OAuth errors from provider
    if (oauthError) {
      logger.warn('OAuth provider returned error', {
        error: oauthError,
        provider,
        state
      });

      return sendError(res, `OAuth authorization failed: ${oauthError}`, 400, 'OAUTH_PROVIDER_ERROR');
    }

    if (!code || !state || !provider) {
      return sendError(res, 'Missing required OAuth parameters', 400, 'MISSING_OAUTH_PARAMS');
    }

    try {
      // Exchange authorization code for access token
      const tokenInfo = await oauthService.exchangeCodeForToken(provider, code, state);

      // Fetch user accounts from the provider (this also validates the token)
      const accounts = await oauthService.fetchAccounts(provider, tokenInfo.accessToken);

      // Validate response - fetchAccounts will throw an error if token is invalid
      if (!Array.isArray(accounts)) {
        logger.error('OAuth account fetch returned invalid data', {
          provider,
          accountsType: typeof accounts
        });
        return sendError(res, 'Invalid account data received from provider', 500, 'INVALID_ACCOUNT_DATA');
      }

      if (accounts.length === 0) {
        logger.warn('No accounts found for user', { provider });
        return sendError(res, 'No accounts found for this connection', 404, 'NO_ACCOUNTS_FOUND');
      }

      // Extract user ID from state (using persistent state service)
      const { userId } = tokenInfo; // Already extracted from state in exchangeCodeForToken
      if (!userId) {
        return sendError(res, 'Invalid or expired authorization state', 400, 'INVALID_STATE');
      }

      // Create account records in database with encrypted tokens
      const createdAccounts = [];
      for (const accountData of accounts) {
        try {
          const account = await bankIntegrationService.createAccountFromOAuth(
            userId,
            provider,
            accountData,
            tokenInfo
          );
          createdAccounts.push(account);
        } catch (accountError) {
          logger.error('Failed to create account record:', accountError);
          // Continue with other accounts
        }
      }

      // Record GDPR data processing log
      await gdprService.recordDataProcessingLog(userId, {
        operation: 'CREATE',
        dataType: 'financial',
        description: `Connected ${provider} accounts via OAuth`,
        legalBasis: 'consent',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Track successful connection
      analyticsService.trackEvent('oauth_connection_successful', userId, {
        provider,
        accountCount: createdAccounts.length
      });

      logger.info('OAuth connection completed successfully', {
        userId,
        provider,
        accountCount: createdAccounts.length
      });

      return sendSuccess(res, {
        provider,
        accountsConnected: createdAccounts.length,
        accounts: createdAccounts.map((acc) => ({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          currency: acc.currency
        }))
      }, 'Bank accounts connected successfully', 201);
    } catch (error) {
      logger.error('OAuth callback handling failed:', error);

      // Track failed connection
      if (req.body.userId) {
        analyticsService.trackEvent('oauth_connection_failed', req.body.userId, {
          provider,
          error: error.message
        });
      }

      return sendError(res, 'Failed to complete OAuth authorization', 500, 'OAUTH_CALLBACK_FAILED');
    }
  }),

  /**
   * Disconnect OAuth provider and revoke tokens
   * @route DELETE /api/oauth/disconnect/:provider
   * @access Private
   */
  disconnectProvider: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { provider } = req.params;

    try {
      // Find accounts for this provider
      const accounts = await prisma.account.findMany({
        where: {
          userId,
          provider,
          isActive: true
        }
      });

      if (accounts.length === 0) {
        return sendError(res, 'No connected accounts found for this provider', 404, 'NO_ACCOUNTS');
      }

      let tokensRevoked = 0;
      let accountsDisconnected = 0;

      // Revoke tokens and disconnect accounts
      for (const account of accounts) {
        try {
          // Decrypt stored credentials to get access token
          if (account.encryptedCredentials) {
            const credentials = bankIntegrationService.decryptCredentials(account.encryptedCredentials);

            if (credentials.accessToken) {
              // Attempt to revoke the token
              await oauthService.revokeToken(provider, credentials.accessToken);
              tokensRevoked++;
            }
          }

          // Deactivate account (don't delete for audit purposes)
          await prisma.account.update({
            where: { id: account.id },
            data: {
              isActive: false,
              encryptedCredentials: null, // Remove stored tokens
              syncError: 'User disconnected',
              lastSyncAt: new Date()
            }
          });

          accountsDisconnected++;
        } catch (accountError) {
          logger.error('Failed to disconnect account:', accountError);
          // Continue with other accounts
        }
      }

      // Record GDPR data processing log
      await gdprService.recordDataProcessingLog(userId, {
        operation: 'DELETE',
        dataType: 'financial',
        description: `Disconnected ${provider} OAuth connection`,
        legalBasis: 'consent',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Track disconnection
      analyticsService.trackEvent('oauth_provider_disconnected', userId, {
        provider,
        accountsDisconnected,
        tokensRevoked
      });

      logger.info('OAuth provider disconnected', {
        userId,
        provider,
        accountsDisconnected,
        tokensRevoked
      });

      return sendSuccess(res, {
        provider,
        accountsDisconnected,
        tokensRevoked
      }, 'Provider disconnected successfully');
    } catch (error) {
      logger.error('OAuth disconnection failed:', error);
      return sendError(res, 'Failed to disconnect provider', 500, 'DISCONNECT_FAILED');
    }
  }),

  /**
   * Get OAuth connection status for user
   * @route GET /api/oauth/status
   * @access Private
   */
  getConnectionStatus: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
      // Get all active accounts grouped by provider
      const accounts = await prisma.account.findMany({
        where: {
          userId,
          isActive: true,
          provider: { not: 'manual' }
        },
        select: {
          provider: true,
          name: true,
          type: true,
          balance: true,
          currency: true,
          lastSyncAt: true,
          syncError: true
        }
      });

      // Group accounts by provider
      const connectionStatus = accounts.reduce((status, account) => {
        if (!status[account.provider]) {
          status[account.provider] = {
            provider: account.provider,
            connected: true,
            accountCount: 0,
            totalBalance: 0,
            lastSync: null,
            hasErrors: false,
            accounts: []
          };
        }

        const providerStatus = status[account.provider];
        providerStatus.accountCount++;
        providerStatus.totalBalance += account.balance || 0;
        providerStatus.accounts.push({
          name: account.name,
          type: account.type,
          balance: account.balance,
          currency: account.currency
        });

        if (account.syncError) {
          providerStatus.hasErrors = true;
        }

        if (!providerStatus.lastSync || account.lastSyncAt > new Date(providerStatus.lastSync)) {
          providerStatus.lastSync = account.lastSyncAt;
        }

        return status;
      }, {});

      // Add disconnected providers
      const supportedProviders = ['bridge', 'budgetinsight', 'tink'];
      supportedProviders.forEach((provider) => {
        if (!connectionStatus[provider]) {
          connectionStatus[provider] = {
            provider,
            connected: false,
            accountCount: 0,
            totalBalance: 0,
            lastSync: null,
            hasErrors: false,
            accounts: []
          };
        }
      });

      return sendSuccess(res, {
        connections: Object.values(connectionStatus),
        totalConnectedProviders: Object.values(connectionStatus).filter((c) => c.connected).length,
        totalAccounts: accounts.length
      }, 'Connection status retrieved successfully');
    } catch (error) {
      logger.error('Failed to get connection status:', error);
      return sendError(res, 'Failed to retrieve connection status', 500, 'STATUS_FAILED');
    }
  }),

  /**
   * Refresh OAuth tokens for a provider
   * @route POST /api/oauth/refresh/:provider
   * @access Private
   */
  refreshProviderTokens: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { provider } = req.params;

    try {
      const accounts = await prisma.account.findMany({
        where: {
          userId,
          provider,
          isActive: true
        }
      });

      if (accounts.length === 0) {
        return sendError(res, 'No connected accounts found for this provider', 404, 'NO_ACCOUNTS');
      }

      let tokensRefreshed = 0;
      let refreshErrors = 0;

      for (const account of accounts) {
        try {
          if (!account.encryptedCredentials) continue;

          const credentials = bankIntegrationService.decryptCredentials(account.encryptedCredentials);

          if (credentials.refreshToken) {
            // Refresh the access token
            const newTokenInfo = await oauthService.refreshAccessToken(provider, credentials.refreshToken);

            // Update stored credentials
            const updatedCredentials = {
              ...credentials,
              accessToken: newTokenInfo.accessToken,
              refreshToken: newTokenInfo.refreshToken,
              expiresAt: new Date(Date.now() + newTokenInfo.expiresIn * 1000)
            };

            const encryptedCredentials = bankIntegrationService.encryptCredentials(updatedCredentials);

            await prisma.account.update({
              where: { id: account.id },
              data: {
                encryptedCredentials,
                syncError: null
              }
            });

            tokensRefreshed++;
          }
        } catch (accountError) {
          logger.error('Failed to refresh token for account:', accountError);
          refreshErrors++;
        }
      }

      // Track token refresh
      analyticsService.trackEvent('oauth_tokens_refreshed', userId, {
        provider,
        tokensRefreshed,
        refreshErrors
      });

      logger.info('OAuth tokens refreshed', {
        userId,
        provider,
        tokensRefreshed,
        refreshErrors
      });

      return sendSuccess(res, {
        provider,
        tokensRefreshed,
        refreshErrors
      }, 'Tokens refreshed successfully');
    } catch (error) {
      logger.error('OAuth token refresh failed:', error);
      return sendError(res, 'Failed to refresh tokens', 500, 'REFRESH_FAILED');
    }
  }),

  /**
   * Extract user ID from OAuth state (implement based on your state format)
   */
  async extractUserIdFromState(state) {
    try {
      // This is a simplified implementation
      // In practice, you should validate the state and extract user ID securely
      const [timestamp, hash] = state.split(':');

      // Verify state is not expired (15 minutes)
      if (Date.now() - parseInt(timestamp) > 15 * 60 * 1000) {
        throw new Error('State expired');
      }

      // You might store user ID in Redis with state as key
      // For now, return null to indicate you need to implement this
      return null;
    } catch (error) {
      logger.error('Failed to extract user ID from state:', error);
      return null;
    }
  }
};

module.exports = oauthController;
