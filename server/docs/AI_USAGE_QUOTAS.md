# AI Usage Quotas - Implementation Documentation

## 📋 Overview

This document describes the AI Usage Quota system implemented in Pluqla to ensure fair usage of AI features across free and premium users.

**Implementation Date**: December 2024
**Status**: ✅ Complete
**Version**: 1.0.0

---

## 🎯 Objectives

1. **Fair Usage**: Prevent abuse of AI API endpoints
2. **Monetization**: Incentivize premium upgrades with higher quotas
3. **Cost Control**: Monitor and limit AI API costs
4. **User Experience**: Provide clear quota information to users

---

## 📊 Quota Limits

### Free Users
- **Daily Quota**: 50 tokens/day
- **Reset**: Daily at midnight UTC
- **Features**:
  - Suggestions: 1 token/request
  - Chat: 2 tokens/request
  - Insights: 3 tokens/request
  - Image Analysis: 5 tokens/request

### Premium Users
- **Daily Quota**: 500 tokens/day
- **Reset**: Daily at midnight UTC
- **Features**: Same token costs as free tier

### Warning Threshold
- **80% Usage**: Warning flag set in response headers
- **100% Usage**: Requests blocked with 429 status

---

## 🏗️ Architecture

### Components

1. **Database Model** (`schema.prisma`)
   - `AiUsage` table tracks all AI consumption
   - Relations to User model
   - Indexed for performance

2. **Service Layer** (`aiUsageService.js`)
   - `checkQuota()`: Verify available quota
   - `consumeTokens()`: Record usage
   - `resetQuota()`: Admin/testing function
   - `getUserStats()`: Analytics

3. **Middleware** (`aiQuotaMiddleware.js`)
   - `aiQuotaMiddleware()`: Enforce quotas before route execution
   - `addQuotaToResponse()`: Add quota info to responses
   - `bypassQuotaForAdmin()`: Admin bypass

4. **Helper Utilities** (`aiQuotaHelper.js`)
   - `consumeAITokens()`: Helper for controllers
   - `autoConsumeTokens()`: Auto-consume middleware

---

## 🔧 Implementation Details

### Database Schema

```prisma
model AiUsage {
  id                String   @id @default(cuid())
  userId            String
  feature           String
  tokensUsed        Int      @default(0)
  tokensRemaining   Int
  dailyQuota        Int
  requestMetadata   String?
  quotaExceeded     Boolean  @default(false)
  resetAt           DateTime
  ipAddress         String?
  userAgent         String?
  createdAt         DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, resetAt])
  @@index([userId, feature])
  @@index([resetAt])
  @@index([quotaExceeded])
  @@map("ai_usage")
}
```

### Route Integration

```javascript
// Example: AI suggestions endpoint
router.post(
  '/suggestions/alimentation',
  rateLimit.ai,
  aiQuotaMiddleware('suggestions'),  // Quota check
  validateAISuggestions,
  aiController.getFoodSuggestions
);
```

### API Response

**Success Response (with quota info)**:
```json
{
  "success": true,
  "suggestions": [...],
  "quota": {
    "remaining": 45,
    "limit": 50,
    "resetAt": "2024-12-02T00:00:00.000Z",
    "warning": false
  }
}
```

**Quota Exceeded Response**:
```json
{
  "error": "Quota exceeded",
  "message": "You have reached your daily free quota of 50 AI requests. Upgrade to premium for 500x more!",
  "details": {
    "remaining": 0,
    "quota": 50,
    "resetAt": "2024-12-02T00:00:00.000Z",
    "isPremium": false,
    "upgradeUrl": "/premium"
  }
}
```

### Response Headers

```
X-AI-Quota-Limit: 50
X-AI-Quota-Remaining: 45
X-AI-Quota-Reset: 2024-12-02T00:00:00.000Z
X-AI-Quota-Warning: false
```

---

## 🧪 Testing

### Unit Tests

```bash
cd server
npm test -- tests/aiUsage.test.js
```

**Test Coverage**:
- ✅ Quota limits for free/premium users
- ✅ Token consumption
- ✅ Quota enforcement
- ✅ Warning thresholds
- ✅ Multi-feature tracking
- ✅ Quota reset
- ✅ Statistics generation
- ✅ Error handling

### Integration Testing

```bash
node scripts/verify-ai-quotas.js
```

**Verification Script Tests**:
- Simulates 100 AI calls per user type
- Verifies free user blocked at 50 calls
- Verifies premium user allows all 100 calls
- Tests different feature costs
- Tests quota reset functionality

### Manual Testing

1. **Create Test Accounts**:
   ```bash
   cd server
   npm run db:seed
   ```

