# 🚨 Premium Subscription Rollback Guide

## Quick Reference

**Feature**: Premium Subscription System
**Last Updated**: December 2024
**Severity Levels**: 🟢 Low | 🟡 Medium | 🔴 Critical

---

## Emergency Contacts

- **Slack**: #pluqla-dev
- **On-Call**: Engineering Lead
- **Escalation**: CTO

---

## Quick Disable (30 seconds)

**Fastest way to disable premium enforcement**:

```bash
# Method 1: Environment variable (if implemented)
export SKIP_PREMIUM_CHECK=true
pm2 restart pluqla-server

# Method 2: Comment out middleware in routes
# Edit server/src/routes/ai.js and comment requirePremium lines
```

This temporarily disables premium checks while keeping code intact.

---

## Rollback Scenarios

### Scenario 1: Database Migration Failed (🔴 Critical)

**Symptoms**:
- Server won't start
- Database connection errors
- "Column subscriptionTier does not exist" errors

**Quick Fix** (5 minutes):

1. **Revert migration**:
   ```bash
   cd server

   # List migrations
   npx prisma migrate status

   # Rollback last migration
   npx prisma migrate resolve --rolled-back <migration-name>

   # Revert database state manually if needed
   psql $DATABASE_URL -c "ALTER TABLE \"User\" DROP COLUMN IF EXISTS \"subscriptionTier\";"
   psql $DATABASE_URL -c "ALTER TABLE \"User\" DROP COLUMN IF EXISTS \"subscriptionStartDate\";"
   psql $DATABASE_URL -c "ALTER TABLE \"User\" DROP COLUMN IF EXISTS \"subscriptionEndDate\";"
   psql $DATABASE_URL -c "DROP TYPE IF EXISTS \"SubscriptionTier\";"
   ```

2. **Revert Prisma schema**:
   ```bash
   git checkout HEAD^ -- server/prisma/schema.prisma
   npx prisma generate
   ```

3. **Restart server**:
   ```bash
   pm2 restart pluqla-server
   ```

---

### Scenario 2: Users Incorrectly Blocked (🔴 Critical)

**Symptoms**:
- Premium users getting 403 errors
- Admins being blocked from features
- Mass user complaints

**Quick Fix** (1 minute):

```javascript
// In server/src/middleware/requirePremium.js
// Add at top of requirePremium function:

function requirePremium(options = {}) {
  return (req, res, next) => {
    // EMERGENCY BYPASS - Allow all users
    return next();

    // ... rest of function
  };
}
```

**Deploy**:
```bash
git add server/src/middleware/requirePremium.js
git commit -m "EMERGENCY: disable premium enforcement"
git push
pm2 restart pluqla-server
```

---

### Scenario 3: Frontend Upgrade Flow Broken (🟡 Medium)

**Symptoms**:
- Subscription page not loading
- Upgrade prompts causing crashes
- Payment flow errors

**Quick Fix** (2 minutes):

```javascript
// Option 1: Disable upgrade prompts in PremiumUpgradePrompt.jsx
// Change component to always return null:
const PremiumUpgradePrompt = () => null;

// Option 2: Remove route temporarily
// In client/src/router/AppRouter.jsx, comment out:
/*
<Route
  path="/subscription"
  element={
    <ProtectedRoute>
      <SubscriptionPage />
    </ProtectedRoute>
  }
/>
*/

// Option 3: Redirect to home
<Route
  path="/subscription"
  element={<Navigate to="/dashboard" replace />}
/>
```

---

### Scenario 4: Tier Detection Bug (🟡 Medium)

**Symptoms**:
- Wrong tier detection
- isPremium field conflicts with subscriptionTier
- Inconsistent access control

**Quick Fix** (5 minutes):

```javascript
// In requirePremium.js, force allow all authenticated users:
function requirePremium(options = {}) {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this feature'
      });
    }

    // TEMPORARY: Allow all authenticated users
    return next();
  };
}
```

---

### Scenario 5: Subscription Expiry Issues (🟢 Low)

