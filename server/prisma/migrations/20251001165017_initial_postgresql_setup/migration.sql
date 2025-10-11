-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "savedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyGoal" DOUBLE PRECISION NOT NULL DEFAULT 800,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastSavingDate" TIMESTAMP(3),
    "level" INTEGER NOT NULL DEFAULT 1,
    "plansUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscriptionStartDate" TIMESTAMP(3),
    "subscriptionEndDate" TIMESTAMP(3),
    "gamificationPoints" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "lastScaAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'saving',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cookingTime" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "estimatedPrice" DOUBLE PRECISION NOT NULL,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "image" TEXT,
    "nutritionalInfo" TEXT,
    "tags" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_recipes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cacheKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "properties" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "conditions" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_blacklist" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "revokedBy" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_processing_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "operation" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "provider" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "encryptedCredentials" TEXT,
    "accountNumber" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "symbol" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitValue" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionPrice" DOUBLE PRECISION,
    "metadata" TEXT,
    "lastUpdateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION,
    "monthlyPayment" DOUBLE PRECISION,
    "minimumPayment" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "originalAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextExpectedDate" TIMESTAMP(3),
    "taxRate" DOUBLE PRECISION,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAssets" DOUBLE PRECISION NOT NULL,
    "totalLiabilities" DOUBLE PRECISION NOT NULL,
    "netWorth" DOUBLE PRECISION NOT NULL,
    "liquidAssets" DOUBLE PRECISION NOT NULL,
    "monthlyIncome" DOUBLE PRECISION NOT NULL,
    "monthlyExpenses" DOUBLE PRECISION NOT NULL,
    "savingsRate" DOUBLE PRECISION,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "merchant" TEXT,
    "location" TEXT,
    "metadata" TEXT,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_mappings" (
    "id" TEXT NOT NULL,
    "merchantPattern" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isUserDefined" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "merchant" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "paymentMethod" TEXT,
    "location" TEXT,
    "receipt" TEXT,
    "tags" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "parentCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "budgetLimit" DOUBLE PRECISION,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'monthly',
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categories" TEXT NOT NULL,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_suggestions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "category" TEXT,
    "potentialSaving" DOUBLE PRECISION,
    "actionRequired" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'active',
    "generatedBy" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sca_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "allowedMethods" TEXT NOT NULL,
    "challengeData" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "verificationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sca_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sca_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sca_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "location" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isVpn" BOOLEAN NOT NULL DEFAULT false,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sca_exemption_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "exemptionType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sca_exemption_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "better_auth_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "better_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "better_auth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "better_auth_accounts_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_user_status" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_user_email_verification_token" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "idx_user_last_login" ON "users"("lastLoginAt");

-- CreateIndex
CREATE INDEX "idx_user_premium" ON "users"("isPremium");

-- CreateIndex
CREATE INDEX "idx_user_created_at" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "idx_user_answer_key" ON "user_answers"("key");

-- CreateIndex
CREATE INDEX "idx_user_answer_key_value" ON "user_answers"("key", "value");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_userId_key_key" ON "user_answers"("userId", "key");

-- CreateIndex
CREATE INDEX "idx_transaction_user_id" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "idx_transaction_user_date" ON "transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "idx_transaction_user_category" ON "transactions"("userId", "category");

-- CreateIndex
CREATE INDEX "idx_transaction_date" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "idx_transaction_category" ON "transactions"("category");

-- CreateIndex
CREATE INDEX "idx_transaction_user_category_date" ON "transactions"("userId", "category", "date");

-- CreateIndex
CREATE INDEX "idx_recipe_category" ON "recipes"("category");

-- CreateIndex
CREATE INDEX "idx_recipe_active" ON "recipes"("isActive");

-- CreateIndex
CREATE INDEX "idx_recipe_category_active" ON "recipes"("category", "isActive");

-- CreateIndex
CREATE INDEX "idx_recipe_difficulty" ON "recipes"("difficulty");

