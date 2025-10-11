-- CreateTable
CREATE TABLE "meal_suggestion_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestHash" TEXT NOT NULL,
    "mealType" TEXT,
    "dietaryRestrictions" TEXT,
    "budget" DOUBLE PRECISION,
    "servings" INTEGER,
    "filters" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_suggestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_suggestion_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealsData" TEXT NOT NULL,
    "totalMeals" INTEGER NOT NULL DEFAULT 0,
    "avgCostEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCookingTimeMin" INTEGER NOT NULL DEFAULT 0,
    "aiProvider" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" INTEGER NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "cachedUntil" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_suggestion_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_suggestion_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mealType" TEXT,
    "mealsData" TEXT NOT NULL,
    "totalMeals" INTEGER NOT NULL DEFAULT 0,
    "avgCostEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCookingTime" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_suggestion_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_job_user" ON "meal_suggestion_jobs"("userId");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_job_status" ON "meal_suggestion_jobs"("status");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_job_user_status" ON "meal_suggestion_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_job_created" ON "meal_suggestion_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_job_request_hash" ON "meal_suggestion_jobs"("requestHash");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_job_user_created" ON "meal_suggestion_jobs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_job_meal_type" ON "meal_suggestion_jobs"("mealType");

-- CreateIndex
CREATE UNIQUE INDEX "meal_suggestion_results_jobId_key" ON "meal_suggestion_results"("jobId");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_result_user" ON "meal_suggestion_results"("userId");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_result_cache_key" ON "meal_suggestion_results"("cacheKey");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_result_cached_until" ON "meal_suggestion_results"("cachedUntil");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_result_user_created" ON "meal_suggestion_results"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_meal_suggestion_result_ai_provider" ON "meal_suggestion_results"("aiProvider");

-- CreateIndex
CREATE UNIQUE INDEX "meal_suggestion_cache_cacheKey_key" ON "meal_suggestion_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "idx_meal_cache_cache_key" ON "meal_suggestion_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "idx_meal_cache_category" ON "meal_suggestion_cache"("category");

-- CreateIndex
CREATE INDEX "idx_meal_cache_meal_type" ON "meal_suggestion_cache"("mealType");

-- CreateIndex
CREATE INDEX "idx_meal_cache_expires_at" ON "meal_suggestion_cache"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_meal_cache_category_expires" ON "meal_suggestion_cache"("category", "expiresAt");

-- AddForeignKey
ALTER TABLE "meal_suggestion_jobs" ADD CONSTRAINT "meal_suggestion_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_suggestion_results" ADD CONSTRAINT "meal_suggestion_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "meal_suggestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_suggestion_results" ADD CONSTRAINT "meal_suggestion_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