**Symptoms**:
- Active subscriptions marked as expired
- Expiration dates not enforced
- Users complaining about incorrect expiration

**Quick Fix** (10 minutes):

1. **Disable expiration check temporarily**:
   ```javascript
   // In requirePremium.js, comment out expiration check:
   /*
   if (user.subscriptionEndDate && new Date() > new Date(user.subscriptionEndDate)) {
     return res.status(403).json({
       error: 'Subscription expired',
       message: 'Your premium subscription has expired.'
     });
   }
   */
   ```

2. **Fix database manually**:
   ```sql
   -- Set all premium users to no expiration
   UPDATE "User"
   SET "subscriptionEndDate" = NULL
   WHERE "subscriptionTier" IN ('PREMIUM', 'ENTERPRISE');
   ```

---

## Complete Rollback (15 minutes)

**Use when**: Multiple critical issues, system unstable

### Step 1: Remove Middleware from Routes

```bash
cd server/src/routes

# Edit ai.js
# Remove these lines:
# const { requirePremium } = require('../middleware/requirePremium');
# requirePremium({ feature: '...' }),

# Example before:
# router.post('/suggestions/alimentation',
#   rateLimit.ai,
#   requirePremium({ feature: 'AI food suggestions' }),
#   aiQuotaMiddleware('suggestions'),
#   ...
# );

# Example after:
# router.post('/suggestions/alimentation',
#   rateLimit.ai,
#   // requirePremium({ feature: 'AI food suggestions' }), // DISABLED
#   aiQuotaMiddleware('suggestions'),
#   ...
# );
```

### Step 2: Revert Database Changes

```bash
cd server

# Option 1: Rollback migration
npx prisma migrate resolve --rolled-back add_subscription_tier

# Option 2: Manual SQL rollback
psql $DATABASE_URL << EOF
ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionTier";
ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionStartDate";
ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionEndDate";
DROP TYPE IF EXISTS "SubscriptionTier";
EOF

# Option 3: Keep columns but don't use them (safest)
# Just remove middleware, keep database as-is
```

### Step 3: Revert Frontend Changes

```bash
cd client/src

# Remove subscription page
rm -f pages/SubscriptionPage.jsx

# Remove upgrade prompt
rm -rf components/premium/

# Revert router changes
git checkout HEAD^ -- router/AppRouter.jsx

# Revert API adapter changes
git checkout HEAD^ -- services/api/apiAdapter.js
```

### Step 4: Clean Up Code

```bash
# Remove requirePremium middleware
rm server/src/middleware/requirePremium.js

# Remove tests
rm server/tests/requirePremium.test.js

# Remove verification script
rm server/scripts/verify-premium.js

# Remove documentation
rm server/docs/README_PREMIUM.md
rm server/docs/ROLLBACK_PREMIUM.md
```

### Step 5: Deploy

```bash
# Commit changes
git add .
git commit -m "rollback: remove premium subscription system"

# Push to repository
git push origin main

# Restart services
pm2 restart pluqla-server
pm2 restart pluqla-client
```

### Step 6: Verify

```bash
# Test endpoints without authentication
curl http://localhost:3004/api/health

# Test premium endpoints (should work now)
TOKEN="your-test-token"
curl -X POST http://localhost:3004/api/ai/suggestions/alimentation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"fruits"}'

# Check logs
tail -f logs/app.log | grep -i "premium"
```

---

## Partial Rollback Options

### Option 1: Disable for Specific Routes Only

```javascript
// Keep premium system but disable on problematic routes
router.post('/ai/suggestions/alimentation',
  rateLimit.ai,
  // requirePremium({ feature: 'AI food suggestions' }), // DISABLED temporarily
  aiQuotaMiddleware('suggestions'),
  validateAISuggestions,
  aiController.getFoodSuggestions
);

// Keep enabled on other routes
router.post('/transport/optimize',
  requirePremium({ feature: 'transport optimization' }),
  transportController.optimize
);
```

### Option 2: Free Access for All (Keep Code)

