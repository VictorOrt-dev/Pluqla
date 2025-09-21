// Mock crypto for consistent test results - Define mock function first
const mockRandomBytes = jest.fn();

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: mockRandomBytes
}));

// Mock axios
jest.mock('axios');

const crypto = require('crypto');
const axios = require('axios');
const oauthService = require('../../src/services/oauthService');

const mockedAxios = axios;

describe('OAuthService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset global PKCE store
    if (global.pkceStore) {
      global.pkceStore.clear();
    }

    // Mock environment variables
    process.env.BRIDGE_CLIENT_ID = 'test_bridge_client_id';
    process.env.BRIDGE_CLIENT_SECRET = 'test_bridge_secret';
    process.env.BUDGET_INSIGHT_CLIENT_ID = 'test_bi_client_id';
    process.env.BUDGET_INSIGHT_CLIENT_SECRET = 'test_bi_secret';
    process.env.TINK_CLIENT_ID = 'test_tink_client_id';
    process.env.TINK_CLIENT_SECRET = 'test_tink_secret';
  });

  describe('generateAuthUrl', () => {
    test('should generate authorization URL with PKCE for Bridge API', async () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('state_random_bytes', 'utf8'))
        .mockReturnValueOnce(Buffer.from('code_verifier_bytes_32_chars_long', 'utf8'));

      const result = await oauthService.generateAuthUrl('bridge', 'test_user_id');

      expect(result).toHaveProperty('authUrl');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('provider', 'bridge');

      const authUrl = new URL(result.authUrl);
      expect(authUrl.hostname).toBe('api.bridgeapi.io');
      expect(authUrl.searchParams.get('client_id')).toBe('test_bridge_client_id');
      expect(authUrl.searchParams.get('response_type')).toBe('code');
      expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
      expect(authUrl.searchParams.get('code_challenge')).toBeTruthy();
    });

    test('should generate authorization URL for Budget Insight', async () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('state_random_bytes', 'utf8'))
        .mockReturnValueOnce(Buffer.from('code_verifier_bytes_32_chars_long', 'utf8'));

      const result = await oauthService.generateAuthUrl('budgetinsight', 'test_user_id');

      expect(result.provider).toBe('budgetinsight');
      const authUrl = new URL(result.authUrl);
      expect(authUrl.hostname).toBe('biapi.pro');
      expect(authUrl.searchParams.get('scope')).toBe('read');
    });

    test('should generate authorization URL for Tink', async () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('state_random_bytes', 'utf8'))
        .mockReturnValueOnce(Buffer.from('code_verifier_bytes_32_chars_long', 'utf8'));

      const result = await oauthService.generateAuthUrl('tink', 'test_user_id');

      expect(result.provider).toBe('tink');
      const authUrl = new URL(result.authUrl);
      expect(authUrl.hostname).toBe('link.tink.com');
      expect(authUrl.searchParams.get('scope')).toBe('accounts:read transactions:read');
    });

    test('should reject unsupported provider', async () => {
      await expect(
        oauthService.generateAuthUrl('unsupported_provider', 'test_user_id')
      ).rejects.toThrow('Unsupported provider: unsupported_provider');
    });

    test('should store PKCE verifier with expiration', async () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('state_random_bytes', 'utf8'))
        .mockReturnValueOnce(Buffer.from('code_verifier_bytes_32_chars_long', 'utf8'));

      const result = await oauthService.generateAuthUrl('bridge', 'test_user_id');

      // Verify PKCE verifier was stored
      expect(global.pkceStore).toBeDefined();
      expect(global.pkceStore.has(result.state)).toBe(true);

      const stored = global.pkceStore.get(result.state);
      expect(stored).toHaveProperty('verifier');
      expect(stored).toHaveProperty('expiresAt');
      expect(stored.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('exchangeCodeForToken', () => {
    beforeEach(() => {
      // Store a PKCE verifier for testing
      if (!global.pkceStore) {
        global.pkceStore = new Map();
      }
      global.pkceStore.set('test_state', {
        verifier: 'test_code_verifier',
        expiresAt: Date.now() + 15 * 60 * 1000
      });
    });

    test('should exchange authorization code for access token', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read_accounts read_transactions'
        }
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      const result = await oauthService.exchangeCodeForToken(
        'bridge',
        'test_auth_code',
        'test_state'
      );

      expect(result).toEqual({
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read_accounts read_transactions',
        provider: 'bridge',
        obtainedAt: expect.any(String)
      });

      // Verify PKCE verifier was used and cleaned up
      expect(global.pkceStore.has('test_state')).toBe(false);

      // Verify API call was made correctly
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.bridgeapi.io/v2/token',
        expect.objectContaining({
          grant_type: 'authorization_code',
          client_id: 'test_bridge_client_id',
          client_secret: 'test_bridge_secret',
          code: 'test_auth_code',
          code_verifier: 'test_code_verifier'
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 30000
        })
      );
    });

    test('should reject invalid or expired state', async () => {
      await expect(
        oauthService.exchangeCodeForToken('bridge', 'test_code', 'invalid_state')
      ).rejects.toThrow('Invalid or expired authorization state');
    });

    test('should reject response without access token', async () => {
      const mockTokenResponse = {
        data: {
          // Missing access_token
          refresh_token: 'test_refresh_token',
          expires_in: 3600
        }
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      await expect(
        oauthService.exchangeCodeForToken('bridge', 'test_code', 'test_state')
      ).rejects.toThrow('No access token received from provider');
    });

    test('should handle network errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(
        oauthService.exchangeCodeForToken('bridge', 'test_code', 'test_state')
      ).rejects.toThrow('Failed to exchange authorization code for token');
    });
  });

  describe('refreshAccessToken', () => {
    test('should refresh access token successfully', async () => {
      const mockRefreshResponse = {
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer'
        }
      };

      mockedAxios.post.mockResolvedValue(mockRefreshResponse);

      const result = await oauthService.refreshAccessToken('bridge', 'test_refresh_token');

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        provider: 'bridge',
        refreshedAt: expect.any(String)
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.bridgeapi.io/v2/token',
        expect.objectContaining({
          grant_type: 'refresh_token',
          client_id: 'test_bridge_client_id',
          client_secret: 'test_bridge_secret',
          refresh_token: 'test_refresh_token'
        }),
        expect.any(Object)
      );
    });

    test('should handle refresh token that does not return new refresh token', async () => {
      const mockRefreshResponse = {
        data: {
          access_token: 'new_access_token',
          // No new refresh_token returned
          expires_in: 3600,
          token_type: 'Bearer'
        }
      };

      mockedAxios.post.mockResolvedValue(mockRefreshResponse);

      const result = await oauthService.refreshAccessToken('bridge', 'original_refresh_token');

      expect(result.refreshToken).toBe('original_refresh_token');
    });
  });

  describe('validateToken', () => {
    test('should validate token by making API call', async () => {
      const mockAccountsResponse = {
        status: 200,
        data: {
          accounts: [
            { id: '1', name: 'Test Account' },
            { id: '2', name: 'Another Account' }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockAccountsResponse);

      const result = await oauthService.validateToken('bridge', 'test_access_token');

      expect(result.isValid).toBe(true);
      expect(result.accountCount).toBe(2);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.bridgeapi.io/v2/accounts',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test_access_token',
            'Accept': 'application/json'
          },
          timeout: 15000
        })
      );
    });

    test('should return invalid for failed API call', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await oauthService.validateToken('bridge', 'invalid_token');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('fetchAccounts', () => {
    test('should fetch and normalize Bridge API accounts', async () => {
      const mockBridgeResponse = {
        data: {
          resources: [
            {
              id: 'bridge_account_1',
              name: 'Compte Courant',
              type: 'checking',
              balance: 1500.50,
              currency_code: 'EUR',
              bank: { name: 'BNP Paribas' },
              iban: 'FR7612345678901234567890',
              number: '1234567890'
            },
            {
              id: 'bridge_account_2',
              name: 'Livret A',
              type: 'savings',
              balance: 5000.00,
              currency_code: 'EUR',
              bank: { name: 'BNP Paribas' }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockBridgeResponse);

      const result = await oauthService.fetchAccounts('bridge', 'test_access_token');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        externalId: 'bridge_account_1',
        name: 'Compte Courant',
        type: 'checking',
        balance: 1500.50,
        currency: 'EUR',
        bankName: 'BNP Paribas',
        iban: 'FR7612345678901234567890',
        number: '1234567890'
      });
    });

    test('should fetch and normalize Budget Insight accounts', async () => {
      const mockBIResponse = {
        data: {
          accounts: [
            {
              id: 12345,
              name: 'Compte Principal',
              type: 'bank',
              balance: 250000, // In cents
              currency: { symbol: 'EUR' },
              bank: { name: 'Crédit Mutuel' }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockBIResponse);

      const result = await oauthService.fetchAccounts('budgetinsight', 'test_access_token');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        externalId: '12345',
        name: 'Compte Principal',
        type: 'checking', // Mapped from 'bank'
        balance: 2500.00, // Converted from cents
        currency: 'EUR',
        bankName: 'Crédit Mutuel',
        iban: undefined,
        number: undefined
      });
    });

    test('should fetch and normalize Tink accounts', async () => {
      const mockTinkResponse = {
        data: {
          accounts: [
            {
              id: 'tink_account_1',
              name: 'Sparkonto',
              type: 'SAVINGS',
              balance: 10000.00,
              currencyCode: 'SEK',
              financialInstitutionId: 'swedbank',
              identifiers: { iban: 'SE1234567890123456789012' },
              accountNumber: 'SE-123456-7890'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockTinkResponse);

      const result = await oauthService.fetchAccounts('tink', 'test_access_token');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        externalId: 'tink_account_1',
        name: 'Sparkonto',
        type: 'savings',
        balance: 10000.00,
        currency: 'SEK',
        bankName: 'swedbank',
        iban: 'SE1234567890123456789012',
        number: 'SE-123456-7890'
      });
    });

    test('should handle empty accounts response', async () => {
      const mockEmptyResponse = {
        data: {
          resources: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockEmptyResponse);

      const result = await oauthService.fetchAccounts('bridge', 'test_access_token');

      expect(result).toEqual([]);
    });
  });

  describe('fetchTransactions', () => {
    test('should fetch and normalize Bridge API transactions', async () => {
      const mockTransactionsResponse = {
        data: {
          resources: [
            {
              id: 'bridge_tx_1',
              amount: -25.50,
              description: 'Supermarket payment',
              date: '2024-01-15',
              category: { name: 'Groceries' },
              merchant: { name: 'Carrefour' }
            },
            {
              id: 'bridge_tx_2',
              amount: 2500.00,
              description: 'Salary deposit',
              date: '2024-01-01'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockTransactionsResponse);

      const result = await oauthService.fetchTransactions(
        'bridge',
        'test_access_token',
        'account_id',
        { since: '2024-01-01', limit: 50 }
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        externalId: 'bridge_tx_1',
        amount: -25.50,
        description: 'Supermarket payment',
        date: '2024-01-15',
        category: 'Groceries',
        merchant: 'Carrefour',
        type: 'debit'
      });
      expect(result[1].type).toBe('credit');
    });
  });

  describe('revokeToken', () => {
    test('should attempt to revoke token', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const result = await oauthService.revokeToken('bridge', 'test_access_token');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.bridgeapi.io/v2/oauth/revoke',
        { token: 'test_access_token' },
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test_access_token',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('should handle revocation failure gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Revocation not supported'));

      const result = await oauthService.revokeToken('bridge', 'test_access_token');

      expect(result).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    test('should generate secure state with timestamp and hash', () => {
      mockRandomBytes.mockReturnValue(Buffer.from('random_test_bytes', 'utf8'));

      const state = oauthService.generateSecureState('test_user_id');

      expect(state).toMatch(/^\d+:[a-f0-9]{64}$/);

      const [timestamp, hash] = state.split(':');
      expect(parseInt(timestamp)).toBeCloseTo(Date.now(), -1000);
    });

    test('should generate code verifier and challenge', () => {
      mockRandomBytes.mockReturnValue(Buffer.from('test_verifier_bytes_32_chars_long!', 'utf8'));

      const verifier = oauthService.generateCodeVerifier();
      const challenge = oauthService.generateCodeChallenge(verifier);

      expect(verifier).toBe(Buffer.from('test_verifier_bytes_32_chars_long!', 'utf8').toString('base64url'));
      expect(challenge).toBeTruthy();
      expect(challenge).not.toBe(verifier);
    });

    test('should map account types correctly', () => {
      // Bridge API types
      expect(oauthService.mapAccountType('checking')).toBe('checking');
      expect(oauthService.mapAccountType('savings')).toBe('savings');
      expect(oauthService.mapAccountType('investment')).toBe('investment');

      // Budget Insight types
      expect(oauthService.mapAccountType('bank')).toBe('checking');
      expect(oauthService.mapAccountType('card')).toBe('checking');
      expect(oauthService.mapAccountType('saving')).toBe('savings');

      // Tink types
      expect(oauthService.mapAccountType('CHECKING')).toBe('checking');
      expect(oauthService.mapAccountType('SAVINGS')).toBe('savings');
      expect(oauthService.mapAccountType('CREDIT_CARD')).toBe('checking');

      // Unknown type should default to checking
      expect(oauthService.mapAccountType('unknown_type')).toBe('checking');
    });
  });
});