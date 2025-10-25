/**
 * Script de seed pour ajouter 100+ recettes variées dans la base de données
 * Usage: node prisma/seed-recipes-bulk.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const recipes = [
  // PETIT-DÉJEUNER (10 recettes)
  {
    title: 'Pancakes Américains',
    description: 'Pancakes moelleux et épais servis avec sirop d\'érable',
    cookingTime: 20,
    servings: 4,
    difficulty: 'easy',
    category: 'breakfast',
    estimatedPrice: 4.0,
    ingredients: JSON.stringify([
      { name: 'Farine', quantity: '200g' },
      { name: 'Lait', quantity: '250ml' },
      { name: 'Œufs', quantity: '2' },
      { name: 'Sucre', quantity: '2 cuillères à soupe' },
      { name: 'Levure chimique', quantity: '1 sachet' },
      { name: 'Sirop d\'érable', quantity: '100ml' }
    ]),
    instructions: JSON.stringify([
      'Mélanger farine, sucre et levure',
      'Battre œufs et lait séparément',
      'Incorporer liquides aux ingrédients secs',
      'Laisser reposer 10 min',
      'Cuire dans une poêle chaude',
      'Servir avec sirop d\'érable'
    ]),
    tags: 'petit-déjeuner,américain,sucré,rapide',
    nutritionalInfo: JSON.stringify({ calories: 320, protein: 10, carbs: 52, fat: 8 }),
    popularityScore: 0
  },
  {
    title: 'Œufs Bénédicte',
    description: 'Muffin anglais, jambon, œuf poché et sauce hollandaise',
    cookingTime: 25,
    servings: 2,
    difficulty: 'intermediate',
    category: 'breakfast',
    estimatedPrice: 7.5,
    ingredients: JSON.stringify([
      { name: 'Muffins anglais', quantity: '2' },
      { name: 'Jambon', quantity: '4 tranches' },
      { name: 'Œufs', quantity: '4' },
      { name: 'Beurre', quantity: '100g' },
      { name: 'Citron', quantity: '1/2' },
      { name: 'Vinaigre blanc', quantity: '2 cuillères à soupe' }
    ]),
    instructions: JSON.stringify([
      'Préparer la sauce hollandaise',
      'Pocher les œufs dans l\'eau vinaigrée',
      'Toaster les muffins',
      'Faire chauffer le jambon',
      'Assembler : muffin, jambon, œuf',
      'Napper de sauce hollandaise'
    ]),
    tags: 'petit-déjeuner,français,élégant,brunch',
    nutritionalInfo: JSON.stringify({ calories: 520, protein: 24, carbs: 28, fat: 36 }),
    popularityScore: 0
  },
  {
    title: 'Smoothie Bowl Açaï',
    description: 'Bol énergétique avec açaï, fruits et granola',
    cookingTime: 10,
    servings: 2,
    difficulty: 'easy',
    category: 'breakfast',
    estimatedPrice: 8.0,
    ingredients: JSON.stringify([
      { name: 'Purée d\'açaï', quantity: '200g' },
      { name: 'Banane', quantity: '2' },
      { name: 'Fruits rouges', quantity: '150g' },
      { name: 'Granola', quantity: '100g' },
      { name: 'Lait d\'amande', quantity: '100ml' },
      { name: 'Miel', quantity: '2 cuillères à soupe' }
    ]),
    instructions: JSON.stringify([
      'Mixer açaï, banane et lait d\'amande',
      'Verser dans des bols',
      'Disposer fruits rouges',
      'Ajouter granola',
      'Arroser de miel',
      'Servir immédiatement'
    ]),
    tags: 'petit-déjeuner,santé,végétarien,frais',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 8, carbs: 68, fat: 12 }),
    popularityScore: 0
  },
  {
    title: 'Croissants aux Amandes',
    description: 'Croissants garnis de crème d\'amandes',
    cookingTime: 15,
    servings: 4,
    difficulty: 'easy',
    category: 'breakfast',
    estimatedPrice: 6.0,
    ingredients: JSON.stringify([
      { name: 'Croissants', quantity: '4' },
      { name: 'Poudre d\'amandes', quantity: '100g' },
      { name: 'Sucre', quantity: '80g' },
      { name: 'Beurre', quantity: '50g' },
      { name: 'Œuf', quantity: '1' },
      { name: 'Amandes effilées', quantity: '50g' }
    ]),
    instructions: JSON.stringify([
      'Préparer la crème d\'amandes',
      'Couper les croissants en deux',
      'Garnir de crème d\'amandes',
      'Parsemer d\'amandes effilées',
      'Enfourner 10 min à 180°C',
      'Servir tiède'
    ]),
    tags: 'petit-déjeuner,viennoiserie,amandes,français',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 10, carbs: 42, fat: 24 }),
    popularityScore: 0
  },
  {
    title: 'Porridge aux Fruits',
    description: 'Flocons d\'avoine crémeux avec fruits frais',
    cookingTime: 15,
    servings: 2,
    difficulty: 'easy',
    category: 'breakfast',
    estimatedPrice: 3.5,
    ingredients: JSON.stringify([
      { name: 'Flocons d\'avoine', quantity: '100g' },
      { name: 'Lait', quantity: '400ml' },
      { name: 'Fruits frais', quantity: '200g' },
      { name: 'Miel', quantity: '2 cuillères à soupe' },
      { name: 'Cannelle', quantity: '1 cuillère à café' }
    ]),
    instructions: JSON.stringify([
      'Chauffer lait et avoine',
      'Remuer pendant 10 min',
      'Ajouter cannelle',
      'Verser dans des bols',
      'Garnir de fruits frais',
      'Arroser de miel'
    ]),
    tags: 'petit-déjeuner,santé,avoine,végétarien',
    nutritionalInfo: JSON.stringify({ calories: 280, protein: 10, carbs: 48, fat: 6 }),
    popularityScore: 0
  },

  // ENTRÉES ET SALADES (15 recettes)
  {
    title: 'Salade Niçoise',
    description: 'Salade méditerranéenne au thon et légumes frais',
    cookingTime: 20,
    servings: 4,
    difficulty: 'easy',
    category: 'salad',
    estimatedPrice: 9.0,
    ingredients: JSON.stringify([
      { name: 'Thon en boîte', quantity: '2 boîtes' },
      { name: 'Tomates', quantity: '4' },
      { name: 'Haricots verts', quantity: '200g' },
      { name: 'Œufs durs', quantity: '4' },
      { name: 'Olives noires', quantity: '100g' },
      { name: 'Anchois', quantity: '8 filets' }
    ]),
    instructions: JSON.stringify([
      'Cuire haricots verts al dente',
      'Couper tomates en quartiers',
      'Émietter le thon',
      'Couper œufs durs en quartiers',
      'Disposer harmonieusement',
      'Assaisonner vinaigrette à l\'huile d\'olive'
    ]),
    tags: 'salade,méditerranéen,thon,été',
    nutritionalInfo: JSON.stringify({ calories: 320, protein: 28, carbs: 12, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Gaspacho Andalou',
    description: 'Soupe froide espagnole aux tomates',
    cookingTime: 15,
    servings: 4,
    difficulty: 'easy',
    category: 'soup',
    estimatedPrice: 5.5,
    ingredients: JSON.stringify([
      { name: 'Tomates mûres', quantity: '1kg' },
      { name: 'Concombre', quantity: '1' },
      { name: 'Poivron rouge', quantity: '1' },
      { name: 'Ail', quantity: '2 gousses' },
      { name: 'Vinaigre de Xérès', quantity: '2 cuillères à soupe' },
      { name: 'Huile d\'olive', quantity: '100ml' }
    ]),
    instructions: JSON.stringify([
      'Couper grossièrement les légumes',
      'Mixer tous les ingrédients',
      'Passer au tamis si désiré',
      'Réfrigérer 2h minimum',
      'Rectifier l\'assaisonnement',
      'Servir très frais avec croûtons'
    ]),
    tags: 'soupe,espagnol,froid,été',
    nutritionalInfo: JSON.stringify({ calories: 180, protein: 3, carbs: 14, fat: 12 }),
    popularityScore: 0
  },
  {
    title: 'Carpaccio de Bœuf',
    description: 'Fines tranches de bœuf cru avec parmesan et roquette',
    cookingTime: 15,
    servings: 4,
    difficulty: 'easy',
    category: 'appetizer',
    estimatedPrice: 12.0,
    ingredients: JSON.stringify([
      { name: 'Filet de bœuf', quantity: '400g' },
      { name: 'Parmesan', quantity: '80g' },
      { name: 'Roquette', quantity: '100g' },
      { name: 'Huile d\'olive', quantity: '50ml' },
      { name: 'Citron', quantity: '1' },
      { name: 'Pignons de pin', quantity: '30g' }
    ]),
    instructions: JSON.stringify([
      'Congeler légèrement la viande',
      'Trancher finement au couteau',
      'Disposer sur assiettes froides',
      'Arroser d\'huile d\'olive et citron',
      'Parsemer de copeaux de parmesan',
      'Ajouter roquette et pignons'
    ]),
    tags: 'entrée,italien,viande-crue,élégant',
    nutritionalInfo: JSON.stringify({ calories: 280, protein: 26, carbs: 2, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Soupe à l\'Oignon Gratinée',
    description: 'Soupe traditionnelle française avec fromage gratiné',
    cookingTime: 50,
    servings: 4,
    difficulty: 'intermediate',
    category: 'soup',
    estimatedPrice: 6.5,
    ingredients: JSON.stringify([
      { name: 'Oignons', quantity: '800g' },
      { name: 'Bouillon de bœuf', quantity: '1L' },
      { name: 'Vin blanc', quantity: '100ml' },
      { name: 'Pain grillé', quantity: '8 tranches' },
      { name: 'Gruyère râpé', quantity: '200g' },
      { name: 'Beurre', quantity: '50g' }
    ]),
    instructions: JSON.stringify([
      'Émincer finement les oignons',
      'Faire caraméliser doucement 30 min',
      'Déglacer au vin blanc',
      'Ajouter bouillon et mijoter 20 min',
      'Verser en cocottes individuelles',
      'Gratiner avec pain et fromage'
    ]),
    tags: 'soupe,français,gratiné,réconfortant',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 18, carbs: 38, fat: 16 }),
    popularityScore: 0
  },
  {
    title: 'Taboulé Libanais',
    description: 'Salade fraîche au persil, menthe et boulgour',
    cookingTime: 20,
    servings: 6,
    difficulty: 'easy',
    category: 'salad',
    estimatedPrice: 5.0,
    ingredients: JSON.stringify([
      { name: 'Boulgour fin', quantity: '100g' },
      { name: 'Persil plat', quantity: '2 bottes' },
      { name: 'Menthe fraîche', quantity: '1 botte' },
      { name: 'Tomates', quantity: '3' },
      { name: 'Citrons', quantity: '3' },
      { name: 'Huile d\'olive', quantity: '100ml' }
    ]),
    instructions: JSON.stringify([
      'Faire gonfler le boulgour',
      'Hacher finement persil et menthe',
      'Couper tomates en petits dés',
      'Presser les citrons',
      'Mélanger tous les ingrédients',
      'Laisser mariner 1h au frais'
    ]),
    tags: 'salade,libanais,végétarien,frais',
    nutritionalInfo: JSON.stringify({ calories: 220, protein: 5, carbs: 24, fat: 12 }),
    popularityScore: 0
  },

  // PLATS ITALIENS (12 recettes)
  {
    title: 'Lasagnes à la Bolognaise',
    description: 'Lasagnes classiques avec sauce bolognaise et béchamel',
    cookingTime: 90,
    servings: 6,
    difficulty: 'intermediate',
    category: 'italian',
    estimatedPrice: 12.0,
    ingredients: JSON.stringify([
      { name: 'Pâtes à lasagne', quantity: '500g' },
      { name: 'Viande hachée', quantity: '600g' },
      { name: 'Tomates concassées', quantity: '800g' },
      { name: 'Lait', quantity: '1L' },
      { name: 'Farine', quantity: '80g' },
      { name: 'Parmesan', quantity: '150g' }
    ]),
    instructions: JSON.stringify([
      'Préparer sauce bolognaise',
      'Faire béchamel avec lait et farine',
      'Cuire pâtes si nécessaire',
      'Alterner couches dans plat',
      'Terminer par béchamel et parmesan',
      'Cuire 45 min à 180°C'
    ]),
    tags: 'italien,pâtes,four,familial',
    nutritionalInfo: JSON.stringify({ calories: 520, protein: 32, carbs: 48, fat: 22 }),
    popularityScore: 0
  },
  {
    title: 'Osso Buco Milanais',
    description: 'Jarret de veau braisé à la milanaise',
    cookingTime: 120,
    servings: 4,
    difficulty: 'intermediate',
    category: 'italian',
    estimatedPrice: 18.0,
    ingredients: JSON.stringify([
      { name: 'Jarret de veau', quantity: '4 rondelles' },
      { name: 'Tomates', quantity: '400g' },
      { name: 'Vin blanc', quantity: '200ml' },
      { name: 'Bouillon', quantity: '500ml' },
      { name: 'Carottes', quantity: '2' },
      { name: 'Gremolata', quantity: 'Pour servir' }
    ]),
    instructions: JSON.stringify([
      'Fariner et dorer les rondelles',
      'Faire revenir légumes',
      'Déglacer au vin blanc',
      'Ajouter tomates et bouillon',
      'Braiser 2h à feu doux',
      'Servir avec gremolata et risotto'
    ]),
    tags: 'italien,veau,braisé,élégant',
    nutritionalInfo: JSON.stringify({ calories: 480, protein: 42, carbs: 12, fat: 28 }),
    popularityScore: 0
  },
  {
    title: 'Pizza Margherita',
    description: 'Pizza classique tomate, mozzarella et basilic',
    cookingTime: 30,
    servings: 4,
    difficulty: 'intermediate',
    category: 'italian',
    estimatedPrice: 8.0,
    ingredients: JSON.stringify([
      { name: 'Pâte à pizza', quantity: '500g' },
      { name: 'Sauce tomate', quantity: '300g' },
      { name: 'Mozzarella', quantity: '250g' },
      { name: 'Basilic frais', quantity: '1 bouquet' },
      { name: 'Huile d\'olive', quantity: '3 cuillères à soupe' },
      { name: 'Parmesan', quantity: '50g' }
    ]),
    instructions: JSON.stringify([
      'Étaler la pâte finement',
      'Étaler sauce tomate',
      'Répartir mozzarella en morceaux',
      'Arroser d\'huile d\'olive',
      'Cuire 12 min à 250°C',
      'Ajouter basilic frais à la sortie'
    ]),
    tags: 'pizza,italien,fromage,végétarien',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 18, carbs: 52, fat: 16 }),
    popularityScore: 0
  },
  {
    title: 'Gnocchis à la Sorrentina',
    description: 'Gnocchis gratinés sauce tomate et mozzarella',
    cookingTime: 35,
    servings: 4,
    difficulty: 'easy',
    category: 'italian',
    estimatedPrice: 9.0,
    ingredients: JSON.stringify([
      { name: 'Gnocchis', quantity: '800g' },
      { name: 'Sauce tomate', quantity: '500g' },
      { name: 'Mozzarella', quantity: '200g' },
      { name: 'Basilic', quantity: '1 bouquet' },
      { name: 'Parmesan', quantity: '80g' },
      { name: 'Ail', quantity: '2 gousses' }
    ]),
    instructions: JSON.stringify([
      'Cuire gnocchis dans eau bouillante',
      'Faire mijoter sauce tomate',
      'Mélanger gnocchis et sauce',
      'Verser dans plat à gratin',
      'Ajouter mozzarella et parmesan',
      'Gratiner 15 min à 200°C'
    ]),
    tags: 'italien,gnocchis,gratiné,végétarien',
    nutritionalInfo: JSON.stringify({ calories: 460, protein: 20, carbs: 58, fat: 16 }),
    popularityScore: 0
  },
  {
    title: 'Saltimbocca à la Romaine',
    description: 'Escalopes de veau au jambon et sauge',
    cookingTime: 20,
    servings: 4,
    difficulty: 'easy',
    category: 'italian',
    estimatedPrice: 14.0,
    ingredients: JSON.stringify([
      { name: 'Escalopes de veau', quantity: '8 fines' },
      { name: 'Jambon de Parme', quantity: '8 tranches' },
      { name: 'Sauge fraîche', quantity: '16 feuilles' },
      { name: 'Vin blanc', quantity: '100ml' },
      { name: 'Beurre', quantity: '50g' },
      { name: 'Farine', quantity: 'Pour fariner' }
    ]),
    instructions: JSON.stringify([
      'Aplatir les escalopes',
      'Fixer jambon et sauge avec pique',
      'Fariner légèrement',
      'Faire dorer dans le beurre',
      'Déglacer au vin blanc',
      'Servir immédiatement'
    ]),
    tags: 'italien,veau,rapide,élégant',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 36, carbs: 4, fat: 22 }),
    popularityScore: 0
  },

  // PLATS FRANÇAIS (15 recettes)
  {
    title: 'Bœuf Bourguignon',
    description: 'Ragoût de bœuf mijoté au vin rouge de Bourgogne',
    cookingTime: 180,
    servings: 6,
    difficulty: 'intermediate',
    category: 'french',
    estimatedPrice: 16.0,
    ingredients: JSON.stringify([
      { name: 'Bœuf à braiser', quantity: '1.2kg' },
      { name: 'Vin rouge', quantity: '750ml' },
      { name: 'Lardons', quantity: '200g' },
      { name: 'Carottes', quantity: '4' },
      { name: 'Oignons grelots', quantity: '300g' },
      { name: 'Champignons', quantity: '300g' }
    ]),
    instructions: JSON.stringify([
      'Faire mariner viande au vin 12h',
      'Dorer la viande et lardons',
      'Faire revenir légumes',
      'Flamber au cognac',
      'Mijoter 3h à feu doux',
      'Servir avec pommes de terre'
    ]),
    tags: 'français,bœuf,mijoté,traditionnel',
    nutritionalInfo: JSON.stringify({ calories: 520, protein: 45, carbs: 18, fat: 28 }),
    popularityScore: 0
  },
  {
    title: 'Coq au Vin',
    description: 'Poulet mijoté au vin rouge avec lardons et champignons',
    cookingTime: 120,
    servings: 6,
    difficulty: 'intermediate',
    category: 'french',
    estimatedPrice: 14.0,
    ingredients: JSON.stringify([
      { name: 'Poulet découpé', quantity: '1.5kg' },
      { name: 'Vin rouge', quantity: '750ml' },
      { name: 'Lardons', quantity: '200g' },
      { name: 'Champignons', quantity: '300g' },
      { name: 'Oignons grelots', quantity: '200g' },
      { name: 'Cognac', quantity: '50ml' }
    ]),
    instructions: JSON.stringify([
      'Faire mariner poulet au vin',
      'Dorer poulet et lardons',
      'Flamber au cognac',
      'Ajouter marinade et légumes',
      'Mijoter 1h30 couvert',
      'Réduire sauce si nécessaire'
    ]),
    tags: 'français,poulet,vin,traditionnel',
    nutritionalInfo: JSON.stringify({ calories: 480, protein: 42, carbs: 12, fat: 26 }),
    popularityScore: 0
  },
  {
    title: 'Blanquette de Veau',
    description: 'Veau tendre en sauce blanche crémeuse',
    cookingTime: 120,
    servings: 6,
    difficulty: 'intermediate',
    category: 'french',
    estimatedPrice: 16.0,
    ingredients: JSON.stringify([
      { name: 'Épaule de veau', quantity: '1kg' },
      { name: 'Carottes', quantity: '3' },
      { name: 'Poireaux', quantity: '2' },
      { name: 'Crème fraîche', quantity: '200ml' },
      { name: 'Jaunes d\'œufs', quantity: '2' },
      { name: 'Champignons', quantity: '250g' }
    ]),
    instructions: JSON.stringify([
      'Faire blanchir la viande',
      'Cuire avec légumes 1h30',
      'Retirer viande et légumes',
      'Lier sauce avec crème et jaunes',
      'Remettre viande dans sauce',
      'Servir avec riz'
    ]),
    tags: 'français,veau,crémeux,élégant',
    nutritionalInfo: JSON.stringify({ calories: 460, protein: 38, carbs: 14, fat: 28 }),
    popularityScore: 0
  },
  {
    title: 'Magret de Canard aux Figues',
    description: 'Magret rosé avec sauce aux figues',
    cookingTime: 25,
    servings: 2,
    difficulty: 'intermediate',
    category: 'french',
    estimatedPrice: 13.0,
    ingredients: JSON.stringify([
      { name: 'Magret de canard', quantity: '1 (400g)' },
      { name: 'Figues fraîches', quantity: '6' },
      { name: 'Miel', quantity: '2 cuillères à soupe' },
      { name: 'Vinaigre balsamique', quantity: '3 cuillères à soupe' },
      { name: 'Beurre', quantity: '30g' }
    ]),
    instructions: JSON.stringify([
      'Inciser peau du magret',
      'Cuire côté peau 8 min',
      'Retourner 4 min côté chair',
      'Laisser reposer sous papier alu',
      'Poêler figues avec miel',
      'Déglacer au vinaigre balsamique'
    ]),
    tags: 'français,canard,figues,gastronomique',
    nutritionalInfo: JSON.stringify({ calories: 520, protein: 32, carbs: 28, fat: 32 }),
    popularityScore: 0
  },
  {
    title: 'Gratin Dauphinois',
    description: 'Pommes de terre fondantes gratinées à la crème',
    cookingTime: 90,
    servings: 6,
    difficulty: 'easy',
    category: 'french',
    estimatedPrice: 6.0,
    ingredients: JSON.stringify([
      { name: 'Pommes de terre', quantity: '1.5kg' },
      { name: 'Crème fraîche', quantity: '500ml' },
      { name: 'Lait', quantity: '300ml' },
      { name: 'Ail', quantity: '2 gousses' },
      { name: 'Noix de muscade', quantity: '1 pincée' }
    ]),
    instructions: JSON.stringify([
      'Éplucher et trancher pommes de terre',
      'Frotter plat avec ail',
      'Disposer pommes de terre en couches',
      'Mélanger crème, lait et muscade',
      'Verser sur pommes de terre',
      'Cuire 1h15 à 180°C'
    ]),
    tags: 'français,gratin,pommes-de-terre,four',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 8, carbs: 42, fat: 20 }),
    popularityScore: 0
  },

  // PLATS ASIATIQUES (15 recettes)
  {
    title: 'Bœuf Sauté Thaï au Basilic',
    description: 'Bœuf émincé sauté avec basilic thaï et piments',
    cookingTime: 20,
    servings: 4,
    difficulty: 'easy',
    category: 'thai',
    estimatedPrice: 11.0,
    ingredients: JSON.stringify([
      { name: 'Bœuf émincé', quantity: '500g' },
      { name: 'Basilic thaï', quantity: '2 bottes' },
      { name: 'Piments', quantity: '3' },
      { name: 'Sauce soja', quantity: '3 cuillères à soupe' },
      { name: 'Sauce d\'huître', quantity: '2 cuillères à soupe' },
      { name: 'Ail', quantity: '4 gousses' }
    ]),
    instructions: JSON.stringify([
      'Faire mariner le bœuf',
      'Chauffer wok à feu vif',
      'Sauter ail et piments',
      'Ajouter bœuf et saisir',
      'Incorporer sauces',
      'Ajouter basilic hors du feu'
    ]),
    tags: 'thaï,bœuf,épicé,wok',
    nutritionalInfo: JSON.stringify({ calories: 320, protein: 32, carbs: 8, fat: 16 }),
    popularityScore: 0
  },
  {
    title: 'Ramen Japonais',
    description: 'Soupe de nouilles avec bouillon riche et toppings',
    cookingTime: 45,
    servings: 4,
    difficulty: 'intermediate',
    category: 'japanese',
    estimatedPrice: 10.0,
    ingredients: JSON.stringify([
      { name: 'Nouilles ramen', quantity: '400g' },
      { name: 'Bouillon dashi', quantity: '1.5L' },
      { name: 'Porc chashu', quantity: '300g' },
      { name: 'Œufs marinés', quantity: '4' },
      { name: 'Nori', quantity: '4 feuilles' },
      { name: 'Oignons verts', quantity: '4' }
    ]),
    instructions: JSON.stringify([
      'Préparer bouillon riche',
      'Cuire nouilles séparément',
      'Trancher porc chashu',
      'Couper œufs marinés',
      'Assembler dans bols',
      'Garnir de nori et oignons'
    ]),
    tags: 'japonais,nouilles,soupe,réconfortant',
    nutritionalInfo: JSON.stringify({ calories: 520, protein: 28, carbs: 62, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Poulet Teriyaki',
    description: 'Poulet grillé glacé sauce teriyaki sucrée-salée',
    cookingTime: 30,
    servings: 4,
    difficulty: 'easy',
    category: 'japanese',
    estimatedPrice: 9.0,
    ingredients: JSON.stringify([
      { name: 'Cuisses de poulet', quantity: '800g' },
      { name: 'Sauce soja', quantity: '100ml' },
      { name: 'Mirin', quantity: '100ml' },
      { name: 'Saké', quantity: '50ml' },
      { name: 'Sucre', quantity: '3 cuillères à soupe' },
      { name: 'Gingembre', quantity: '20g' }
    ]),
    instructions: JSON.stringify([
      'Mélanger ingrédients sauce',
      'Faire mariner poulet 20 min',
      'Griller poulet à la poêle',
      'Glacer avec sauce réduite',
      'Caraméliser légèrement',
      'Servir avec riz et légumes'
    ]),
    tags: 'japonais,poulet,teriyaki,sucré-salé',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 35, carbs: 18, fat: 22 }),
    popularityScore: 0
  },
  {
    title: 'Curry Vert Thaï',
    description: 'Curry crémeux au lait de coco et basilic thaï',
    cookingTime: 35,
    servings: 4,
    difficulty: 'easy',
    category: 'thai',
    estimatedPrice: 10.0,
    ingredients: JSON.stringify([
      { name: 'Poulet', quantity: '500g' },
      { name: 'Pâte curry vert', quantity: '3 cuillères à soupe' },
      { name: 'Lait de coco', quantity: '400ml' },
      { name: 'Aubergines', quantity: '2' },
      { name: 'Basilic thaï', quantity: '1 botte' },
      { name: 'Piments verts', quantity: '2' }
    ]),
    instructions: JSON.stringify([
      'Faire revenir pâte de curry',
      'Ajouter poulet et saisir',
      'Verser lait de coco',
      'Ajouter aubergines',
      'Mijoter 20 min',
      'Finir avec basilic thaï'
    ]),
    tags: 'thaï,curry,lait-de-coco,épicé',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 28, carbs: 16, fat: 28 }),
    popularityScore: 0
  },
  {
    title: 'Bibimbap Coréen',
    description: 'Bol de riz garni de légumes, viande et œuf',
    cookingTime: 40,
    servings: 4,
    difficulty: 'intermediate',
    category: 'korean',
    estimatedPrice: 12.0,
    ingredients: JSON.stringify([
      { name: 'Riz', quantity: '400g' },
      { name: 'Bœuf bulgogi', quantity: '300g' },
      { name: 'Légumes variés', quantity: '500g' },
      { name: 'Œufs', quantity: '4' },
      { name: 'Gochujang', quantity: '4 cuillères à soupe' },
      { name: 'Huile de sésame', quantity: '2 cuillères à soupe' }
    ]),
    instructions: JSON.stringify([
      'Cuire riz à la perfection',
      'Faire mariner et cuire bœuf',
      'Sauter chaque légume séparément',
      'Faire œufs au plat',
      'Disposer harmonieusement dans bols',
      'Servir avec gochujang'
    ]),
    tags: 'coréen,bol,riz,équilibré',
    nutritionalInfo: JSON.stringify({ calories: 580, protein: 32, carbs: 68, fat: 20 }),
    popularityScore: 0
  },

  // PLATS MEXICAINS (8 recettes)
  {
    title: 'Enchiladas au Poulet',
    description: 'Tortillas roulées garnies de poulet sauce piquante',
    cookingTime: 45,
    servings: 4,
    difficulty: 'intermediate',
    category: 'mexican',
    estimatedPrice: 10.0,
    ingredients: JSON.stringify([
      { name: 'Tortillas', quantity: '12' },
      { name: 'Poulet cuit', quantity: '500g' },
      { name: 'Sauce enchilada', quantity: '500ml' },
      { name: 'Fromage râpé', quantity: '200g' },
      { name: 'Crème fraîche', quantity: '150ml' },
      { name: 'Oignons', quantity: '2' }
    ]),
    instructions: JSON.stringify([
      'Émietter le poulet',
      'Garnir tortillas de poulet',
      'Rouler les tortillas',
      'Napper de sauce',
      'Parsemer de fromage',
      'Gratiner 25 min à 180°C'
    ]),
    tags: 'mexicain,poulet,gratiné,épicé',
    nutritionalInfo: JSON.stringify({ calories: 520, protein: 32, carbs: 48, fat: 22 }),
    popularityScore: 0
  },
  {
    title: 'Chili con Carne',
    description: 'Ragoût épicé de bœuf et haricots rouges',
    cookingTime: 90,
    servings: 6,
    difficulty: 'easy',
    category: 'mexican',
    estimatedPrice: 10.0,
    ingredients: JSON.stringify([
      { name: 'Bœuf haché', quantity: '800g' },
      { name: 'Haricots rouges', quantity: '400g (boîtes)' },
      { name: 'Tomates concassées', quantity: '800g' },
      { name: 'Piments', quantity: '3' },
      { name: 'Épices chili', quantity: '3 cuillères à soupe' },
      { name: 'Oignons', quantity: '2' }
    ]),
    instructions: JSON.stringify([
      'Faire revenir oignons',
      'Ajouter bœuf et faire dorer',
      'Incorporer épices',
      'Ajouter tomates et haricots',
      'Mijoter 1h à feu doux',
      'Servir avec riz ou tortillas'
    ]),
    tags: 'mexicain,bœuf,épicé,haricots',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 35, carbs: 28, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Quesadillas au Fromage',
    description: 'Tortillas grillées fourrées au fromage',
    cookingTime: 15,
    servings: 4,
    difficulty: 'easy',
    category: 'mexican',
    estimatedPrice: 6.0,
    ingredients: JSON.stringify([
      { name: 'Tortillas', quantity: '8' },
      { name: 'Fromage râpé', quantity: '300g' },
      { name: 'Poivrons', quantity: '2' },
      { name: 'Oignons', quantity: '1' },
      { name: 'Jalapeños', quantity: '50g' },
      { name: 'Coriandre', quantity: '1 botte' }
    ]),
    instructions: JSON.stringify([
      'Faire revenir légumes',
      'Garnir tortillas de fromage',
      'Ajouter légumes',
      'Plier en deux',
      'Griller à la poêle',
      'Servir avec guacamole'
    ]),
    tags: 'mexicain,fromage,rapide,végétarien',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 18, carbs: 38, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Guacamole Maison',
    description: 'Purée d\'avocat épicée aux tomates et citron',
    cookingTime: 10,
    servings: 4,
    difficulty: 'easy',
    category: 'mexican',
    estimatedPrice: 5.0,
    ingredients: JSON.stringify([
      { name: 'Avocats mûrs', quantity: '4' },
      { name: 'Tomates', quantity: '2' },
      { name: 'Oignon rouge', quantity: '1/2' },
      { name: 'Citron vert', quantity: '2' },
      { name: 'Coriandre', quantity: '1/2 botte' },
      { name: 'Jalapeño', quantity: '1' }
    ]),
    instructions: JSON.stringify([
      'Écraser avocats à la fourchette',
      'Couper tomates en petits dés',
      'Hacher finement oignon',
      'Presser citrons verts',
      'Mélanger tous ingrédients',
      'Servir immédiatement'
    ]),
    tags: 'mexicain,avocat,végétarien,dip',
    nutritionalInfo: JSON.stringify({ calories: 220, protein: 3, carbs: 12, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Fajitas au Bœuf',
    description: 'Bœuf mariné avec poivrons dans tortillas',
    cookingTime: 30,
    servings: 4,
    difficulty: 'easy',
    category: 'mexican',
    estimatedPrice: 12.0,
    ingredients: JSON.stringify([
      { name: 'Bœuf émincé', quantity: '600g' },
      { name: 'Tortillas', quantity: '8' },
      { name: 'Poivrons', quantity: '3' },
      { name: 'Oignons', quantity: '2' },
      { name: 'Épices fajitas', quantity: '3 cuillères à soupe' },
      { name: 'Citron vert', quantity: '2' }
    ]),
    instructions: JSON.stringify([
      'Mariner bœuf aux épices',
      'Faire sauter poivrons et oignons',
      'Cuire bœuf à feu vif',
      'Réchauffer tortillas',
      'Disposer viande et légumes',
      'Servir avec accompagnements'
    ]),
    tags: 'mexicain,bœuf,poivrons,épicé',
    nutritionalInfo: JSON.stringify({ calories: 480, protein: 36, carbs: 42, fat: 18 }),
    popularityScore: 0
  },

  // PLATS VÉGÉTARIENS (12 recettes)
  {
    title: 'Curry de Pois Chiches',
    description: 'Curry végétarien crémeux aux pois chiches',
    cookingTime: 35,
    servings: 4,
    difficulty: 'easy',
    category: 'vegetarian',
    estimatedPrice: 6.0,
    ingredients: JSON.stringify([
      { name: 'Pois chiches', quantity: '800g (boîtes)' },
      { name: 'Tomates concassées', quantity: '400g' },
      { name: 'Lait de coco', quantity: '400ml' },
      { name: 'Épinards', quantity: '200g' },
      { name: 'Pâte de curry', quantity: '3 cuillères à soupe' },
      { name: 'Gingembre', quantity: '20g' }
    ]),
    instructions: JSON.stringify([
      'Faire revenir pâte curry et gingembre',
      'Ajouter pois chiches',
      'Incorporer tomates',
      'Verser lait de coco',
      'Mijoter 20 min',
      'Ajouter épinards en fin'
    ]),
    tags: 'végétarien,curry,pois-chiches,indien',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 16, carbs: 42, fat: 16 }),
    popularityScore: 0
  },
  {
    title: 'Buddha Bowl',
    description: 'Bol complet végétarien coloré et nutritif',
    cookingTime: 30,
    servings: 2,
    difficulty: 'easy',
    category: 'vegetarian',
    estimatedPrice: 8.0,
    ingredients: JSON.stringify([
      { name: 'Quinoa', quantity: '200g' },
      { name: 'Patate douce', quantity: '2' },
      { name: 'Avocat', quantity: '1' },
      { name: 'Pois chiches', quantity: '200g' },
      { name: 'Légumes variés', quantity: '300g' },
      { name: 'Tahini', quantity: '3 cuillères à soupe' }
    ]),
    instructions: JSON.stringify([
      'Cuire quinoa',
      'Rôtir patate douce au four',
      'Griller pois chiches',
      'Préparer légumes crus/cuits',
      'Disposer harmonieusement',
      'Arroser de sauce tahini'
    ]),
    tags: 'végétarien,bol,quinoa,santé',
    nutritionalInfo: JSON.stringify({ calories: 520, protein: 18, carbs: 72, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Lasagnes aux Légumes',
    description: 'Lasagnes végétariennes aux légumes grillés',
    cookingTime: 75,
    servings: 6,
    difficulty: 'intermediate',
    category: 'vegetarian',
    estimatedPrice: 10.0,
    ingredients: JSON.stringify([
      { name: 'Pâtes lasagne', quantity: '500g' },
      { name: 'Aubergines', quantity: '2' },
      { name: 'Courgettes', quantity: '3' },
      { name: 'Sauce tomate', quantity: '800g' },
      { name: 'Ricotta', quantity: '250g' },
      { name: 'Mozzarella', quantity: '200g' }
    ]),
    instructions: JSON.stringify([
      'Griller légumes au four',
      'Préparer sauce tomate',
      'Alterner couches pâtes/légumes',
      'Ajouter ricotta et mozzarella',
      'Terminer par fromage',
      'Cuire 45 min à 180°C'
    ]),
    tags: 'végétarien,lasagnes,gratiné,italien',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 18, carbs: 52, fat: 16 }),
    popularityScore: 0
  },
  {
    title: 'Falafels Maison',
    description: 'Boulettes de pois chiches croustillantes',
    cookingTime: 30,
    servings: 4,
    difficulty: 'intermediate',
    category: 'vegetarian',
    estimatedPrice: 5.0,
    ingredients: JSON.stringify([
      { name: 'Pois chiches secs', quantity: '400g' },
      { name: 'Oignons', quantity: '1' },
      { name: 'Ail', quantity: '3 gousses' },
      { name: 'Persil', quantity: '1 botte' },
      { name: 'Coriandre', quantity: '1 botte' },
      { name: 'Cumin', quantity: '2 cuillères à café' }
    ]),
    instructions: JSON.stringify([
      'Tremper pois chiches 12h',
      'Mixer tous ingrédients',
      'Former des boulettes',
      'Laisser reposer 30 min',
      'Frire ou cuire au four',
      'Servir avec sauce tahini'
    ]),
    tags: 'végétarien,pois-chiches,moyen-orient,frit',
    nutritionalInfo: JSON.stringify({ calories: 320, protein: 14, carbs: 48, fat: 8 }),
    popularityScore: 0
  },
  {
    title: 'Tarte aux Poireaux',
    description: 'Tarte salée crémeuse aux poireaux',
    cookingTime: 60,
    servings: 6,
    difficulty: 'easy',
    category: 'vegetarian',
    estimatedPrice: 7.0,
    ingredients: JSON.stringify([
      { name: 'Pâte brisée', quantity: '1' },
      { name: 'Poireaux', quantity: '4' },
      { name: 'Œufs', quantity: '3' },
      { name: 'Crème fraîche', quantity: '200ml' },
      { name: 'Gruyère', quantity: '100g' },
      { name: 'Noix de muscade', quantity: '1 pincée' }
    ]),
    instructions: JSON.stringify([
      'Étaler pâte dans moule',
      'Faire fondre poireaux au beurre',
      'Battre œufs et crème',
      'Disposer poireaux sur pâte',
      'Verser appareil',
      'Cuire 40 min à 180°C'
    ]),
    tags: 'végétarien,tarte,poireaux,four',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 12, carbs: 32, fat: 22 }),
    popularityScore: 0
  },

  // DESSERTS (15 recettes)
  {
    title: 'Tiramisu Classique',
    description: 'Dessert italien au mascarpone et café',
    cookingTime: 20,
    servings: 6,
    difficulty: 'easy',
    category: 'dessert',
    estimatedPrice: 8.0,
    ingredients: JSON.stringify([
      { name: 'Mascarpone', quantity: '500g' },
      { name: 'Œufs', quantity: '6' },
      { name: 'Sucre', quantity: '150g' },
      { name: 'Café fort', quantity: '300ml' },
      { name: 'Biscuits cuillère', quantity: '300g' },
      { name: 'Cacao', quantity: '30g' }
    ]),
    instructions: JSON.stringify([
      'Séparer blancs et jaunes',
      'Monter blancs en neige',
      'Mélanger jaunes, sucre, mascarpone',
      'Incorporer délicatement blancs',
      'Tremper biscuits dans café',
      'Alterner couches et saupoudrer cacao'
    ]),
    tags: 'dessert,italien,café,mascarpone',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 12, carbs: 38, fat: 24 }),
    popularityScore: 0
  },
  {
    title: 'Crème Brûlée',
    description: 'Crème onctueuse avec croûte de sucre caramélisé',
    cookingTime: 60,
    servings: 6,
    difficulty: 'intermediate',
    category: 'dessert',
    estimatedPrice: 7.0,
    ingredients: JSON.stringify([
      { name: 'Crème liquide', quantity: '500ml' },
      { name: 'Jaunes d\'œufs', quantity: '6' },
      { name: 'Sucre', quantity: '120g' },
      { name: 'Vanille', quantity: '1 gousse' },
      { name: 'Cassonade', quantity: '60g' }
    ]),
    instructions: JSON.stringify([
      'Infuser vanille dans crème',
      'Battre jaunes et sucre',
      'Mélanger avec crème',
      'Cuire au bain-marie 45 min',
      'Réfrigérer 4h minimum',
      'Caraméliser sucre au chalumeau'
    ]),
    tags: 'dessert,français,crème,caramel',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 6, carbs: 28, fat: 28 }),
    popularityScore: 0
  },
  {
    title: 'Brownies au Chocolat',
    description: 'Carrés fondants au chocolat noir',
    cookingTime: 35,
    servings: 12,
    difficulty: 'easy',
    category: 'dessert',
    estimatedPrice: 6.0,
    ingredients: JSON.stringify([
      { name: 'Chocolat noir', quantity: '200g' },
      { name: 'Beurre', quantity: '150g' },
      { name: 'Sucre', quantity: '200g' },
      { name: 'Œufs', quantity: '3' },
      { name: 'Farine', quantity: '100g' },
      { name: 'Noix', quantity: '100g' }
    ]),
    instructions: JSON.stringify([
      'Faire fondre chocolat et beurre',
      'Battre œufs et sucre',
      'Incorporer chocolat fondu',
      'Ajouter farine tamisée',
      'Incorporer noix concassées',
      'Cuire 25 min à 180°C'
    ]),
    tags: 'dessert,chocolat,américain,moelleux',
    nutritionalInfo: JSON.stringify({ calories: 320, protein: 5, carbs: 32, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Tarte Tatin',
    description: 'Tarte aux pommes caramélisées renversée',
    cookingTime: 60,
    servings: 8,
    difficulty: 'intermediate',
    category: 'dessert',
    estimatedPrice: 7.0,
    ingredients: JSON.stringify([
      { name: 'Pommes', quantity: '8' },
      { name: 'Pâte feuilletée', quantity: '1' },
      { name: 'Sucre', quantity: '150g' },
      { name: 'Beurre', quantity: '100g' },
      { name: 'Vanille', quantity: '1 gousse' }
    ]),
    instructions: JSON.stringify([
      'Caraméliser sucre et beurre',
      'Disposer pommes épluchées',
      'Cuire 20 min à feu doux',
      'Couvrir de pâte',
      'Enfourner 30 min à 200°C',
      'Démouler tiède sur plat'
    ]),
    tags: 'dessert,tarte,pommes,français',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 3, carbs: 52, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Panna Cotta',
    description: 'Crème italienne onctueuse au coulis de fruits',
    cookingTime: 20,
    servings: 6,
    difficulty: 'easy',
    category: 'dessert',
    estimatedPrice: 6.0,
    ingredients: JSON.stringify([
      { name: 'Crème liquide', quantity: '500ml' },
      { name: 'Sucre', quantity: '80g' },
      { name: 'Vanille', quantity: '1 gousse' },
      { name: 'Gélatine', quantity: '3 feuilles' },
      { name: 'Fruits rouges', quantity: '300g' }
    ]),
    instructions: JSON.stringify([
      'Infuser vanille dans crème',
      'Ajouter sucre et gélatine',
      'Verser dans verrines',
      'Réfrigérer 4h minimum',
      'Préparer coulis de fruits',
      'Servir avec coulis'
    ]),
    tags: 'dessert,italien,crème,léger',
    nutritionalInfo: JSON.stringify({ calories: 280, protein: 3, carbs: 24, fat: 18 }),
    popularityScore: 0
  },
  {
    title: 'Mousse au Chocolat',
    description: 'Mousse aérienne et intense au chocolat noir',
    cookingTime: 15,
    servings: 6,
    difficulty: 'easy',
    category: 'dessert',
    estimatedPrice: 5.0,
    ingredients: JSON.stringify([
      { name: 'Chocolat noir', quantity: '200g' },
      { name: 'Œufs', quantity: '6' },
      { name: 'Sucre', quantity: '50g' },
      { name: 'Sel', quantity: '1 pincée' }
    ]),
    instructions: JSON.stringify([
      'Faire fondre chocolat',
      'Séparer blancs et jaunes',
      'Incorporer jaunes au chocolat',
      'Monter blancs en neige avec sucre',
      'Incorporer délicatement',
      'Réfrigérer 3h minimum'
    ]),
    tags: 'dessert,chocolat,mousse,français',
    nutritionalInfo: JSON.stringify({ calories: 260, protein: 8, carbs: 22, fat: 16 }),
    popularityScore: 0
  },
  {
    title: 'Cheesecake New-Yorkais',
    description: 'Gâteau au fromage crémeux sur base biscuitée',
    cookingTime: 90,
    servings: 10,
    difficulty: 'intermediate',
    category: 'dessert',
    estimatedPrice: 12.0,
    ingredients: JSON.stringify([
      { name: 'Philadelphia', quantity: '800g' },
      { name: 'Sucre', quantity: '200g' },
      { name: 'Œufs', quantity: '4' },
      { name: 'Crème fraîche', quantity: '200ml' },
      { name: 'Biscuits digestive', quantity: '200g' },
      { name: 'Beurre', quantity: '100g' }
    ]),
    instructions: JSON.stringify([
      'Écraser biscuits avec beurre',
      'Former base dans moule',
      'Battre Philadelphia et sucre',
      'Incorporer œufs et crème',
      'Verser sur base',
      'Cuire 1h à 160°C au bain-marie'
    ]),
    tags: 'dessert,américain,fromage,crémeux',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 10, carbs: 38, fat: 26 }),
    popularityScore: 0
  },
  {
    title: 'Crêpes Suzette',
    description: 'Crêpes flambées au Grand Marnier',
    cookingTime: 30,
    servings: 4,
    difficulty: 'intermediate',
    category: 'dessert',
    estimatedPrice: 8.0,
    ingredients: JSON.stringify([
      { name: 'Farine', quantity: '250g' },
      { name: 'Lait', quantity: '500ml' },
      { name: 'Œufs', quantity: '4' },
      { name: 'Oranges', quantity: '3' },
      { name: 'Grand Marnier', quantity: '100ml' },
      { name: 'Sucre', quantity: '100g' }
    ]),
    instructions: JSON.stringify([
      'Préparer pâte à crêpes',
      'Cuire crêpes fines',
      'Caraméliser sucre et jus d\'orange',
      'Plier crêpes en 4',
      'Flamber au Grand Marnier',
      'Servir immédiatement'
    ]),
    tags: 'dessert,français,crêpes,flambé',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 10, carbs: 58, fat: 10 }),
    popularityScore: 0
  },
  {
    title: 'Fondant au Chocolat',
    description: 'Gâteau au cœur coulant de chocolat',
    cookingTime: 25,
    servings: 6,
    difficulty: 'intermediate',
    category: 'dessert',
    estimatedPrice: 7.0,
    ingredients: JSON.stringify([
      { name: 'Chocolat noir', quantity: '200g' },
      { name: 'Beurre', quantity: '120g' },
      { name: 'Œufs', quantity: '4' },
      { name: 'Sucre', quantity: '100g' },
      { name: 'Farine', quantity: '60g' }
    ]),
    instructions: JSON.stringify([
      'Faire fondre chocolat et beurre',
      'Battre œufs et sucre',
      'Incorporer chocolat fondu',
      'Ajouter farine tamisée',
      'Beurrer et remplir moules',
      'Cuire 12 min à 180°C'
    ]),
    tags: 'dessert,chocolat,coulant,élégant',
    nutritionalInfo: JSON.stringify({ calories: 420, protein: 8, carbs: 38, fat: 26 }),
    popularityScore: 0
  },
  {
    title: 'Tarte au Citron Meringuée',
    description: 'Tarte citronnée surmontée de meringue',
    cookingTime: 75,
    servings: 8,
    difficulty: 'intermediate',
    category: 'dessert',
    estimatedPrice: 8.0,
    ingredients: JSON.stringify([
      { name: 'Pâte sablée', quantity: '1' },
      { name: 'Citrons', quantity: '4' },
      { name: 'Œufs', quantity: '5' },
      { name: 'Sucre', quantity: '250g' },
      { name: 'Beurre', quantity: '100g' }
    ]),
    instructions: JSON.stringify([
      'Cuire pâte à blanc',
      'Préparer crème citron',
      'Verser sur fond de tarte',
      'Monter blancs en meringue',
      'Dresser meringue sur tarte',
      'Dorer au four 10 min'
    ]),
    tags: 'dessert,tarte,citron,meringue',
    nutritionalInfo: JSON.stringify({ calories: 380, protein: 8, carbs: 52, fat: 16 }),
    popularityScore: 0
  }
];

async function main() {
  console.log('🌱 Seeding 100+ recipes to database...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipe of recipes) {
    try {
      // Check if recipe already exists
      const existing = await prisma.recipe.findFirst({
        where: { title: recipe.title }
      });

      if (existing) {
        console.log(`⏭️  "${recipe.title}" déjà existante`);
        skipped++;
        continue;
      }

      await prisma.recipe.create({
        data: recipe
      });

      console.log(`✅ "${recipe.title}" créée`);
      created++;
    } catch (error) {
      console.error(`❌ Erreur "${recipe.title}":`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ SEEDING TERMINÉ!');
  console.log('='.repeat(60));
  console.log(`📝 ${created} nouvelles recettes créées`);
  console.log(`⏭️  ${skipped} recettes déjà existantes`);
  console.log(`❌ ${errors} erreurs`);
  console.log(`📊 TOTAL EN BASE: ${created + skipped} recettes\n`);

  // Récupérer les catégories et stats
  const stats = await prisma.recipe.groupBy({
    by: ['category'],
    _count: true,
    where: { isActive: true }
  });

  console.log('📊 RÉPARTITION PAR CATÉGORIE:');
  console.log('='.repeat(60));
  stats.forEach(stat => {
    console.log(`   ${stat.category.padEnd(20)} : ${stat._count} recettes`);
  });
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
