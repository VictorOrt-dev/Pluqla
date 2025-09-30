# Testing Guide - Pluqla Backend

Comprehensive testing documentation for Pluqla's Better Auth integration and system testing.

## 🧪 Test Overview

Pluqla uses a multi-layered testing approach:

- **Unit Tests**: Individual component testing with Jest
- **Integration Tests**: API endpoint and service integration
- **End-to-End Tests**: Full user workflow testing with Playwright
- **Security Tests**: Authentication and authorization validation
- **Performance Tests**: Load testing and benchmarking

## 🚀 Quick Start

### Run All Tests

```bash
# Full test suite
npm test

# Backend tests only
cd server && npm test

# Frontend tests only
cd client && npm test

# Authentication-specific tests
npm run test:auth

# End-to-end tests
npm run test:e2e
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# Authentication coverage
npm run test:auth:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## 🔐 Authentication Testing

### Better Auth Test Suite

**Location**: `server/tests/auth/`

**Test Files**:
- `betterAuth.test.js` - Core Better Auth functionality
- `aiEndpointProtection.test.js` - AI endpoint security
- `legacyCompatibility.test.js` - JWT compatibility layer
- `roleBasedAccess.test.js` - RBAC validation
- `sessionManagement.test.js` - Session lifecycle

### Running Authentication Tests

```bash
# All authentication tests
npm run test:auth

# Specific test file
npm test -- tests/auth/betterAuth.test.js

# Watch mode for development
npm run test:auth:watch

