/**
 * Bundle Analysis Script for Alimentation Feature
 *
 * Analyzes the bundle size and composition of the Alimentation feature
 * to track Phase 2 optimizations.
 *
 * Usage: node scripts/analyze-alimentation-bundle.js
 */

const fs = require('fs');
const path = require('path');

// Bundle sizes before Phase 2 optimizations
const BASELINE_SIZES = {
  MealSuggestions: 45, // KB estimated
  lucideReact: 15, // KB per full import
  framerMotion: 30, // KB for full library
  total: 177 // KB total (from Phase 1)
};

// Expected savings after Phase 2
const EXPECTED_SAVINGS = {
  MealSuggestions: 45, // Lazy loaded, saved from initial bundle
  lucideReact: 0, // Already tree-shaken (imports specific icons)
  framerMotion: 0, // Not lazy loaded yet (pending)
  total: 45 // KB expected savings
};

const TARGET_SIZE = BASELINE_SIZES.total - EXPECTED_SAVINGS.total; // 132 KB

console.log('📊 BUNDLE ANALYSIS - ALIMENTATION FEATURE\n');
console.log('====================================\n');

console.log('📦 Baseline Sizes (Phase 1):');
console.log(`   Total: ${BASELINE_SIZES.total} KB`);
console.log(`   - MealSuggestions: ${BASELINE_SIZES.MealSuggestions} KB`);
console.log(`   - lucide-react: ${BASELINE_SIZES.lucideReact} KB`);
console.log(`   - framer-motion: ${BASELINE_SIZES.framerMotion} KB\n`);

console.log('🎯 Optimizations Applied (Phase 2):');
console.log('   ✅ Lazy load MealSuggestions component');
console.log('   ✅ Tree-shake lucide-react icons (already optimized)');
console.log('   ✅ Reduce props passed to AlimentationScreen (6 → 2)');
console.log('   ✅ Add Suspense boundaries for code splitting\n');

console.log('💾 Expected Savings:');
console.log(`   - MealSuggestions lazy loading: ${EXPECTED_SAVINGS.MealSuggestions} KB`);
console.log(`   - Total expected savings: ${EXPECTED_SAVINGS.total} KB\n`);

console.log('🎯 Target Size:');
console.log(`   Target: ${TARGET_SIZE} KB (from ${BASELINE_SIZES.total} KB)`);
console.log(`   Reduction: ${((EXPECTED_SAVINGS.total / BASELINE_SIZES.total) * 100).toFixed(1)}%\n`);

console.log('📊 To verify actual bundle size, run:');
console.log('   npm run build');
console.log('   npx source-map-explorer build/static/js/*.js\n');

console.log('✅ Next Steps (Phase 2 remaining):');
console.log('   ⏳ Analyze bundle with webpack-bundle-analyzer');
console.log('   ⏳ Consider lazy loading framer-motion animations');
console.log('   ⏳ Verify optimizations with Lighthouse (target: 90+)\n');

// Check if build directory exists
const buildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildPath)) {
  console.log('✅ Build directory found. Analyzing...\n');

  // Find all JS chunks
  const staticJs = path.join(buildPath, 'static', 'js');
  if (fs.existsSync(staticJs)) {
    const files = fs.readdirSync(staticJs);
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.map'));

    let totalSize = 0;
    console.log('📦 JS Chunks:\n');

    jsFiles.forEach(file => {
      const filePath = path.join(staticJs, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      totalSize += stats.size;

      // Highlight main chunk
      const isMain = file.includes('main');
      const prefix = isMain ? '🔴 ' : '   ';
      console.log(`${prefix}${file}: ${sizeKB} KB`);
    });

    console.log(`\n   Total: ${(totalSize / 1024).toFixed(2)} KB\n`);

    // Compare with target
    const actualSizeKB = totalSize / 1024;
    const diff = TARGET_SIZE - actualSizeKB;
    const diffPercent = ((diff / TARGET_SIZE) * 100).toFixed(1);

    if (actualSizeKB <= TARGET_SIZE) {
      console.log(`✅ SUCCESS: Bundle is ${Math.abs(diff).toFixed(2)} KB under target (${diffPercent}%)\n`);
    } else {
      console.log(`⚠️  Bundle is ${Math.abs(diff).toFixed(2)} KB over target (${Math.abs(diffPercent)}%)\n`);
      console.log('💡 Consider:');
      console.log('   - Lazy loading more components');
      console.log('   - Using dynamic imports for heavy libraries');
      console.log('   - Analyzing with webpack-bundle-analyzer\n');
    }
  } else {
    console.log('⚠️  No static/js directory found in build.\n');
  }
} else {
  console.log('⚠️  No build directory found. Run `npm run build` first.\n');
}

console.log('====================================\n');
console.log('📝 Documentation: docs/ALIMENTATION_FEATURE_PHASE2_PERFORMANCE.md\n');
