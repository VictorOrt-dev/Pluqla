# 🧪 Pluqla Backend - Testing Guide

Complete testing infrastructure for the Pluqla backend with PostgreSQL + Prisma + Jest.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Test Database](#test-database)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

1. **PostgreSQL 14+** installed and running
2. **Node.js 18+** and npm 9+
3. **Test database** configured

### Setup Test Environment

```bash
# 1. Install dependencies
npm install

# 2. Configure test database
cp .env.example .env.test
# Edit .env.test with your PostgreSQL credentials

# 3. Generate Prisma Client
npm run db:generate

# 4. Run tests
npm test
```

### First Test Run

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

---

## 🏗️ Test Infrastructure

### Architecture

```
server/
├── tests/
│   ├── setup/                      # Test configuration
│   │   ├── jestGlobalSetup.js      # Runs once before all tests
│   │   ├── jestGlobalTeardown.js   # Runs once after all tests
│   │   ├── globalSetup.js          # Runs before each test file
│   │   ├── setupTestDatabase.js    # Database creation & seeding
│   │   └── teardownTestDatabase.js # Database cleanup
│   │
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   ├── auth/                       # Authentication tests
│   ├── ai/                         # AI service tests
│   ├── security/                   # Security tests
│   └── performance/                # Performance tests
│
├── jest.config.js                  # Jest configuration (in package.json)
└── .env.test                       # Test environment variables
```

### Test Database Configuration

The test suite uses a **dedicated PostgreSQL database** (`pluqla_test`) to ensure complete isolation from development and production data.

**Configuration (`.env.test`):**

```env
NODE_ENV=test
DATABASE_URL="postgresql://postgres:password@localhost:5432/pluqla_test?schema=public"

# AI Configuration (Mock provider for testing)
AI_PROVIDER=mock
AI_SANITIZER_MODE=strict
AI_MAX_TOKENS=4000
AI_TIMEOUT=30000

# JWT Secrets (Test-only secrets)
JWT_SECRET="test-jwt-secret-at-least-32-characters-long"
JWT_REFRESH_SECRET="test-refresh-secret-at-least-32-chars"
JWT_EMAIL_SECRET="test-email-secret-at-least-32-chars-long"
JWT_PASSWORD_RESET_SECRET="test-reset-secret-at-least-32-chars-long"

# Logging (Minimal logging in tests)
LOG_LEVEL=error
```

---

## 🧪 Running Tests

### Basic Commands

```bash
# Run all tests (serial execution)
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# CI mode (optimized for CI/CD)
npm run test:ci
```

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- --testPathPattern=auth

# Run a specific test file
npm test -- tests/auth/betterAuth.test.js

# Run tests by name
npm test -- --testNamePattern="should authenticate user"

# Run only changed tests (with git)
npm test -- --onlyChanged
```

### Debug Mode

```bash
# Enable test debugging
DEBUG_TESTS=true npm test

# Run with verbose output
npm test -- --verbose

# Run a single test with debugging
node --inspect-brk node_modules/.bin/jest tests/auth/betterAuth.test.js
```

---

## 🗄️ Test Database

### Automated Database Management

The test infrastructure automatically handles database setup and teardown:

1. **Global Setup** (`jestGlobalSetup.js`):
   - Checks PostgreSQL availability
   - Generates Prisma Client
   - Creates `pluqla_test` database
   - Runs migrations
   - Seeds test data (test users with different roles)

2. **Global Teardown** (`jestGlobalTeardown.js`):
   - Cleans up test data (truncates tables)
   - Optionally drops test database
   - Disconnects Prisma

### Manual Database Operations

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations on test database
DATABASE_URL="postgresql://postgres:password@localhost:5432/pluqla_test" npx prisma migrate deploy

# Reset test database (drop + recreate)
DATABASE_URL="postgresql://postgres:password@localhost:5432/pluqla_test" npx prisma migrate reset --force

# Open Prisma Studio for test database
DATABASE_URL="postgresql://postgres:password@localhost:5432/pluqla_test" npx prisma studio
```

### Test Data Seeding

The setup script automatically creates test users:

```javascript
// Available test users (in setupTestDatabase.js)
const testUsers = [
  {
    email: 'testuser@example.com',
    password: 'Test123!@#',
    role: 'user'
  },
  {
    email: 'premium@example.com',
    password: 'Premium123!@#',
    role: 'premium'
  },
  {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    role: 'admin'
  }
];
```

---

## ✍️ Writing Tests

### Test Helpers

Global test helpers are available in all test files via `global.testHelpers`:

```javascript
describe('User API', () => {
  it('should create a user', async () => {
    // Create test user
    const user = await global.testHelpers.createTestUser({
      email: 'custom@example.com',
      role: 'premium'
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('custom@example.com');
  });

  it('should create a transaction', async () => {
    const user = await global.testHelpers.createTestUser();

    // Create test transaction
    const transaction = await global.testHelpers.createTestTransaction(user.id, {
      amount: 100,
      category: 'alimentation'
    });

    expect(transaction.amount).toBe(100);
  });

  it('should get test credentials', () => {
    // Get predefined test user credentials
    const userCreds = global.testHelpers.getTestCredentials('user');
    const premiumCreds = global.testHelpers.getTestCredentials('premium');
    const adminCreds = global.testHelpers.getTestCredentials('admin');

    expect(userCreds.email).toBe('testuser@example.com');
  });

  it('should wait for async condition', async () => {
    let count = 0;

    // Wait for condition with timeout
    await global.testHelpers.waitFor(
      async () => ++count >= 5,
      5000, // timeout in ms
      100   // check interval in ms
    );

    expect(count).toBeGreaterThanOrEqual(5);
  });
});
```

### Using Prisma in Tests

Global Prisma client is available via `global.prisma`:

```javascript
describe('Database Operations', () => {
  it('should query database', async () => {
    // Use global Prisma client
    const users = await global.prisma.user.findMany({
      where: { role: 'user' }
    });

    expect(users.length).toBeGreaterThan(0);
  });

  it('should clean up after test', async () => {
    // Create test data
    const user = await global.prisma.user.create({
      data: {
        email: 'cleanup@example.com',
        password: 'Test123',
        name: 'Cleanup Test'
      }
    });

    // Clean up specific table
    await global.testHelpers.cleanTable('User');

    const userCount = await global.prisma.user.count();
    expect(userCount).toBe(0);
  });
});
```

### Testing API Endpoints

Use `supertest` for integration testing:

```javascript
const request = require('supertest');
const app = require('../src/app'); // Your Express app

describe('Auth API', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'NewUser123!@#',
        name: 'New User'
      })
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('newuser@example.com');
  });

  it('should login with valid credentials', async () => {
    const credentials = global.testHelpers.getTestCredentials('user');

    const response = await request(app)
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('should require authentication', async () => {
    await request(app)
      .get('/api/users/me')
      .expect(401);
  });

  it('should access protected route with token', async () => {
    // Login to get token
    const credentials = global.testHelpers.getTestCredentials('user');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(credentials);

    const token = loginRes.body.token;

    // Access protected route
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.email).toBe(credentials.email);
  });
});
```

### Testing AI Services

AI tests use the **mock provider** (configured in `.env.test`):

```javascript
const aiService = require('../src/services/ai/aiService');

describe('AI Service', () => {
  it('should generate suggestions', async () => {
    const suggestions = await aiService.getSuggestions(
      'test-user-id',
      'alimentation',
      { monthlyGoal: 500, level: 1 },
      'fr'
    );

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toHaveProperty('title');
    expect(suggestions[0]).toHaveProperty('description');
  });

  it('should sanitize PII in requests', async () => {
    const context = {
      email: 'user@example.com',
      phone: '555-1234',
      cardNumber: '4111111111111111'
    };

    const result = await aiService.analyzeSpending(
      'test-user-id',
      [],
      context
    );

    // AI service should sanitize PII before sending to provider
    expect(result).toBeDefined();
    // PII should not appear in logs or provider requests
  });
});
```

---

## 📊 Coverage Requirements

### Coverage Thresholds

The test suite enforces strict coverage requirements:

```javascript
// Global thresholds (applies to all code)
{
  branches: 85%,
  functions: 85%,
  lines: 90%,
  statements: 90%
}

// Enhanced thresholds for critical code
{
  "./src/middleware/**/*.js": {
    branches: 90%,
    functions: 90%,
    lines: 95%,
    statements: 95%
  },
  "./src/services/ai/**/*.js": {
    branches: 90%,
    functions: 90%,
    lines: 95%,
    statements: 95%
  }
}
```

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

### Coverage Files Ignored

```javascript
// Excluded from coverage
- src/server.js              // Entry point
- src/**/index.js            // Index files
- src/**/*.test.js           // Test files
- src/**/*.spec.js           // Spec files
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: pluqla_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd server
          npm ci

      - name: Generate Prisma Client
        run: |
          cd server
          npm run db:generate

      - name: Run tests
        run: |
          cd server
          npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/pluqla_test
          NODE_ENV: test
          AI_PROVIDER: mock

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage/coverage-final.json
```

### GitLab CI Example

```yaml
test:
  image: node:18
  services:
    - postgres:14
  variables:
    POSTGRES_DB: pluqla_test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pluqla_test
    NODE_ENV: test
    AI_PROVIDER: mock
  script:
    - cd server
    - npm ci
    - npm run db:generate
    - npm run test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: server/coverage/cobertura-coverage.xml
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Database connection failed"

**Problem:** PostgreSQL is not running or test database doesn't exist.

**Solution:**
```bash
# Check PostgreSQL status
pg_isalive

# Start PostgreSQL
# macOS (Homebrew):
brew services start postgresql

# Linux:
sudo service postgresql start

# Windows:
pg_ctl start -D "C:\Program Files\PostgreSQL\14\data"

# Create test database manually
createdb pluqla_test
```

#### 2. "Prisma Client not generated"

**Problem:** Prisma Client hasn't been generated yet.

**Solution:**
```bash
npm run db:generate
```

The `pretest` script should automatically run this, but you can run it manually if needed.

#### 3. "Tests hanging or timing out"

**Problem:** Database connections not closed properly.

**Solution:**
- Ensure all tests disconnect Prisma: `await prisma.$disconnect()`
- Check global teardown is running: `jestGlobalTeardown.js`
- Increase timeout: `jest.setTimeout(30000)`

#### 4. "Coverage thresholds not met"

**Problem:** Code coverage below required thresholds.

**Solution:**
```bash
# Check current coverage
npm run test:coverage

# Identify uncovered code
open coverage/lcov-report/index.html

# Write tests for uncovered lines/branches
```

#### 5. "Test pollution / Tests fail when run together"

**Problem:** Tests affecting each other due to shared database state.

**Solution:**
- Use `cleanTable()` helper to reset tables between tests
- Ensure unique test data (use timestamps in emails)
- Run tests serially: `--runInBand` (already configured)

#### 6. "Mock provider not working"

**Problem:** AI provider not set to 'mock' in tests.

**Solution:**
```bash
# Check .env.test
cat .env.test | grep AI_PROVIDER
# Should show: AI_PROVIDER=mock

# If incorrect, update .env.test
echo "AI_PROVIDER=mock" >> .env.test
```

---

## 📚 Additional Resources

- **Jest Documentation**: https://jestjs.io/
- **Prisma Testing Guide**: https://www.prisma.io/docs/guides/testing
- **Supertest Documentation**: https://github.com/visionmedia/supertest
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

---

## 🎯 Testing Checklist

Before pushing code, ensure:

- [ ] All tests pass: `npm test`
- [ ] Coverage ≥90%: `npm run test:coverage`
- [ ] No console errors or warnings
- [ ] Test database isolated (using `pluqla_test`)
- [ ] AI provider set to `mock` for tests
- [ ] New features have corresponding tests
- [ ] Test helpers used for common operations
- [ ] Tests are idempotent (can run multiple times)
- [ ] CI/CD configuration updated if needed

---

**Test Infrastructure Version**: 1.0.0
**Last Updated**: September 2024
**Maintained by**: Pluqla Dev Team