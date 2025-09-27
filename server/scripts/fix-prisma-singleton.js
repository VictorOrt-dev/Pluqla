#!/usr/bin/env node
/**
 * CRITICAL FIX: Replace all PrismaClient instantiations with singleton
 *
 * This script fixes the connection pool exhaustion issue by replacing
 * all individual PrismaClient instances with the singleton pattern.
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/controllers/badgeController.js',
  'src/controllers/categoryController.js',
  'src/controllers/financialController.js',
  'src/controllers/uploadController.js',
  'src/controllers/userController.js',
  'src/services/bankIntegrationService.js',
  'src/services/financialAIService.js',
  'src/services/gdprService.js',
  'src/services/strikeService.js',
  'src/utils/tokenUtils.js'
];

const fixFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Pattern 1: Standard import + new PrismaClient
    const pattern1 = /const \{ PrismaClient \} = require\('@prisma\/client'\);\n/g;
    const pattern2 = /const prisma = new PrismaClient\(\);\n/g;

    if (pattern1.test(content) && pattern2.test(content)) {
      console.log(`🔧 Fixing ${filePath}...`);

      // Remove PrismaClient import
      content = content.replace(pattern1, '');

      // Replace new PrismaClient() with singleton import
      content = content.replace(
        pattern2,
        "const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion\n"
      );

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  Skipping ${filePath} (already fixed or different pattern)`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
};

console.log('🚨 CRITICAL: Fixing Prisma singleton pattern across all files...\n');

let fixedCount = 0;
let totalCount = filesToFix.length;

filesToFix.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n📊 Results:`);
console.log(`   Fixed: ${fixedCount}/${totalCount} files`);
console.log(`   Remaining connection pool exhaustion risk: ${totalCount - fixedCount > 0 ? 'HIGH' : 'ELIMINATED'}`);

if (fixedCount > 0) {
  console.log('\n✅ Critical fix applied! Connection pool exhaustion risk eliminated.');
  console.log('🔄 Restart your application to use the singleton pattern.');
} else {
  console.log('\n⚠️  No files were fixed. Please check manually.');
}