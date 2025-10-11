const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');
const jwt = require('jsonwebtoken');
const scaService = require('../src/services/scaService');

describe('PSD2 Compliance - Strong Customer Authentication (Article 97)', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'psd2-sca-test@example.com',
        password: 'TestPassword123!',
        name: 'PSD2 Test User',
        status: 'active',
        lastScaAt: new Date() // Recent SCA authentication
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        userId: testUser.id,
        type: 'access'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '15m',
        audience: 'plus-clair-users',
        issuer: 'plus-clair-app'
      }
    );
  });

  afterEach(async () => {
    // Cleanup
    await prisma.scaChallenge.deleteMany({ where: { userId: testUser.id } });
    await prisma.scaExemptionLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  describe('SCA Threshold Enforcement (€30 threshold)', () => {
    it('should NOT require SCA for transactions ≤ €30', async () => {
      const result = await scaService.requiresSCA(testUser.id, 25.0);

      expect(result.required).toBe(false);
      expect(result.reason).toContain('threshold');
    });

    it('should require SCA for transactions > €30', async () => {
      const result = await scaService.requiresSCA(testUser.id, 50.0);

      expect(result.required).toBe(true);
      expect(result.reason).toBe('amount_exceeds_threshold');
      expect(result.threshold).toBe(30);
    });

    it('should require SCA exactly at €30.01', async () => {
      const result = await scaService.requiresSCA(testUser.id, 30.01);

      expect(result.required).toBe(true);
    });
  });

  describe('90-Day Re-authentication Requirement', () => {
    it('should require SCA if last authentication > 90 days ago', async () => {
      // Set last SCA to 91 days ago
      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: testUser.id },
        data: { lastScaAt: ninetyOneDaysAgo }
      });

      const result = await scaService.requiresSCA(testUser.id, 25.0);

      expect(result.required).toBe(true);
      expect(result.reason).toBe('sca_expired');
      expect(result.daysSinceLastSca).toBeGreaterThan(90);
    });

    it('should NOT require SCA if authenticated within 90 days', async () => {
      // Set last SCA to 30 days ago
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: testUser.id },
        data: { lastScaAt: thirtyDaysAgo }
      });

      const result = await scaService.requiresSCA(testUser.id, 25.0);

      expect(result.required).toBe(false);
    });

    it('should require SCA if user has never authenticated', async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { lastScaAt: null }
      });

      const result = await scaService.requiresSCA(testUser.id, 10.0);

      expect(result.required).toBe(true);
      expect(result.reason).toBe('no_previous_sca');
    });
  });

  describe('SCA Exemptions', () => {
    it('should grant exemption for low value transactions (≤ €30)', async () => {
      const exemption = await scaService.checkScaExemption(testUser.id, 20.0);

      expect(exemption.exempt).toBe(true);
      expect(exemption.exemptionType).toBe('low_value');
      expect(exemption.reason).toContain('below SCA threshold');
    });

    it('should grant exemption for low risk transactions', async () => {
      const exemption = await scaService.checkScaExemption(testUser.id, 45.0, {
        riskScore: 0.1 // Low risk
      });

      expect(exemption.exempt).toBe(true);
      expect(exemption.exemptionType).toBe('low_risk');
    });

    it('should grant exemption for recurring payments', async () => {
      // Create a recurring payment history
      await prisma.expense.create({
        data: {
          userId: testUser.id,
          merchant: 'Netflix',
          amount: 15.99,
          category: 'entertainment',
          description: 'Monthly subscription',
          isRecurring: true
        }
      });

      const exemption = await scaService.checkScaExemption(testUser.id, 40.0, {
        merchant: 'Netflix',
        isRecurring: true
      });

      expect(exemption.exempt).toBe(true);
      expect(exemption.exemptionType).toBe('recurring_payment');

      // Cleanup
      await prisma.expense.deleteMany({
        where: { userId: testUser.id, merchant: 'Netflix' }
      });
    });

    it('should NOT grant exemption for high value, high risk transactions', async () => {
      const exemption = await scaService.checkScaExemption(testUser.id, 150.0, {
        riskScore: 0.8 // High risk
      });

      expect(exemption.exempt).toBe(false);
    });

    it('should log SCA exemptions for compliance audit', async () => {
      const mockReq = {
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' }
      };

      await scaService.logScaExemption(
        testUser.id,
        'test-transaction-123',
        {
          exemptionType: 'low_value',
          amount: 25.0,
          reason: 'Transaction below €30 threshold',
          riskScore: 0.2
        },
        mockReq
      );

      const logs = await prisma.scaExemptionLog.findMany({
        where: {
          userId: testUser.id,
          transactionId: 'test-transaction-123'
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].exemptionType).toBe('low_value');
      expect(logs[0].amount).toBe(25.0);
      expect(logs[0].riskScore).toBe(0.2);
    });
  });

  describe('SCA Challenge Flow', () => {
    it('should create SCA challenge for high-value transaction', async () => {
      const challenge = await scaService.createScaChallenge(
        testUser.id,
        'transaction-456',
        ['password', 'biometric']
      );

      expect(challenge).toBeTruthy();
      expect(challenge.userId).toBe(testUser.id);
      expect(challenge.transactionId).toBe('transaction-456');
      expect(challenge.status).toBe('pending');
      expect(challenge.expiresAt).toBeInstanceOf(Date);

      const allowedMethods = JSON.parse(challenge.allowedMethods);
      expect(allowedMethods).toContain('password');
      expect(allowedMethods).toContain('biometric');
    });

    it('should complete SCA challenge successfully', async () => {
      const challenge = await scaService.createScaChallenge(
        testUser.id,
        'transaction-789',
        ['password']
      );

      const result = await scaService.completeScaChallenge(challenge.id, 'password');

      expect(result.success).toBe(true);

      // Verify challenge is marked as completed
      const updatedChallenge = await prisma.scaChallenge.findUnique({
        where: { id: challenge.id }
      });

      expect(updatedChallenge.status).toBe('completed');
      expect(updatedChallenge.completedAt).toBeInstanceOf(Date);
      expect(updatedChallenge.verificationMethod).toBe('password');
    });

    it('should update user lastScaAt timestamp after successful challenge', async () => {
      const oldTimestamp = testUser.lastScaAt;

      const challenge = await scaService.createScaChallenge(
        testUser.id,
        'transaction-update-test',
        ['password']
      );

      await scaService.completeScaChallenge(challenge.id, 'password');

      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(updatedUser.lastScaAt).not.toEqual(oldTimestamp);
      expect(new Date(updatedUser.lastScaAt).getTime()).toBeGreaterThan(
        new Date(oldTimestamp).getTime()
      );
    });

    it('should fail challenge if expired', async () => {
      // Create challenge with past expiration
      const expiredChallenge = await prisma.scaChallenge.create({
        data: {
          userId: testUser.id,
          transactionId: 'expired-transaction',
          allowedMethods: JSON.stringify(['password']),
          challengeData: JSON.stringify({}),
          status: 'pending',
          expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        }
      });

      const result = await scaService.completeScaChallenge(expiredChallenge.id, 'password');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should lock challenge after 3 failed attempts', async () => {
      const challenge = await scaService.createScaChallenge(
        testUser.id,
        'lockout-test',
        ['password']
      );

      // Simulate 3 failed attempts
      await prisma.scaChallenge.update({
        where: { id: challenge.id },
        data: { attempts: 3 }
      });

      const result = await scaService.completeScaChallenge(challenge.id, 'password');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many attempts');

      const lockedChallenge = await prisma.scaChallenge.findUnique({
        where: { id: challenge.id }
      });

      expect(lockedChallenge.status).toBe('locked');
    });
  });

  describe('API Endpoints - SCA Check', () => {
    it('POST /api/sca/check-requirement should validate transaction', async () => {
      const response = await request(app)
        .post('/api/sca/check-requirement')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50.0,
          transactionType: 'payment'
        })
        .expect(200);

      expect(response.body.scaRequired).toBeDefined();
      expect(response.body.scaCheck).toBeTruthy();
      expect(response.body.exemption).toBeTruthy();
      expect(response.body.psd2Compliant).toBe(true);
    });

    it('POST /api/sca/create-challenge should create challenge', async () => {
      const response = await request(app)
        .post('/api/sca/create-challenge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId: 'api-test-transaction',
          amount: 75.0
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.challenge).toBeTruthy();
      expect(response.body.challenge.id).toBeTruthy();
      expect(response.body.challenge.expiresAt).toBeTruthy();
    });

    it('GET /api/sca/exemptions should require admin access', async () => {
      const response = await request(app)
        .get('/api/sca/exemptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('ACCESS_DENIED');
    });
  });

  describe('PSD2 Compliance Verification', () => {
    it('should enforce two-factor authentication for SCA', async () => {
      const challenge = await scaService.createScaChallenge(
        testUser.id,
        'two-factor-test',
        ['password', 'biometric']
      );

      const challengeData = JSON.parse(challenge.challengeData);
      expect(challengeData.requiredFactors).toBe(2);
    });

    it('should maintain audit trail of all SCA events', async () => {
      // Create and complete a challenge
      const challenge = await scaService.createScaChallenge(
        testUser.id,
        'audit-trail-test',
        ['password']
      );

      await scaService.completeScaChallenge(challenge.id, 'password');

      // Verify audit trail
      const challengeRecord = await prisma.scaChallenge.findUnique({
        where: { id: challenge.id }
      });

      expect(challengeRecord.createdAt).toBeTruthy();
      expect(challengeRecord.completedAt).toBeTruthy();
      expect(challengeRecord.verificationMethod).toBeTruthy();
      expect(challengeRecord.status).toBe('completed');
    });

    it('should respect PSD2 transaction threshold exactly', async () => {
      expect(scaService.SCA_THRESHOLD_AMOUNT).toBe(30);
    });

    it('should respect PSD2 90-day re-authentication rule', async () => {
      expect(scaService.SCA_REAUTHENTICATION_DAYS).toBe(90);
    });
  });
});
