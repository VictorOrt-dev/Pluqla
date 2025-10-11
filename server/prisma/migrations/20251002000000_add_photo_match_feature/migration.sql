-- CreateTable: PhotoMatchJob
-- Stores photo match job requests and processing status
CREATE TABLE "photo_match_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    "imageUrl" TEXT NOT NULL, -- S3/storage URL or base64 (for small images)
    "imageHash" TEXT NOT NULL, -- SHA-256 hash for deduplication
    "imageSize" INTEGER NOT NULL, -- in bytes
    "mimeType" TEXT NOT NULL,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT, -- JSON string for additional data
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_match_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PhotoMatchResult
-- Stores AI-generated photo match results
CREATE TABLE "photo_match_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchType" TEXT NOT NULL, -- clothing, style, product, color_palette, etc.
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0, -- 0-100 confidence score
    "matchData" TEXT NOT NULL, -- JSON: detailed match results
    "aiProvider" TEXT NOT NULL, -- openai, anthropic, gemini
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" INTEGER NOT NULL, -- processing time in milliseconds
    "cacheKey" TEXT NOT NULL, -- Redis cache key
    "cachedUntil" TIMESTAMP(3) NOT NULL, -- cache expiration
    "metadata" TEXT, -- JSON: additional metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_match_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes: PhotoMatchJob
CREATE INDEX "idx_photo_match_job_user" ON "photo_match_jobs"("userId");
CREATE INDEX "idx_photo_match_job_status" ON "photo_match_jobs"("status");
CREATE INDEX "idx_photo_match_job_user_status" ON "photo_match_jobs"("userId", "status");
CREATE INDEX "idx_photo_match_job_created" ON "photo_match_jobs"("createdAt");
CREATE INDEX "idx_photo_match_job_image_hash" ON "photo_match_jobs"("imageHash"); -- for deduplication
CREATE INDEX "idx_photo_match_job_user_created" ON "photo_match_jobs"("userId", "createdAt");

-- CreateIndexes: PhotoMatchResult
CREATE UNIQUE INDEX "idx_photo_match_result_job" ON "photo_match_results"("jobId");
CREATE INDEX "idx_photo_match_result_user" ON "photo_match_results"("userId");
CREATE INDEX "idx_photo_match_result_cache_key" ON "photo_match_results"("cacheKey");
CREATE INDEX "idx_photo_match_result_cached_until" ON "photo_match_results"("cachedUntil");
CREATE INDEX "idx_photo_match_result_user_created" ON "photo_match_results"("userId", "createdAt");

-- AddForeignKeys
ALTER TABLE "photo_match_jobs" ADD CONSTRAINT "photo_match_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_match_results" ADD CONSTRAINT "photo_match_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "photo_match_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_match_results" ADD CONSTRAINT "photo_match_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
