# AI Usage Quota Migration

## Migration Name
`add_ai_usage_quota_tracking`

## Description
Adds AI usage quota tracking to enable fair usage limits for free and premium users.

## Changes
- **New Table**: `ai_usage`
  - Tracks AI API consumption per user
  - Records tokens used, remaining quota, and reset times
  - Supports different features (suggestions, chat, insights, image_analysis)
  - Includes performance indexes for fast quota lookups

## SQL (PostgreSQL)
```sql
-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "tokensRemaining" INTEGER NOT NULL,
    "dailyQuota" INTEGER NOT NULL,
    "requestMetadata" TEXT,
    "quotaExceeded" BOOLEAN NOT NULL DEFAULT false,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ai_usage_user_reset" ON "ai_usage"("userId", "resetAt");

-- CreateIndex
CREATE INDEX "idx_ai_usage_user_feature" ON "ai_usage"("userId", "feature");

-- CreateIndex
CREATE INDEX "idx_ai_usage_reset" ON "ai_usage"("resetAt");

-- CreateIndex
CREATE INDEX "idx_ai_usage_exceeded" ON "ai_usage"("quotaExceeded");

-- CreateIndex
CREATE INDEX "idx_ai_usage_user_created" ON "ai_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_ai_usage_feature_created" ON "ai_usage"("feature", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Rollback
```sql
-- DropTable
DROP TABLE "ai_usage";
```

## Notes
- Migration is backward compatible (only adds new table)
- Existing users will need initial quota records (handled by seed script)
- No downtime required
- Uses CASCADE delete to clean up when users are deleted