# Coverage report
npm run test:auth:coverage
```

### Core Authentication Test Cases

**File**: `server/tests/auth/betterAuth.test.js`

```javascript
describe('Better Auth Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
    await seedTestData();
  });

  describe('User Registration', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'secure123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/sign-up')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.user).toMatchObject({
        email: userData.email,
        name: userData.name,
        role: 'user',
        isPremium: false
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject duplicate email addresses', async () => {
      await createTestUser({ email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          email: 'test@example.com',
          password: 'secure123',
          name: 'Duplicate User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email already exists');
    });

    it('should enforce password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          email: 'test@example.com',
          password: '123',        // Too short
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });
  });

  describe('User Login', () => {
    it('should authenticate valid credentials', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'secure123'
      });

      const response = await request(app)
        .post('/api/auth/sign-in')
        .send({
          email: 'test@example.com',
          password: 'secure123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.session).toBeDefined();

      // Check session cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(cookie =>
        cookie.includes('better-auth.session-token')
      )).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      await createTestUser({
        email: 'test@example.com',
        password: 'secure123'
      });

      const response = await request(app)
        .post('/api/auth/sign-in')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('Session Management', () => {
    it('should validate active sessions', async () => {
      const { sessionToken } = await createTestUserSession();

      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', `better-auth.session-token=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.session).toBeDefined();
    });

    it('should reject expired sessions', async () => {
      const { sessionToken } = await createExpiredSession();

      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', `better-auth.session-token=${sessionToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });

    it('should sign out users properly', async () => {
      const { sessionToken } = await createTestUserSession();

      const response = await request(app)
        .post('/api/auth/sign-out')
        .set('Cookie', `better-auth.session-token=${sessionToken}`);

      expect(response.status).toBe(200);

      // Verify session is invalidated
      const sessionCheck = await request(app)
        .get('/api/auth/session')
        .set('Cookie', `better-auth.session-token=${sessionToken}`);

      expect(sessionCheck.status).toBe(401);
    });
  });
});
```

### AI Endpoint Protection Tests

**File**: `server/tests/auth/aiEndpointProtection.test.js`

```javascript
describe('AI Endpoint Protection', () => {
  describe('Authentication Requirements', () => {
    it('should block unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/ai-secure/suggestions')
        .send({ category: 'groceries', amount: 50 });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should allow authenticated requests', async () => {
      const { sessionToken } = await createTestUserSession();

      const response = await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({ category: 'groceries', amount: 50 });

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toBeDefined();
    });
  });

  describe('PII Sanitization', () => {
    it('should sanitize email addresses', async () => {
      const { sessionToken, userId } = await createTestUserSession({
        email: 'john.doe@example.com'
      });

      const spy = jest.spyOn(aiService, 'getSuggestions');

      await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({
          description: 'Payment to john.doe@example.com',
          amount: 100
        });

      const aiRequest = spy.mock.calls[0][0];
      expect(aiRequest).not.toContain('john.doe@example.com');
      expect(aiRequest).toMatch(/user_email_[a-f0-9]{8}/);
    });

    it('should sanitize phone numbers', async () => {
      const { sessionToken } = await createTestUserSession();
      const spy = jest.spyOn(aiService, 'getSuggestions');

      await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({
          description: 'Call 555-123-4567 for support',
          amount: 50
        });

      const aiRequest = spy.mock.calls[0][0];
      expect(aiRequest).not.toContain('555-123-4567');
      expect(aiRequest).toMatch(/user_phone_[a-f0-9]{8}/);
    });

    it('should sanitize credit card numbers', async () => {
      const { sessionToken } = await createTestUserSession();
      const spy = jest.spyOn(aiService, 'getSuggestions');

      await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({
          description: 'Card ending 4532-1234-5678-9012',
          amount: 75
        });

      const aiRequest = spy.mock.calls[0][0];
      expect(aiRequest).not.toContain('4532-1234-5678-9012');
      expect(aiRequest).toContain('[CARD_REDACTED]');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce user tier limits', async () => {
      const { sessionToken } = await createTestUserSession({ role: 'user' });

      // Make requests up to limit (10 for free users)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/ai-secure/suggestions')
          .set('Cookie', `better-auth.session-token=${sessionToken}`)
          .send({ category: 'groceries', amount: 50 });

        expect(response.status).toBe(200);
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/api/ai-secure/suggestions')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({ category: 'groceries', amount: 50 });

      expect(response.status).toBe(429);
      expect(response.body.error).toContain('rate limit');
    });

    it('should allow higher limits for premium users', async () => {
      const { sessionToken } = await createTestUserSession({
        role: 'user',
        isPremium: true
      });

      // Premium users should have 50 requests per 15 minutes
      for (let i = 0; i < 20; i++) {
        const response = await request(app)
          .post('/api/ai-secure/suggestions')
          .set('Cookie', `better-auth.session-token=${sessionToken}`)
          .send({ category: 'groceries', amount: 50 });

        expect(response.status).toBe(200);
      }
    });
  });
});
```

### Role-Based Access Control Tests

**File**: `server/tests/auth/roleBasedAccess.test.js`

```javascript
describe('Role-Based Access Control', () => {
  describe('Premium Features', () => {
    it('should block free users from premium features', async () => {
      const { sessionToken } = await createTestUserSession({
        role: 'user',
        isPremium: false
      });

      const response = await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({
          portfolio: [{ symbol: 'AAPL', shares: 10 }],
          riskTolerance: 'moderate'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Premium subscription required');
      expect(response.body.upgradeUrl).toBe('/pricing');
    });

    it('should allow premium users access to premium features', async () => {
      const { sessionToken } = await createTestUserSession({
        role: 'user',
        isPremium: true
      });

      const response = await request(app)
        .post('/api/ai-secure/analyze/investment')
        .set('Cookie', `better-auth.session-token=${sessionToken}`)
        .send({
          portfolio: [{ symbol: 'AAPL', shares: 10 }],
          riskTolerance: 'moderate'
        });

      expect(response.status).toBe(200);
      expect(response.body.analysis).toBeDefined();
    });
  });

  describe('Admin Features', () => {
    it('should block non-admin users from admin endpoints', async () => {
      const { sessionToken } = await createTestUserSession({ role: 'user' });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', `better-auth.session-token=${sessionToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Administrator access required');
    });

    it('should allow admin users access to admin endpoints', async () => {
      const { sessionToken } = await createTestUserSession({ role: 'admin' });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', `better-auth.session-token=${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(response.body.usage).toBeDefined();
    });

    it('should allow admin users to manage user roles', async () => {
      const admin = await createTestUserSession({ role: 'admin' });
      const targetUser = await createTestUser({ role: 'user' });

      const response = await request(app)
        .put(`/api/admin/users/${targetUser.id}/role`)
        .set('Cookie', `better-auth.session-token=${admin.sessionToken}`)
        .send({
          role: 'admin',
          reason: 'Promoted to administrator'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('admin');
    });
  });
});
```

## 🔄 Legacy JWT Compatibility Tests

**File**: `server/tests/auth/legacyCompatibility.test.js`

```javascript
describe('Legacy JWT Compatibility', () => {
  describe('JWT Token Validation', () => {
    it('should accept valid legacy JWT tokens', async () => {
      const user = await createTestUser();
      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
    });

    it('should reject expired JWT tokens', async () => {
      const user = await createTestUser();
      const expiredToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Migration Endpoint', () => {
    it('should migrate JWT user to Better Auth', async () => {
      const user = await createTestUser();
      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/migrate')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionToken).toBeDefined();
      expect(response.body.message).toContain('migrated to Better Auth');
    });

    it('should handle invalid JWT during migration', async () => {
      const response = await request(app)
        .post('/api/auth/migrate')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('Hybrid Authentication', () => {
    it('should try Better Auth first, then fallback to JWT', async () => {
      const user = await createTestUser();
      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Mock Better Auth failure
      jest.spyOn(auth.api, 'getSession').mockRejectedValue(new Error('Session not found'));

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
    });
  });
});
```

## 🧩 Integration Tests

### API Integration Testing

**Location**: `server/tests/integration/`

```bash
# Run all integration tests
npm run test:integration

# Specific integration test
npm test -- tests/integration/userWorkflow.test.js
```

**Example Integration Test**:

```javascript
// server/tests/integration/userWorkflow.test.js
describe('User Workflow Integration', () => {
  it('should complete full user journey', async () => {
    // 1. Register new user
    const registerResponse = await request(app)
      .post('/api/auth/sign-up')
      .send({
        email: 'newuser@example.com',
        password: 'secure123',
        name: 'New User'
      });

    expect(registerResponse.status).toBe(201);
    const sessionToken = extractSessionToken(registerResponse);

    // 2. Access AI suggestions
    const aiResponse = await request(app)
      .post('/api/ai-secure/suggestions')
      .set('Cookie', `better-auth.session-token=${sessionToken}`)
      .send({ category: 'groceries', amount: 50 });

    expect(aiResponse.status).toBe(200);

    // 3. Create transaction
    const transactionResponse = await request(app)
      .post('/api/transactions')
      .set('Cookie', `better-auth.session-token=${sessionToken}`)
      .send({
        amount: -50.00,
        description: 'Grocery shopping',
        category: 'groceries',
        date: new Date().toISOString()
      });

    expect(transactionResponse.status).toBe(201);

    // 4. Get analytics
    const analyticsResponse = await request(app)
      .get('/api/analytics/spending?timeframe=month')
      .set('Cookie', `better-auth.session-token=${sessionToken}`);

    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.body.analytics.totalSpent).toBeGreaterThan(0);

    // 5. Sign out
    const signOutResponse = await request(app)
      .post('/api/auth/sign-out')
      .set('Cookie', `better-auth.session-token=${sessionToken}`);

    expect(signOutResponse.status).toBe(200);
  });
});
```

## 🎭 End-to-End Testing

### Playwright E2E Tests

**Location**: `tests/e2e/`

**Setup**:
```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- tests/e2e/auth.spec.js
```

**Authentication E2E Tests**:

```javascript
// tests/e2e/auth.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test('should register and login user', async ({ page }) => {
    // Navigate to registration
    await page.goto('/register');

    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'secure123');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.click('[data-testid="register-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');

    // Sign out
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="sign-out-button"]');

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Sign back in
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'secure123');
    await page.click('[data-testid="login-button"]');

    // Should be back on dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle authentication errors', async ({ page }) => {
    await page.goto('/login');

    // Try invalid credentials
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should protect premium features', async ({ page }) => {
    // Login as free user
    await loginAsUser(page, { isPremium: false });

    // Try to access premium feature
    await page.goto('/analytics/advanced');

    // Should redirect or show upgrade prompt
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
  });
});
```

## 📊 Performance Testing

### Load Testing

**Using Artillery.js**:

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run tests/performance/auth-load-test.yml
```

**Auth Load Test Configuration**:

```yaml
# tests/performance/auth-load-test.yml
config:
  target: 'http://localhost:3004'
  phases:
    - duration: 60
      arrivalRate: 10
  variables:
    testEmail: 'load-test-{{ $randomString() }}@example.com'
    testPassword: 'secure123'

scenarios:
  - name: "Authentication Load Test"
    weight: 100
    flow:
      - post:
          url: "/api/auth/sign-up"
          json:
            email: "{{ testEmail }}"
            password: "{{ testPassword }}"
            name: "Load Test User"
        capture:
          - json: "$.user.id"
            as: "userId"

      - post:
          url: "/api/auth/sign-in"
          json:
            email: "{{ testEmail }}"
            password: "{{ testPassword }}"
        capture:
          - header: "set-cookie"
            as: "sessionCookie"

      - post:
          url: "/api/ai-secure/suggestions"
          headers:
            Cookie: "{{ sessionCookie }}"
          json:
            category: "groceries"
            amount: 50
        expect:
          - statusCode: 200

      - post:
          url: "/api/auth/sign-out"
          headers:
            Cookie: "{{ sessionCookie }}"
```

### Benchmark Tests

```javascript
// tests/performance/benchmark.test.js
const Benchmark = require('benchmark');

describe('Authentication Performance', () => {
  const suite = new Benchmark.Suite();

  suite
    .add('Session Validation', async () => {
      await validateSession('test-session-token');
    })
    .add('JWT Validation', async () => {
      await validateJWT('test-jwt-token');
    })
    .add('PII Sanitization', async () => {
      await sanitizePII({
        description: 'Payment to john.doe@example.com for $100',
        amount: 100
      });
    })
    .on('cycle', (event) => {
      console.log(String(event.target));
    })
    .on('complete', function() {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run({ async: true });
});
```

## 🔧 Test Configuration

### Jest Configuration

**File**: `server/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/src/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/auth/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

### Test Setup

**File**: `server/tests/setup.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Global test setup
let prisma;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./test.db'
      }
    }
  });

  await prisma.$connect();

  // Clear test database
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Utility functions
global.cleanDatabase = async () => {
  await prisma.betterAuthSession.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();
};

