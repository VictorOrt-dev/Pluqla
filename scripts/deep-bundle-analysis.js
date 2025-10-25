#!/usr/bin/env node

/**
 * DEEP BUNDLE ANALYSIS
 * Analyse approfondie du bundle pour identifier les optimisations possibles
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_DIR = path.join(__dirname, '../client/build/static/js');
const REPORT_PATH = path.join(__dirname, '../docs/BUNDLE_OPTIMIZATION_REPORT.md');

console.log('🔍 Starting deep bundle analysis...\n');

// Lire tous les fichiers JS
const files = fs.readdirSync(BUNDLE_DIR)
  .filter(f => f.endsWith('.js') && !f.endsWith('.map'))
  .map(f => ({
    name: f,
    path: path.join(BUNDLE_DIR, f),
    size: fs.statSync(path.join(BUNDLE_DIR, f)).size,
  }))
  .sort((a, b) => b.size - a.size);

const mainBundle = files.find(f => f.name.startsWith('main.'));
const chunks = files.filter(f => !f.name.startsWith('main.'));

console.log('📦 Bundle Files Found:\n');
console.log(`   Main: ${mainBundle.name} - ${(mainBundle.size / 1024).toFixed(2)} KB`);
console.log(`   Chunks: ${chunks.length} files\n`);

// Analyser le contenu du main bundle
console.log('🔬 Analyzing main bundle content...\n');

const mainContent = fs.readFileSync(mainBundle.path, 'utf8');

// Détecter les patterns de bibliothèques
const libraryPatterns = {
  'react': {
    pattern: /"react":|react\.createElement|React\.Component/g,
    estimatedSize: '40-50 KB',
    category: 'Framework',
    optimization: 'Already optimized (core dependency)',
  },
  'react-dom': {
    pattern: /"react-dom":|ReactDOM\.render|createRoot/g,
    estimatedSize: '120-130 KB',
    category: 'Framework',
    optimization: 'Already optimized (core dependency)',
  },
  'framer-motion': {
    pattern: /framer-motion|motion\./g,
    estimatedSize: '80-100 KB',
    category: 'Animation',
    optimization: '🔴 HIGH: Lazy load or replace with CSS animations',
  },
  'lucide-react': {
    pattern: /lucide-react/g,
    estimatedSize: '30-50 KB',
    category: 'Icons',
    optimization: '🟡 MEDIUM: Use individual icon imports',
  },
  'i18next': {
    pattern: /"i18next"|i18n\.t\(|useTranslation/g,
    estimatedSize: '20-30 KB',
    category: 'i18n',
    optimization: '✅ Already optimized (lazy loading implemented)',
  },
  'react-i18next': {
    pattern: /"react-i18next"|useTranslation|Trans\s/g,
    estimatedSize: '10-15 KB',
    category: 'i18n',
    optimization: '✅ Already optimized',
  },
  'axios': {
    pattern: /"axios"|axios\.get|axios\.post/g,
    estimatedSize: '15-20 KB',
    category: 'HTTP',
    optimization: '🟢 Consider fetch API (native)',
  },
  'date-fns': {
    pattern: /"date-fns"|format\(.*Date/g,
    estimatedSize: '10-70 KB (varies by imports)',
    category: 'Date Utils',
    optimization: '🟡 Import only needed functions',
  },
  'lodash': {
    pattern: /"lodash"|_\./g,
    estimatedSize: '20-70 KB',
    category: 'Utils',
    optimization: '🔴 HIGH: Replace with lodash-es and specific imports',
  },
  'PropTypes': {
    pattern: /PropTypes\./g,
    estimatedSize: '5-10 KB',
    category: 'Validation',
    optimization: '🟡 Remove in production build',
  },
};

const detectedLibraries = [];

Object.entries(libraryPatterns).forEach(([name, config]) => {
  const matches = mainContent.match(config.pattern);
  if (matches) {
    detectedLibraries.push({
      name,
      occurrences: matches.length,
      ...config,
    });
    console.log(`  ✓ ${name}: ${matches.length} occurrences`);
  }
});

console.log('\n');

// Analyser les imports de composants
console.log('🧩 Analyzing component imports...\n');

const componentImports = {
  'Lazy Components': /React\.lazy\(/g,
  'Suspense Boundaries': /<Suspense/g,
  'Error Boundaries': /ErrorBoundary/g,
  'Memo Components': /React\.memo\(/g,
  'useCallback': /useCallback\(/g,
  'useMemo': /useMemo\(/g,
  'useEffect': /useEffect\(/g,
  'useState': /useState\(/g,
};

const componentStats = {};
Object.entries(componentImports).forEach(([name, pattern]) => {
  const matches = mainContent.match(pattern);
  componentStats[name] = matches ? matches.length : 0;
  console.log(`  ${name}: ${componentStats[name]}`);
});

console.log('\n');

// Calculer les opportunités d'optimisation
console.log('💡 Optimization Opportunities:\n');

const optimizations = [];

// 1. Framer Motion
const framerMotionLib = detectedLibraries.find(l => l.name === 'framer-motion');
if (framerMotionLib && framerMotionLib.occurrences > 10) {
  optimizations.push({
    priority: 'HIGH',
    library: 'framer-motion',
    impact: '80-100 KB savings',
    action: 'Lazy load animations or replace with CSS',
    effort: 'Medium',
  });
}

// 2. Lodash
const lodashLib = detectedLibraries.find(l => l.name === 'lodash');
if (lodashLib) {
  optimizations.push({
    priority: 'HIGH',
    library: 'lodash',
    impact: '20-50 KB savings',
    action: 'Use lodash-es with specific imports',
    effort: 'Low',
  });
}

// 3. PropTypes
if (componentStats['Memo Components'] < 5) {
  optimizations.push({
    priority: 'MEDIUM',
    library: 'Component Optimization',
    impact: '10-20% faster re-renders',
    action: 'Add React.memo to large components',
    effort: 'Low',
  });
}

// 4. Lazy Loading
const totalComponents = componentStats['useState'] || 0;
const lazyComponents = componentStats['Lazy Components'] || 0;
const lazyPercentage = totalComponents > 0 ? (lazyComponents / totalComponents * 100) : 0;

if (lazyPercentage < 50) {
  optimizations.push({
    priority: 'MEDIUM',
    library: 'Code Splitting',
    impact: `${(100 - lazyPercentage).toFixed(0)}% of components not lazy`,
    action: 'Lazy load more screen components',
    effort: 'Medium',
  });
}

optimizations.forEach((opt, i) => {
  const emoji = opt.priority === 'HIGH' ? '🔴' : opt.priority === 'MEDIUM' ? '🟡' : '🟢';
  console.log(`  ${emoji} [${opt.priority}] ${opt.library}`);
  console.log(`     Impact: ${opt.impact}`);
  console.log(`     Action: ${opt.action}`);
  console.log(`     Effort: ${opt.effort}\n`);
});

// Générer rapport markdown
const report = generateMarkdownReport({
  mainBundle,
  chunks,
  detectedLibraries,
  componentStats,
  optimizations,
});

fs.writeFileSync(REPORT_PATH, report);

console.log(`📄 Report generated: ${REPORT_PATH}\n`);

// Résumé final
console.log('📊 Summary:\n');
console.log(`  Main Bundle: ${(mainBundle.size / 1024).toFixed(2)} KB`);
console.log(`  Total Chunks: ${chunks.length}`);
console.log(`  Libraries Detected: ${detectedLibraries.length}`);
console.log(`  High Priority Optimizations: ${optimizations.filter(o => o.priority === 'HIGH').length}`);
console.log(`  Potential Savings: 100-150 KB\n`);

console.log('✅ Analysis complete!\n');

// Helper function
function generateMarkdownReport(data) {
  const { mainBundle, chunks, detectedLibraries, componentStats, optimizations } = data;

  let md = `# Bundle Optimization Report\n\n`;
  md += `**Generated**: ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;

  md += `## 📊 Bundle Overview\n\n`;
  md += `### Main Bundle\n\n`;
  md += `- **File**: ${mainBundle.name}\n`;
  md += `- **Size**: ${(mainBundle.size / 1024).toFixed(2)} KB\n`;
  md += `- **Status**: ${mainBundle.size > 300 * 1024 ? '❌ TOO LARGE' : '✅ OK'}\n\n`;

  md += `### Chunks\n\n`;
  md += `| Chunk | Size | Status |\n`;
  md += `|-------|------|--------|\n`;
  chunks.slice(0, 10).forEach(chunk => {
    const sizeKB = (chunk.size / 1024).toFixed(2);
    const status = chunk.size > 150 * 1024 ? '⚠️' : '✅';
    md += `| ${chunk.name} | ${sizeKB} KB | ${status} |\n`;
  });
  md += `\n`;

  md += `## 📚 Detected Libraries\n\n`;
  md += `| Library | Occurrences | Est. Size | Optimization |\n`;
  md += `|---------|-------------|-----------|-------------|\n`;
  detectedLibraries.forEach(lib => {
    md += `| ${lib.name} | ${lib.occurrences} | ${lib.estimatedSize} | ${lib.optimization} |\n`;
  });
  md += `\n`;

  md += `## 🧩 Component Analysis\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  Object.entries(componentStats).forEach(([name, count]) => {
    md += `| ${name} | ${count} |\n`;
  });
  md += `\n`;

  md += `## 💡 Optimization Recommendations\n\n`;
  optimizations.forEach((opt, i) => {
    const emoji = opt.priority === 'HIGH' ? '🔴' : opt.priority === 'MEDIUM' ? '🟡' : '🟢';
    md += `### ${emoji} ${i + 1}. ${opt.library} (${opt.priority})\n\n`;
    md += `- **Impact**: ${opt.impact}\n`;
    md += `- **Action**: ${opt.action}\n`;
    md += `- **Effort**: ${opt.effort}\n\n`;
  });

  md += `## 🎯 Action Plan\n\n`;
  md += `1. Address HIGH priority optimizations first\n`;
  md += `2. Measure impact after each change\n`;
  md += `3. Re-run analysis to verify improvements\n`;
  md += `4. Target: Reduce main bundle to < 300 KB\n\n`;

  return md;
}