-- CreateIndex
CREATE INDEX "idx_recipe_price" ON "recipes"("estimatedPrice");

-- CreateIndex
CREATE INDEX "idx_favorite_recipe_user" ON "favorite_recipes"("userId");

-- CreateIndex
CREATE INDEX "idx_favorite_recipe_recipe" ON "favorite_recipes"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_recipes_userId_recipeId_key" ON "favorite_recipes"("userId", "recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE INDEX "idx_badge_active" ON "badges"("isActive");

-- CreateIndex
CREATE INDEX "idx_badge_rarity" ON "badges"("rarity");

-- CreateIndex
CREATE INDEX "idx_badge_points" ON "badges"("points");

-- CreateIndex
CREATE INDEX "idx_user_badge_user" ON "user_badges"("userId");

-- CreateIndex
CREATE INDEX "idx_user_badge_badge" ON "user_badges"("badgeId");

-- CreateIndex
CREATE INDEX "idx_user_badge_unlocked" ON "user_badges"("unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "idx_daily_challenge_user_date" ON "daily_challenges"("userId", "date");

-- CreateIndex
CREATE INDEX "idx_daily_challenge_date_completed" ON "daily_challenges"("date", "completed");

-- CreateIndex
CREATE INDEX "idx_daily_challenge_user_completed" ON "daily_challenges"("userId", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_userId_challengeId_date_key" ON "daily_challenges"("userId", "challengeId", "date");

-- CreateIndex
CREATE INDEX "idx_cache_expires_at" ON "cache_entries"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_cache_category" ON "cache_entries"("category");

-- CreateIndex
CREATE INDEX "idx_cache_user_category" ON "cache_entries"("userId", "category");

-- CreateIndex
CREATE INDEX "idx_cache_category_expires" ON "cache_entries"("category", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "cache_entries_userId_cacheKey_category_key" ON "cache_entries"("userId", "cacheKey", "category");

-- CreateIndex
CREATE INDEX "idx_analytics_user_type" ON "analytics_events"("userId", "type");

-- CreateIndex
CREATE INDEX "idx_analytics_session" ON "analytics_events"("sessionId");

-- CreateIndex
CREATE INDEX "idx_analytics_timestamp" ON "analytics_events"("timestamp");

-- CreateIndex
CREATE INDEX "idx_analytics_type_timestamp" ON "analytics_events"("type", "timestamp");

-- CreateIndex
CREATE INDEX "idx_analytics_user_timestamp" ON "analytics_events"("userId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_name_key" ON "feature_flags"("name");

-- CreateIndex
CREATE INDEX "idx_feature_flag_environment" ON "feature_flags"("environment");

-- CreateIndex
CREATE INDEX "idx_feature_flag_enabled" ON "feature_flags"("enabled");

-- CreateIndex
CREATE INDEX "idx_feature_flag_env_enabled" ON "feature_flags"("environment", "enabled");

-- CreateIndex
CREATE INDEX "idx_feature_flag_expires" ON "feature_flags"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_image_user" ON "images"("userId");

-- CreateIndex
CREATE INDEX "idx_image_analyzed" ON "images"("analyzed");

-- CreateIndex
CREATE INDEX "idx_image_mimetype" ON "images"("mimetype");

-- CreateIndex
CREATE INDEX "idx_image_created" ON "images"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "idx_refresh_token_expires" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_refresh_token_revoked" ON "refresh_tokens"("revoked");

-- CreateIndex
CREATE INDEX "idx_refresh_token_jti" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user_active" ON "refresh_tokens"("userId", "revoked", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_refresh_token_jti_user" ON "refresh_tokens"("jti", "userId");

-- CreateIndex
CREATE INDEX "idx_refresh_token_cleanup" ON "refresh_tokens"("revoked", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_tokenHash_key" ON "token_blacklist"("tokenHash");

-- CreateIndex
CREATE INDEX "idx_token_blacklist_hash" ON "token_blacklist"("tokenHash");

-- CreateIndex
CREATE INDEX "idx_token_blacklist_expires" ON "token_blacklist"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_token_blacklist_user" ON "token_blacklist"("userId");

-- CreateIndex
CREATE INDEX "idx_token_blacklist_type" ON "token_blacklist"("tokenType");

-- CreateIndex
CREATE INDEX "idx_token_blacklist_type_expires" ON "token_blacklist"("tokenType", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_tokenHash_key" ON "password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "idx_password_reset_token" ON "password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "idx_password_reset_user" ON "password_resets"("userId");

-- CreateIndex
CREATE INDEX "idx_password_reset_expires" ON "password_resets"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_password_reset_used" ON "password_resets"("used");

-- CreateIndex
CREATE INDEX "idx_password_reset_user_active" ON "password_resets"("userId", "used", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_password_reset_cleanup" ON "password_resets"("used", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_user_consent_user_type" ON "user_consents"("userId", "consentType");

-- CreateIndex
CREATE INDEX "idx_user_consent_created" ON "user_consents"("createdAt");

-- CreateIndex
CREATE INDEX "idx_user_consent_granted" ON "user_consents"("granted");

-- CreateIndex
CREATE INDEX "idx_user_consent_type_granted" ON "user_consents"("consentType", "granted");

-- CreateIndex
CREATE INDEX "idx_data_processing_user" ON "data_processing_logs"("userId");

-- CreateIndex
CREATE INDEX "idx_data_processing_timestamp" ON "data_processing_logs"("timestamp");

-- CreateIndex
CREATE INDEX "idx_data_processing_operation" ON "data_processing_logs"("operation");

-- CreateIndex
CREATE INDEX "idx_data_processing_data_type" ON "data_processing_logs"("dataType");

-- CreateIndex
CREATE INDEX "idx_data_processing_success" ON "data_processing_logs"("success");

-- CreateIndex
CREATE INDEX "idx_data_processing_op_time" ON "data_processing_logs"("operation", "timestamp");

-- CreateIndex
CREATE INDEX "idx_security_incident_user" ON "security_incidents"("userId");

-- CreateIndex
CREATE INDEX "idx_security_incident_type" ON "security_incidents"("incidentType");

-- CreateIndex
CREATE INDEX "idx_security_incident_severity" ON "security_incidents"("severity");

-- CreateIndex
CREATE INDEX "idx_security_incident_resolved" ON "security_incidents"("resolved");

-- CreateIndex
CREATE INDEX "idx_security_incident_created" ON "security_incidents"("createdAt");

-- CreateIndex
CREATE INDEX "idx_security_incident_severity_resolved" ON "security_incidents"("severity", "resolved");

-- CreateIndex
CREATE INDEX "idx_security_incident_type_created" ON "security_incidents"("incidentType", "createdAt");

-- CreateIndex
CREATE INDEX "idx_account_user_type" ON "accounts"("userId", "type");

-- CreateIndex
CREATE INDEX "idx_account_provider" ON "accounts"("provider");

-- CreateIndex
CREATE INDEX "idx_account_active" ON "accounts"("isActive");

-- CreateIndex
CREATE INDEX "idx_account_user_active" ON "accounts"("userId", "isActive");

-- CreateIndex
CREATE INDEX "idx_account_last_sync" ON "accounts"("lastSyncAt");

-- CreateIndex
CREATE INDEX "idx_asset_user_type" ON "assets"("userId", "type");

-- CreateIndex
CREATE INDEX "idx_asset_symbol" ON "assets"("symbol");

-- CreateIndex
CREATE INDEX "idx_asset_type" ON "assets"("type");

-- CreateIndex
CREATE INDEX "idx_asset_last_update" ON "assets"("lastUpdateAt");

-- CreateIndex
CREATE INDEX "idx_asset_user_value" ON "assets"("userId", "totalValue");

-- CreateIndex
CREATE INDEX "idx_liability_user_type" ON "liabilities"("userId", "type");

-- CreateIndex
CREATE INDEX "idx_liability_due_date" ON "liabilities"("dueDate");

-- CreateIndex
CREATE INDEX "idx_liability_user_due" ON "liabilities"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "idx_income_user_type" ON "incomes"("userId", "type");

-- CreateIndex
CREATE INDEX "idx_income_active" ON "incomes"("isActive");

-- CreateIndex
CREATE INDEX "idx_income_user_active" ON "incomes"("userId", "isActive");

-- CreateIndex
CREATE INDEX "idx_income_next_expected" ON "incomes"("nextExpectedDate");

-- CreateIndex
CREATE INDEX "idx_financial_goal_user_status" ON "financial_goals"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_financial_goal_type" ON "financial_goals"("type");

-- CreateIndex
CREATE INDEX "idx_financial_goal_priority" ON "financial_goals"("priority");

-- CreateIndex
CREATE INDEX "idx_financial_goal_target_date" ON "financial_goals"("targetDate");

-- CreateIndex
CREATE INDEX "idx_net_worth_user_date" ON "net_worth_snapshots"("userId", "date");

-- CreateIndex
CREATE INDEX "idx_net_worth_date" ON "net_worth_snapshots"("date");

-- CreateIndex
CREATE INDEX "idx_account_transaction_account_date" ON "account_transactions"("accountId", "date");

-- CreateIndex
CREATE INDEX "idx_account_transaction_category" ON "account_transactions"("category");

-- CreateIndex
CREATE INDEX "idx_account_transaction_merchant" ON "account_transactions"("merchant");

-- CreateIndex
CREATE INDEX "idx_account_transaction_status" ON "account_transactions"("status");

-- CreateIndex
CREATE INDEX "idx_account_transaction_reviewed" ON "account_transactions"("isReviewed");

-- CreateIndex
CREATE INDEX "idx_account_transaction_date_category" ON "account_transactions"("date", "category");

-- CreateIndex
CREATE INDEX "idx_category_mapping_merchant" ON "category_mappings"("merchantPattern");

-- CreateIndex
CREATE INDEX "idx_category_mapping_category" ON "category_mappings"("category");

-- CreateIndex
CREATE INDEX "idx_category_mapping_confidence" ON "category_mappings"("confidence");

-- CreateIndex
CREATE INDEX "idx_category_mapping_usage" ON "category_mappings"("usageCount");

-- CreateIndex
CREATE INDEX "idx_expense_user_category" ON "expenses"("userId", "category");

-- CreateIndex
CREATE INDEX "idx_expense_user_date" ON "expenses"("userId", "date");

-- CreateIndex
CREATE INDEX "idx_expense_merchant" ON "expenses"("merchant");

-- CreateIndex
CREATE INDEX "idx_expense_recurring" ON "expenses"("isRecurring");

-- CreateIndex
CREATE INDEX "idx_expense_user_recurring" ON "expenses"("userId", "isRecurring");

-- CreateIndex
CREATE INDEX "idx_expense_category_date" ON "expenses"("category", "date");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "idx_expense_category_active" ON "expense_categories"("isActive");

-- CreateIndex
CREATE INDEX "idx_expense_category_parent" ON "expense_categories"("parentCategory");

-- CreateIndex
CREATE INDEX "idx_expense_category_sort" ON "expense_categories"("sortOrder");

-- CreateIndex
CREATE INDEX "idx_budget_plan_user_active" ON "budget_plans"("userId", "isActive");

-- CreateIndex
CREATE INDEX "idx_budget_plan_type" ON "budget_plans"("type");

-- CreateIndex
CREATE INDEX "idx_budget_plan_date_range" ON "budget_plans"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "idx_budget_plan_user_start" ON "budget_plans"("userId", "startDate");

-- CreateIndex
CREATE INDEX "idx_financial_suggestion_user_status" ON "financial_suggestions"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_financial_suggestion_user_priority" ON "financial_suggestions"("userId", "priority");

-- CreateIndex
CREATE INDEX "idx_financial_suggestion_impact" ON "financial_suggestions"("impact");

-- CreateIndex
CREATE INDEX "idx_financial_suggestion_valid" ON "financial_suggestions"("validUntil");

-- CreateIndex
CREATE INDEX "idx_financial_suggestion_generated" ON "financial_suggestions"("generatedBy");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states"("state");

-- CreateIndex
CREATE INDEX "idx_oauth_state_lookup" ON "oauth_states"("state");

-- CreateIndex
CREATE INDEX "idx_oauth_state_expires" ON "oauth_states"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_oauth_state_created" ON "oauth_states"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sca_challenges_transactionId_key" ON "sca_challenges"("transactionId");

-- CreateIndex
CREATE INDEX "idx_sca_challenge_user_status" ON "sca_challenges"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_sca_challenge_transaction" ON "sca_challenges"("transactionId");

-- CreateIndex
CREATE INDEX "idx_sca_challenge_expires" ON "sca_challenges"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_sca_challenge_status_expires" ON "sca_challenges"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_sca_session_user_active" ON "sca_sessions"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_sca_session_challenge" ON "sca_sessions"("challengeId");

-- CreateIndex
CREATE INDEX "idx_sca_session_expires" ON "sca_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_user_device_user_active" ON "user_devices"("userId", "isActive");

-- CreateIndex
CREATE INDEX "idx_user_device_hash" ON "user_devices"("deviceHash");

-- CreateIndex
CREATE INDEX "idx_user_device_last_seen" ON "user_devices"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_deviceHash_key" ON "user_devices"("userId", "deviceHash");

-- CreateIndex
CREATE INDEX "idx_user_location_user_recent" ON "user_locations"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "idx_user_location_ip" ON "user_locations"("ipAddress");

-- CreateIndex
CREATE INDEX "idx_user_location_vpn" ON "user_locations"("isVpn");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_userId_ipAddress_key" ON "user_locations"("userId", "ipAddress");

-- CreateIndex
CREATE INDEX "idx_sca_exemption_user_created" ON "sca_exemption_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_sca_exemption_transaction" ON "sca_exemption_logs"("transactionId");

-- CreateIndex
CREATE INDEX "idx_sca_exemption_type" ON "sca_exemption_logs"("exemptionType");

-- CreateIndex
CREATE INDEX "idx_sca_exemption_created" ON "sca_exemption_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "better_auth_sessions_sessionToken_key" ON "better_auth_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "idx_better_auth_session_token" ON "better_auth_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "idx_better_auth_session_user" ON "better_auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "idx_better_auth_session_expires" ON "better_auth_sessions"("expires");

-- CreateIndex
CREATE INDEX "idx_better_auth_session_user_active" ON "better_auth_sessions"("userId", "expires");

-- CreateIndex
CREATE INDEX "idx_better_auth_account_user" ON "better_auth_accounts"("userId");

-- CreateIndex
CREATE INDEX "idx_better_auth_account_provider" ON "better_auth_accounts"("provider");

-- CreateIndex
CREATE INDEX "idx_better_auth_account_type" ON "better_auth_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "better_auth_accounts_provider_providerAccountId_key" ON "better_auth_accounts"("provider", "providerAccountId");

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
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_recipes" ADD CONSTRAINT "favorite_recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_recipes" ADD CONSTRAINT "favorite_recipes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cache_entries" ADD CONSTRAINT "cache_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_processing_logs" ADD CONSTRAINT "data_processing_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_suggestions" ADD CONSTRAINT "financial_suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sca_challenges" ADD CONSTRAINT "sca_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sca_sessions" ADD CONSTRAINT "sca_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sca_sessions" ADD CONSTRAINT "sca_sessions_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "sca_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "better_auth_sessions" ADD CONSTRAINT "better_auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "better_auth_accounts" ADD CONSTRAINT "better_auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