2. **Test Users Created**:
   - Free: `test@pluqla.com` (password: `password123`)
   - Premium: `premium@pluqla.com` (password: `password123`)

3. **Test API Endpoints**:
   ```bash
   # Login as free user
   curl -X POST http://localhost:3004/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@pluqla.com","password":"password123"}'

   # Make AI request (use returned token)
   curl -X POST http://localhost:3004/api/ai/suggestions \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"category":"alimentation","language":"fr"}'
   ```

---

## 📈 Monitoring & Analytics

### User Statistics

```javascript
const stats = await getUserStats(userId, 7); // Last 7 days

// Returns:
{
  period: { days: 7, since: Date },
  totalRequests: 45,
  totalTokens: 73,
  byFeature: {
    suggestions: 30,
    chat: 20,
    insights: 15,
    image_analysis: 8
  },
  quotaExceededCount: 2,
  averageTokensPerDay: 10
}
```

### Database Queries

```sql
-- Active users by quota usage
SELECT
  u.email,
  u.isPremium,
  SUM(ai.tokensUsed) as total_tokens,
  COUNT(*) as request_count
FROM users u
JOIN ai_usage ai ON u.id = ai.userId
WHERE ai.createdAt >= NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email, u.isPremium
ORDER BY total_tokens DESC;

-- Quota exceeded events
SELECT
  DATE(createdAt) as date,
  COUNT(*) as exceeded_count
FROM ai_usage
WHERE quotaExceeded = true
GROUP BY DATE(createdAt)
ORDER BY date DESC;
```

---

## 🔄 Maintenance

### Cleanup Old Records

```javascript
const { cleanupOldRecords } = require('./src/services/aiUsageService');

// Delete records older than 30 days
const deleted = await cleanupOldRecords();
console.log(`Deleted ${deleted} old records`);
```

**Recommended**: Set up a cron job to run this monthly.

### Reset User Quota (Admin)

```javascript
const { resetQuota } = require('./src/services/aiUsageService');

await resetQuota(userId);
```

---

## 🚨 Rollback Plan

### If Issues Occur

1. **Disable Quota Enforcement** (Quick Fix):
   ```javascript
   // In aiQuotaMiddleware.js
   function aiQuotaMiddleware(feature) {
     return (req, res, next) => {
       // EMERGENCY: Skip quota check
       next();
     };
   }
   ```

2. **Remove Middleware** (Temporary):
   ```javascript
   // In src/routes/ai.js
   // Comment out middleware:
   router.post('/suggestions',
     rateLimit.ai,
     // aiQuotaMiddleware('suggestions'), // DISABLED
     validateAISuggestions,
     aiController.getSuggestions
   );
   ```

3. **Database Rollback** (Full Rollback):
   ```sql
   -- Drop the ai_usage table
   DROP TABLE ai_usage;

   -- Remove relation from users table (requires migration)
   -- This would be handled by Prisma migration
   ```

4. **Code Rollback**:
   ```bash
   git revert <commit-hash>
   npm install
   npx prisma generate
   ```

### Rollback Checklist

- [ ] Notify users of temporary quota removal
- [ ] Monitor API costs during rollback period
- [ ] Document issues encountered
- [ ] Plan fixes for re-deployment
- [ ] Test fixes in staging before production
- [ ] Re-enable quotas gradually (premium first, then free)

---

## 🎯 Future Enhancements

### Phase 2 Improvements

1. **Actual Token Counting**:
   - Use OpenAI/Anthropic token counters
   - More accurate cost tracking
   - Per-model pricing

2. **Flexible Quotas**:
   - Monthly quotas in addition to daily
   - Rollover unused tokens
   - Tiered premium plans (Basic, Pro, Enterprise)

3. **Rate Limiting Integration**:
   - Combine with existing rate limiting
   - Burst allowances
   - Time-based throttling

4. **Analytics Dashboard**:
   - Real-time quota monitoring
   - Usage trends and predictions
   - Cost optimization insights

5. **User Notifications**:
   - Email alerts at 80% usage
   - In-app notifications
   - Quota reset reminders

6. **Dynamic Pricing**:
   - Pay-as-you-go option
   - Token purchase packages
   - Usage-based billing

---

## 📚 References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [OpenAI Token Counting](https://platform.openai.com/docs/guides/rate-limits)
- [Pluqla Architecture Docs](./ARCHITECTURE.md)

---

## 👥 Support

For questions or issues:
- **Slack**: #pluqla-dev
- **GitHub Issues**: Tag with `ai-quotas`
- **Documentation**: `/server/docs`

---

**Last Updated**: December 2024
**Author**: Pluqla Engineering Team
**Review Status**: ✅ Approved
