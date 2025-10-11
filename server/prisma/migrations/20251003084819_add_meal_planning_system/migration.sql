-- CreateTable
CREATE TABLE "user_meal_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "householdSize" INTEGER NOT NULL DEFAULT 2,
    "dietaryRestrictions" TEXT,
    "dislikedIngredients" TEXT,
    "preferredCuisines" TEXT,
    "skillLevel" TEXT NOT NULL DEFAULT 'intermediate',
    "weeklyBudget" DOUBLE PRECISION,
    "cookingFrequency" TEXT NOT NULL DEFAULT 'daily',
    "mealTypes" TEXT,
    "allergies" TEXT,
    "cookingTimeLimit" INTEGER,
    "eatingHabits" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_meal_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_meal_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalBudget" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mealsCount" INTEGER NOT NULL DEFAULT 0,
    "planHash" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'ai',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferencesId" TEXT,

    CONSTRAINT "weekly_meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_meals" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "recipeId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "mealType" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "cookingTimeMin" INTEGER NOT NULL,
    "totalCostEur" DOUBLE PRECISION NOT NULL,
    "ingredients" TEXT NOT NULL,
    "recipe" TEXT NOT NULL,
    "nutritionInfo" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "cuisineType" TEXT,
    "tags" TEXT,
    "isCooked" BOOLEAN NOT NULL DEFAULT false,
    "cookedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_lists" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "checkedItems" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shoppedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grocery_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_items" (
    "id" TEXT NOT NULL,
    "groceryListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "unit" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "estimatedCostEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCostEur" DOUBLE PRECISION,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "usedInMeals" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grocery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateType" TEXT NOT NULL,
    "cuisine" TEXT,
    "dietaryType" TEXT,
    "mealsData" TEXT NOT NULL,
    "estimatedBudget" DOUBLE PRECISION,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_meal_preferences_userId_key" ON "user_meal_preferences"("userId");

-- CreateIndex
CREATE INDEX "idx_meal_preferences_user" ON "user_meal_preferences"("userId");

-- CreateIndex
CREATE INDEX "idx_weekly_plan_user_week" ON "weekly_meal_plans"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX "idx_weekly_plan_status" ON "weekly_meal_plans"("status");

-- CreateIndex
CREATE INDEX "idx_weekly_plan_user_status" ON "weekly_meal_plans"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_weekly_plan_hash" ON "weekly_meal_plans"("planHash");

-- CreateIndex
CREATE INDEX "idx_planned_meal_plan" ON "planned_meals"("weeklyPlanId");

-- CreateIndex
CREATE INDEX "idx_planned_meal_day_type" ON "planned_meals"("dayOfWeek", "mealType");

-- CreateIndex
CREATE INDEX "idx_planned_meal_recipe" ON "planned_meals"("recipeId");

-- CreateIndex
CREATE INDEX "idx_planned_meal_plan_day" ON "planned_meals"("weeklyPlanId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "idx_grocery_list_user_status" ON "grocery_lists"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_grocery_list_plan" ON "grocery_lists"("weeklyPlanId");

-- CreateIndex
CREATE INDEX "idx_grocery_list_status" ON "grocery_lists"("status");

-- CreateIndex
CREATE INDEX "idx_grocery_item_list_category" ON "grocery_items"("groceryListId", "category");

-- CreateIndex
CREATE INDEX "idx_grocery_item_checked" ON "grocery_items"("isChecked");

-- CreateIndex
CREATE INDEX "idx_grocery_item_category" ON "grocery_items"("category");

-- CreateIndex
CREATE INDEX "idx_meal_template_type" ON "meal_plan_templates"("templateType");

-- CreateIndex
CREATE INDEX "idx_meal_template_dietary" ON "meal_plan_templates"("dietaryType");

-- CreateIndex
CREATE INDEX "idx_meal_template_public" ON "meal_plan_templates"("isPublic");

-- CreateIndex
CREATE INDEX "idx_meal_template_rating" ON "meal_plan_templates"("rating");

-- AddForeignKey
ALTER TABLE "user_meal_preferences" ADD CONSTRAINT "user_meal_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_meal_plans" ADD CONSTRAINT "weekly_meal_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_meal_plans" ADD CONSTRAINT "weekly_meal_plans_preferencesId_fkey" FOREIGN KEY ("preferencesId") REFERENCES "user_meal_preferences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_lists" ADD CONSTRAINT "grocery_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_groceryListId_fkey" FOREIGN KEY ("groceryListId") REFERENCES "grocery_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