```javascript
// In requirePremium.js, modify logic to allow all users:
const isPremium =
  user.subscriptionTier === 'PREMIUM' ||
  user.subscriptionTier === 'ENTERPRISE' ||
  user.isPremium === true ||
  true; // TEMPORARY: Allow all users
```

### Option 3: Keep Backend, Disable Frontend

```javascript
// Keep premium enforcement on backend
// But disable upgrade prompts on frontend

// In apiAdapter.js, don't throw PREMIUM_REQUIRED errors:
if (response.status === 403) {
  // Just show generic error instead of upgrade prompt
  return ERROR_CATEGORIES.AUTHENTICATION;
}
```

---

## Database Fixes

### Reset All Users to Free

```sql
UPDATE "User"
SET "subscriptionTier" = 'FREE',
    "subscriptionStartDate" = NULL,
    "subscriptionEndDate" = NULL,
    "isPremium" = false;
```

### Upgrade Specific Users

```sql
-- Upgrade user to premium
UPDATE "User"
SET "subscriptionTier" = 'PREMIUM',
    "subscriptionStartDate" = NOW(),
    "subscriptionEndDate" = NULL,
    "isPremium" = true
WHERE email = 'user@example.com';
```

### Sync subscriptionTier with isPremium

```sql
-- For users with isPremium=true but subscriptionTier=FREE
UPDATE "User"
SET "subscriptionTier" = 'PREMIUM'
WHERE "isPremium" = true
  AND "subscriptionTier" = 'FREE';

-- For users with subscriptionTier=PREMIUM but isPremium=false
UPDATE "User"
SET "isPremium" = true
WHERE "subscriptionTier" IN ('PREMIUM', 'ENTERPRISE')
  AND "isPremium" = false;
```

---

## Post-Rollback Checklist

### Immediate (0-1 hour)
- [ ] Verify all critical endpoints responding
- [ ] Check 403 error rate dropped to zero
- [ ] Test with free and premium users
- [ ] Monitor API response times
- [ ] Update status page
- [ ] Notify team via Slack

### Short-term (1-24 hours)
- [ ] Document root cause
- [ ] Create bug tickets for issues
- [ ] Plan fixes with team
- [ ] Communicate timeline to stakeholders
- [ ] Review monitoring alerts
- [ ] Analyze user feedback

### Long-term (1-7 days)
- [ ] Implement fixes
- [ ] Add missing tests
- [ ] Test in staging thoroughly
- [ ] Create gradual rollout plan
- [ ] Monitor metrics closely
- [ ] Update documentation

---

## Monitoring Commands

### Check Premium Enforcement Status

```bash
# View recent premium-related logs
tail -f logs/app.log | grep -i "premium"

# Count 403 errors in last hour
grep "403" logs/app.log | wc -l

# View specific 403 premium errors
grep "Premium subscription required" logs/app.log | tail -20
```

### Database Diagnostics

```sql
-- Count users by tier
SELECT "subscriptionTier", COUNT(*) as count
FROM "User"
GROUP BY "subscriptionTier";

-- Find users with mismatched fields
SELECT id, email, "subscriptionTier", "isPremium"
FROM "User"
WHERE ("subscriptionTier" IN ('PREMIUM', 'ENTERPRISE') AND "isPremium" = false)
   OR ("subscriptionTier" = 'FREE' AND "isPremium" = true);

-- Find expired subscriptions
SELECT id, email, "subscriptionEndDate"
FROM "User"
WHERE "subscriptionEndDate" < NOW()
  AND "subscriptionTier" IN ('PREMIUM', 'ENTERPRISE');
```

### Health Check

```bash
# Check if server is running
curl http://localhost:3004/api/health

# Test authentication still works
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pluqla.com","password":"password"}'

# Test previously-premium endpoint (should work after rollback)
TOKEN="your-token"
curl -X POST http://localhost:3004/api/ai/suggestions/alimentation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"fruits"}'
```

---

## Prevention Checklist

### Before Deployment
- [ ] Full test suite passing (26+ tests)
- [ ] Integration tests completed
- [ ] Staging environment validated (24+ hours)
- [ ] Database migration tested on staging
- [ ] Rollback plan reviewed
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment
- [ ] Database backup completed

