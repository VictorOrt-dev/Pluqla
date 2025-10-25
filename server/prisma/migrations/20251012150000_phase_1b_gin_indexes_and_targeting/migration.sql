-- Phase 1B: Add GIN indexes for JSON fields and targeting rules for feature flags

-- Add GIN indexes for JSON fields (already exist, but including for migration tracking)
CREATE INDEX IF NOT EXISTS idx_recipes_metadata_gin ON recipes USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_metadata_gin ON recipe_interactions USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changes_gin ON audit_logs USING GIN (changes);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);

-- Add targetingRules field to feature_flags table
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS "targetingRules" JSONB;

-- Add GIN index for targetingRules
CREATE INDEX IF NOT EXISTS idx_feature_flags_targeting_rules_gin ON feature_flags USING GIN ("targetingRules");
