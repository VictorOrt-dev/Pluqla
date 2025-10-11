-- CreateTable: TransportOptimizationJob
-- Stores transport optimization job requests and processing status
CREATE TABLE "transport_optimization_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    "tripData" TEXT NOT NULL, -- JSON: origin, destination, modes, distance, recurring
    "tripHash" TEXT NOT NULL, -- SHA-256 hash for deduplication
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT, -- JSON: user preferences, calculation version
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_optimization_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TransportOptimizationResult
-- Stores calculated cost optimization results
CREATE TABLE "transport_optimization_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "optimalMode" TEXT NOT NULL, -- car, bike, public_transport, walk, electric_car, etc.
    "totalCostEur" DOUBLE PRECISION NOT NULL,
    "costsBreakdown" TEXT NOT NULL, -- JSON: detailed cost per mode
    "savingsPotential" DOUBLE PRECISION NOT NULL DEFAULT 0, -- vs most expensive mode
    "co2ImpactKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculationVersion" TEXT NOT NULL DEFAULT '1.0',
    "processingTimeMs" INTEGER NOT NULL,
    "cacheKey" TEXT NOT NULL, -- Redis cache key
    "cachedUntil" TIMESTAMP(3) NOT NULL, -- cache expiration
    "metadata" TEXT, -- JSON: assumptions, parameters used
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_optimization_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes: TransportOptimizationJob
CREATE INDEX "idx_transport_opt_job_user" ON "transport_optimization_jobs"("userId");
CREATE INDEX "idx_transport_opt_job_status" ON "transport_optimization_jobs"("status");
CREATE INDEX "idx_transport_opt_job_user_status" ON "transport_optimization_jobs"("userId", "status");
CREATE INDEX "idx_transport_opt_job_created" ON "transport_optimization_jobs"("createdAt");
CREATE INDEX "idx_transport_opt_job_trip_hash" ON "transport_optimization_jobs"("tripHash"); -- for deduplication
CREATE INDEX "idx_transport_opt_job_user_created" ON "transport_optimization_jobs"("userId", "createdAt");

-- CreateIndexes: TransportOptimizationResult
CREATE UNIQUE INDEX "idx_transport_opt_result_job" ON "transport_optimization_results"("jobId");
CREATE INDEX "idx_transport_opt_result_user" ON "transport_optimization_results"("userId");
CREATE INDEX "idx_transport_opt_result_cache_key" ON "transport_optimization_results"("cacheKey");
CREATE INDEX "idx_transport_opt_result_cached_until" ON "transport_optimization_results"("cachedUntil");
CREATE INDEX "idx_transport_opt_result_user_created" ON "transport_optimization_results"("userId", "createdAt");
CREATE INDEX "idx_transport_opt_result_optimal_mode" ON "transport_optimization_results"("optimalMode");

-- AddForeignKeys
ALTER TABLE "transport_optimization_jobs" ADD CONSTRAINT "transport_optimization_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transport_optimization_results" ADD CONSTRAINT "transport_optimization_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "transport_optimization_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transport_optimization_results" ADD CONSTRAINT "transport_optimization_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
