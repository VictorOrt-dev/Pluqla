# Pluqla Setup Guide

Complete setup instructions for the Pluqla backend with **NEW** Better Auth integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Git

### 1. Installation

```bash
# Clone repository
git clone https://github.com/pluqla/app.git
cd pluqla

# Install dependencies
npm run install:all

# Setup environment
cp server/.env.example server/.env
```

### 2. Database Setup

**PostgreSQL Database (Required)**
```bash
# Create database
createdb pluqla_dev

# Update server/.env with your database URL
DATABASE_URL="postgresql://username:password@localhost:5432/pluqla_dev"
```

**Run Migrations**
```bash
cd server
npx prisma migrate dev
npx prisma generate
```

### 3. **NEW** Better Auth Configuration

**Required Environment Variables**
```env
# Better Auth (NEW - Required)
BETTER_AUTH_SECRET="your-64-character-secret-generate-with-openssl-rand-hex-32"
BASE_URL="http://localhost:3004"

# JWT (Legacy compatibility)
JWT_SECRET="your-jwt-secret-32-characters-minimum"
JWT_REFRESH_SECRET="your-refresh-secret-32-characters-minimum"
JWT_EMAIL_SECRET="your-email-secret-32-characters-minimum"
JWT_PASSWORD_RESET_SECRET="your-password-reset-secret-32-characters-minimum"

# Security Keys (Required)
FINANCIAL_ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
BANK_ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
SESSION_SECRET="your-session-secret-32-characters-minimum"
```

**Generate Secure Keys**
```bash
# Generate Better Auth secret
openssl rand -hex 32

# Generate JWT secrets
openssl rand -base64 32
```

### 4. **NEW** Google OAuth Setup (Optional)

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Google Console Setup**:
1. Create project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add redirect URI: `http://localhost:3004/api/auth/google/callback`

### 5. Start Application

```bash
# Start development servers
npm start

# Verify setup
curl http://localhost:3004/health
curl http://localhost:3000
```

**Expected Response**:
```json
{
  "status": "OK",
  "database": { "healthy": true },
  "services": { "auth": "healthy" }
}
```

## 🔧 Environment Configuration

### Complete .env Template

```env
# ===== CORE SETTINGS =====
NODE_ENV=development
PORT=3004

# ===== DATABASE =====
DATABASE_URL="postgresql://username:password@localhost:5432/pluqla_dev"

# ===== BETTER AUTH (NEW) =====
BETTER_AUTH_SECRET="your-64-character-secret-here"
BASE_URL="http://localhost:3004"

# ===== JWT SECRETS (Legacy Compatibility) =====
JWT_SECRET="your-jwt-secret-32-characters-minimum"
JWT_REFRESH_SECRET="your-refresh-secret-32-characters-minimum"
JWT_EMAIL_SECRET="your-email-secret-32-characters-minimum"
JWT_PASSWORD_RESET_SECRET="your-password-reset-secret-32-characters-minimum"

# ===== SECURITY KEYS =====
FINANCIAL_ENCRYPTION_KEY="your-financial-encryption-key-64-chars"
BANK_ENCRYPTION_KEY="your-bank-encryption-key-64-chars"
SESSION_SECRET="your-session-secret-32-characters-minimum"

# ===== GOOGLE OAUTH =====
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ===== CORS =====
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"
TRUST_PROXY=false

# ===== AI SERVICES =====
AI_PROVIDER=none  # Options: none, openai, anthropic, mistral
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""

# ===== OPTIONAL SERVICES =====
REDIS_URL=""  # For session storage (recommended for production)
EMAIL_ENABLED=false
SMTP_HOST=""
SMTP_USER=""
SMTP_PASS=""
```

## 🗄️ Database Performance & Connection Management

### Singleton Prisma Client Pattern

**Why Singleton Matters**

Pluqla uses a **singleton pattern** for the Prisma client to prevent connection pool exhaustion under high load.

**The Problem**:
```javascript
// ❌ ANTI-PATTERN - Creates multiple connection pools
const prisma1 = new PrismaClient(); // Pool 1
const prisma2 = new PrismaClient(); // Pool 2
const prisma3 = new PrismaClient(); // Pool 3
// Result: Connection pool exhaustion → Server crashes
```

**The Solution**:
```javascript
// ✅ CORRECT - Reuses single connection pool
const { prisma } = require('./lib/prisma'); // Same instance everywhere
```

### Implementation

**Location**: [`server/src/lib/prisma.js`](../server/src/lib/prisma.js)

```javascript
/**
 * Singleton Prisma Client
 *
 * Prevents connection pool exhaustion by ensuring only ONE
 * PrismaClient instance exists across the entire application.
 */

const { PrismaClient } = require('@prisma/client');

let prismaInstance = null;

function getPrismaClient() {
  // Development: Protect against hot-reload creating multiple instances
  if (process.env.NODE_ENV === 'development') {
    if (!global.__prisma) {
      global.__prisma = new PrismaClient();
    }
    return global.__prisma;
  }

  // Production: Standard singleton pattern
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      // Optimized connection pool settings
      datasources: {
        db: {
          url: buildOptimizedDatabaseUrl()
        }
      }
    });
  }

  return prismaInstance;
}

// Export singleton instance
module.exports = { prisma: getPrismaClient() };
```

