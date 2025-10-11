# 🔄 SQLite to PostgreSQL Migration Guide

## 📋 Overview

This guide walks you through migrating Pluqla backend from SQLite to PostgreSQL safely, for both development and production environments.

**Why PostgreSQL?**
- ✅ Supports native ENUM types (required for `SubscriptionTier`)
- ✅ Better performance at scale
- ✅ Production-ready with ACID compliance
- ✅ Advanced features (full-text search, JSON operations)
- ✅ Better concurrent write handling

---

## ⚠️ Prerequisites

### For Development:
- [ ] Docker and Docker Compose installed
- [ ] OR PostgreSQL 14+ installed locally
- [ ] Node.js v18+ and npm installed
- [ ] Backup of existing SQLite database (if any data to preserve)

### For Production:
- [ ] PostgreSQL 14+ server accessible
- [ ] Database credentials ready
- [ ] Backup strategy in place
- [ ] Downtime window scheduled (if applicable)

---

## 🚀 Quick Start (Development)

### Option 1: Using Docker (Recommended)

```bash
# 1. Start PostgreSQL with Docker Compose
cd /path/to/PLUQLA
docker-compose -f docker-compose.dev.yml up -d postgres

# 2. Verify PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# 3. Update .env file
cd server
cp .env .env.sqlite.backup  # Backup current config
# Edit .env and update DATABASE_URL:
# DATABASE_URL="postgresql://pluqla:pluqla@localhost:5432/pluqla_dev?schema=public"

# 4. Generate Prisma client
npx prisma generate

# 5. Run migrations
npx prisma migrate dev --name initial_postgresql_setup

# 6. Seed database with test users
npm run db:seed

# 7. Start server
npm run dev

# 8. Verify server starts without errors
# Check: http://localhost:3004/health
```

### Option 2: Using Local PostgreSQL

```bash
# 1. Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@15
# Linux: sudo apt-get install postgresql-15

# 2. Start PostgreSQL service
# Windows: Use Services or pg_ctl
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql

# 3. Create database and user
psql -U postgres << EOF
CREATE USER pluqla WITH PASSWORD 'pluqla';
CREATE DATABASE pluqla_dev OWNER pluqla;
GRANT ALL PRIVILEGES ON DATABASE pluqla_dev TO pluqla;
\c pluqla_dev
GRANT ALL ON SCHEMA public TO pluqla;
EOF

# 4. Continue with steps 3-8 from Docker option above
```

---

## 📊 Step-by-Step Migration (Development)

### Step 1: Backup Current Data (Optional)

If you have existing SQLite data you want to preserve:

```bash
cd server

# Backup SQLite database
cp dev.db dev.db.backup.$(date +%Y%m%d)

# Export data (if needed for migration)
npx prisma db pull
npx prisma studio  # Visual export/import tool
```

### Step 2: Start PostgreSQL

```bash
# Start Docker containers
docker-compose -f docker-compose.dev.yml up -d

# Verify running
docker ps | grep pluqla_postgres

# Check logs
docker-compose -f docker-compose.dev.yml logs postgres

# Expected output:
# PostgreSQL init process complete; ready for start up.
# database system is ready to accept connections
```

### Step 3: Update Environment Configuration

```bash
cd server

# Backup current .env
cp .env .env.sqlite.backup

# Update DATABASE_URL in .env
# Change FROM:
#   DATABASE_URL="file:./dev.db"
# Change TO:
#   DATABASE_URL="postgresql://pluqla:pluqla@localhost:5432/pluqla_dev?schema=public"
```

Edit `server/.env`:
```bash
# Development Environment Variables
NODE_ENV=development
DATABASE_URL="postgresql://pluqla:pluqla@localhost:5432/pluqla_dev?schema=public"
PORT=3004

# ... rest of config stays the same
```

### Step 4: Verify Prisma Schema

```bash
cd server

# Check schema is set to PostgreSQL (should already be)
cat prisma/schema.prisma | grep provider

# Expected output:
# provider = "postgresql"
```

If not, the schema should look like this at the top:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 5: Generate Prisma Client

```bash
cd server

# Regenerate Prisma Client for PostgreSQL
npx prisma generate

# Expected output:
# ✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client
```

### Step 6: Run Database Migrations