### After Deployment
- [ ] Monitor 403 error rates for 1 hour
- [ ] Verify premium users can access features
- [ ] Verify free users properly blocked
- [ ] Check frontend upgrade flow works
- [ ] Test subscription page loads
- [ ] Monitor user feedback channels
- [ ] Document any issues
- [ ] On-call engineer assigned

---

## Testing After Rollback

### Manual Tests

```bash
# Test as free user (should now access premium features)
TOKEN_FREE=$(curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"free@pluqla.com","password":"Password123!"}' \
  | jq -r '.tokens.accessToken')

curl -X POST http://localhost:3004/api/ai/suggestions/alimentation \
  -H "Authorization: Bearer $TOKEN_FREE" \
  -H "Content-Type: application/json" \
  -d '{"category":"fruits"}' \
  | jq

# Should return 200 (not 403) after rollback
```

### Automated Tests

```bash
# Run full test suite
npm test

# Run specific tests (should skip or pass)
npm test -- tests/requirePremium.test.js

# Run verification (should show all endpoints accessible)
node scripts/verify-premium.js || echo "Script removed after rollback"
```

---

## Communication Templates

### Internal Slack Notification

```
🚨 ALERT: Premium enforcement disabled temporarily

Reason: [describe issue]
Duration: [estimated time]
Impact: All users now have access to premium features
Action: Investigating root cause and preparing fix
ETA Fix: [time estimate]

Status updates: Every 30 minutes
```

### User-Facing Status Update

```
We're currently experiencing technical difficulties with our premium
subscription system. As a temporary measure, all features have been
made available to all users at no charge.

We're working on a resolution and will provide updates shortly.

Status: Investigating
ETA: [time]
```

### Post-Mortem Template

```
**Premium Subscription Rollback - Post-Mortem**

**Date**: [date]
**Duration**: [duration]
**Impact**: [description]

**Root Cause**:
[detailed explanation]

**Timeline**:
- [time] Issue detected
- [time] Rollback initiated
- [time] Services restored
- [time] Root cause identified

**Resolution**:
[what was done]

**Prevention**:
- [action item 1]
- [action item 2]
- [action item 3]

**Follow-up**:
- [task 1] - Owner: [name] - Due: [date]
- [task 2] - Owner: [name] - Due: [date]
```

---

## Configuration Reference

### Environment Variables (if implemented)

```bash
# Enable/disable premium enforcement
SKIP_PREMIUM_CHECK=true     # Skip all premium checks (dev/emergency)

# Database connection
DATABASE_URL="postgresql://..." # Ensure this is correct

# Development mode
NODE_ENV=development        # May affect premium checks
```

### Code Toggles

```javascript
// Emergency bypass at function level
function requirePremium(options = {}) {
  return async (req, res, next) => {
    // TOGGLE: Uncomment to bypass all checks
    // return next();

    // Normal premium enforcement...
  };
}

// Bypass for specific tiers
if (tier === 'FREE') {
  // TOGGLE: Uncomment to allow free users
  // return next();
}
```

---

## Additional Resources

- **Main Documentation**: [README_PREMIUM.md](./README_PREMIUM.md)
- **Rate Limiting**: [README_RATE_LIMIT.md](./README_RATE_LIMIT.md)
- **AI Quotas**: [AI_USAGE_QUOTAS.md](./AI_USAGE_QUOTAS.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Decision Matrix

| Severity | Symptoms | Action | Time | Risk |
|----------|----------|--------|------|------|
| 🟢 Low | Minor complaints | Adjust tier detection | 5 min | Low |
| 🟡 Medium | Several users affected | Partial rollback | 10 min | Medium |
| 🔴 Critical | Service blocking users | Full disable | 1 min | High |
| 🔴 Critical | Database corruption | Full rollback + restore | 15 min | High |

---

**Remember**: It's better to roll back and fix properly than to leave broken features in production.

---

**Version**: 1.0.0
**Last Review**: December 2024
**Next Review**: January 2025
