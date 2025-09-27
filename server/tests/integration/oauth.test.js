const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../src/app');
const { createTestUser, generateAuthToken, cleanupTestData } = require('../helpers/testHelpers');

const prisma = new PrismaClient();

describe('OAuth Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user and auth token
    testUser = await createTestUser();
    authToken = generateAuthToken(testUser.id);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(testUser.id);
    await prisma.$disconnect();
  });

  describe('POST /api/oauth/authorize', () => {
    beforeEach(async () => {
      // Create valid consent for financial aggregation
      await prisma.userConsent.create({
        data: {
          userId: testUser.id,
          consentType: 'financial_aggregation',
          purpose: 'Connect bank accounts for financial dashboard',
          legalBasis: 'consent',
          granted: true,
          grantedAt: new Date(),
          version: '1.0'
        }
      });
    });

    afterEach(async () => {
      // Clean up consent records
      await prisma.userConsent.deleteMany({
        where: { userId: testUser.id }
      });
    });

    test('should initiate OAuth authorization with valid provider', async () => {
      const authData = {
        provider: 'bridge',
        returnUrl: 'https://test.com/callback'
      };

      const response = await request(app)
        .post('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(authData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authUrl');
      expect(response.body.data).toHaveProperty('state');
      expect(response.body.data).toHaveProperty('provider', 'bridge');
      expect(response.body.data.authUrl).toContain('api.bridgeapi.io');
    });

    test('should reject invalid provider', async () => {
      const authData = {
        provider: 'invalid_provider'
      };

      await request(app)
        .post('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(authData)
        .expect(400);
    });

    test('should reject authorization without financial aggregation consent', async () => {
      // Remove consent
      await prisma.userConsent.deleteMany({
        where: { userId: testUser.id }
      });

      const authData = {
        provider: 'bridge'
      };

      const response = await request(app)
        .post('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .send(authData)
        .expect(403);

      expect(response.body.error).toBe('CONSENT_REQUIRED');
    });

    test('should reject unauthenticated requests', async () => {
      const authData = {
        provider: 'bridge'
      };

      await request(app)
        .post('/api/oauth/authorize')
        .send(authData)
        .expect(401);
    });
  });

  describe('GET /api/oauth/status', () => {
    beforeEach(async () => {
      // Create test accounts for different providers
      await prisma.account.createMany({
        data: [
          {
            userId: testUser.id,
            name: 'Bridge Test Account',
            type: 'checking',
            provider: 'bridge',
            balance: 1500,
            currency: 'EUR',
            isActive: true,
            lastSyncAt: new Date()
          },
          {
            userId: testUser.id,
            name: 'Tink Test Account',
            type: 'savings',
            provider: 'tink',
            balance: 5000,
            currency: 'EUR',
            isActive: true,
            lastSyncAt: new Date(),
            syncError: 'Token expired'
          }
        ]
      });
    });

    afterEach(async () => {
      // Clean up test accounts
      await prisma.account.deleteMany({
        where: { userId: testUser.id }
      });
    });

    test('should return connection status for all providers', async () => {
      const response = await request(app)
        .get('/api/oauth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('connections');
      expect(response.body.data).toHaveProperty('totalConnectedProviders');
      expect(response.body.data).toHaveProperty('totalAccounts');

      const connections = response.body.data.connections;
      expect(Array.isArray(connections)).toBe(true);
      expect(connections.length).toBe(3); // bridge, budgetinsight, tink

      // Find bridge connection
      const bridgeConnection = connections.find(c => c.provider === 'bridge');
      expect(bridgeConnection.connected).toBe(true);
      expect(bridgeConnection.accountCount).toBe(1);
      expect(bridgeConnection.totalBalance).toBe(1500);

      // Find tink connection with error
      const tinkConnection = connections.find(c => c.provider === 'tink');
      expect(tinkConnection.connected).toBe(true);
      expect(tinkConnection.hasErrors).toBe(true);

      // Find budgetinsight (not connected)
      const biConnection = connections.find(c => c.provider === 'budgetinsight');
      expect(biConnection.connected).toBe(false);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/oauth/status')
        .expect(401);
    });
  });

  describe('DELETE /api/oauth/disconnect/:provider', () => {
    let testAccount;

    beforeEach(async () => {
      // Create test account with encrypted credentials
      testAccount = await prisma.account.create({
        data: {
          userId: testUser.id,
          name: 'Test Bank Account',
          type: 'checking',
          provider: 'bridge',
          balance: 2000,
          currency: 'EUR',
          isActive: true,
          encryptedCredentials: 'encrypted_test_credentials'
        }
      });
    });

    afterEach(async () => {
      // Clean up test accounts
      if (testAccount) {
        await prisma.account.deleteMany({
          where: { id: testAccount.id }
        });
      }
    });

    test('should disconnect provider and deactivate accounts', async () => {
      const response = await request(app)
        .delete('/api/oauth/disconnect/bridge')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe('bridge');
      expect(response.body.data.accountsDisconnected).toBe(1);

      // Verify account was deactivated
      const updatedAccount = await prisma.account.findUnique({
        where: { id: testAccount.id }
      });

      expect(updatedAccount.isActive).toBe(false);
      expect(updatedAccount.encryptedCredentials).toBeNull();
      expect(updatedAccount.syncError).toBe('User disconnected');
    });

    test('should return 404 for provider with no accounts', async () => {
      const response = await request(app)
        .delete('/api/oauth/disconnect/tink')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('NO_ACCOUNTS');
    });

    test('should validate provider parameter', async () => {
      await request(app)
        .delete('/api/oauth/disconnect/invalid_provider')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /api/oauth/refresh/:provider', () => {
    let testAccount;

    beforeEach(async () => {
      // Create account with encrypted credentials
      testAccount = await prisma.account.create({
        data: {
          userId: testUser.id,
          name: 'Test Account for Refresh',
          type: 'checking',
          provider: 'bridge',
          balance: 1000,
          currency: 'EUR',
          isActive: true,
          encryptedCredentials: 'test_encrypted_credentials'
        }
      });
    });

    afterEach(async () => {
      if (testAccount) {
        await prisma.account.deleteMany({
          where: { id: testAccount.id }
        });
      }
    });

    test('should return account information for refresh attempt', async () => {
      // Since we're testing without real OAuth credentials, this will attempt refresh
      const response = await request(app)
        .post('/api/oauth/refresh/bridge')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe('bridge');
      expect(response.body.data).toHaveProperty('tokensRefreshed');
      expect(response.body.data).toHaveProperty('refreshErrors');
    });

    test('should return 404 for provider with no accounts', async () => {
      const response = await request(app)
        .post('/api/oauth/refresh/tink')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('NO_ACCOUNTS');
    });
  });

  describe('POST /api/oauth/consent', () => {
    test('should record user consent for financial aggregation', async () => {
      const consentData = {
        consentType: 'financial_aggregation',
        granted: true,
        purpose: 'Connect bank accounts for financial dashboard analysis',
        legalBasis: 'consent'
      };

      const response = await request(app)
        .post('/api/oauth/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('consentId');
      expect(response.body.data.type).toBe('financial_aggregation');
      expect(response.body.data.granted).toBe(true);

      // Verify consent was stored in database
      const storedConsent = await prisma.userConsent.findFirst({
        where: {
          userId: testUser.id,
          consentType: 'financial_aggregation'
        }
      });

      expect(storedConsent).toBeTruthy();
      expect(storedConsent.granted).toBe(true);
      expect(storedConsent.purpose).toBe(consentData.purpose);
    });

    test('should record consent withdrawal', async () => {
      const consentData = {
        consentType: 'transaction_categorization',
        granted: false,
        purpose: 'Withdraw consent for automatic transaction categorization'
      };

      const response = await request(app)
        .post('/api/oauth/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData)
        .expect(200);

      expect(response.body.data.granted).toBe(false);
    });

    test('should validate consent type', async () => {
      const consentData = {
        consentType: 'invalid_consent_type',
        granted: true,
        purpose: 'Invalid consent type test'
      };

      await request(app)
        .post('/api/oauth/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData)
        .expect(400);
    });

    test('should validate purpose length', async () => {
      const consentData = {
        consentType: 'financial_aggregation',
        granted: true,
        purpose: 'Short' // Too short
      };

      await request(app)
        .post('/api/oauth/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData)
        .expect(400);
    });
  });

  describe('GET /api/oauth/consent', () => {
    beforeEach(async () => {
      // Create test consents
      await prisma.userConsent.createMany({
        data: [
          {
            userId: testUser.id,
            consentType: 'financial_aggregation',
            purpose: 'Connect bank accounts',
            legalBasis: 'consent',
            granted: true,
            grantedAt: new Date(),
            version: '1.0'
          },
          {
            userId: testUser.id,
            consentType: 'transaction_categorization',
            purpose: 'Automatic categorization',
            legalBasis: 'consent',
            granted: false,
            withdrawnAt: new Date(),
            version: '1.0'
          }
        ]
      });
    });

    afterEach(async () => {
      await prisma.userConsent.deleteMany({
        where: { userId: testUser.id }
      });
    });

    test('should return user consent status', async () => {
      const response = await request(app)
        .get('/api/oauth/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('consents');
      expect(response.body.data).toHaveProperty('hasFinancialAggregationConsent');
      expect(response.body.data).toHaveProperty('lastUpdated');

      expect(response.body.data.hasFinancialAggregationConsent).toBe(true);

      const consents = response.body.data.consents;
      expect(consents.financial_aggregation).toBeTruthy();
      expect(consents.financial_aggregation.granted).toBe(true);
      expect(consents.transaction_categorization).toBeTruthy();
      expect(consents.transaction_categorization.granted).toBe(false);
    });
  });

  describe('GET /api/oauth/providers', () => {
    test('should return available OAuth providers', async () => {
      const response = await request(app)
        .get('/api/oauth/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('providers');
      expect(response.body.data).toHaveProperty('totalProviders');
      expect(response.body.data).toHaveProperty('psd2Compliant');

      const providers = response.body.data.providers;
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBe(3);

      // Check provider structure
      providers.forEach(provider => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('description');
        expect(provider).toHaveProperty('countries');
        expect(provider).toHaveProperty('capabilities');
        expect(provider).toHaveProperty('psd2Compliant');
        expect(provider).toHaveProperty('logoUrl');
      });

      // Verify specific providers
      const bridgeProvider = providers.find(p => p.id === 'bridge');
      expect(bridgeProvider.name).toBe('Bridge API');
      expect(bridgeProvider.capabilities).toContain('accounts');
      expect(bridgeProvider.psd2Compliant).toBe(true);

      expect(response.body.data.psd2Compliant).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to OAuth endpoints', async () => {
      // Test authorization endpoint rate limiting
      const authData = {
        provider: 'bridge'
      };

      // Create consent first
      await prisma.userConsent.create({
        data: {
          userId: testUser.id,
          consentType: 'financial_aggregation',
          purpose: 'Test rate limiting',
          legalBasis: 'consent',
          granted: true,
          grantedAt: new Date(),
          version: '1.0'
        }
      });

      // Make multiple rapid requests (rate limit is 5 per minute)
      const requests = Array(7).fill().map(() =>
        request(app)
          .post('/api/oauth/authorize')
          .set('Authorization', `Bearer ${authToken}`)
          .send(authData)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.filter(res => res.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Clean up
      await prisma.userConsent.deleteMany({
        where: { userId: testUser.id }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid authorization tokens gracefully', async () => {
      const response = await request(app)
        .get('/api/oauth/status')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing required parameters', async () => {
      const response = await request(app)
        .post('/api/oauth/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          granted: true
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});