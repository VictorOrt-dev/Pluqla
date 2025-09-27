#!/usr/bin/env node
/**
 * Script de vérification des exports/imports
 * Détecte les incohérences qui causent "Component is not a function"
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const errors = [];
const warnings = [];

// Fonction pour analyser les exports d'un fichier
function analyzeExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(srcDir, filePath);

    // Vérifier les exports default
    const defaultExportMatch = content.match(/export\s+default\s+(\w+)/);
    const componentDefMatch = content.match(/const\s+(\w+)\s*=.*=>/);
    const functionDefMatch = content.match(/function\s+(\w+)/);

    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
      // Vérifier que les composants React ont un export default
      if ((componentDefMatch || functionDefMatch) && !defaultExportMatch) {
        warnings.push(`${relativePath}: Composant défini mais pas d'export default`);
      }

      // Vérifier la cohérence nom de fichier / export
      const fileName = path.basename(filePath, path.extname(filePath));
      if (defaultExportMatch && defaultExportMatch[1] !== fileName) {
        warnings.push(`${relativePath}: Export default "${defaultExportMatch[1]}" ne correspond pas au nom de fichier "${fileName}"`);
      }
    }

    return {
      defaultExport: defaultExportMatch ? defaultExportMatch[1] : null,
      namedExports: [...content.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)].map(m => m[1])
    };
  } catch (error) {
    errors.push(`Erreur lecture ${filePath}: ${error.message}`);
    return null;
  }
}

// Fonction pour analyser les imports d'un fichier
function analyzeImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(srcDir, filePath);

    // Trouver tous les imports
    const imports = [...content.matchAll(/import\s+(.+?)\s+from\s+['"](.+?)['"]/g)];

    imports.forEach(([fullMatch, importPart, importPath]) => {
      // Ignorer les imports de node_modules
      if (importPath.startsWith('.')) {
        const resolvedPath = path.resolve(path.dirname(filePath), importPath);
        const possibleExtensions = ['.js', '.jsx', '.ts', '.tsx'];

        let foundFile = false;
        for (const ext of possibleExtensions) {
          const fullPath = resolvedPath + ext;
          if (fs.existsSync(fullPath)) {
            foundFile = true;

            // Vérifier que l'import correspond à l'export
            const exportInfo = analyzeExports(fullPath);
            if (exportInfo) {
              // Vérifier import default
              const defaultImportMatch = importPart.match(/^(\w+)(?:\s*,|$)/);
              if (defaultImportMatch && exportInfo.defaultExport &&
                  defaultImportMatch[1] !== exportInfo.defaultExport) {
                errors.push(`${relativePath}: Import default "${defaultImportMatch[1]}" ne correspond pas à l'export "${exportInfo.defaultExport}" dans ${importPath}`);
              }
            }
            break;
          }
        }

        if (!foundFile) {
          errors.push(`${relativePath}: Fichier importé non trouvé: ${importPath}`);
        }
      }
    });

  } catch (error) {
    errors.push(`Erreur analyse imports ${filePath}: ${error.message}`);
  }
}

// Parcourir récursivement le dossier src
function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      analyzeImports(filePath);
    }
  });
}

console.log('🔍 Vérification des exports/imports...');
console.log('=====================================');

walkDir(srcDir);

// Afficher les résultats
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Aucun problème détecté !');
} else {
  if (errors.length > 0) {
    console.log(`\n❌ ERREURS (${errors.length}):`);
    errors.forEach(error => console.log(`  - ${error}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
}

console.log(`\n📊 Résumé: ${errors.length} erreurs, ${warnings.length} warnings`);

// Exit avec code d'erreur si problèmes critiques
process.exit(errors.length > 0 ? 1 : 0);