# 🚨 CRITICAL SECURITY FIXES CHECKLIST

## ✅ IMMEDIATE ACTIONS REQUIRED

### 🔒 Step 1: Generate Secure Environment Variables
```bash
# Generate secure keys
openssl rand -hex 32  # Copy output for JWT_SECRET
openssl rand -hex 32  # Copy output for JWT_REFRESH_SECRET
openssl rand -hex 32  # Copy output for JWT_EMAIL_SECRET
openssl rand -hex 32  # Copy output for JWT_PASSWORD_RESET_SECRET
openssl rand -hex 32  # Copy output for FINANCIAL_ENCRYPTION_KEY
openssl rand -hex 32  # Copy output for BANK_ENCRYPTION_KEY
```

### 📝 Step 2: Create Production .env File
```bash
cd server
cp .env.secure .env
# Edit .env and replace ALL dummy values with generated keys above
```

### 🔧 Step 3: Validate Environment Security
```bash
cd server
npm run dev  # Should show security validation output
# ✅ Look for "All environment variables are secure"
# ❌ If errors, fix .env file
```

---

## 🗄️ DATABASE FIXES

### 🏗️ Step 4: Apply Database Migrations
```bash
cd server
npx prisma generate  # Regenerate Prisma client
npx prisma db push   # Apply schema changes (development)
# OR for production:
# npx prisma migrate dev --name add-user-role-field
```

### 👤 Step 5: Create Admin User (Optional)
```sql
-- Connect to your database and run:
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@domain.com';
```

---

## 🧪 VERIFICATION TESTS

### ✅ Step 6: Test All Fixed Security Issues

#### Test 1: Environment Validation
```bash
cd server && npm run dev
# Expected: ✅ "All environment variables are secure"
# If ❌: Fix .env file
```

#### Test 2: Refresh Token Storage
```bash
# Register new user via API
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User"}'
# Expected: Should return both accessToken and refreshToken
# Database should store refresh token in refresh_tokens table
```

#### Test 3: Email Token Hashing
```bash
# Check database - emailVerificationToken should be 64-char hash, not UUID
# Token in email should be different from database value
```

#### Test 4: API Keys Moved to Backend
```bash
# Check client bundle
grep -r "REACT_APP_OPENAI" client/src/
# Expected: No results or only in test files
```

#### Test 5: Database Schema
```bash
cd server
npx prisma studio
# Check users table has 'role' field with default 'user'
```

#### Test 6: Admin Authentication
```bash
# Set a user as admin in database, then:
curl -X GET http://localhost:3004/api/admin/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Should work without "role field doesn't exist" errors
```

---

## 🚀 DEPLOYMENT CHECKLIST

### ✅ Step 7: Pre-Production Security Validation

#### Environment Security
- [ ] All JWT secrets are 32+ characters
- [ ] No default/example values in production .env
- [ ] FINANCIAL_ENCRYPTION_KEY is 64 hex characters
- [ ] BANK_ENCRYPTION_KEY is 64 hex characters
- [ ] All API keys are server-side only

#### Database Security
- [ ] Email verification tokens are hashed
- [ ] Refresh tokens are stored properly
- [ ] Admin role field exists
- [ ] All indexes are applied

#### Application Security
- [ ] No console.log in production code
- [ ] All API calls go through backend proxy
- [ ] Environment validator runs on startup
- [ ] Production mode blocks startup if security issues found

#### Testing Checklist
- [ ] User registration works
- [ ] Login generates and stores refresh tokens
- [ ] Email verification works with hashed tokens
- [ ] Admin authentication works
- [ ] AI services work through proxy
- [ ] No API keys exposed in frontend bundle

---

## 🆘 EMERGENCY ROLLBACK

If any fix breaks the application:

### Quick Rollback Commands
```bash
# Revert environment validation (if blocking startup)
git checkout HEAD~1 server/src/server.js

# Revert refresh token storage (if auth breaks)
git checkout HEAD~1 server/src/controllers/authController.js

# Revert database changes
npx prisma db push --accept-data-loss  # Resets to schema.prisma

# Revert frontend API changes
git checkout HEAD~1 client/src/services/aiService.js
```

---

## 📊 SECURITY MONITORING

### Post-Deployment Monitoring
- [ ] Monitor startup logs for security validation
- [ ] Monitor failed authentication attempts
- [ ] Monitor AI proxy usage
- [ ] Set up alerts for security incidents
- [ ] Review access logs regularly

### Regular Security Maintenance
- [ ] Rotate JWT secrets every 90 days
- [ ] Review admin user list monthly
- [ ] Update dependencies regularly
- [ ] Run security audits quarterly
- [ ] Backup encryption keys securely

---

## 🔥 CRITICAL REMINDERS

### ❌ NEVER DO THIS
- Never commit .env files to git
- Never expose API keys in frontend
- Never use default/weak secrets in production
- Never deploy without security validation
- Never skip environment validation

### ✅ ALWAYS DO THIS
- Always validate environment on startup
- Always hash sensitive tokens
- Always use backend proxy for API calls
- Always monitor security logs
- Always test security fixes thoroughly

---

## 📞 EMERGENCY CONTACTS

If you need help with these fixes:
- Check server logs: `tail -f server/logs/app.log`
- Check startup output for security validation messages
- Test each fix individually before moving to the next
- Keep backups of working states

**🚨 DO NOT DEPLOY TO PRODUCTION UNTIL ALL CHECKBOXES ARE ✅**