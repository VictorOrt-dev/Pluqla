/*
  Warnings:

  - You are about to drop the column `createdBy` on the `meal_plan_templates` table. All the data in the column will be lost.
  - You are about to drop the column `cuisine` on the `meal_plan_templates` table. All the data in the column will be lost.
  - You are about to drop the column `dietaryType` on the `meal_plan_templates` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedBudget` on the `meal_plan_templates` table. All the data in the column will be lost.
  - You are about to drop the column `mealsData` on the `meal_plan_templates` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `meal_plan_templates` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `meal_plan_templates` table. All the data in the column will be lost.
  - You are about to drop the column `templateType` on the `meal_plan_templates` table. All the data in the column will be lost.
  - Added the required column `createdByUserId` to the `meal_plan_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateData` to the `meal_plan_templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."idx_meal_template_dietary";

-- DropIndex
DROP INDEX "public"."idx_meal_template_public";

-- DropIndex
DROP INDEX "public"."idx_meal_template_rating";

-- DropIndex
DROP INDEX "public"."idx_meal_template_type";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "iban" TEXT,
ADD COLUMN     "nordigenAccessToken" TEXT,
ADD COLUMN     "nordigenAccountId" TEXT,
ADD COLUMN     "nordigenInstitutionId" TEXT,
ADD COLUMN     "nordigenRefreshToken" TEXT,
ADD COLUMN     "nordigenRequisitionId" TEXT,
ADD COLUMN     "nordigenTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "meal_plan_templates" DROP COLUMN "createdBy",
DROP COLUMN "cuisine",
DROP COLUMN "dietaryType",
DROP COLUMN "estimatedBudget",
DROP COLUMN "mealsData",
DROP COLUMN "rating",
DROP COLUMN "tags",
DROP COLUMN "templateType",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'custom',
ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "daysCount" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "dietaryTags" TEXT,
ADD COLUMN     "mealsPerDay" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "targetBudget" DOUBLE PRECISION,
ADD COLUMN     "templateData" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "lastEnriched" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietaryRestrictions" TEXT,
    "dislikedIngredients" TEXT,
    "preferredCuisines" TEXT,
    "maxCookingTime" INTEGER,
    "budgetPerMeal" DOUBLE PRECISION,
    "skillLevel" TEXT NOT NULL DEFAULT 'intermediate',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "ipHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_meals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "cookingTimeMin" INTEGER NOT NULL,
    "totalCostEur" DOUBLE PRECISION NOT NULL,
    "ingredients" TEXT NOT NULL,
    "recipe" TEXT NOT NULL,
    "nutritionInfo" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "cuisineType" TEXT,
    "mealType" TEXT NOT NULL,
    "tags" TEXT,
    "notes" TEXT,
    "timesCooked" INTEGER NOT NULL DEFAULT 0,
    "lastCookedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "favorite_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_meal_plans" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "allowCopy" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "shared_meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "idx_user_profile_user" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "idx_recipe_interaction_recipe_type" ON "recipe_interactions"("recipeId", "interactionType");

-- CreateIndex
CREATE INDEX "idx_recipe_interaction_user_recipe" ON "recipe_interactions"("userId", "recipeId");

-- CreateIndex
CREATE INDEX "idx_recipe_interaction_created" ON "recipe_interactions"("createdAt");

-- CreateIndex
CREATE INDEX "idx_recipe_interaction_type_created" ON "recipe_interactions"("interactionType", "createdAt");

-- CreateIndex
CREATE INDEX "idx_recipe_interaction_recipe_created" ON "recipe_interactions"("recipeId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_log_user_action" ON "audit_logs"("userId", "action");

-- CreateIndex
CREATE INDEX "idx_audit_log_created" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_log_action_created" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "idx_favorite_meal_user" ON "favorite_meals"("userId");

-- CreateIndex
CREATE INDEX "idx_favorite_meal_user_type" ON "favorite_meals"("userId", "mealType");

-- CreateIndex
CREATE INDEX "idx_favorite_meal_cuisine" ON "favorite_meals"("cuisineType");

-- CreateIndex
CREATE UNIQUE INDEX "shared_meal_plans_shareToken_key" ON "shared_meal_plans"("shareToken");

-- CreateIndex
CREATE INDEX "idx_shared_plan_token" ON "shared_meal_plans"("shareToken");

-- CreateIndex
CREATE INDEX "idx_shared_plan_user" ON "shared_meal_plans"("userId");

-- CreateIndex
CREATE INDEX "idx_shared_plan_weekly" ON "shared_meal_plans"("weeklyPlanId");

-- CreateIndex
CREATE INDEX "idx_shared_plan_expires" ON "shared_meal_plans"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_account_nordigen_id" ON "accounts"("nordigenAccountId");

-- CreateIndex
CREATE INDEX "idx_account_nordigen_req" ON "accounts"("nordigenRequisitionId");

-- CreateIndex
CREATE INDEX "idx_template_creator" ON "meal_plan_templates"("createdByUserId");

-- CreateIndex
CREATE INDEX "idx_template_public_category" ON "meal_plan_templates"("isPublic", "category");

-- CreateIndex
CREATE INDEX "idx_template_category" ON "meal_plan_templates"("category");

-- CreateIndex
CREATE INDEX "idx_planned_meal_cooked" ON "planned_meals"("isCooked");

-- CreateIndex
CREATE INDEX "idx_planned_meal_plan_cooked" ON "planned_meals"("weeklyPlanId", "isCooked");

-- CreateIndex
CREATE INDEX "idx_recipe_popularity" ON "recipes"("popularityScore" DESC);

-- CreateIndex
CREATE INDEX "idx_recipe_active_created" ON "recipes"("isActive", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_recipe_filters" ON "recipes"("category", "difficulty", "estimatedPrice");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_interactions" ADD CONSTRAINT "recipe_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_interactions" ADD CONSTRAINT "recipe_interactions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_meals" ADD CONSTRAINT "favorite_meals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_templates" ADD CONSTRAINT "meal_plan_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_meal_plans" ADD CONSTRAINT "shared_meal_plans_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_meal_plans" ADD CONSTRAINT "shared_meal_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
