/**
 * Script de seed pour ajouter des recettes dans la base de données
 * Usage: node prisma/seed-recipes.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const recipes = [
  {
    title: 'Pâtes Carbonara',
    description: 'Recette authentique italienne crémeuse et savoureuse',
    cookingTime: 20,
    servings: 4,
    difficulty: 'easy',
    category: 'italian',
    estimatedPrice: 6.5,
    ingredients: JSON.stringify([
      { name: 'Spaghetti', quantity: '400g' },
      { name: 'Lardons', quantity: '200g' },
      { name: 'Œufs', quantity: '4' },
      { name: 'Parmesan râpé', quantity: '100g' },
      { name: 'Poivre noir', quantity: '1 cuillère à café' }
    ]),
    instructions: JSON.stringify([
      'Cuire les pâtes al dente dans une grande casserole d\'eau salée',
      'Faire revenir les lardons dans une poêle',
      'Battre les œufs avec le parmesan',
      'Égoutter les pâtes et les mélanger avec les lardons',
      'Retirer du feu et ajouter le mélange œufs-parmesan',
      'Mélanger rapidement et servir avec du poivre'
    ]),
    tags: 'pâtes,italien,rapide,crémeux',
    nutritionalInfo: JSON.stringify({
      calories: 520,
      protein: 28,
      carbs: 55,
      fat: 22
    }),
    popularityScore: 0
  },
  {
    title: 'Poulet Rôti aux Herbes',
    description: 'Poulet tendre et juteux avec des herbes de Provence',
    cookingTime: 60,
    servings: 4,
    difficulty: 'easy',
    category: 'french',
    estimatedPrice: 8.0,
    ingredients: JSON.stringify([
      { name: 'Poulet entier', quantity: '1.5kg' },
      { name: 'Herbes de Provence', quantity: '2 cuillères à soupe' },
      { name: 'Beurre', quantity: '50g' },
      { name: 'Citron', quantity: '1' },
      { name: 'Ail', quantity: '4 gousses' }
    ]),
    instructions: JSON.stringify([
      'Préchauffer le four à 200°C',
      'Mélanger le beurre avec les herbes',
      'Badigeonner le poulet avec le beurre aux herbes',
      'Insérer le citron et l\'ail dans la cavité',
      'Rôtir pendant 1h en arrosant régulièrement',
      'Laisser reposer 10 min avant de découper'
    ]),
    tags: 'poulet,four,français,dimanche',
    nutritionalInfo: JSON.stringify({
      calories: 420,
      protein: 42,
      carbs: 2,
      fat: 26
    }),
    popularityScore: 0
  },
  {
    title: 'Salade César',
    description: 'Salade croquante avec poulet grillé et parmesan',
    cookingTime: 15,
    servings: 2,
    difficulty: 'easy',
    category: 'salad',
    estimatedPrice: 7.0,
    ingredients: JSON.stringify([
      { name: 'Laitue romaine', quantity: '1' },
      { name: 'Poulet grillé', quantity: '200g' },
      { name: 'Parmesan', quantity: '50g' },
      { name: 'Croûtons', quantity: '100g' },
      { name: 'Sauce César', quantity: '100ml' }
    ]),
    instructions: JSON.stringify([
      'Laver et couper la laitue',
      'Couper le poulet en lamelles',
      'Mélanger la laitue avec la sauce',
      'Ajouter le poulet et les croûtons',
      'Parsemer de parmesan râpé',
      'Servir immédiatement'
    ]),
    tags: 'salade,léger,rapide,été',
    nutritionalInfo: JSON.stringify({
      calories: 380,
      protein: 32,
      carbs: 18,
      fat: 22
    }),
    popularityScore: 0
  },
  {
    title: 'Curry de Légumes',
    description: 'Curry végétarien épicé et savoureux',
    cookingTime: 35,
    servings: 4,
    difficulty: 'easy',
    category: 'vegetarian',
    estimatedPrice: 5.5,
    ingredients: JSON.stringify([
      { name: 'Pommes de terre', quantity: '3' },
      { name: 'Carottes', quantity: '2' },
      { name: 'Pois chiches', quantity: '400g (boîte)' },
      { name: 'Lait de coco', quantity: '400ml' },
      { name: 'Pâte de curry', quantity: '2 cuillères à soupe' }
    ]),
    instructions: JSON.stringify([
      'Couper les légumes en cubes',
      'Faire revenir la pâte de curry',
      'Ajouter les légumes et faire revenir 5 min',
      'Verser le lait de coco et les pois chiches',
      'Laisser mijoter 25 min',
      'Servir avec du riz basmati'
    ]),
    tags: 'végétarien,curry,indien,épicé',
    nutritionalInfo: JSON.stringify({
      calories: 320,
      protein: 12,
      carbs: 42,
      fat: 12
    }),
    popularityScore: 0
  },
  {
    title: 'Saumon Teriyaki',
    description: 'Filets de saumon glacés avec sauce teriyaki maison',
    cookingTime: 25,
    servings: 2,
    difficulty: 'intermediate',
    category: 'japanese',
    estimatedPrice: 12.0,
    ingredients: JSON.stringify([
      { name: 'Filets de saumon', quantity: '2 (150g chacun)' },
      { name: 'Sauce soja', quantity: '4 cuillères à soupe' },
      { name: 'Mirin', quantity: '2 cuillères à soupe' },
      { name: 'Sucre', quantity: '1 cuillère à soupe' },
      { name: 'Gingembre frais', quantity: '1 morceau' }
    ]),
    instructions: JSON.stringify([
      'Mélanger sauce soja, mirin, sucre et gingembre râpé',
      'Faire mariner le saumon 15 min',
      'Chauffer une poêle à feu moyen-vif',
      'Cuire le saumon 4 min de chaque côté',
      'Glacer avec la marinade',
      'Servir avec riz et légumes vapeur'
    ]),
    tags: 'poisson,japonais,teriyaki,santé',
    nutritionalInfo: JSON.stringify({
      calories: 380,
      protein: 35,
      carbs: 12,
      fat: 20
    }),
    popularityScore: 0
  },
  {
    title: 'Tacos au Poulet',
    description: 'Tacos épicés garnis de poulet mariné et légumes frais',
    cookingTime: 30,
    servings: 4,
    difficulty: 'easy',
    category: 'mexican',
    estimatedPrice: 9.0,
    ingredients: JSON.stringify([
      { name: 'Tortillas', quantity: '8' },
      { name: 'Blanc de poulet', quantity: '400g' },
      { name: 'Épices à tacos', quantity: '2 cuillères à soupe' },
      { name: 'Tomates', quantity: '2' },
      { name: 'Avocat', quantity: '2' },
      { name: 'Crème fraîche', quantity: '100ml' }
    ]),
    instructions: JSON.stringify([
      'Couper le poulet en lamelles',
      'Faire mariner avec les épices 10 min',
      'Faire cuire le poulet à la poêle',
      'Couper tomates et avocats',
      'Réchauffer les tortillas',
      'Garnir et servir avec crème fraîche'
    ]),
    tags: 'mexicain,tacos,poulet,épicé',
    nutritionalInfo: JSON.stringify({
      calories: 450,
      protein: 28,
      carbs: 38,
      fat: 22
    }),
    popularityScore: 0
  },
  {
    title: 'Risotto aux Champignons',
    description: 'Risotto crémeux avec champignons de Paris et parmesan',
    cookingTime: 40,
    servings: 4,
    difficulty: 'intermediate',
    category: 'italian',
    estimatedPrice: 7.5,
    ingredients: JSON.stringify([
      { name: 'Riz arborio', quantity: '300g' },
      { name: 'Champignons', quantity: '300g' },
      { name: 'Bouillon de légumes', quantity: '1L' },
      { name: 'Vin blanc', quantity: '100ml' },
      { name: 'Parmesan', quantity: '80g' },
      { name: 'Beurre', quantity: '50g' }
    ]),
    instructions: JSON.stringify([
      'Faire revenir les champignons émincés',
      'Ajouter le riz et nacrer 2 min',
      'Déglacer au vin blanc',
      'Ajouter le bouillon louche par louche',
      'Remuer constamment pendant 20 min',
      'Incorporer beurre et parmesan hors du feu'
    ]),
    tags: 'risotto,italien,champignons,crémeux',
    nutritionalInfo: JSON.stringify({
      calories: 420,
      protein: 12,
      carbs: 62,
      fat: 14
    }),
    popularityScore: 0
  },
  {
    title: 'Burger Maison',
    description: 'Burger juteux avec steak haché, cheddar et légumes frais',
    cookingTime: 25,
    servings: 4,
    difficulty: 'easy',
    category: 'american',
    estimatedPrice: 10.0,
    ingredients: JSON.stringify([
      { name: 'Pains à burger', quantity: '4' },
      { name: 'Steak haché', quantity: '600g' },
      { name: 'Cheddar', quantity: '4 tranches' },
      { name: 'Tomates', quantity: '2' },
      { name: 'Salade', quantity: '4 feuilles' },
      { name: 'Oignons', quantity: '1' }
    ]),
    instructions: JSON.stringify([
      'Former 4 steaks avec la viande hachée',
      'Assaisonner généreusement',
      'Cuire les steaks 3-4 min de chaque côté',
      'Ajouter le cheddar en fin de cuisson',
      'Toaster légèrement les pains',
      'Assembler avec salade, tomate, oignons'
    ]),
    tags: 'burger,américain,viande,rapide',
    nutritionalInfo: JSON.stringify({
      calories: 580,
      protein: 38,
      carbs: 42,
      fat: 28
    }),
    popularityScore: 0
  },
  {
    title: 'Quiche Lorraine',
    description: 'Quiche classique avec lardons et crème fraîche',
    cookingTime: 45,
    servings: 6,
    difficulty: 'easy',
    category: 'french',
    estimatedPrice: 8.5,
    ingredients: JSON.stringify([
      { name: 'Pâte brisée', quantity: '1' },
      { name: 'Lardons', quantity: '200g' },
      { name: 'Œufs', quantity: '4' },
      { name: 'Crème fraîche', quantity: '200ml' },
      { name: 'Gruyère râpé', quantity: '100g' }
    ]),
    instructions: JSON.stringify([
      'Préchauffer le four à 180°C',
      'Étaler la pâte dans un moule',
      'Faire revenir les lardons',
      'Battre œufs et crème, ajouter gruyère',
      'Disposer lardons sur la pâte',
      'Verser le mélange et cuire 35 min'
    ]),
    tags: 'quiche,français,œufs,four',
    nutritionalInfo: JSON.stringify({
      calories: 420,
      protein: 18,
      carbs: 24,
      fat: 28
    }),
    popularityScore: 0
  },
  {
    title: 'Pad Thaï aux Crevettes',
    description: 'Nouilles sautées thaïlandaises sucrées-salées',
    cookingTime: 30,
    servings: 2,
    difficulty: 'intermediate',
    category: 'thai',
    estimatedPrice: 11.0,
    ingredients: JSON.stringify([
      { name: 'Nouilles de riz', quantity: '200g' },
      { name: 'Crevettes', quantity: '250g' },
      { name: 'Sauce tamarin', quantity: '3 cuillères à soupe' },
      { name: 'Cacahuètes', quantity: '50g' },
      { name: 'Œufs', quantity: '2' },
      { name: 'Pousses de soja', quantity: '100g' }
    ]),
    instructions: JSON.stringify([
      'Faire tremper les nouilles 30 min',
      'Faire sauter les crevettes',
      'Pousser sur le côté, brouiller les œufs',
      'Ajouter nouilles égouttées',
      'Incorporer sauce tamarin',
      'Garnir de cacahuètes et pousses de soja'
    ]),
    tags: 'thaï,nouilles,crevettes,asiatique',
    nutritionalInfo: JSON.stringify({
      calories: 520,
      protein: 32,
      carbs: 58,
      fat: 18
    }),
    popularityScore: 0
  },
  {
    title: 'Soupe Minestrone',
    description: 'Soupe italienne aux légumes et pâtes',
    cookingTime: 40,
    servings: 6,
    difficulty: 'easy',
    category: 'italian',
    estimatedPrice: 6.0,
    ingredients: JSON.stringify([
      { name: 'Légumes variés', quantity: '500g' },
      { name: 'Haricots blancs', quantity: '200g (boîte)' },
      { name: 'Tomates concassées', quantity: '400g (boîte)' },
      { name: 'Petites pâtes', quantity: '100g' },
      { name: 'Bouillon de légumes', quantity: '1.5L' }
    ]),
    instructions: JSON.stringify([
      'Couper tous les légumes en dés',
      'Faire revenir dans un peu d\'huile',
      'Ajouter tomates et bouillon',
      'Laisser mijoter 25 min',
      'Ajouter pâtes et haricots',
      'Cuire 10 min et servir avec parmesan'
    ]),
    tags: 'soupe,italien,végétarien,santé',
    nutritionalInfo: JSON.stringify({
      calories: 180,
      protein: 8,
      carbs: 32,
      fat: 3
    }),
    popularityScore: 0
  },
  {
    title: 'Omelette aux Fines Herbes',
    description: 'Omelette française baveuse aux herbes fraîches',
    cookingTime: 10,
    servings: 1,
    difficulty: 'easy',
    category: 'french',
    estimatedPrice: 2.5,
    ingredients: JSON.stringify([
      { name: 'Œufs', quantity: '3' },
      { name: 'Beurre', quantity: '20g' },
      { name: 'Ciboulette', quantity: '1 cuillère à soupe' },
      { name: 'Persil', quantity: '1 cuillère à soupe' },
      { name: 'Crème fraîche', quantity: '1 cuillère à soupe' }
    ]),
    instructions: JSON.stringify([
      'Battre les œufs avec la crème',
      'Hacher finement les herbes',
      'Faire fondre le beurre dans une poêle',
      'Verser les œufs et cuire à feu doux',
      'Parsemer d\'herbes',
      'Plier et servir immédiatement'
    ]),
    tags: 'omelette,français,rapide,petit-déjeuner',
    nutritionalInfo: JSON.stringify({
      calories: 280,
      protein: 18,
      carbs: 2,
      fat: 22
    }),
    popularityScore: 0
  }
];

async function main() {
  console.log('🌱 Seeding recipes...');

  let created = 0;
  let skipped = 0;

  for (const recipe of recipes) {
    try {
      // Check if recipe already exists
      const existing = await prisma.recipe.findFirst({
        where: { title: recipe.title }
      });

      if (existing) {
        console.log(`⏭️  Recipe "${recipe.title}" already exists, skipping...`);
        skipped++;
        continue;
      }

      await prisma.recipe.create({
        data: recipe
      });

      console.log(`✅ Created recipe: ${recipe.title}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating recipe "${recipe.title}":`, error.message);
    }
  }

  console.log(`\n✨ Seeding completed!`);
  console.log(`   📝 ${created} recipes created`);
  console.log(`   ⏭️  ${skipped} recipes skipped (already exist)`);
  console.log(`   📊 Total in database: ${created + skipped} recipes\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
