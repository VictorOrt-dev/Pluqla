const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../src/app');
const { createTestUser, generateAuthToken, cleanupTestData } = require('../helpers/testHelpers');

const prisma = new PrismaClient();

describe('Financial Dashboard Integration Tests', () => {
  let testUser;
  let authToken;
  let testAccount;

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

  beforeEach(async () => {
    // Create test account for each test - vérifier que l'utilisateur existe
    if (testUser && testUser.id) {
      testAccount = await prisma.account.create({
        data: {
          userId: testUser.id,
          name: 'Test Checking Account',
          type: 'checking',
          provider: 'manual',
          balance: 5000,
          currency: 'EUR'
        }
      });
    }
  });

  afterEach(async () => {
    // Clean up test account after each test
    if (testAccount) {
      await prisma.account.delete({ where: { id: testAccount.id } });
    }
  });

  describe('GET /api/financial/dashboard', () => {
    test('should return financial dashboard data for authenticated user', async () => {
      const response = await request(app)
        .get('/api/financial/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('accounts');
      expect(response.body.data).toHaveProperty('insights');
      expect(response.body.data.summary).toHaveProperty('netWorth');
      expect(response.body.data.summary).toHaveProperty('totalAssets');
      expect(response.body.data.accounts).toBeInstanceOf(Array);
    });

    test('should return 401 for unauthenticated user', async () => {
      await request(app)
        .get('/api/financial/dashboard')
        .expect(401);
    });

    test('should support language parameter', async () => {
      const response = await request(app)
        .get('/api/financial/dashboard?lang=en')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Insights should be in English when lang=en is specified
      expect(response.body.data.insights).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/financial/accounts', () => {
    test('should create a new account with valid data', async () => {
      const accountData = {
        name: 'Test Savings Account',
        type: 'savings',
        provider: 'manual',
        balance: 10000,
        currency: 'EUR'
      };

      const response = await request(app)
        .post('/api/financial/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(accountData.name);
      expect(response.body.data.type).toBe(accountData.type);
      expect(response.body.data.balance).toBe(accountData.balance);

      // Clean up created account
      await prisma.account.delete({ where: { id: response.body.data.id } });
    });

    test('should reject invalid account type', async () => {
      const accountData = {
        name: 'Invalid Account',
        type: 'invalid_type',
        provider: 'manual',
        balance: 1000
      };

      await request(app)
        .post('/api/financial/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(400);
    });

    test('should reject negative balance', async () => {
      const accountData = {
        name: 'Negative Balance Account',
        type: 'checking',
        provider: 'manual',
        balance: -1000
      };

      await request(app)
        .post('/api/financial/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(400);
    });
  });

  describe('GET /api/financial/accounts', () => {
    test('should return user accounts', async () => {
      const response = await request(app)
        .get('/api/financial/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('balance');
    });

    test('should filter accounts by type', async () => {
      const response = await request(app)
        .get('/api/financial/accounts?type=checking')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(account => {
        expect(account.type).toBe('checking');
      });
    });
  });

  describe('POST /api/financial/assets', () => {
    test('should create a new asset', async () => {
      const assetData = {
        name: 'Apple Inc.',
        type: 'stock',
        symbol: 'AAPL',
        quantity: 10,
        unitValue: 150.50,
        currency: 'USD',
        accountId: testAccount.id
      };

      const response = await request(app)
        .post('/api/financial/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(assetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(assetData.name);
      expect(response.body.data.totalValue).toBe(assetData.quantity * assetData.unitValue);

      // Clean up created asset
      await prisma.asset.delete({ where: { id: response.body.data.id } });
    });

    test('should reject invalid asset type', async () => {
      const assetData = {
        name: 'Invalid Asset',
        type: 'invalid_type',
        quantity: 1,
        unitValue: 100
      };

      await request(app)
        .post('/api/financial/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(assetData)
        .expect(400);
    });
  });

  describe('GET /api/financial/net-worth', () => {
    beforeEach(async () => {
      // Create test asset and liability
      await prisma.asset.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Test Stock',
          type: 'stock',
          quantity: 5,
          unitValue: 100,
          totalValue: 500,
          currency: 'EUR'
        }
      });

      await prisma.liability.create({
        data: {
          userId: testUser.id,
          accountId: testAccount.id,
          name: 'Test Loan',
          type: 'personal_loan',
          balance: 2000,
          currency: 'EUR'
        }
      });
    });

    test('should return net worth evolution', async () => {
      const response = await request(app)
        .get('/api/financial/net-worth')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('snapshots');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('should support period filtering', async () => {
      const response = await request(app)
        .get('/api/financial/net-worth?period=1m')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('1m');
    });
  });

  describe('POST /api/financial/net-worth/snapshot', () => {
    test('should create net worth snapshot', async () => {
      const response = await request(app)
        .post('/api/financial/net-worth/snapshot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('netWorth');
      expect(response.body.data).toHaveProperty('totalAssets');
      expect(response.body.data).toHaveProperty('totalLiabilities');

      // Clean up created snapshot
      await prisma.netWorthSnapshot.delete({ where: { id: response.body.data.id } });
    });
  });

  describe('GET /api/financial/goals', () => {
    test('should return user financial goals', async () => {
      // Create test goal
      const testGoal = await prisma.financialGoal.create({
        data: {
          userId: testUser.id,
          name: 'Emergency Fund',
          type: 'emergency_fund',
          targetAmount: 10000,
          currentAmount: 2500
        }
      });

      const response = await request(app)
        .get('/api/financial/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('progressPercentage');

      // Clean up test goal
      await prisma.financialGoal.delete({ where: { id: testGoal.id } });
    });

    test('should filter goals by status', async () => {
      const response = await request(app)
        .get('/api/financial/goals?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(goal => {
        expect(goal.status).toBe('active');
      });
    });
  });

  describe('POST /api/financial/goals', () => {
    test('should create a new financial goal', async () => {
      const goalData = {
        name: 'Vacation Fund',
        type: 'savings',
        targetAmount: 5000,
        targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/financial/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(goalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(goalData.name);
      expect(response.body.data.targetAmount).toBe(goalData.targetAmount);

      // Clean up created goal
      await prisma.financialGoal.delete({ where: { id: response.body.data.id } });
    });

    test('should reject invalid goal type', async () => {
      const goalData = {
        name: 'Invalid Goal',
        type: 'invalid_type',
        targetAmount: 1000
      };

      await request(app)
        .post('/api/financial/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(goalData)
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to dashboard endpoint', async () => {
      // Make multiple rapid requests
      const requests = Array(15).fill().map(() =>
        request(app)
          .get('/api/financial/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimited = responses.filter(res => res.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    test('should sanitize input data', async () => {
      const accountData = {
        name: '  Test Account  ',
        type: 'checking',
        provider: 'manual',
        balance: '1000.50' // String that should be converted to number
      };

      const response = await request(app)
        .post('/api/financial/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201);

      expect(response.body.data.name).toBe('Test Account'); // Trimmed
      expect(response.body.data.balance).toBe(1000.50); // Converted to number

      // Clean up
      await prisma.account.delete({ where: { id: response.body.data.id } });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Try to create account with invalid user ID
      const accountData = {
        name: 'Test Account',
        type: 'checking',
        provider: 'manual',
        balance: 1000
      };

      // Use invalid auth token
      const response = await request(app)
        .post('/api/financial/accounts')
        .set('Authorization', 'Bearer invalid_token')
        .send(accountData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return appropriate error for missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Account'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/financial/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // Personal Finance Tracking Tests
  describe('Personal Finance Tracking', () => {
    let testExpense;
    let testSuggestion;

    describe('GET /api/financial/summary', () => {
      beforeEach(async () => {
        // Create test expense
        testExpense = await prisma.expense.create({
          data: {
            userId: testUser.id,
            category: 'alimentation',
            amount: 50.75,
            description: 'Test grocery shopping',
            date: new Date()
          }
        });
      });

      afterEach(async () => {
        if (testExpense) {
          await prisma.expense.delete({ where: { id: testExpense.id } });
        }
      });

      test('should return financial summary with expenses and income data', async () => {
        const response = await request(app)
          .get('/api/financial/summary?lang=fr&period=month')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('period');
        expect(response.body.data).toHaveProperty('totals');
        expect(response.body.data).toHaveProperty('expenses');
        expect(response.body.data).toHaveProperty('income');
        expect(response.body.data.totals).toHaveProperty('expenses');
        expect(response.body.data.totals).toHaveProperty('income');
        expect(response.body.data.totals).toHaveProperty('netSavings');
        expect(response.body.data.totals).toHaveProperty('savingsRate');
      });

      test('should support different periods', async () => {
        const periods = ['week', 'month', 'year'];

        for (const period of periods) {
          const response = await request(app)
            .get(`/api/financial/summary?period=${period}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.period).toBe(period);
        }
      });
    });

    describe('POST /api/financial/expenses', () => {
      test('should create a new expense', async () => {
        const expenseData = {
          category: 'transport',
          amount: 25.50,
          description: 'Bus ticket',
          merchant: 'RATP',
          paymentMethod: 'card'
        };

        const response = await request(app)
          .post('/api/financial/expenses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(expenseData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.category).toBe(expenseData.category);
        expect(response.body.data.amount).toBe(expenseData.amount);
        expect(response.body.data.description).toBe(expenseData.description);

        // Clean up
        await prisma.expense.delete({ where: { id: response.body.data.id } });
      });

      test('should reject invalid category', async () => {
        const expenseData = {
          category: 'invalid_category',
          amount: 25.50,
          description: 'Test expense'
        };

        await request(app)
          .post('/api/financial/expenses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(expenseData)
          .expect(400);
      });

      test('should reject negative amount', async () => {
        const expenseData = {
          category: 'alimentation',
          amount: -25.50,
          description: 'Test expense'
        };

        await request(app)
          .post('/api/financial/expenses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(expenseData)
          .expect(400);
      });
    });

    describe('GET /api/financial/expenses', () => {
      beforeEach(async () => {
        // Create multiple test expenses
        await prisma.expense.createMany({
          data: [
            {
              userId: testUser.id,
              category: 'alimentation',
              amount: 30,
              description: 'Grocery 1',
              date: new Date()
            },
            {
              userId: testUser.id,
              category: 'transport',
              amount: 20,
              description: 'Metro',
              date: new Date()
            }
          ]
        });
      });

      test('should return user expenses with pagination', async () => {
        const response = await request(app)
          .get('/api/financial/expenses?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('expenses');
        expect(response.body.data).toHaveProperty('pagination');
        expect(response.body.data.pagination).toHaveProperty('page');
        expect(response.body.data.pagination).toHaveProperty('total');
        expect(Array.isArray(response.body.data.expenses)).toBe(true);
      });

      test('should filter expenses by category', async () => {
        const response = await request(app)
          .get('/api/financial/expenses?category=alimentation')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.expenses.forEach(expense => {
          expect(expense.category).toBe('alimentation');
        });
      });

      test('should filter expenses by period', async () => {
        const response = await request(app)
          .get('/api/financial/expenses?period=month')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe('month');
      });
    });

    describe('PUT /api/financial/expenses/:id', () => {
      beforeEach(async () => {
        testExpense = await prisma.expense.create({
          data: {
            userId: testUser.id,
            category: 'alimentation',
            amount: 50,
            description: 'Original expense'
          }
        });
      });

      test('should update expense successfully', async () => {
        const updateData = {
          amount: 75,
          description: 'Updated expense'
        };

        const response = await request(app)
          .put(`/api/financial/expenses/${testExpense.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.amount).toBe(updateData.amount);
        expect(response.body.data.description).toBe(updateData.description);
      });

      test('should return 404 for non-existent expense', async () => {
        await request(app)
          .put('/api/financial/expenses/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 100 })
          .expect(404);
      });
    });

    describe('DELETE /api/financial/expenses/:id', () => {
      beforeEach(async () => {
        testExpense = await prisma.expense.create({
          data: {
            userId: testUser.id,
            category: 'alimentation',
            amount: 50,
            description: 'Expense to delete'
          }
        });
      });

      test('should delete expense successfully', async () => {
        const response = await request(app)
          .delete(`/api/financial/expenses/${testExpense.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify expense is deleted
        const deletedExpense = await prisma.expense.findUnique({
          where: { id: testExpense.id }
        });
        expect(deletedExpense).toBeNull();
        testExpense = null; // Prevent cleanup
      });
    });

    describe('GET /api/financial/suggestions', () => {
      beforeEach(async () => {
        // Create test suggestion
        testSuggestion = await prisma.financialSuggestion.create({
          data: {
            userId: testUser.id,
            type: 'expense_reduction',
            title: 'Reduce food expenses',
            description: 'Try cooking at home more often',
            impact: 'medium',
            potentialSaving: 100,
            actionRequired: 'Plan meals and shop with a list',
            priority: 7,
            generatedBy: 'ai'
          }
        });
      });

      afterEach(async () => {
        if (testSuggestion) {
          await prisma.financialSuggestion.delete({ where: { id: testSuggestion.id } });
        }
      });

      test('should return financial suggestions', async () => {
        const response = await request(app)
          .get('/api/financial/suggestions?lang=fr&limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        if (response.body.data.length > 0) {
          expect(response.body.data[0]).toHaveProperty('title');
          expect(response.body.data[0]).toHaveProperty('description');
          expect(response.body.data[0]).toHaveProperty('impact');
          expect(response.body.data[0]).toHaveProperty('priority');
        }
      });

      test('should filter suggestions by type', async () => {
        const response = await request(app)
          .get('/api/financial/suggestions?type=expense_reduction')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach(suggestion => {
          expect(suggestion.type).toBe('expense_reduction');
        });
      });

      test('should filter suggestions by status', async () => {
        const response = await request(app)
          .get('/api/financial/suggestions?status=active')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach(suggestion => {
          expect(suggestion.status).toBe('active');
        });
      });
    });

    describe('POST /api/financial/suggestions/dismiss/:id', () => {
      beforeEach(async () => {
        testSuggestion = await prisma.financialSuggestion.create({
          data: {
            userId: testUser.id,
            type: 'budget_optimization',
            title: 'Test suggestion',
            description: 'Test description',
            impact: 'low',
            potentialSaving: 50,
            actionRequired: 'Test action',
            priority: 5,
            generatedBy: 'ai'
          }
        });
      });

      test('should dismiss suggestion successfully', async () => {
        const response = await request(app)
          .post(`/api/financial/suggestions/dismiss/${testSuggestion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('dismissed');
      });

      test('should return 404 for non-existent suggestion', async () => {
        await request(app)
          .post('/api/financial/suggestions/dismiss/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('GET /api/financial/categories', () => {
      test('should return expense categories', async () => {
        const response = await request(app)
          .get('/api/financial/categories?lang=fr')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('displayName');
        expect(response.body.data[0]).toHaveProperty('icon');
        expect(response.body.data[0]).toHaveProperty('color');
      });

      test('should return localized category names', async () => {
        const responseEn = await request(app)
          .get('/api/financial/categories?lang=en')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const responseFr = await request(app)
          .get('/api/financial/categories?lang=fr')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Find alimentation category in both responses
        const aliEn = responseEn.body.data.find(cat => cat.name === 'alimentation');
        const aliFr = responseFr.body.data.find(cat => cat.name === 'alimentation');

        expect(aliEn.displayName).toBe('Food & Dining');
        expect(aliFr.displayName).toBe('Alimentation');
      });
    });

    describe('GET /api/financial/income', () => {
      beforeEach(async () => {
        // Create test income
        await prisma.income.create({
          data: {
            userId: testUser.id,
            name: 'Test Salary',
            type: 'salary',
            amount: 3000,
            frequency: 'monthly',
            isActive: true
          }
        });
      });

      test('should return income details with monthly equivalents', async () => {
        const response = await request(app)
          .get('/api/financial/income')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('incomes');
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data.summary).toHaveProperty('totalMonthly');
        expect(response.body.data.summary).toHaveProperty('sourcesCount');
        expect(response.body.data.summary).toHaveProperty('byType');

        if (response.body.data.incomes.length > 0) {
          expect(response.body.data.incomes[0]).toHaveProperty('monthlyEquivalent');
        }
      });
    });
  });
});