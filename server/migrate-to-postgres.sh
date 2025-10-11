#!/bin/bash
# Pluqla SQLite to PostgreSQL Migration Script
# Usage: ./migrate-to-postgres.sh

set -e  # Exit on any error

echo "🚀 Pluqla PostgreSQL Migration Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js v18+ first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Backup current .env
echo -e "${BLUE}📦 Backing up current .env...${NC}"
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup created${NC}"
else
    echo -e "${YELLOW}⚠️  No existing .env file found${NC}"
fi
echo ""

# Start PostgreSQL with Docker
echo -e "${BLUE}🐳 Starting PostgreSQL with Docker...${NC}"
cd ..  # Go to root directory
docker-compose -f docker-compose.dev.yml up -d postgres

echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if PostgreSQL is running
if docker-compose -f docker-compose.dev.yml ps | grep -q "pluqla_postgres_dev.*Up"; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    echo "Check logs with: docker-compose -f docker-compose.dev.yml logs postgres"
    exit 1
fi
echo ""

# Return to server directory
cd server

# Update .env
echo -e "${BLUE}🔧 Updating .env configuration...${NC}"
if grep -q "DATABASE_URL=\"file:./dev.db\"" .env; then
    sed -i 's|DATABASE_URL="file:./dev.db"|DATABASE_URL="postgresql://pluqla:pluqla@localhost:5432/pluqla_dev?schema=public"|g' .env
    echo -e "${GREEN}✅ DATABASE_URL updated${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL already configured${NC}"
fi
echo ""

# Generate Prisma Client
echo -e "${BLUE}🔨 Generating Prisma Client...${NC}"
npx prisma generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prisma Client generated${NC}"
else
    echo -e "${RED}❌ Prisma Client generation failed${NC}"
    exit 1
fi
echo ""

# Run migrations
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
npx prisma migrate dev --name initial_postgresql_setup

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migrations failed${NC}"
    exit 1
fi
echo ""

# Seed database
echo -e "${BLUE}🌱 Seeding database with test data...${NC}"
npm run db:seed

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
else
    echo -e "${RED}❌ Database seeding failed${NC}"
    exit 1
fi
echo ""

# Summary
echo ""
echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Start server: npm run dev"
echo "2. Test health: curl http://localhost:3004/health"
echo "3. Run tests: npm test"
echo "4. Verify premium: node scripts/verify-premium.js"
echo ""
echo -e "${BLUE}👤 Test credentials:${NC}"
echo "Free user:    free@pluqla.com / password123"
echo "Premium user: premium@pluqla.com / password123"
echo "Admin user:   admin@pluqla.com / password123"
echo ""
echo -e "${BLUE}🐳 Docker commands:${NC}"
echo "View logs:    docker-compose -f ../docker-compose.dev.yml logs -f postgres"
echo "Stop DB:      docker-compose -f ../docker-compose.dev.yml stop postgres"
echo "Restart DB:   docker-compose -f ../docker-compose.dev.yml restart postgres"
echo ""
echo -e "${YELLOW}⚠️  Backup stored at: .env.backup.*${NC}"
echo ""
