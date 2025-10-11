# Pluqla SQLite to PostgreSQL Migration Script for Windows (PowerShell)
# Usage: .\migrate-to-postgres.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Pluqla PostgreSQL Migration Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check command availability
function Test-CommandExists {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) { return $true }
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists "docker")) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-CommandExists "docker-compose")) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-CommandExists "node")) {
    Write-Host "❌ Node.js is not installed. Please install Node.js v18+ first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-CommandExists "npm")) {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ All prerequisites met" -ForegroundColor Green
Write-Host ""

# Backup current .env
Write-Host "📦 Backing up current .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item ".env" ".env.backup.$timestamp"
    Write-Host "✅ Backup created: .env.backup.$timestamp" -ForegroundColor Green
} else {
    Write-Host "⚠️  No existing .env file found" -ForegroundColor Yellow
}
Write-Host ""

# Start PostgreSQL with Docker
Write-Host "🐳 Starting PostgreSQL with Docker..." -ForegroundColor Yellow
Set-Location ..
try {
    docker-compose -f docker-compose.dev.yml up -d postgres
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed" }
} catch {
    Write-Host "❌ Failed to start PostgreSQL" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Set-Location server
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if PostgreSQL is running
try {
    $containerStatus = docker inspect pluqla_postgres_dev --format='{{.State.Status}}' 2>$null
    if ($containerStatus -ne "running") {
        throw "Container not running"
    }
    $containerHealth = docker inspect pluqla_postgres_dev --format='{{.State.Health.Status}}' 2>$null
    if ($containerHealth -and $containerHealth -ne "healthy") {
        Write-Host "⚠️  PostgreSQL is starting but not yet healthy. Waiting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host "❌ PostgreSQL failed to start" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose -f docker-compose.dev.yml logs postgres" -ForegroundColor Yellow
    Set-Location server
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
Write-Host ""

# Return to server directory
Set-Location server

# Update .env
Write-Host "🔧 Updating .env configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace 'DATABASE_URL="file:./dev.db"', 'DATABASE_URL="postgresql://pluqla:pluqla@localhost:5432/pluqla_dev?schema=public"'
    Set-Content ".env" $envContent -NoNewline
    Write-Host "✅ DATABASE_URL updated" -ForegroundColor Green
} else {
    # Create .env from .env.example if it doesn't exist
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        $envContent = Get-Content ".env" -Raw
        $envContent = $envContent -replace 'DATABASE_URL="postgresql://pluqla_user:secure_password_here@localhost:5432/pluqla_production"', 'DATABASE_URL="postgresql://pluqla:pluqla@localhost:5432/pluqla_dev?schema=public"'
        Set-Content ".env" $envContent -NoNewline
        Write-Host "✅ Created .env from .env.example and updated DATABASE_URL" -ForegroundColor Green
    } else {
        Write-Host "❌ No .env or .env.example file found" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Generate Prisma Client
Write-Host "🔨 Generating Prisma Client..." -ForegroundColor Yellow
try {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed" }
    Write-Host "✅ Prisma Client generated" -ForegroundColor Green
} catch {
    Write-Host "❌ Prisma Client generation failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Yellow
try {
    npx prisma migrate dev --name initial_postgresql_setup
    if ($LASTEXITCODE -ne 0) { throw "Migrations failed" }
    Write-Host "✅ Migrations completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Migrations failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Seed database
Write-Host "🌱 Seeding database with test data..." -ForegroundColor Yellow
try {
    npm run db:seed
    if ($LASTEXITCODE -ne 0) { throw "Database seeding failed" }
    Write-Host "✅ Database seeded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Database seeding failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Migration completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Start server: npm run dev"
Write-Host "2. Test health: curl http://localhost:3004/health"
Write-Host "3. Run tests: npm test"
Write-Host "4. Verify premium: node scripts\verify-premium.js"
Write-Host ""
Write-Host "👤 Test credentials:" -ForegroundColor Yellow
Write-Host "Free user:    free@pluqla.com / password123"
Write-Host "Premium user: premium@pluqla.com / password123"
Write-Host "Admin user:   admin@pluqla.com / password123"
Write-Host ""
Write-Host "🐳 Docker commands:" -ForegroundColor Yellow
Write-Host "View logs:    docker-compose -f ..\docker-compose.dev.yml logs -f postgres"
Write-Host "Stop DB:      docker-compose -f ..\docker-compose.dev.yml stop postgres"
Write-Host "Restart DB:   docker-compose -f ..\docker-compose.dev.yml restart postgres"
Write-Host ""
Write-Host "⚠️  Backup stored at: .env.backup.*" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
