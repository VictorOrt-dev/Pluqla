/**
 * Analyse la cohérence des prix et quantités des recettes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeRecipes() {
  console.log('🔍 ANALYSE DE COHÉRENCE PRIX/QUANTITÉS\n');
  console.log('='.repeat(70));

  const recipes = await prisma.recipe.findMany({
    select: {
      title: true,
      servings: true,
      estimatedPrice: true,
      cookingTime: true,
      difficulty: true,
      category: true,
      ingredients: true
    },
    orderBy: {
      estimatedPrice: 'asc'
    }
  });

  console.log(`\n📊 Total recettes analysées: ${recipes.length}\n`);

  // Analyse par catégorie de prix
  const cheap = recipes.filter(r => r.estimatedPrice <= 6);
  const medium = recipes.filter(r => r.estimatedPrice > 6 && r.estimatedPrice <= 12);
  const expensive = recipes.filter(r => r.estimatedPrice > 12);

  console.log('💰 RÉPARTITION PAR PRIX:');
  console.log(`   Économique (≤6€):    ${cheap.length} recettes`);
  console.log(`   Moyen (6-12€):       ${medium.length} recettes`);
  console.log(`   Cher (>12€):         ${expensive.length} recettes\n`);

  // Prix moyen par portion
  console.log('📊 PRIX MOYEN PAR PORTION:');
  const pricesPerServing = recipes.map(r => r.estimatedPrice / r.servings);
  const avgPricePerServing = pricesPerServing.reduce((a, b) => a + b, 0) / pricesPerServing.length;
  const minPrice = Math.min(...pricesPerServing);
  const maxPrice = Math.max(...pricesPerServing);

  console.log(`   Minimum:  ${minPrice.toFixed(2)}€/portion`);
  console.log(`   Moyenne:  ${avgPricePerServing.toFixed(2)}€/portion`);
  console.log(`   Maximum:  ${maxPrice.toFixed(2)}€/portion\n`);

  // Top 5 recettes les plus économiques
  console.log('💚 TOP 5 RECETTES LES PLUS ÉCONOMIQUES:');
  recipes.slice(0, 5).forEach((r, i) => {
    const pricePerServing = (r.estimatedPrice / r.servings).toFixed(2);
    console.log(`   ${i + 1}. ${r.title}`);
    console.log(`      ${r.estimatedPrice}€ pour ${r.servings} portions (${pricePerServing}€/portion)`);
  });

  // Top 5 recettes les plus chères
  console.log('\n💎 TOP 5 RECETTES LES PLUS CHÈRES:');
  recipes.slice(-5).reverse().forEach((r, i) => {
    const pricePerServing = (r.estimatedPrice / r.servings).toFixed(2);
    console.log(`   ${i + 1}. ${r.title}`);
    console.log(`      ${r.estimatedPrice}€ pour ${r.servings} portions (${pricePerServing}€/portion)`);
  });

  // Analyse détaillée de quelques recettes
  console.log('\n\n🔬 ANALYSE DÉTAILLÉE DE 5 RECETTES:\n');
  console.log('='.repeat(70));

  const sampleRecipes = [
    recipes.find(r => r.title.includes('Carbonara')),
    recipes.find(r => r.title.includes('Salade')),
    recipes.find(r => r.title.includes('Curry')),
    recipes.find(r => r.title.includes('Burger')),
    recipes.find(r => r.title.includes('Tiramisu'))
  ].filter(Boolean);

  sampleRecipes.forEach(recipe => {
    if (!recipe) return;

    const ingredients = JSON.parse(recipe.ingredients);
    const pricePerServing = (recipe.estimatedPrice / recipe.servings).toFixed(2);

    console.log(`\n📋 ${recipe.title.toUpperCase()}`);
    console.log(`   Catégorie: ${recipe.category} | Difficulté: ${recipe.difficulty}`);
    console.log(`   Prix total: ${recipe.estimatedPrice}€ | Portions: ${recipe.servings}`);
    console.log(`   Prix/portion: ${pricePerServing}€`);
    console.log(`   Temps de cuisson: ${recipe.cookingTime} min`);
    console.log(`   Ingrédients (${ingredients.length}):`);
    ingredients.forEach((ing, idx) => {
      console.log(`      ${idx + 1}. ${ing.name}: ${ing.quantity}`);
    });
  });

  // Vérification des incohérences potentielles
  console.log('\n\n⚠️  VÉRIFICATION DES INCOHÉRENCES:\n');
  console.log('='.repeat(70));

  let issues = 0;

  // Prix trop bas pour des ingrédients chers
  const luxuryIngredients = ['saumon', 'veau', 'canard', 'mascarpone'];
  recipes.forEach(r => {
    const ingredients = JSON.parse(r.ingredients);
    const hasLuxury = ingredients.some(ing =>
      luxuryIngredients.some(lux => ing.name.toLowerCase().includes(lux))
    );

    if (hasLuxury && r.estimatedPrice < 10) {
      console.log(`   ⚠️  ${r.title}: ${r.estimatedPrice}€ semble bas pour des ingrédients premium`);
      issues++;
    }
  });

  // Portions incohérentes
  recipes.forEach(r => {
    if (r.servings > 10) {
      console.log(`   ⚠️  ${r.title}: ${r.servings} portions semble élevé`);
      issues++;
    }
    if (r.servings < 1) {
      console.log(`   ❌ ${r.title}: ${r.servings} portions invalide!`);
      issues++;
    }
  });

  // Prix/portion anormalement élevé ou bas
  recipes.forEach(r => {
    const pricePerServing = r.estimatedPrice / r.servings;
    if (pricePerServing < 1) {
      console.log(`   ⚠️  ${r.title}: ${pricePerServing.toFixed(2)}€/portion très économique`);
      issues++;
    }
    if (pricePerServing > 10) {
      console.log(`   ⚠️  ${r.title}: ${pricePerServing.toFixed(2)}€/portion très cher`);
      issues++;
    }
  });

  if (issues === 0) {
    console.log('   ✅ Aucune incohérence majeure détectée!');
  } else {
    console.log(`\n   Total: ${issues} points à vérifier`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Analyse terminée!\n');
}

analyzeRecipes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
