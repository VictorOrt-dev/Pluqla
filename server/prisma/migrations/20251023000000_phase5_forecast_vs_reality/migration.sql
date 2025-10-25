-- Phase 5: Prévision vs Réalité - Enhanced FoodSpendingLog model
-- Migration to add forecast/actual tracking fields

-- Add new columns for Phase 5
ALTER TABLE "food_spending_logs"
ADD COLUMN "estimatedPriceEur" DOUBLE PRECISION,
ADD COLUMN "actualPriceEur" DOUBLE PRECISION,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'forecast',
ADD COLUMN "linkedTransactionId" TEXT,
ADD COLUMN "dateMatched" TIMESTAMP(3);

-- Add check constraint for status
ALTER TABLE "food_spending_logs"
ADD CONSTRAINT "food_spending_logs_status_check"
CHECK ("status" IN ('forecast', 'matched', 'archived'));

-- Create new indexes for Phase 5 queries
CREATE INDEX "idx_food_spending_user_status" ON "food_spending_logs"("userId", "status");
CREATE INDEX "idx_food_spending_status_date" ON "food_spending_logs"("status", "date");
CREATE INDEX "idx_food_spending_transaction" ON "food_spending_logs"("linkedTransactionId");

-- Migrate existing data: set estimatedPriceEur = totalCostEur for old records
UPDATE "food_spending_logs"
SET "estimatedPriceEur" = "totalCostEur"
WHERE "estimatedPriceEur" IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN "food_spending_logs"."status" IS 'Status of spending log: forecast (planned), matched (linked to bank transaction), archived (no match found after timeout)';
COMMENT ON COLUMN "food_spending_logs"."estimatedPriceEur" IS 'Estimated price when user added recipe to budget';
COMMENT ON COLUMN "food_spending_logs"."actualPriceEur" IS 'Actual price from bank transaction after matching';
COMMENT ON COLUMN "food_spending_logs"."linkedTransactionId" IS 'Foreign key to account_transactions table (soft link)';
COMMENT ON COLUMN "food_spending_logs"."dateMatched" IS 'Timestamp when forecast was matched with real transaction';
