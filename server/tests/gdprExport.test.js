const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');
const jwt = require('jsonwebtoken');

describe('GDPR Compliance - Data Export (Article 20: Right to Data Portability)', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user with comprehensive data
    testUser = await prisma.user.create({
      data: {
        email: 'gdpr-export-test@example.com',
        password: 'TestPassword123!',
        name: 'GDPR Export User',
        status: 'active',
        savedAmount: 150.0,
        monthlyGoal: 500.0,
        gamificationPoints: 100,
        isPremium: true
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

    // Create test transactions
    await prisma.transaction.create({
      data: {
        userId: testUser.id,
        amount: 25.0,
        category: 'alimentation',
        description: 'Groceries',
        type: 'saving'
      }
    });

    await prisma.transaction.create({
      data: {
        userId: testUser.id,
        amount: 15.5,
        category: 'transport',
        description: 'Bus ticket',
        type: 'expense'
      }
    });

    // Create test consent
    await prisma.userConsent.create({
      data: {
        userId: testUser.id,
        consentType: 'data_processing',
        purpose: 'Financial tracking',
        legalBasis: 'consent',
        granted: true,
        grantedAt: new Date()
      }
    });

    // Create test expense
    await prisma.expense.create({
      data: {
        userId: testUser.id,
        category: 'alimentation',
        amount: 45.0,
        description: 'Restaurant'
      }
    });

    // Create budget plan
    await prisma.budgetPlan.create({
      data: {
        userId: testUser.id,
        name: 'Monthly Budget',
        type: 'monthly',
        totalBudget: 1000.0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        categories: JSON.stringify([
          { category: 'alimentation', budget: 300 },
          { category: 'transport', budget: 150 }
        ])
      }
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } });
    await prisma.userConsent.deleteMany({ where: { userId: testUser.id } });
    await prisma.expense.deleteMany({ where: { userId: testUser.id } });
    await prisma.budgetPlan.deleteMany({ where: { userId: testUser.id } });
    await prisma.dataProcessingLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  describe('GET /api/compliance/user/export-data', () => {
    it('should export all user data in JSON format', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.gdprCompliant).toBe(true);
      expect(response.body.format).toBe('JSON');
      expect(response.body.exportedAt).toBeTruthy();
      expect(response.body.userData).toBeTruthy();
    });

    it('should include user profile data', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.userData;

      expect(userData.id).toBe(testUser.id);
      expect(userData.email).toBe('gdpr-export-test@example.com');
      expect(userData.name).toBe('GDPR Export User');
      expect(userData.savedAmount).toBe(150.0);
      expect(userData.monthlyGoal).toBe(500.0);
      expect(userData.isPremium).toBe(true);
    });

    it('should exclude sensitive fields like password', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.userData;

      expect(userData.password).toBeUndefined();
      expect(userData.emailVerificationToken).toBeUndefined();
    });

    it('should include transaction history', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.userData;

      expect(userData.transactions).toBeTruthy();
      expect(Array.isArray(userData.transactions)).toBe(true);
      expect(userData.transactions.length).toBeGreaterThan(0);

      const transaction = userData.transactions[0];
      expect(transaction.amount).toBeTruthy();
      expect(transaction.category).toBeTruthy();
      expect(transaction.description).toBeTruthy();
    });

    it('should include consent records', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.userData;

      expect(userData.consents).toBeTruthy();
      expect(Array.isArray(userData.consents)).toBe(true);
      expect(userData.consents.length).toBeGreaterThan(0);

      const consent = userData.consents[0];
      expect(consent.consentType).toBe('data_processing');
      expect(consent.purpose).toBeTruthy();
      expect(consent.legalBasis).toBe('consent');
    });

    it('should include expenses and budget plans', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.userData;

      expect(userData.expenses).toBeTruthy();
      expect(Array.isArray(userData.expenses)).toBe(true);
      expect(userData.expenses.length).toBeGreaterThan(0);

      expect(userData.budgetPlans).toBeTruthy();
      expect(Array.isArray(userData.budgetPlans)).toBe(true);
      expect(userData.budgetPlans.length).toBeGreaterThan(0);
    });

    it('should create data processing log for export', async () => {
      await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const logs = await prisma.dataProcessingLog.findMany({
        where: {
          userId: testUser.id,
          operation: 'EXPORT',
          dataType: 'personal'
        }
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].legalBasis).toBe('user_request');
      expect(logs[0].success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/compliance/user/export-data')
        .expect(401);
    });

    it('should set correct headers for file download', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('pluqla-data-export');
    });

    it('should return 400 for unsupported export format', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data?format=xml')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Unsupported format');
    });
  });

  describe('GDPR Compliance Verification', () => {
    it('should export data in machine-readable format', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify JSON structure is valid and parseable
      expect(typeof response.body).toBe('object');
      expect(response.body.userData).toBeTruthy();

      // Should be able to stringify/parse
      const jsonString = JSON.stringify(response.body);
      const parsed = JSON.parse(jsonString);
      expect(parsed.userData).toBeTruthy();
    });

    it('should include metadata about export', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.exportedAt).toBeTruthy();
      expect(response.body.format).toBe('JSON');
      expect(response.body.gdprCompliant).toBe(true);
      expect(response.body.dataController).toBe('Pluqla');
    });

    it('should export complete user financial profile', async () => {
      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.userData;

      // Verify all major data categories are included
      expect(userData.transactions).toBeDefined();
      expect(userData.expenses).toBeDefined();
      expect(userData.budgetPlans).toBeDefined();
      expect(userData.consents).toBeDefined();
      expect(userData.accounts).toBeDefined();
      expect(userData.assets).toBeDefined();
      expect(userData.liabilities).toBeDefined();
      expect(userData.incomes).toBeDefined();
      expect(userData.financialGoals).toBeDefined();
    });

    it('should handle large data exports without errors', async () => {
      // Create many transactions
      const transactions = [];
      for (let i = 0; i < 100; i++) {
        transactions.push({
          userId: testUser.id,
          amount: Math.random() * 100,
          category: 'alimentation',
          description: `Transaction ${i}`,
          type: 'saving'
        });
      }
      await prisma.transaction.createMany({ data: transactions });

      const response = await request(app)
        .get('/api/compliance/user/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.userData.transactions.length).toBeGreaterThanOrEqual(100);

      // Cleanup
      await prisma.transaction.deleteMany({
        where: {
          userId: testUser.id,
          description: { startsWith: 'Transaction ' }
        }
      });
    });
  });
});
