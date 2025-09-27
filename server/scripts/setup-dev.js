#!/usr/bin/env node

/**
 * 🚀 Pluqla Development Setup Script
 *
 * This script automatically:
 * 1. Checks environment configuration
 * 2. Sets up SQLite database
 * 3. Runs Prisma migrations
 * 4. Seeds database with test data
 * 5. Starts the development server
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Pluqla backend for development...\n');

// Helper function to run commands with proper error handling
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to ${description.toLowerCase()}`);
    console.error(`Command: ${command}`);
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

async function setupDevelopment() {
  console.log('🔍 Checking environment configuration...');

  // Check if .env exists
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('Please create a .env file in the server directory.');
    console.log('You can copy .env.example if it exists.\n');
    process.exit(1);
  }
  console.log('✅ .env file found\n');

  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing dependencies...');
    if (!runCommand('cd .. && npm install', 'Install dependencies')) {
      process.exit(1);
    }
  } else {
    console.log('✅ Dependencies already installed\n');
  }

  // Generate Prisma client
  if (!runCommand('cd .. && npx prisma generate', 'Generate Prisma client')) {
    process.exit(1);
  }

  // Check if database exists and run migrations
  console.log('🗄️ Setting up database...');
  const dbPath = path.join(__dirname, '..', 'dev.db');

  if (fs.existsSync(dbPath)) {
    console.log('📋 Database exists, checking for new migrations...');
    if (!runCommand('cd .. && npx prisma migrate dev', 'Apply database migrations')) {
      console.log('⚠️  Migration failed, but continuing...\n');
    }
  } else {
    console.log('📋 Creating new database...');
    if (!runCommand('cd .. && npx prisma migrate dev --name init', 'Create database and run initial migration')) {
      process.exit(1);
    }
  }

  // Seed database with test data (optional)
  const seedPath = path.join(__dirname, '..', 'prisma', 'seed.js');
  if (fs.existsSync(seedPath)) {
    console.log('🌱 Seeding database with test data...');
    runCommand('cd .. && npm run db:seed', 'Seed database');
  } else {
    console.log('⚠️  No seed file found, skipping database seeding\n');
  }

  console.log('🎉 Development setup completed successfully!');
  console.log('\n📍 Next steps:');
  console.log('   1. Run: npm run dev (to start the server)');
  console.log('   2. Access: http://localhost:3004/health (to verify server is running)');
  console.log('   3. API docs: http://localhost:3004/api-docs (if available)');
  console.log('\n🔧 Useful commands:');
  console.log('   - npm run dev          # Start development server');
  console.log('   - npm run db:studio    # Open Prisma Studio (database GUI)');
  console.log('   - npm run db:reset     # Reset database (caution: deletes all data)');
  console.log('   - npm test             # Run tests\n');
}

// Run setup
setupDevelopment().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
});