global.createTestUser = async (userData = {}) => {
  const defaultData = {
    email: `test${Date.now()}@example.com`,
    password: await bcrypt.hash('secure123', 12),
    name: 'Test User',
    role: 'user',
    isPremium: false,
    ...userData
  };

  return await prisma.user.create({
    data: defaultData
  });
};

global.createTestUserSession = async (userData = {}) => {
  const user = await createTestUser(userData);

  // Create Better Auth session
  const sessionData = {
    id: `ses_${Date.now()}`,
    sessionToken: `token_${Date.now()}_${Math.random()}`,
    userId: user.id,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };

  const session = await prisma.betterAuthSession.create({
    data: sessionData
  });

  return {
    user,
    session,
    sessionToken: session.sessionToken,
    userId: user.id
  };
};

global.createExpiredSession = async () => {
  const user = await createTestUser();

  const sessionData = {
    id: `ses_expired_${Date.now()}`,
    sessionToken: `expired_token_${Date.now()}`,
    userId: user.id,
    expires: new Date(Date.now() - 60 * 60 * 1000) // Expired 1 hour ago
  };

  const session = await prisma.betterAuthSession.create({
    data: sessionData
  });

  return {
    user,
    session,
    sessionToken: session.sessionToken
  };
};

global.extractSessionToken = (response) => {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;

  const sessionCookie = cookies.find(cookie =>
    cookie.includes('better-auth.session-token')
  );

  if (!sessionCookie) return null;

  const match = sessionCookie.match(/better-auth\.session-token=([^;]+)/);
  return match ? match[1] : null;
};
```

## 📋 Test Checklists

### Pre-Commit Testing Checklist

- [ ] All unit tests pass
- [ ] Authentication tests pass
- [ ] No linting errors
- [ ] Code coverage above threshold
- [ ] No security vulnerabilities

```bash
# Pre-commit script
npm run lint
npm run test:auth
npm run test:coverage
npm audit --audit-level moderate
```

### Pre-Deploy Testing Checklist

- [ ] All tests pass in CI/CD
- [ ] End-to-end tests pass
- [ ] Load testing completed
- [ ] Security scan completed
- [ ] Database migrations tested

```bash
# Pre-deploy script
npm run test:all
npm run test:e2e
npm run test:security
npm run test:performance
```

### Production Testing Checklist

- [ ] Health endpoints responding
- [ ] Authentication working
- [ ] AI endpoints protected
- [ ] Rate limiting active
- [ ] Monitoring active

```bash
# Production verification
curl https://your-domain.com/api/health
curl https://your-domain.com/api/auth/session
curl -X POST https://your-domain.com/api/ai-secure/suggestions # Should return 401
```

## 🚨 Test Troubleshooting

### Common Test Issues

**Database Connection Errors**:
```bash
# Check test database
echo $DATABASE_URL
npx prisma db pull --schema=tests/test.schema.prisma

# Reset test database
npx prisma migrate reset --force
```

**Session Test Failures**:
```bash
# Check Better Auth configuration
npm run test:auth -- --verbose
cat tests/auth/betterAuth.test.js
```

**Rate Limiting Test Failures**:
```bash
# Clear rate limit cache
redis-cli FLUSHALL
npm run test:auth -- --testNamePattern="rate"
```

### Test Debugging

**Enable Debug Logging**:
```bash
DEBUG=pluqla:* npm test
LOG_LEVEL=debug npm run test:auth
```

**Test Isolation**:
```bash
# Run single test
npm test -- --testNamePattern="should authenticate valid credentials"

# Run in watch mode
npm test -- --watch tests/auth/betterAuth.test.js
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Testing](https://playwright.dev/docs/writing-tests)
- [Better Auth Testing Guide](https://better-auth.com/docs/testing)
- [Artillery Load Testing](https://artillery.io/docs)
- [Security Testing Best Practices](./SECURITY.md#security-testing)

---

**Last Updated**: December 2024 | **Version**: 2.0.0 | **Coverage Target**: 85%