```bash
cd server

# Run migrations to create all tables
npx prisma migrate dev --name initial_postgresql_setup

# This will:
# - Create migration SQL files
# - Execute them against PostgreSQL
# - Create all tables, enums, indexes

# Expected output:
# ✔ Generated Prisma Client
# ✔ The migration has been generated
# ✔ The migration(s) have been applied
```

**What gets created:**
- `SubscriptionTier` enum (FREE, PREMIUM, ENTERPRISE)
- `User` table with all fields including subscription fields
- `Transaction`, `AiUsage`, `RefreshToken`, etc.
- All indexes for performance
- Foreign key constraints

### Step 7: Seed Database

```bash
cd server

# Seed with test users and sample data
npm run db:seed

# Expected output:
# 🌱 Starting database seeding...
# ✅ Created test user: test@pluqla.com
# ✅ Created sample transactions
# ✅ Created premium test user: premium@pluqla.com
# ✅ Created free test user: free@pluqla.com
# ✅ Created admin test user: admin@pluqla.com
# 🎉 Database seeded successfully!
```

**Test Credentials:**
```
Free User:
  Email: free@pluqla.com
  Password: password123
  Tier: FREE

Premium User:
  Email: premium@pluqla.com
  Password: password123
  Tier: PREMIUM

Admin User:
  Email: admin@pluqla.com
  Password: password123
  Role: admin (bypasses premium checks)
```

### Step 8: Start Server

```bash
cd server

# Start development server
npm run dev

# Expected output:
# 🔒 Validating environment variables...
# ✅ All environment variables are secure
# 🚀 Server running on port 3004 in development mode
# 📍 Health check: http://localhost:3004/health
# 🔍 Checking database connection...
# ✅ Database connected successfully (Xms)
```

### Step 9: Verify Migration

```bash
# Test health endpoint
curl http://localhost:3004/health

# Test login with free user
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"free@pluqla.com","password":"password123"}'

# Should return 200 with tokens

# Test premium-protected endpoint (should get 403)
TOKEN="<paste-access-token-here>"
curl -X POST http://localhost:3004/api/ai/suggestions/alimentation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"fruits"}'

# Free user should get:
# {"error":"Premium subscription required", "message":"Upgrade to premium..."}

# Test with premium user (should succeed)
# Login as premium@pluqla.com and repeat the above
```

### Step 10: Run Tests

```bash
cd server

# Run unit tests
npm test

# Run specific test suites
npm test -- tests/requirePremium.test.js
npm test -- tests/aiQuota.test.js

# Run verification scripts
node scripts/verify-premium.js
node scripts/verify-ai-quotas.js
node scripts/verify-rate-limit.js
```

---

## 🏭 Production Deployment

### Pre-Deployment Checklist

- [ ] PostgreSQL server provisioned and accessible
- [ ] Database credentials secured
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates ready
- [ ] Backup strategy in place
- [ ] Monitoring and alerts configured
- [ ] Rollback plan prepared
- [ ] Downtime window scheduled (if needed)

### Production DATABASE_URL Format

```bash
# Standard PostgreSQL URL
DATABASE_URL="postgresql://username:password@host:port/database?schema=public&sslmode=require"

# Examples:

# AWS RDS
DATABASE_URL="postgresql://pluqla_user:SecurePass123@pluqla-prod.abc123.us-east-1.rds.amazonaws.com:5432/pluqla_prod?schema=public&sslmode=require"

# Heroku Postgres
DATABASE_URL="postgres://user:pass@ec2-xx-xx-xx-xx.compute-1.amazonaws.com:5432/dbname?sslmode=require"

# DigitalOcean Managed Database
DATABASE_URL="postgresql://doadmin:pass@db-postgresql-nyc3-12345-do-user-123456-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Railway
DATABASE_URL="postgresql://postgres:pass@containers-us-west-xx.railway.app:7890/railway?sslmode=require"
```

### Production Deployment Steps

