# 🚀 Quick Test Guide - PostgreSQL Migration

## ✅ Pre-Flight Checks (30 seconds)

### 1. Check Docker PostgreSQL
```bash
docker ps | findstr pluqla_postgres_dev
```
**Expected**: `Up X minutes (healthy)`

### 2. Test Database Connection
```bash
cd C:\Users\Victor\Desktop\PLUQLA\server
node test-db-connection.js
```
**Expected**: `✅ All connection tests PASSED!`

### 3. Start Server
```bash
npm run dev
```
**Expected**:
```
✅ Database connected successfully (Xms)
🚀 Server running on port 3004 in development mode
```

### 4. Test Health Endpoint
```bash
curl http://localhost:3004/health
```
**Expected**: `"status": "healthy"`

---

## 🧪 One-Liner Tests

### Test PostgreSQL Connection (PowerShell)
```powershell
node -e "require('dotenv').config(); const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.user.count().then(c=>console.log('Users:',c)).finally(()=>p.\$disconnect())"
```

### Test Health (PowerShell)
```powershell
(Invoke-WebRequest -Uri http://localhost:3004/health).Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Test Health (Bash)
```bash
curl -s http://localhost:3004/health | python3 -m json.tool
```

---

## 📝 Test Users Credentials

```javascript
// FREE user
email: "free@pluqla.com"
password: "password123"

// PREMIUM user
email: "premium@pluqla.com"
password: "password123"

// ADMIN user
email: "admin@pluqla.com"
password: "password123"
```

---

## 🔍 Quick Diagnostics

### If server won't start:

```bash
# 1. Check .env DATABASE_URL
cat .env | findstr DATABASE_URL

# 2. Check PostgreSQL logs
docker logs pluqla_postgres_dev --tail 50

# 3. Regenerate Prisma Client
npx prisma generate

# 4. Check migrations
npx prisma migrate status
```

### If connection fails:

```bash
# Test direct PostgreSQL access
docker exec -it pluqla_postgres_dev psql -U pluqla -d pluqla_dev -c "SELECT current_database(), current_user;"

# Expected output:
# current_database | current_user
# ------------------+--------------
# pluqla_dev       | pluqla
```

---

## 🎯 Success Indicators

All must be ✅:

- [ ] Docker container `pluqla_postgres_dev` is **healthy**
- [ ] `test-db-connection.js` passes all 3 tests
- [ ] Server starts without errors
- [ ] `/health` endpoint returns `"status": "healthy"`
- [ ] Database has 4 users (free, premium, admin, test)

---

## 🛠️ Files Modified

1. **`src/auth/betterAuth.js`** - Added Prisma adapter
2. **`src/services/monitoringService.js`** - Fixed BigInt serialization
3. **`.env`** - Updated DATABASE_URL to PostgreSQL

---

**Status**: ✅ **ALL SYSTEMS OPERATIONAL**
**Database**: PostgreSQL 15 @ localhost:5432
**Server**: Node.js 20.19.5 @ localhost:3004
