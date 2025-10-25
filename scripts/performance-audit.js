#!/usr/bin/env node

/**
 * PERFORMANCE AUDIT SCRIPT
 * Analyse la performance de l'application Pluqla
 *
 * Usage: node scripts/performance-audit.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CLIENT_BUILD_DIR = path.join(__dirname, '../client/build');
const REPORT_PATH = path.join(__dirname, '../docs/PERFORMANCE_AUDIT_REPORT.md');
const BUNDLE_SIZE_THRESHOLD = 300 * 1024; // 300 KB (recommandé: 200KB)
const CHUNK_SIZE_THRESHOLD = 150 * 1024; // 150 KB

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

// 1. ANALYSE TAILLE DES BUNDLES
function analyzeBundleSizes() {
  log('\n📦 ANALYSE DES BUNDLES\n', 'cyan');

  const jsDir = path.join(CLIENT_BUILD_DIR, 'static/js');

  if (!fs.existsSync(jsDir)) {
    log('❌ Build directory not found. Run `npm run build` first.', 'red');
    return null;
  }

  const files = fs.readdirSync(jsDir)
    .filter(file => file.endsWith('.js') && !file.endsWith('.map'))
    .map(file => {
      const filePath = path.join(jsDir, file);
      const size = getFileSize(filePath);
      return { name: file, size, path: filePath };
    })
    .sort((a, b) => b.size - a.size);

  const bundles = {
    main: files.find(f => f.name.startsWith('main')),
    chunks: files.filter(f => !f.name.startsWith('main')),
    total: files.reduce((acc, f) => acc + f.size, 0),
  };

  // Afficher résultats
  if (bundles.main) {
    const mainStatus = bundles.main.size > BUNDLE_SIZE_THRESHOLD ? '❌' : '✅';
    log(`${mainStatus} Main Bundle: ${bundles.main.name} - ${formatBytes(bundles.main.size)}`,
      bundles.main.size > BUNDLE_SIZE_THRESHOLD ? 'red' : 'green');
  }

  log(`\n📑 Top 5 Chunks:`, 'yellow');
  bundles.chunks.slice(0, 5).forEach(chunk => {
    const status = chunk.size > CHUNK_SIZE_THRESHOLD ? '⚠️' : '✅';
    log(`  ${status} ${chunk.name} - ${formatBytes(chunk.size)}`,
      chunk.size > CHUNK_SIZE_THRESHOLD ? 'yellow' : 'green');
  });

  log(`\n📊 Total Bundle Size: ${formatBytes(bundles.total)}`, 'cyan');

  return bundles;
}

// 2. ANALYSE ASSETS (Images, CSS, etc.)
function analyzeAssets() {
  log('\n🖼️  ANALYSE DES ASSETS\n', 'cyan');

  const assetsAnalysis = {
    images: { count: 0, totalSize: 0, files: [] },
    css: { count: 0, totalSize: 0, files: [] },
    fonts: { count: 0, totalSize: 0, files: [] },
  };

  // Images
  const imgDir = path.join(CLIENT_BUILD_DIR, 'static/media');
  if (fs.existsSync(imgDir)) {
    fs.readdirSync(imgDir).forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(ext)) {
        const size = getFileSize(path.join(imgDir, file));
        assetsAnalysis.images.count++;
        assetsAnalysis.images.totalSize += size;
        assetsAnalysis.images.files.push({ name: file, size });
      }
    });
  }

  // CSS
  const cssDir = path.join(CLIENT_BUILD_DIR, 'static/css');
  if (fs.existsSync(cssDir)) {
    fs.readdirSync(cssDir)
      .filter(file => file.endsWith('.css'))
      .forEach(file => {
        const size = getFileSize(path.join(cssDir, file));
        assetsAnalysis.css.count++;
        assetsAnalysis.css.totalSize += size;
        assetsAnalysis.css.files.push({ name: file, size });
      });
  }

  log(`📸 Images: ${assetsAnalysis.images.count} files - ${formatBytes(assetsAnalysis.images.totalSize)}`, 'yellow');
  log(`🎨 CSS: ${assetsAnalysis.css.count} files - ${formatBytes(assetsAnalysis.css.totalSize)}`, 'yellow');

  return assetsAnalysis;
}

// 3. ANALYSE CODE POUR OPTIMISATIONS POTENTIELLES
function analyzeCodeOptimizations() {
  log('\n🔍 ANALYSE CODE OPTIMIZATIONS\n', 'cyan');

  const srcDir = path.join(__dirname, '../client/src');
  const issues = {
    noLazyLoading: [],
    noMemo: [],
    largeComponents: [],
    unnecessaryReRenders: [],
  };

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath);
      } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        const relativePath = path.relative(srcDir, filePath);

        // Détection composants sans React.memo
        if (content.includes('export default function') &&
            !content.includes('React.memo') &&
            !content.includes('memo(') &&
            lines > 50) {
          issues.noMemo.push({
            file: relativePath,
            lines,
            reason: 'Large component without React.memo',
          });
        }

        // Détection routes sans lazy loading
        if (file.includes('Screen.jsx') &&
            !content.includes('React.lazy') &&
            !filePath.includes('node_modules')) {
          issues.noLazyLoading.push({
            file: relativePath,
            reason: 'Screen component not lazy loaded',
          });
        }

        // Composants très gros
        if (lines > 500) {
          issues.largeComponents.push({
            file: relativePath,
            lines,
            reason: 'Component exceeds 500 lines - consider splitting',
          });
        }

        // Détection de re-renders potentiels
        if (content.includes('props.') &&
            !content.includes('useMemo') &&
            !content.includes('useCallback') &&
            lines > 100) {
          issues.unnecessaryReRenders.push({
            file: relativePath,
            reason: 'Component using props without memoization',
          });
        }
      }
    });
  }

  scanDirectory(srcDir);

  // Afficher résultats
  if (issues.noLazyLoading.length > 0) {
    log(`⚠️  ${issues.noLazyLoading.length} screens without lazy loading`, 'yellow');
  }

  if (issues.noMemo.length > 0) {
    log(`⚠️  ${issues.noMemo.length} large components without React.memo`, 'yellow');
  }

  if (issues.largeComponents.length > 0) {
    log(`⚠️  ${issues.largeComponents.length} components > 500 lines`, 'yellow');
  }

  return issues;
}

// 4. CALCULER SCORE DE PERFORMANCE
function calculatePerformanceScore(bundles, assets, codeIssues) {
  let score = 100;

  // Pénalités bundle size
  if (bundles && bundles.main) {
    if (bundles.main.size > BUNDLE_SIZE_THRESHOLD) {
      const excess = bundles.main.size - BUNDLE_SIZE_THRESHOLD;
      score -= Math.min(30, Math.floor(excess / 10240)); // -1 point par 10KB excess
    }
  }

  // Pénalités assets
  if (assets.images.totalSize > 500 * 1024) {
    score -= 10;
  }

  // Pénalités code
  score -= Math.min(20, codeIssues.noLazyLoading.length * 2);
  score -= Math.min(10, codeIssues.largeComponents.length);

  return Math.max(0, score);
}

// 5. RECOMMANDATIONS D'OPTIMISATION
function generateRecommendations(bundles, codeIssues) {
  const recommendations = [];

  if (bundles && bundles.main && bundles.main.size > BUNDLE_SIZE_THRESHOLD) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Bundle Size',
      title: 'Reduce main bundle size',
      description: `Main bundle is ${formatBytes(bundles.main.size)}, should be < ${formatBytes(BUNDLE_SIZE_THRESHOLD)}`,
      actions: [
        'Implement code splitting for routes',
        'Lazy load heavy components',
        'Remove unused dependencies',
        'Use dynamic imports for large libraries',
      ],
    });
  }

  if (codeIssues.noLazyLoading.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Code Splitting',
      title: 'Implement lazy loading for screens',
      description: `${codeIssues.noLazyLoading.length} screen components are not lazy loaded`,
      actions: [
        'Use React.lazy() for screen components',
        'Wrap with Suspense boundary',
        'Preload critical routes',
      ],
      files: codeIssues.noLazyLoading.slice(0, 5).map(i => i.file),
    });
  }

  if (codeIssues.noMemo.length > 5) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Re-renders',
      title: 'Add React.memo to prevent unnecessary re-renders',
      description: `${codeIssues.noMemo.length} large components without memoization`,
      actions: [
        'Wrap components with React.memo',
        'Use useMemo for expensive calculations',
        'Use useCallback for event handlers',
      ],
      files: codeIssues.noMemo.slice(0, 5).map(i => i.file),
    });
  }

  if (codeIssues.largeComponents.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Quality',
      title: 'Split large components',
      description: `${codeIssues.largeComponents.length} components exceed 500 lines`,
      actions: [
        'Extract sub-components',
        'Move business logic to custom hooks',
        'Create dedicated utility functions',
      ],
      files: codeIssues.largeComponents.slice(0, 3).map(i => i.file),
    });
  }

  // Recommandations générales
  recommendations.push({
    priority: 'LOW',
    category: 'General',
    title: 'Implement performance monitoring',
    actions: [
      'Add Web Vitals tracking',
      'Monitor bundle size in CI/CD',
      'Set performance budgets',
      'Use Lighthouse CI',
    ],
  });

  return recommendations;
}

// 6. GÉNÉRER RAPPORT MARKDOWN
function generateReport(bundles, assets, codeIssues, score, recommendations) {
  const timestamp = new Date().toISOString();

  let report = `# Performance Audit Report

**Date**: ${timestamp}
**Performance Score**: ${score}/100
**Status**: ${score >= 80 ? '✅ GOOD' : score >= 60 ? '⚠️ NEEDS IMPROVEMENT' : '❌ CRITICAL'}

---

## 📊 Executive Summary

`;

  if (score >= 80) {
    report += `L'application présente de bonnes performances globales. Quelques optimisations mineures peuvent encore améliorer l'expérience utilisateur.\n\n`;
  } else if (score >= 60) {
    report += `L'application nécessite des optimisations pour améliorer les performances. Les principales priorités sont listées ci-dessous.\n\n`;
  } else {
    report += `⚠️ **CRITIQUE** : L'application présente des problèmes de performance majeurs qui affectent l'expérience utilisateur. Des actions immédiates sont requises.\n\n`;
  }

  // Bundle Analysis
  report += `## 📦 Bundle Analysis\n\n`;

  if (bundles && bundles.main) {
    report += `### Main Bundle\n`;
    report += `- **File**: ${bundles.main.name}\n`;
    report += `- **Size**: ${formatBytes(bundles.main.size)}\n`;
    report += `- **Status**: ${bundles.main.size > BUNDLE_SIZE_THRESHOLD ? '❌ TOO LARGE' : '✅ OK'}\n`;
    report += `- **Threshold**: ${formatBytes(BUNDLE_SIZE_THRESHOLD)}\n\n`;

    if (bundles.main.size > BUNDLE_SIZE_THRESHOLD) {
      const excess = bundles.main.size - BUNDLE_SIZE_THRESHOLD;
      report += `⚠️ Main bundle exceeds threshold by ${formatBytes(excess)}\n\n`;
    }
  }

  if (bundles && bundles.chunks.length > 0) {
    report += `### Top 5 Chunks\n\n`;
    report += `| Chunk | Size | Status |\n`;
    report += `|-------|------|--------|\n`;
    bundles.chunks.slice(0, 5).forEach(chunk => {
      const status = chunk.size > CHUNK_SIZE_THRESHOLD ? '⚠️' : '✅';
      report += `| ${chunk.name} | ${formatBytes(chunk.size)} | ${status} |\n`;
    });
    report += `\n`;
  }

  if (bundles) {
    report += `**Total Bundle Size**: ${formatBytes(bundles.total)}\n\n`;
  }

  // Assets Analysis
  report += `## 🖼️ Assets Analysis\n\n`;
  report += `| Type | Count | Total Size |\n`;
  report += `|------|-------|------------|\n`;
  report += `| Images | ${assets.images.count} | ${formatBytes(assets.images.totalSize)} |\n`;
  report += `| CSS | ${assets.css.count} | ${formatBytes(assets.css.totalSize)} |\n`;
  report += `| Fonts | ${assets.fonts.count} | ${formatBytes(assets.fonts.totalSize)} |\n\n`;

  // Code Issues
  report += `## 🔍 Code Analysis\n\n`;
  report += `| Issue | Count |\n`;
  report += `|-------|-------|\n`;
  report += `| Screens without lazy loading | ${codeIssues.noLazyLoading.length} |\n`;
  report += `| Large components without memo | ${codeIssues.noMemo.length} |\n`;
  report += `| Components > 500 lines | ${codeIssues.largeComponents.length} |\n`;
  report += `| Potential unnecessary re-renders | ${codeIssues.unnecessaryReRenders.length} |\n\n`;

  // Recommendations
  report += `## 🎯 Recommendations\n\n`;

  const highPriority = recommendations.filter(r => r.priority === 'HIGH');
  const mediumPriority = recommendations.filter(r => r.priority === 'MEDIUM');
  const lowPriority = recommendations.filter(r => r.priority === 'LOW');

  if (highPriority.length > 0) {
    report += `### 🔴 High Priority\n\n`;
    highPriority.forEach((rec, index) => {
      report += `#### ${index + 1}. ${rec.title}\n\n`;
      report += `**Category**: ${rec.category}\n\n`;
      if (rec.description) {
        report += `${rec.description}\n\n`;
      }
      report += `**Actions**:\n`;
      rec.actions.forEach(action => {
        report += `- ${action}\n`;
      });
      if (rec.files && rec.files.length > 0) {
        report += `\n**Affected Files**:\n`;
        rec.files.forEach(file => {
          report += `- \`${file}\`\n`;
        });
      }
      report += `\n`;
    });
  }

  if (mediumPriority.length > 0) {
    report += `### 🟡 Medium Priority\n\n`;
    mediumPriority.forEach((rec, index) => {
      report += `#### ${index + 1}. ${rec.title}\n\n`;
      report += `**Category**: ${rec.category}\n\n`;
      if (rec.description) {
        report += `${rec.description}\n\n`;
      }
      report += `**Actions**:\n`;
      rec.actions.forEach(action => {
        report += `- ${action}\n`;
      });
      if (rec.files && rec.files.length > 0) {
        report += `\n**Affected Files** (sample):\n`;
        rec.files.forEach(file => {
          report += `- \`${file}\`\n`;
        });
      }
      report += `\n`;
    });
  }

  if (lowPriority.length > 0) {
    report += `### 🟢 Low Priority / General\n\n`;
    lowPriority.forEach((rec, index) => {
      report += `#### ${index + 1}. ${rec.title}\n\n`;
      if (rec.description) {
        report += `${rec.description}\n\n`;
      }
      report += `**Actions**:\n`;
      rec.actions.forEach(action => {
        report += `- ${action}\n`;
      });
      report += `\n`;
    });
  }

  // Next Steps
  report += `## 📝 Next Steps\n\n`;
  report += `1. **Immediate**: Address high-priority recommendations\n`;
  report += `2. **Short-term**: Implement medium-priority optimizations\n`;
  report += `3. **Long-term**: Establish performance monitoring and budgets\n`;
  report += `4. **Continuous**: Run Lighthouse CI on every deploy\n\n`;

  // Performance Budgets
  report += `## 💰 Recommended Performance Budgets\n\n`;
  report += `| Metric | Current | Target | Status |\n`;
  report += `|--------|---------|--------|--------|\n`;
  if (bundles && bundles.main) {
    const mainStatus = bundles.main.size <= BUNDLE_SIZE_THRESHOLD ? '✅' : '❌';
    report += `| Main Bundle | ${formatBytes(bundles.main.size)} | ${formatBytes(BUNDLE_SIZE_THRESHOLD)} | ${mainStatus} |\n`;
  }
  report += `| Total JS | ${bundles ? formatBytes(bundles.total) : 'N/A'} | < 600 KB | ${bundles && bundles.total < 600*1024 ? '✅' : '❌'} |\n`;
  report += `| Images | ${formatBytes(assets.images.totalSize)} | < 500 KB | ${assets.images.totalSize < 500*1024 ? '✅' : '❌'} |\n`;
  report += `| First Load JS | TBD | < 200 KB | ⏳ |\n`;
  report += `| Lighthouse Score | TBD | > 90 | ⏳ |\n\n`;

  report += `---\n\n`;
  report += `**Report generated by**: performance-audit.js\n`;
  report += `**Timestamp**: ${timestamp}\n`;

  return report;
}

// MAIN
async function main() {
  log('🚀 PLUQLA PERFORMANCE AUDIT', 'magenta');
  log('=' .repeat(50), 'magenta');

  try {
    // Vérifier si build existe
    if (!fs.existsSync(CLIENT_BUILD_DIR)) {
      log('\n❌ Build not found. Building client first...', 'red');
      execSync('cd client && npm run build', { stdio: 'inherit' });
    }

    // 1. Analyser bundles
    const bundles = analyzeBundleSizes();

    // 2. Analyser assets
    const assets = analyzeAssets();

    // 3. Analyser code
    const codeIssues = analyzeCodeOptimizations();

    // 4. Calculer score
    const score = calculatePerformanceScore(bundles, assets, codeIssues);
    log(`\n🎯 PERFORMANCE SCORE: ${score}/100`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');

    // 5. Générer recommandations
    const recommendations = generateRecommendations(bundles, codeIssues);

    // 6. Générer rapport
    const report = generateReport(bundles, assets, codeIssues, score, recommendations);

    // Créer dossier docs si nécessaire
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    fs.writeFileSync(REPORT_PATH, report);
    log(`\n📄 Report generated: ${REPORT_PATH}`, 'green');

    // Afficher résumé
    log('\n' + '='.repeat(50), 'magenta');
    log('📊 AUDIT COMPLETE', 'magenta');
    log('='.repeat(50), 'magenta');
    log(`Score: ${score}/100`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
    log(`Recommendations: ${recommendations.length} total`, 'cyan');
    log(`  - High Priority: ${recommendations.filter(r => r.priority === 'HIGH').length}`, 'red');
    log(`  - Medium Priority: ${recommendations.filter(r => r.priority === 'MEDIUM').length}`, 'yellow');
    log(`  - Low Priority: ${recommendations.filter(r => r.priority === 'LOW').length}`, 'green');

    process.exit(0);
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
