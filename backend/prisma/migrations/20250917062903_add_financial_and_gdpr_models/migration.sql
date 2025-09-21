-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" DATETIME,
    "withdrawnAt" DATETIME,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "data_processing_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_processing_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "security_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "provider" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "syncError" TEXT,
    "encryptedCredentials" TEXT,
    "accountNumber" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "symbol" TEXT,
    "quantity" REAL NOT NULL DEFAULT 0,
    "unitValue" REAL NOT NULL,
    "totalValue" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "acquisitionDate" DATETIME,
    "acquisitionPrice" REAL,
    "metadata" TEXT,
    "lastUpdateAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "liabilities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "interestRate" REAL,
    "monthlyPayment" REAL,
    "minimumPayment" REAL,
    "dueDate" DATETIME,
    "originalAmount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "liabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "liabilities_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextExpectedDate" DATETIME,
    "taxRate" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "incomes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL DEFAULT 0,
    "targetDate" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "financial_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAssets" REAL NOT NULL,
    "totalLiabilities" REAL NOT NULL,
    "netWorth" REAL NOT NULL,
    "liquidAssets" REAL NOT NULL,
    "monthlyIncome" REAL NOT NULL,
    "monthlyExpenses" REAL NOT NULL,
    "savingsRate" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "net_worth_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "merchant" TEXT,
    "location" TEXT,
    "metadata" TEXT,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "category_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantPattern" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "isUserDefined" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "merchant" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "paymentMethod" TEXT,
    "location" TEXT,
    "receipt" TEXT,
    "tags" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "parentCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "budgetLimit" REAL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "budget_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'monthly',
    "totalBudget" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categories" TEXT NOT NULL,
    "alertThreshold" REAL NOT NULL DEFAULT 80,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "budget_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "financial_suggestions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "category" TEXT,
    "potentialSaving" REAL,
    "actionRequired" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'active',
    "generatedBy" TEXT NOT NULL,
    "validUntil" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "financial_suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_consents_userId_consentType_idx" ON "user_consents"("userId", "consentType");

-- CreateIndex
CREATE INDEX "user_consents_createdAt_idx" ON "user_consents"("createdAt");

-- CreateIndex
CREATE INDEX "data_processing_logs_userId_idx" ON "data_processing_logs"("userId");

-- CreateIndex
CREATE INDEX "data_processing_logs_timestamp_idx" ON "data_processing_logs"("timestamp");

-- CreateIndex
CREATE INDEX "data_processing_logs_operation_idx" ON "data_processing_logs"("operation");

-- CreateIndex
CREATE INDEX "security_incidents_userId_idx" ON "security_incidents"("userId");

-- CreateIndex
CREATE INDEX "security_incidents_incidentType_idx" ON "security_incidents"("incidentType");

-- CreateIndex
CREATE INDEX "security_incidents_severity_idx" ON "security_incidents"("severity");

-- CreateIndex
CREATE INDEX "security_incidents_resolved_idx" ON "security_incidents"("resolved");

-- CreateIndex
CREATE INDEX "security_incidents_createdAt_idx" ON "security_incidents"("createdAt");

-- CreateIndex
CREATE INDEX "accounts_userId_type_idx" ON "accounts"("userId", "type");

-- CreateIndex
CREATE INDEX "assets_userId_type_idx" ON "assets"("userId", "type");

-- CreateIndex
CREATE INDEX "assets_symbol_idx" ON "assets"("symbol");

-- CreateIndex
CREATE INDEX "liabilities_userId_type_idx" ON "liabilities"("userId", "type");

-- CreateIndex
CREATE INDEX "incomes_userId_type_idx" ON "incomes"("userId", "type");

-- CreateIndex
CREATE INDEX "financial_goals_userId_status_idx" ON "financial_goals"("userId", "status");

-- CreateIndex
CREATE INDEX "net_worth_snapshots_userId_date_idx" ON "net_worth_snapshots"("userId", "date");

-- CreateIndex
CREATE INDEX "account_transactions_accountId_date_idx" ON "account_transactions"("accountId", "date");

-- CreateIndex
CREATE INDEX "account_transactions_category_idx" ON "account_transactions"("category");

-- CreateIndex
CREATE INDEX "category_mappings_merchantPattern_idx" ON "category_mappings"("merchantPattern");

-- CreateIndex
CREATE INDEX "expenses_userId_category_idx" ON "expenses"("userId", "category");

-- CreateIndex
CREATE INDEX "expenses_userId_date_idx" ON "expenses"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE INDEX "budget_plans_userId_isActive_idx" ON "budget_plans"("userId", "isActive");

-- CreateIndex
CREATE INDEX "financial_suggestions_userId_status_idx" ON "financial_suggestions"("userId", "status");

-- CreateIndex
CREATE INDEX "financial_suggestions_userId_priority_idx" ON "financial_suggestions"("userId", "priority");
