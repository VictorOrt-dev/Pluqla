# 🚨 AI Quotas Rollback Guide

## Quick Reference

**Last Updated**: December 2024
**Feature**: AI Usage Quotas
**Severity Levels**: 🟢 Low | 🟡 Medium | 🔴 Critical

---

## Emergency Contacts

- **Slack**: #pluqla-dev
- **On-Call**: Engineering Lead
- **Escalation**: CTO

---

## Rollback Scenarios

### Scenario 1: Quota Enforcement Too Strict (🟡 Medium)

**Symptoms**:
- Users complaining about blocked requests
- Quota limits reached unexpectedly
- Premium users hitting limits

**Quick Fix** (5 minutes):

1. **Temporarily increase quotas**:
   ```javascript
   // In src/services/aiUsageService.js
   this.QUOTA_LIMITS = {
     free: 100,      // Was: 50
     premium: 1000   // Was: 500
   };
   ```

2. **Restart server**:
   ```bash
   pm2 restart pluqla-server
   # or
   npm run dev
   ```

3. **Monitor**: Check usage patterns for 24 hours
4. **Adjust**: Set permanent limits based on data

---

### Scenario 2: Database Performance Issues (🔴 Critical)

**Symptoms**:
- Slow AI endpoint responses
- Database connection timeouts
- High CPU on database server

**Quick Fix** (10 minutes):

1. **Disable quota checks**:
   ```javascript
   // In src/middleware/aiQuotaMiddleware.js
   function aiQuotaMiddleware(feature) {
     return async (req, res, next) => {
       // EMERGENCY BYPASS
       console.warn('AI quota checks disabled - emergency mode');
       next();
     };
   }
   ```

2. **Deploy change**:
   ```bash
   git add src/middleware/aiQuotaMiddleware.js
   git commit -m "hotfix: disable AI quota checks temporarily"
   git push
   pm2 restart pluqla-server
   ```

3. **Investigate**: Check database indexes and query performance
4. **Fix**: Optimize queries or add missing indexes

---

### Scenario 3: Bug in Quota Logic (🔴 Critical)

**Symptoms**:
- Users charged incorrect tokens
- Quota not resetting
- Incorrect quota calculations

**Quick Fix** (15 minutes):

1. **Disable middleware from routes**:
   ```javascript
   // In src/routes/ai.js
   // Comment out all aiQuotaMiddleware calls:
   router.post('/suggestions/alimentation',
     rateLimit.ai,
     // aiQuotaMiddleware('suggestions'), // DISABLED - Bug fix in progress
     validateAISuggestions,
     aiController.getFoodSuggestions
   );
   ```

2. **Deploy**:
   ```bash
   git add src/routes/ai.js
   git commit -m "hotfix: disable AI quota middleware due to bug"
   git push
   pm2 restart pluqla-server
   ```

3. **Reset affected users**:
   ```javascript
   // Run in Node REPL or script
   const { resetQuota } = require('./src/services/aiUsageService');

   // Reset all users (use carefully!)
   const users = await prisma.user.findMany({ select: { id: true } });
   for (const user of users) {
     await resetQuota(user.id);
   }
   ```

4. **Investigate & Fix**: Fix bug, test thoroughly, redeploy

---

### Scenario 4: Complete Rollback Needed (🔴 Critical)

**Symptoms**:
- Multiple critical issues
- System instability
- Data corruption

**Full Rollback** (30 minutes):

#### Step 1: Revert Code Changes

```bash
# Find the commit before quota implementation
git log --oneline | grep -i quota

# Revert to previous stable version
git revert <quota-commit-hash>

# Or reset to previous commit (use with caution)
git reset --hard <commit-before-quotas>
git push --force origin main
```

#### Step 2: Remove Database Table

```sql
-- Connect to database
psql -U pluqla_user -d pluqla_production

-- Backup first!
CREATE TABLE ai_usage_backup AS SELECT * FROM ai_usage;

-- Drop the table
DROP TABLE ai_usage;

-- Remove from Prisma
-- Edit prisma/schema.prisma and remove:
-- - AiUsage model
-- - aiUsageRecords relation from User model

-- Regenerate Prisma client
npx prisma generate
```

#### Step 3: Remove Migration

```bash
# Navigate to migrations
cd server/prisma/migrations

# Remove quota migration folder
rm -rf <migration-folder-with-ai-usage>

# Update Prisma migration history
npx prisma migrate resolve --rolled-back <migration-name>
```