```bash
# 1. SSH into production server
ssh user@production-server

# 2. Navigate to application directory
cd /var/www/pluqla/server

# 3. Backup current .env
cp .env .env.backup.$(date +%Y%m%d)

# 4. Update DATABASE_URL in .env
nano .env
# Update to production PostgreSQL URL

# 5. Install dependencies (if not already)
npm ci --production

# 6. Generate Prisma Client
npx prisma generate

# 7. Run migrations (IMPORTANT: Use migrate deploy for production)
npx prisma migrate deploy

# 8. Verify migration success
npx prisma db pull

# 9. Restart application
pm2 restart pluqla-server

# 10. Verify health
curl http://localhost:3004/health

# 11. Monitor logs
pm2 logs pluqla-server --lines 50
```

### Production Migration Script

Create `deploy-postgres.sh`:

```bash
#!/bin/bash
set -e  # Exit on error

echo "🚀 Starting PostgreSQL migration for production..."

# Backup
echo "📦 Creating backup..."
pg_dump $OLD_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Update environment
echo "🔧 Updating environment..."
export DATABASE_URL=$NEW_POSTGRESQL_URL

# Generate client
echo "🔨 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Verify
echo "✅ Verifying migration..."
node scripts/verify-db-connection.js

# Restart app
echo "♻️ Restarting application..."
pm2 restart pluqla-server

echo "✅ Migration complete!"
```

---

## 🔍 Verification Checklist

After migration, verify the following:

### Database Verification

```sql
-- Connect to PostgreSQL
psql -U pluqla -d pluqla_dev

-- Check if SubscriptionTier enum exists
\dT+ SubscriptionTier

-- Expected output:
-- SubscriptionTier | enum | FREE, PREMIUM, ENTERPRISE

-- Check User table structure
\d users

-- Verify test users exist
SELECT id, email, "subscriptionTier", "isPremium", role FROM users;

-- Expected output:
-- free@pluqla.com    | FREE     | false     | user
-- premium@pluqla.com | PREMIUM  | true      | user
-- admin@pluqla.com   | FREE     | false     | admin

-- Check indexes
\di

-- Count records
SELECT COUNT(*) FROM users;
```

### API Verification

```bash
# 1. Health Check
curl http://localhost:3004/health
# Expected: {"status":"healthy"}

# 2. Login Test (Free User)
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"free@pluqla.com","password":"password123"}'
# Expected: 200 with tokens

# 3. Premium Endpoint Test (Free User - Should Fail)
TOKEN="<free-user-token>"
curl -X POST http://localhost:3004/api/ai/suggestions/alimentation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"fruits"}'
# Expected: 403 with upgrade message

# 4. Premium Endpoint Test (Premium User - Should Succeed)
TOKEN="<premium-user-token>"
curl -X POST http://localhost:3004/api/ai/suggestions/alimentation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"fruits"}'
# Expected: 200 or 402 (quota) - NOT 403

# 5. Subscription Page
curl http://localhost:3004/api/users/subscription
# Should load without errors
```

### Automated Verification

```bash
cd server

# Run all verification scripts
npm run verify:all

# Or individually:
node scripts/verify-premium.js
node scripts/verify-ai-quotas.js
node scripts/verify-rate-limit.js

# Run test suite
npm test

# Expected: All tests passing
```

---

## 🛠️ Troubleshooting

### Issue: "Can't reach database server"

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# Or for local PostgreSQL:
# Windows: Check Services
# macOS: brew services list
# Linux: systemctl status postgresql

# Restart if needed
docker-compose -f docker-compose.dev.yml restart postgres
```

### Issue: "Provider 'postgresql' not found"

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate

# If that fails, delete node_modules and reinstall
rm -rf node_modules
npm install
npx prisma generate
```

### Issue: "Enum SubscriptionTier not found"

**Solution:**
```bash
# Run migrations
npx prisma migrate dev --name add_subscription_enum

# If migrations fail, reset database (DEV ONLY!)
npx prisma migrate reset
npm run db:seed
```

### Issue: "Server crashes immediately on startup"

**Solution:**
```bash
# Check logs for exact error
npm run dev 2>&1 | tee server.log

# Common causes:
# 1. DATABASE_URL incorrect format
# 2. PostgreSQL not running
# 3. Missing Prisma Client

# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection manually
psql "postgresql://pluqla:pluqla@localhost:5432/pluqla_dev"
```

### Issue: "Migration conflicts"

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# If migrations are out of sync (DEV ONLY):
npx prisma migrate reset
npx prisma migrate dev
npm run db:seed

