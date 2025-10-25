#!/usr/bin/env node

/**
 * ICON OPTIMIZER
 * Crée un barrel file optimisé pour les icônes lucide-react
 * Tree-shaking garanti en important seulement les icônes utilisées
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../client/src');
const ICONS_FILE = path.join(SRC_DIR, 'components/common/icons.js');

console.log('🔍 Scanning for lucide-react icon usage...\n');

// Scanner tous les fichiers pour extraire les icônes utilisées
const iconUsage = new Set();

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanDirectory(filePath);
    } else if ((file.endsWith('.jsx') || file.endsWith('.js')) && !file.includes('.test.')) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Pattern: import { Icon1, Icon2 } from 'lucide-react'
      const importPattern = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g;
      let match;

      while ((match = importPattern.exec(content)) !== null) {
        const icons = match[1].split(',').map(i => i.trim());
        icons.forEach(icon => iconUsage.add(icon));
      }
    }
  });
}

scanDirectory(SRC_DIR);

const uniqueIcons = Array.from(iconUsage).sort();

console.log(`✅ Found ${uniqueIcons.length} unique icons:\n`);
uniqueIcons.forEach((icon, i) => {
  if (i % 5 === 0) process.stdout.write('\n  ');
  process.stdout.write(`${icon}, `);
});
console.log('\n\n');

// Générer le barrel file optimisé
const barrelContent = `/**
 * OPTIMIZED LUCIDE ICONS
 * Barrel file qui exporte seulement les icônes utilisées dans l'app
 *
 * Avantages:
 * - Tree-shaking garanti
 * - Import centralisé: import { Icon } from '@/components/common/icons'
 * - Facilite le tracking des icônes utilisées
 *
 * Auto-généré par: scripts/optimize-icons.js
 * Date: ${new Date().toISOString()}
 * Icons count: ${uniqueIcons.length}
 */

export {
${uniqueIcons.map(icon => `  ${icon},`).join('\n')}
} from 'lucide-react';
`;

fs.writeFileSync(ICONS_FILE, barrelContent);

console.log(`✅ Generated: ${path.relative(process.cwd(), ICONS_FILE)}`);
console.log(`📦 Exporting ${uniqueIcons.length} icons\n`);

// Instructions
console.log('📝 NEXT STEPS:\n');
console.log('1. Replace imports in components:');
console.log('   BEFORE: import { Icon } from \'lucide-react\'');
console.log('   AFTER:  import { Icon } from \'@/components/common/icons\'\n');
console.log('2. Configure path alias in jsconfig.json (if not already):');
console.log('   "@/*": ["./src/*"]\n');
console.log('3. Rebuild and verify bundle size reduction\n');

// Estimation de gain
const estimatedSavings = Math.max(0, 50 - (uniqueIcons.length * 1.5)); // 50 KB base, ~1.5 KB par icône
console.log(`💡 Estimated bundle size reduction: ~${estimatedSavings.toFixed(0)} KB\n`);
