# PostgreSQL Migration Guide

## Overview

This document describes the migration from SQLite to PostgreSQL for production deployment.

## Prerequisites

- PostgreSQL 14+ installed and running
- Database credentials (user, password, database name)
- Backup of existing SQLite database (if applicable)

## Migration Steps

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE pluqla_production;

# Create user with password
CREATE USER pluqla_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pluqla_production TO pluqla_user;

# Exit psql
\q
```

### 3. Configure Environment Variables

Update your `.env` file:

```bash
# Production PostgreSQL connection
DATABASE_URL="postgresql://pluqla_user:your_secure_password_here@localhost:5432/pluqla_production"

# For Railway/Heroku, use the provided DATABASE_URL
# For local development:
# DATABASE_URL="postgresql://pluqla_user:dev_password@localhost:5432/pluqla_dev"
```

### 4. Run Prisma Migration

```bash
cd server

# Generate Prisma Client for PostgreSQL
npx prisma generate

# Create initial migration (if starting fresh)
npx prisma migrate dev --name init

# Or deploy to production
npx prisma migrate deploy
```

### 5. Verify Migration

```bash
# Check database connection
npx prisma db push

# View database status
npx prisma studio
```

### 6. Migrate Data (Optional)

If you have existing SQLite data:

```bash
# Export SQLite data
npx prisma db push --schema=prisma/schema-sqlite.prisma

# Import to PostgreSQL (custom script required)
node scripts/migrate-sqlite-to-postgres.js
```

## PostgreSQL Configuration

### Connection Pooling

For production, configure connection pooling in `.env`:

```bash
DB_CONNECTION_LIMIT=10
DB_POOL_TIMEOUT=10
DB_STATEMENT_TIMEOUT=30000
DB_CONNECT_TIMEOUT=10
```

### Indexes

All necessary indexes are defined in `prisma/schema.prisma`. Key indexes:

- User authentication: `email`, `emailVerificationToken`
- Sessions: `sessionToken`, `expires`
- Transactions: `userId`, `date`, `category`
- Cache: `expiresAt`, `category`

### Performance Optimization

**Enable query logging (development only):**
```bash
DEBUG_SQL=true
```

**Monitor slow queries:**
```sql
-- PostgreSQL slow query log
ALTER DATABASE pluqla_production SET log_min_duration_statement = 1000;
```

## Rollback Plan

If migration fails:

1. **Restore SQLite database:**
   ```bash
   cp backup/dev.db prisma/dev.db
   ```

2. **Revert schema:**
   ```bash
   git checkout HEAD~1 prisma/schema.prisma
   npx prisma generate
   ```

3. **Restart server:**
   ```bash
   npm start
   ```

## Verification Checklist

- [ ] PostgreSQL service is running
- [ ] Database created and accessible
- [ ] `DATABASE_URL` correctly configured
- [ ] Prisma Client generated successfully
- [ ] All migrations applied (`npx prisma migrate deploy`)
- [ ] Application starts without errors
- [ ] User registration works
- [ ] User login works
- [ ] Session persistence works
- [ ] All critical features tested

## Troubleshooting

### Connection refused

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql
```

### Authentication failed

**Error:** `password authentication failed for user "pluqla_user"`

**Solution:**
1. Reset password:
   ```sql
   ALTER USER pluqla_user WITH PASSWORD 'new_secure_password';
   ```
2. Update `DATABASE_URL` in `.env`

### Migration conflicts

**Error:** `Migration XXX failed to apply cleanly`

**Solution:**
```bash
# Reset migrations (⚠️  DATA LOSS)
npx prisma migrate reset

# Or manually resolve:
npx prisma migrate resolve --applied XXX
npx prisma migrate deploy
```

## Production Deployment

### Environment Variables

Required in production:

```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
COOKIE_DOMAIN="yourdomain.com"  # REQUIRED in production
JWT_SECRET="64-char-hex-string"
BETTER_AUTH_SECRET="64-char-hex-string"
```

### Health Check

Verify database connectivity:

```bash
curl http://localhost:3004/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "latency": "15ms"
}
```

## Support

For issues, consult:
- [Prisma PostgreSQL Documentation](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- Project README: `/docs/README.md`