### Usage in Your Code

**Controllers**:
```javascript
// ✅ ALWAYS import from lib/prisma
const { prisma } = require('../lib/prisma');

async function getUser(userId) {
  return await prisma.user.findUnique({
    where: { id: userId }
  });
}
```

**Services**:
```javascript
// ✅ ALWAYS import from lib/prisma
const { prisma } = require('../lib/prisma');

async function createTransaction(data) {
  return await prisma.transaction.create({ data });
}
```

**Middleware**:
```javascript
// ✅ ALWAYS import from lib/prisma
const { prisma } = require('../lib/prisma');

async function validateSession(token) {
  return await prisma.betterAuthSession.findUnique({
    where: { sessionToken: token }
  });
}
```

### Connection Pool Configuration

**Environment Variables**:
```env
# PostgreSQL Connection Pool Settings
DB_CONNECTION_LIMIT=5          # Max concurrent connections
DB_POOL_TIMEOUT=10             # Seconds to wait for connection
DB_STATEMENT_TIMEOUT=30000     # Max query execution time (ms)
DB_CONNECT_TIMEOUT=10          # Max connection establishment time (s)
DB_APP_NAME=pluqla-backend     # Application name in pg_stat_activity
```

**Recommended Settings by Environment**:

| Environment | CONNECTION_LIMIT | Notes |
|-------------|------------------|-------|
| Development | 5 | Low traffic, frequent restarts |
| Staging     | 10 | Moderate traffic, testing |
| Production  | 20-30 | High traffic, scale based on load |

### Monitoring Connection Health

**Health Check Endpoint**:
```bash
# Check database connectivity
curl http://localhost:3004/health

# Response includes connection stats
{
  "status": "OK",
  "database": {
    "healthy": true,
    "latency": 15,  // milliseconds
    "timestamp": "2025-09-30T12:00:00Z"
  }
}
```

**Connection Statistics**:
```bash
# Get detailed connection pool stats
curl http://localhost:3004/api/performance/database

# Response
{
  "total_connections": 8,
  "active_connections": 3,
  "idle_connections": 5,
  "app_connections": 8
}
```

### Graceful Shutdown

The singleton automatically handles graceful shutdown:

```javascript
// In server.js
const { disconnectPrisma } = require('./lib/prisma');

process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});
```

**What happens on shutdown**:
1. Stop accepting new database requests
2. Wait for active queries to complete
3. Close all connections in pool
4. Release database resources

### Performance Benefits

**Before Singleton** (Multiple Instances):
- 🔴 10+ connection pools created
- 🔴 50+ database connections used
- 🔴 Connection limit reached under load
- 🔴 Server crashes with "too many connections"

**After Singleton** (Single Instance):
- ✅ 1 connection pool shared
- ✅ 5-10 database connections used
- ✅ Efficient connection reuse
- ✅ Stable under high load

### Validation & Testing

**Run Singleton Validation Test**:
```bash
cd server
npm test -- tests/integration/prisma-singleton.test.js
```

**Test Coverage**:
- ✅ Verifies only ONE instance created
- ✅ Tests database queries work correctly
- ✅ Validates connection reuse
- ✅ Checks concurrent query handling
- ✅ Scans code for anti-patterns
- ✅ Validates all controllers use singleton

**Expected Output**:
```
✓ should return the same instance when imported multiple times
✓ should successfully perform database queries
✓ should handle concurrent queries without creating new instances
✓ should not exhaust connection pool with multiple operations
✓ should not allow direct PrismaClient instantiation in source files
✓ should verify all controllers import from lib/prisma
```

### Common Mistakes to Avoid

**❌ NEVER do this**:
```javascript
// Creating new instance (WRONG!)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Multiple instances (WRONG!)
const prisma1 = new PrismaClient();
const prisma2 = new PrismaClient();

// Importing from wrong location (WRONG!)
const prisma = require('@prisma/client');
```

**✅ ALWAYS do this**:
```javascript
// Import singleton (CORRECT!)
const { prisma } = require('./lib/prisma');

// Reuse everywhere (CORRECT!)
const { prisma } = require('../lib/prisma');
```

### Troubleshooting

**Issue: "Too many connections" error**

**Solution**:
1. Check for direct `new PrismaClient()` calls:
   ```bash
   cd server && grep -r "new PrismaClient()" src/
   ```
2. Should only appear in `src/lib/prisma.js`
3. Fix any violations by importing from `lib/prisma`

**Issue: Slow query performance**

**Solution**:
1. Check connection pool stats:
   ```bash
   curl http://localhost:3004/api/performance/database
   ```
2. Increase `DB_CONNECTION_LIMIT` if active connections maxed out
3. Add database indexes for frequently queried fields

**Issue: Connection timeout errors**

