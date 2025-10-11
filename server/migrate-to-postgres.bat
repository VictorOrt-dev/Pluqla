@echo off
REM Pluqla SQLite to PostgreSQL Migration Script for Windows
REM Usage: migrate-to-postgres.bat

echo ========================================
echo 🚀 Pluqla PostgreSQL Migration Script
echo ========================================
echo.

REM Check if Docker is installed
echo 📋 Checking prerequisites...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js v18+ first.
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ All prerequisites met
echo.

REM Backup current .env
echo 📦 Backing up current .env...
if exist .env (
    copy .env .env.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2% >nul
    echo ✅ Backup created
) else (
    echo ⚠️  No existing .env file found
)
echo.

REM Start PostgreSQL with Docker
echo 🐳 Starting PostgreSQL with Docker...
cd ..
docker-compose -f docker-compose.dev.yml up -d postgres

echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

REM Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps | findstr "pluqla_postgres_dev" | findstr "Up" >nul
if errorlevel 1 (
    echo ❌ PostgreSQL failed to start
    echo Check logs with: docker-compose -f docker-compose.dev.yml logs postgres
    pause
    exit /b 1
)

echo ✅ PostgreSQL is running
echo.

REM Return to server directory
cd server

REM Update .env
echo 🔧 Updating .env configuration...
powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=\"file:./dev.db\"', 'DATABASE_URL=\"postgresql://pluqla:pluqla@localhost:5432/pluqla_dev?schema=public\"' | Set-Content .env"
echo ✅ DATABASE_URL updated
echo.

REM Generate Prisma Client
echo 🔨 Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Prisma Client generation failed
    pause
    exit /b 1
)
echo ✅ Prisma Client generated
echo.

REM Run migrations
echo 🗄️  Running database migrations...
call npx prisma migrate dev --name initial_postgresql_setup
if errorlevel 1 (
    echo ❌ Migrations failed
    pause
    exit /b 1
)
echo ✅ Migrations completed
echo.

REM Seed database
echo 🌱 Seeding database with test data...
call npm run db:seed
if errorlevel 1 (
    echo ❌ Database seeding failed
    pause
    exit /b 1
)
echo ✅ Database seeded successfully
echo.

REM Summary
echo.
echo ========================================
echo 🎉 Migration completed successfully!
echo ========================================
echo.
echo 📝 Next steps:
echo 1. Start server: npm run dev
echo 2. Test health: curl http://localhost:3004/health
echo 3. Run tests: npm test
echo 4. Verify premium: node scripts\verify-premium.js
echo.
echo 👤 Test credentials:
echo Free user:    free@pluqla.com / password123
echo Premium user: premium@pluqla.com / password123
echo Admin user:   admin@pluqla.com / password123
echo.
echo 🐳 Docker commands:
echo View logs:    docker-compose -f ..\docker-compose.dev.yml logs -f postgres
echo Stop DB:      docker-compose -f ..\docker-compose.dev.yml stop postgres
echo Restart DB:   docker-compose -f ..\docker-compose.dev.yml restart postgres
echo.
echo ⚠️  Backup stored at: .env.backup.*
echo.
pause