#### Step 4: Clean Up Files

```bash
# Remove quota-related files
rm server/src/services/aiUsageService.js
rm server/src/middleware/aiQuotaMiddleware.js
rm server/src/utils/aiQuotaHelper.js
rm server/tests/aiUsage.test.js
rm server/scripts/verify-ai-quotas.js
```

#### Step 5: Deploy

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run tests
npm test

# Deploy
pm2 restart pluqla-server

# Verify
curl http://localhost:3004/api/health
```

#### Step 6: Notify Stakeholders

- Post in #pluqla-dev: "AI quotas rolled back due to [reason]"
- Update status page if applicable
- Email premium users if they were affected

---

## Partial Rollback (Gradual)

### Option 1: Disable for Free Users Only

```javascript
// In src/middleware/aiQuotaMiddleware.js
function aiQuotaMiddleware(feature) {
  return async (req, res, next) => {
    // Skip quota for free users temporarily
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user.isPremium) {
      console.log('Quota check bypassed for free user');
      return next();
    }

    // Normal quota check for premium users
    // ... existing code
  };
}
```

### Option 2: Disable Specific Features

```javascript
// In src/routes/ai.js
// Remove quota middleware from specific routes:
router.post('/suggestions',
  rateLimit.ai,
  // aiQuotaMiddleware('suggestions'), // DISABLED - high demand feature
  validateAISuggestions,
  aiController.getSuggestions
);

// Keep quota on expensive features:
router.post('/analyze/image',
  rateLimit.ai,
  aiQuotaMiddleware('image_analysis'), // KEEP - expensive operation
  validateImageAnalysis,
  aiController.analyzeImage
);
```

---

## Post-Rollback Checklist

### Immediate (0-1 hour)
- [ ] Verify all AI endpoints responding
- [ ] Check error logs for new issues
- [ ] Monitor API costs (ensure no spike)
- [ ] Test with free and premium accounts
- [ ] Update status page

### Short-term (1-24 hours)
- [ ] Document root cause
- [ ] Create bug tickets
- [ ] Plan fixes with team
- [ ] Schedule post-mortem meeting
- [ ] Communicate timeline to users

### Long-term (1-7 days)
- [ ] Implement fixes
- [ ] Add missing tests
- [ ] Test in staging thoroughly
- [ ] Gradual rollout plan (A/B test)
- [ ] Monitor metrics closely

---

## Monitoring Commands

### Check AI Usage

```sql
-- Recent AI requests
SELECT
  u.email,
  COUNT(*) as requests,
  SUM(ai.tokensUsed) as total_tokens,
  MAX(ai.createdAt) as last_request
FROM users u
LEFT JOIN ai_usage ai ON u.id = ai.userId
WHERE ai.createdAt >= NOW() - INTERVAL '1 hour'
GROUP BY u.id, u.email
ORDER BY requests DESC
LIMIT 20;
```

### Check for Errors

```bash
# View recent logs
tail -f server/logs/error.log | grep -i quota

# Count quota errors
grep -c "quota exceeded" server/logs/app.log
```

### Check Database Health

```sql
-- Table size
SELECT
  pg_size_pretty(pg_total_relation_size('ai_usage')) as total_size,
  pg_size_pretty(pg_relation_size('ai_usage')) as table_size,
  pg_size_pretty(pg_indexes_size('ai_usage')) as indexes_size;

-- Index usage
SELECT
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname = 'ai_usage';
```

---

## Prevention

### Before Deployment
- [ ] Full test suite passing
- [ ] Load testing completed
- [ ] Staging environment validated
- [ ] Rollback plan reviewed
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment

### After Deployment
- [ ] Monitor error rates for 1 hour
- [ ] Check performance metrics
- [ ] Verify user feedback channels
- [ ] Document any issues
- [ ] On-call engineer assigned

---

## Additional Resources

- **Main Documentation**: [AI_USAGE_QUOTAS.md](./AI_USAGE_QUOTAS.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Deployment Guide**: [DEPLOYMENT.md](../../docs/DEPLOYMENT.md)
- **Monitoring Dashboard**: [Grafana](http://localhost:3001)

---

**Remember**: It's better to roll back and fix properly than to leave a broken feature in production.

---

**Version**: 1.0.0
**Last Review**: December 2024
**Next Review**: January 2025
