const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Configuration des tests d'accessibilité
const PAGES_TO_TEST = [
  { name: 'Landing Page', url: 'http://localhost:3000', waitFor: '[data-testid="landing-content"]' },
  { name: 'Login Screen', url: 'http://localhost:3000?screen=login', waitFor: '[data-testid="login-form"]' },
  { name: 'Home Screen', url: 'http://localhost:3000?screen=home', waitFor: '[data-testid="home-content"]' },
  { name: 'Profile Screen', url: 'http://localhost:3000?screen=profile', waitFor: '[data-testid="profile-content"]' }
];

// Tags WCAG à tester
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];

test.describe('Accessibility Tests with Axe', () => {
  PAGES_TO_TEST.forEach(page => {
    test(`${page.name} should be accessible`, async ({ browser }) => {
      const context = await browser.newContext();
      const browserPage = await context.newPage();

      try {
        // Navigation vers la page
        await browserPage.goto(page.url, { waitUntil: 'networkidle' });

        // Attendre que le contenu soit chargé
        if (page.waitFor) {
          await browserPage.waitForSelector(page.waitFor, { timeout: 10000 }).catch(() => {
            console.warn(`Selector ${page.waitFor} not found for ${page.name}, continuing...`);
          });
        }

        // Attendre un délai supplémentaire pour les animations
        await browserPage.waitForTimeout(2000);

        // Exécuter l'audit Axe
        const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
          .withTags(WCAG_TAGS)
          .include('body')
          .exclude('[data-testid="ads"]') // Exclure les publicités
          .exclude('[data-testid="external-widgets"]') // Exclure widgets externes
          .analyze();

        // Vérifications
        console.log(`\\n📊 Axe Results for ${page.name}:`);
        console.log(`✅ Passes: ${accessibilityScanResults.passes.length}`);
        console.log(`⚠️  Violations: ${accessibilityScanResults.violations.length}`);
        console.log(`ℹ️  Incomplete: ${accessibilityScanResults.incomplete.length}`);

        // Afficher les violations détaillées
        if (accessibilityScanResults.violations.length > 0) {
          console.log('\\n🚨 Accessibility Violations:');
          accessibilityScanResults.violations.forEach((violation, index) => {
            console.log(`\\n${index + 1}. ${violation.id} (${violation.impact})`);
            console.log(`   Description: ${violation.description}`);
            console.log(`   Help: ${violation.helpUrl}`);
            console.log(`   Nodes affected: ${violation.nodes.length}`);

            // Afficher les premiers éléments affectés
            violation.nodes.slice(0, 3).forEach((node, nodeIndex) => {
              console.log(`   ${nodeIndex + 1}) ${node.target.join(', ')}`);
              if (node.failureSummary) {
                console.log(`      Error: ${node.failureSummary}`);
              }
            });
          });
        }

        // Générer rapport JSON détaillé
        const report = {
          page: page.name,
          url: page.url,
          timestamp: new Date().toISOString(),
          summary: {
            passes: accessibilityScanResults.passes.length,
            violations: accessibilityScanResults.violations.length,
            incomplete: accessibilityScanResults.incomplete.length,
            inapplicable: accessibilityScanResults.inapplicable.length
          },
          violations: accessibilityScanResults.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            helpUrl: v.helpUrl,
            nodes: v.nodes.length,
            tags: v.tags
          }))
        };

        // Sauvegarder le rapport
        const fs = require('fs');
        const reportDir = './accessibility-reports';
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        const fileName = `${page.name.toLowerCase().replace(/\\s+/g, '-')}-accessibility-report.json`;
        fs.writeFileSync(`${reportDir}/${fileName}`, JSON.stringify(report, null, 2));

        // Les violations critiques font échouer le test
        const criticalViolations = accessibilityScanResults.violations.filter(
          v => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations.length).toBe(0);

        // Vérifier qu'il n'y a pas trop de violations totales
        expect(accessibilityScanResults.violations.length).toBeLessThan(10);

      } catch (error) {
        console.error(`Test failed for ${page.name}:`, error);
        throw error;
      } finally {
        await context.close();
      }
    });
  });

  test('Color contrast audit', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze();

      console.log('\\n🎨 Color Contrast Results:');
      console.log(`Violations: ${accessibilityScanResults.violations.length}`);

      accessibilityScanResults.violations.forEach(violation => {
        console.log(`- ${violation.description}`);
        violation.nodes.forEach(node => {
          console.log(`  Target: ${node.target.join(', ')}`);
        });
      });

      expect(accessibilityScanResults.violations.length).toBe(0);

    } finally {
      await context.close();
    }
  });
});