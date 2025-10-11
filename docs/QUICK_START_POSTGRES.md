# ⚡ Quick Start: PostgreSQL Migration

## 🎯 TL;DR - Just Run This

### Windows:
```cmd
cd C:\Users\Victor\Desktop\PLUQLA
docker-compose -f docker-compose.dev.yml up -d postgres
cd server
migrate-to-postgres.bat
npm run dev
```

### macOS/Linux:
```bash
cd /path/to/PLUQLA
docker-compose -f docker-compose.dev.yml up -d postgres
cd server
chmod +x migrate-to-postgres.sh && ./migrate-to-postgres.sh
npm run dev
```

**That's it!** ✅

---

## 📋 What You Need

- [ ] Docker Desktop installed and running
- [ ] Node.js v18+ installed
- [ ] 5 minutes of time

---

## ✅ Verify It Worked

```bash
# 1. Check PostgreSQL running
docker ps | grep pluqla_postgres

# 2. Check server started
# Look for: "✅ Database connected successfully"

# 3. Test health endpoint
curl http://localhost:3004/health

# 4. Test login
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"free@pluqla.com","password":"password123"}'
```

If all return 200/success → **You're done!** 🎉

---

## 🔧 If Something Fails

### PostgreSQL won't start:
```bash
docker-compose -f docker-compose.dev.yml logs postgres
```

### Server crashes:
```bash
cd server
npm run dev 2>&1 | tee server.log
# Check server.log for errors
```

### Migration fails:
```bash
cd server
npx prisma migrate reset
npm run db:seed
```

---

## 👤 Test Credentials

| User | Email | Password | Tier |
|------|-------|----------|------|
| Free | free@pluqla.com | password123 | FREE |
| Premium | premium@pluqla.com | password123 | PREMIUM |
| Admin | admin@pluqla.com | password123 | ADMIN |

---

## 📚 Full Docs

- **Complete Guide**: [MIGRATION_SQLITE_TO_POSTGRESQL.md](MIGRATION_SQLITE_TO_POSTGRESQL.md)
- **Summary**: [POSTGRESQL_MIGRATION_SUMMARY.md](POSTGRESQL_MIGRATION_SUMMARY.md)
- **Troubleshooting**: See migration guide

---

## 🔙 Rollback (if needed)

```bash
cd server
cp .env.backup.* .env
docker-compose -f ../docker-compose.dev.yml stop postgres
npm run dev
```

---

## 🎯 Key Commands

```bash
# Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d postgres

# Stop PostgreSQL
docker-compose -f docker-compose.dev.yml stop postgres

# View logs
docker-compose -f docker-compose.dev.yml logs -f postgres

# Connect to database
docker-compose -f docker-compose.dev.yml exec postgres psql -U pluqla -d pluqla_dev

# Reset everything (DEV ONLY!)
docker-compose -f docker-compose.dev.yml down -v
```

---

**Need help?** See [POSTGRESQL_MIGRATION_SUMMARY.md](POSTGRESQL_MIGRATION_SUMMARY.md)
