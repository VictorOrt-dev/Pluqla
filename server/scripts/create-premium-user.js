/**
 * Script pour créer ou promouvoir un utilisateur en Premium
 *
 * Usage:
 *   node scripts/create-premium-user.js [email] [password] [name]
 *
 * Exemples:
 *   node scripts/create-premium-user.js premium@test.com Test123! "Premium User"
 *   node scripts/create-premium-user.js  # Mode interactif
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createOrUpgradePremiumUser(email, password, name) {
  console.log('🔍 Vérification utilisateur existant...');

  // Vérifier si l'utilisateur existe déjà
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    console.log(`✅ Utilisateur trouvé: ${user.email} (ID: ${user.id})`);
    console.log(`   Status actuel: ${user.subscriptionTier} (Premium: ${user.isPremium})`);

    // Mettre à jour vers Premium
    console.log('⬆️  Upgrade vers Premium...');

    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1); // 1 an de premium

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: true,
        subscriptionTier: 'PREMIUM',
        subscriptionStartDate: subscriptionStart,
        subscriptionEndDate: subscriptionEnd,
        updatedAt: new Date()
      }
    });

    console.log('✅ Utilisateur upgradé vers Premium!');
  } else {
    console.log('👤 Création d\'un nouvel utilisateur Premium...');

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1); // 1 an de premium

    // Créer le nouvel utilisateur Premium
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'user',
        status: 'active',
        emailVerified: true, // Auto-vérifié pour les tests
        isPremium: true,
        subscriptionTier: 'PREMIUM',
        subscriptionStartDate: subscriptionStart,
        subscriptionEndDate: subscriptionEnd,
        savedAmount: 0,
        monthlyGoal: 1500, // Objectif plus élevé pour premium
        streak: 0,
        level: 1,
        plansUsedThisMonth: 0,
        gamificationPoints: 0
      }
    });

    console.log('✅ Utilisateur Premium créé avec succès!');
  }

  // Afficher les infos
  console.log('\n' + '='.repeat(60));
  console.log('📋 Informations du compte Premium');
  console.log('='.repeat(60));
  console.log(`📧 Email: ${user.email}`);
  console.log(`🔑 Mot de passe: ${password}`);
  console.log(`👤 Nom: ${user.name}`);
  console.log(`🆔 User ID: ${user.id}`);
  console.log(`💎 Tier: ${user.subscriptionTier}`);
  console.log(`✨ Premium: ${user.isPremium ? 'OUI' : 'NON'}`);
  console.log(`📅 Début abonnement: ${user.subscriptionStartDate?.toLocaleDateString('fr-FR')}`);
  console.log(`📅 Fin abonnement: ${user.subscriptionEndDate?.toLocaleDateString('fr-FR')}`);
  console.log('='.repeat(60));

  console.log('\n📌 Limites Premium:');
  console.log('   - Requêtes AI: 50/jour (vs 5 pour Free)');
  console.log('   - Tokens: 10,000/jour (vs 1,000 pour Free)');
  console.log('   - Features exclusives: Photo Match, Transport Optimization');
  console.log('   - Cache prioritaire');
  console.log('   - Support prioritaire');

  console.log('\n🔐 Pour te connecter:');
  console.log('   1. Frontend: http://localhost:3000/login');
  console.log(`   2. Email: ${user.email}`);
  console.log(`   3. Password: ${password}`);
  console.log('\n   OU via API:');
  console.log(`   POST http://localhost:3004/api/auth/email/login`);
  console.log(`   Body: { "email": "${user.email}", "password": "${password}" }`);

  return user;
}

async function main() {
  console.log('🚀 Script de création de compte Premium\n');

  // Récupérer les arguments
  const args = process.argv.slice(2);

  let email, password, name;

  if (args.length >= 3) {
    // Mode avec arguments
    [email, password, name] = args;
  } else {
    // Mode par défaut
    email = 'premium@test.com';
    password = 'Premium123!';
    name = 'Premium Test User';

    console.log('⚙️  Aucun argument fourni, utilisation des valeurs par défaut:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log();
  }

  // Validation simple
  if (!email || !email.includes('@')) {
    console.error('❌ Email invalide');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('❌ Mot de passe trop court (min 8 caractères)');
    process.exit(1);
  }

  if (!name || name.length < 2) {
    console.error('❌ Nom invalide');
    process.exit(1);
  }

  try {
    await createOrUpgradePremiumUser(email, password, name);
    console.log('\n✅ Script terminé avec succès!');
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