# For production, never use reset!
# Instead, resolve conflicts manually:
npx prisma migrate resolve --applied <migration-name>
```

---

## 🔙 Rollback Plan

If migration fails or issues arise:

### Rollback to SQLite (Development Only)

```bash
cd server

# 1. Stop server
pm2 stop pluqla-server  # or Ctrl+C if using npm run dev

# 2. Restore .env
cp .env.sqlite.backup .env

# 3. Update schema temporarily (only if needed)
# Edit prisma/schema.prisma:
# datasource db {
#   provider = "sqlite"
#   url      = env("DATABASE_URL")
# }

# 4. Regenerate Prisma Client
npx prisma generate

# 5. Restore SQLite database (if backed up)
cp dev.db.backup.YYYYMMDD dev.db

# 6. Start server
npm run dev

# 7. Verify health
curl http://localhost:3004/health
```

### Rollback in Production

```bash
# 1. SSH to production
ssh user@production-server

# 2. Stop application
pm2 stop pluqla-server

# 3. Restore backup .env
cp .env.backup.YYYYMMDD .env

# 4. Restore database from backup
pg_restore -U pluqla -d pluqla_prod backup_YYYYMMDD_HHMMSS.sql

# 5. Regenerate Prisma Client
npx prisma generate

# 6. Restart application
pm2 restart pluqla-server

# 7. Verify
curl http://localhost:3004/health
pm2 logs pluqla-server
```

---

## 📚 Additional Resources

### Docker Commands

```bash
# Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d postgres

# Stop PostgreSQL
docker-compose -f docker-compose.dev.yml stop postgres

# View logs
docker-compose -f docker-compose.dev.yml logs -f postgres

# Access PostgreSQL shell
docker-compose -f docker-compose.dev.yml exec postgres psql -U pluqla -d pluqla_dev

# Delete all data and start fresh (DEV ONLY!)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
```

### Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (development)
npx prisma migrate dev --name migration_name

# Run migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset database (DEV ONLY!)
npx prisma migrate reset

# Open Prisma Studio (GUI)
npx prisma studio

# Pull schema from database
npx prisma db pull

# Push schema to database (prototyping only)
npx prisma db push
```

### Database Management

```bash
# Connect to PostgreSQL
psql -U pluqla -d pluqla_dev

# Useful SQL commands:
\l                    # List databases
\dt                   # List tables
\d table_name         # Describe table
\dT+                  # List enums
\di                   # List indexes
\q                    # Quit

# Backup database
pg_dump -U pluqla -d pluqla_dev > backup.sql

# Restore database
psql -U pluqla -d pluqla_dev < backup.sql

# Drop database (DEV ONLY!)
dropdb -U pluqla pluqla_dev

# Create database
createdb -U pluqla pluqla_dev
```

---

## ✅ Final Checklist

### Development Setup
- [ ] Docker Compose running PostgreSQL
- [ ] DATABASE_URL updated in .env
- [ ] Prisma Client generated
- [ ] Migrations executed successfully
- [ ] Database seeded with test users
- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Login works with test users
- [ ] Premium enforcement working (403 for free users)
- [ ] All tests passing

### Production Deployment
- [ ] PostgreSQL server accessible
- [ ] DATABASE_URL configured with SSL
- [ ] Backup strategy in place
- [ ] Migrations deployed with `migrate deploy`
- [ ] Application restarted
- [ ] Health check passing
- [ ] Monitoring alerts active
- [ ] Performance metrics normal
- [ ] Rollback plan documented

---

## 🎉 Success!

You've successfully migrated from SQLite to PostgreSQL!

**What changed:**
- ✅ Database: SQLite → PostgreSQL
- ✅ Enum support: Native `SubscriptionTier` enum
- ✅ Performance: Better concurrency and scalability
- ✅ Production-ready: ACID compliance and reliability

**Next steps:**
1. Monitor application performance
2. Set up automated backups
3. Configure connection pooling if needed
4. Implement read replicas for high traffic

**Support:**
- Documentation: `/server/docs/`
- Issues: GitHub Issues
- Slack: #pluqla-dev

---

**Version**: 1.0.0
**Last Updated**: $(date)
**Author**: Pluqla Engineering Team
