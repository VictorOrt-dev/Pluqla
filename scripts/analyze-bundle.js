#!/usr/bin/env node

/**
 * BUNDLE ANALYZER - Deep Analysis
 * Analyse le contenu du bundle principal pour identifier les bibliothèques lourdes
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_PATH = path.join(__dirname, '../client/build/static/js');

// Trouver le fichier main.*.js
const files = fs.readdirSync(BUNDLE_PATH);
const mainFile = files.find(f => f.startsWith('main.') && f.endsWith('.js') && !f.endsWith('.map'));

if (!mainFile) {
  console.error('❌ Main bundle not found');
  process.exit(1);
}

const bundlePath = path.join(BUNDLE_PATH, mainFile);
const bundleContent = fs.readFileSync(bundlePath, 'utf8');
const bundleSize = fs.statSync(bundlePath).size;

console.log(`\n📦 Analyzing: ${mainFile}`);
console.log(`📊 Size: ${(bundleSize / 1024).toFixed(2)} KB\n`);

// Patterns de détection de bibliothèques
const libraries = [
  { name: 'react', pattern: /react@/g },
  { name: 'react-dom', pattern: /react-dom@/g },
  { name: 'framer-motion', pattern: /framer-motion/g },
  { name: 'lucide-react', pattern: /lucide-react/g },
  { name: 'axios', pattern: /axios/g },
  { name: '@tanstack/react-query', pattern: /@tanstack\/react-query/g },
  { name: 'better-auth', pattern: /better-auth/g },
  { name: 'i18next', pattern: /i18next/g },
  { name: 'react-i18next', pattern: /react-i18next/g },
  { name: 'recharts', pattern: /recharts/g },
  { name: 'date-fns', pattern: /date-fns/g },
  { name: 'zod', pattern: /\bzod\b/g },
  { name: 'react-router', pattern: /react-router/g },
  { name: 'lodash', pattern: /lodash/g },
  { name: 'moment', pattern: /moment/g },
];

// Détecter les imports de composants
const componentPatterns = {
  'Home Components': /HomeScreen|DashboardWidget|QuickActions|RecommendedCard/g,
  'Finance Components': /FinanceCard|Transaction|Budget|ExpenseChart/g,
  'Auth Components': /LoginScreen|SignupForm|AuthProvider/g,
  'Onboarding': /OnboardingManager|WelcomeScreen|PersonalizationScreen/g,
  'Category Components': /CategoryScreen|AISuggestions|StandardDeals/g,
  'Common Components': /Header|Navigation|LoadingSpinner|ErrorBoundary|PWAManager/g,
};

console.log('🔍 Library Detection:\n');

let totalMatches = 0;
const detectedLibs = [];

libraries.forEach(lib => {
  const matches = bundleContent.match(lib.pattern);
  if (matches && matches.length > 0) {
    console.log(`  ✓ ${lib.name}: ${matches.length} occurrences`);
    detectedLibs.push({ name: lib.name, occurrences: matches.length });
    totalMatches += matches.length;
  }
});

console.log(`\n📊 Component Analysis:\n`);

Object.entries(componentPatterns).forEach(([category, pattern]) => {
  const matches = bundleContent.match(pattern);
  if (matches && matches.length > 0) {
    console.log(`  ${category}: ${matches.length} references`);
  }
});

// Estimation de la taille par bibliothèque (approximation)
console.log(`\n💡 Optimization Suggestions:\n`);

const suggestions = [];

// Framer Motion detection
if (bundleContent.includes('framer-motion')) {
  suggestions.push({
    priority: 'HIGH',
    lib: 'framer-motion',
    estimated: '50-80 KB',
    action: 'Lazy load animations or use CSS animations',
  });
}

// Lucide React detection
if (bundleContent.includes('lucide-react')) {
  const iconCount = (bundleContent.match(/lucide-react/g) || []).length;
  suggestions.push({
    priority: 'HIGH',
    lib: 'lucide-react',
    estimated: '30-50 KB',
    action: `${iconCount} icon imports detected - use tree-shaking or icon-only imports`,
  });
}

// React Query detection
if (bundleContent.includes('@tanstack/react-query')) {
  suggestions.push({
    priority: 'MEDIUM',
    lib: '@tanstack/react-query',
    estimated: '20-40 KB',
    action: 'Ensure tree-shaking is enabled',
  });
}

// i18next detection
if (bundleContent.includes('i18next')) {
  suggestions.push({
    priority: 'MEDIUM',
    lib: 'i18next/react-i18next',
    estimated: '15-30 KB',
    action: 'Lazy load language files, use dynamic imports',
  });
}

// Recharts detection
if (bundleContent.includes('recharts')) {
  suggestions.push({
    priority: 'HIGH',
    lib: 'recharts',
    estimated: '40-60 KB',
    action: 'Lazy load charts components',
  });
}

// Lodash detection
if (bundleContent.includes('lodash')) {
  suggestions.push({
    priority: 'MEDIUM',
    lib: 'lodash',
    estimated: '20-50 KB',
    action: 'Use lodash-es and import only needed functions',
  });
}

// Moment detection
if (bundleContent.includes('moment')) {
  suggestions.push({
    priority: 'HIGH',
    lib: 'moment',
    estimated: '60-100 KB',
    action: 'Replace with date-fns or dayjs (much lighter)',
  });
}

// Afficher suggestions
suggestions.sort((a, b) => {
  const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
  return priorityOrder[a.priority] - priorityOrder[b.priority];
});

suggestions.forEach((s, i) => {
  const emoji = s.priority === 'HIGH' ? '🔴' : s.priority === 'MEDIUM' ? '🟡' : '🟢';
  console.log(`  ${emoji} [${s.priority}] ${s.lib}`);
  console.log(`     Estimated: ${s.estimated}`);
  console.log(`     Action: ${s.action}\n`);
});

// Recommandations finales
console.log(`\n🎯 Quick Wins (Target: -109 KB to reach 300 KB):\n`);

const quickWins = [
  '1. Lazy load framer-motion (-50-80 KB)',
  '2. Optimize lucide-react icon imports (-30-50 KB)',
  '3. Replace moment with date-fns (-60-100 KB if present)',
  '4. Lazy load recharts (-40-60 KB if present)',
  '5. Tree-shake unused library exports',
];

quickWins.forEach(win => console.log(`  ${win}`));

console.log(`\n📈 Expected Result: 409 KB → 250-300 KB ✅\n`);

// Générer rapport JSON
const report = {
  file: mainFile,
  size: bundleSize,
  sizeKB: (bundleSize / 1024).toFixed(2),
  detectedLibraries: detectedLibs,
  suggestions,
  timestamp: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(__dirname, '../docs/bundle-analysis.json'),
  JSON.stringify(report, null, 2)
);

console.log(`📄 Report saved: docs/bundle-analysis.json\n`);