**Solution**:
1. Increase `DB_POOL_TIMEOUT` in .env
2. Check database server health
3. Verify network connectivity
4. Review slow query logs

### Best Practices

1. **Always import from singleton**: `require('./lib/prisma')`
2. **Never create new instances**: No `new PrismaClient()`
3. **Monitor connection usage**: Use health check endpoints
4. **Configure appropriate limits**: Based on environment
5. **Test connection handling**: Run integration tests
6. **Handle graceful shutdown**: Disconnect on server stop

### Further Reading

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Production Deployment Guide](./DEPLOYMENT.md)

---

## 🗄️ Database Schema

### **UPDATED** User Model with Better Auth

The User model now includes Better Auth relations:

```prisma
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  password              String
  name                  String
  role                  String   @default("user") // user, admin
  status                String   @default("active") // active, inactive, suspended
  isPremium             Boolean  @default(false)
  emailVerified         Boolean  @default(false)

  // Better Auth Relations (NEW)
  betterAuthSessions    BetterAuthSession[]
  betterAuthAccounts    BetterAuthAccount[]

  // Existing relations...
  transactions          Transaction[]
  // ... other relations
}
```

### **NEW** Better Auth Tables

```sql
-- Better Auth Sessions
CREATE TABLE "better_auth_sessions" (
  id VARCHAR PRIMARY KEY,
  sessionToken VARCHAR UNIQUE NOT NULL,
  userId VARCHAR NOT NULL REFERENCES users(id),
  expires TIMESTAMP NOT NULL
);

-- Better Auth Accounts (OAuth)
CREATE TABLE "better_auth_accounts" (
  id VARCHAR PRIMARY KEY,
  userId VARCHAR NOT NULL REFERENCES users(id),
  type VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  providerAccountId VARCHAR NOT NULL,
  UNIQUE(provider, providerAccountId)
);
```

## 🔍 Verification Steps

### 1. Database Connection
```bash
cd server && npx prisma studio
# Should open Prisma Studio at http://localhost:5555
```

### 2. **NEW** Authentication Endpoints
```bash
# Test Better Auth endpoints
curl http://localhost:3004/api/auth/session
curl -X POST http://localhost:3004/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secure123","name":"Test User"}'
```

### 3. **NEW** Protected AI Endpoints
```bash
# Should require authentication
curl http://localhost:3004/api/ai-secure/suggestions
# Expected: 401 Unauthorized

# With authentication
curl http://localhost:3004/api/ai-secure/suggestions \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
# Expected: 200 OK
```

### 4. Health Checks
```bash
# Application health
curl http://localhost:3004/health

# API health
curl http://localhost:3004/api/health

# Better Auth status
curl http://localhost:3004/api/ai-secure/status
```

## 🛠️ Development Workflow

### Available Scripts

```bash
# Backend
cd server
npm run dev          # Start with nodemon
npm run start        # Production start
npm run test         # Run all tests
npm run test:auth    # NEW - Run authentication tests
npm run lint         # ESLint check
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio

# Frontend
cd client
npm start           # Start React development server
npm run build       # Build for production
npm test           # Run React tests
```

### **NEW** Authentication Testing

```bash
# Run complete auth test suite
npm run test:auth:coverage

# Quick auth functionality test
npm run test:auth:quick

# Watch mode for development
npm run test:auth:watch
```

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Verify connection
psql $DATABASE_URL
```

**2. Better Auth Session Issues**
```bash
# Clear sessions
npx prisma studio
# Delete all records from better_auth_sessions table

# Check environment variables
echo $BETTER_AUTH_SECRET
echo $BASE_URL
```

**3. Port Already in Use**
```bash
# Find and kill process
lsof -i :3004
kill -9 PID
```

**4. Migration Errors**
```bash
# Reset database (development only)
npx prisma migrate reset --force

# Or apply specific migration
npx prisma migrate deploy
```

## 🔄 Migration from Legacy Setup

### **NEW** JWT to Better Auth Migration

If upgrading from legacy JWT authentication:

1. **Keep existing environment variables** (for compatibility)
2. **Add Better Auth variables** (see template above)
3. **Run migrations** to add Better Auth tables
4. **Test both authentication methods** work
5. **Migrate users gradually** using migration endpoint

```bash
# Test legacy compatibility
curl -X POST http://localhost:3004/api/auth/migrate \
  -H "Authorization: Bearer OLD_JWT_TOKEN"
```

### Version Compatibility

- **Current**: Better Auth + JWT (both supported)
- **Future**: Better Auth only (JWT deprecated)
- **Migration Period**: 90 days for gradual transition

## 📚 Next Steps

After successful setup:

1. **Read [AUTH.md](./AUTH.md)** - Authentication implementation details
2. **Read [API.md](./API.md)** - API endpoints and usage
3. **Read [SECURITY.md](./SECURITY.md)** - Security guidelines
4. **Read [DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment
5. **Read [TESTS.md](./TESTS.md)** - Testing procedures

## 🔗 Links

- [Better Auth Documentation](https://better-auth.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Project Repository](https://github.com/pluqla/app)
- [API Documentation](./API.md)