const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initialisation du seed de données...');

  // 1. Créer les badges de gamification
  console.log('🏆 Création des badges...');

  const badges = [
    // Badges de transactions
    {
      name: 'first_saver',
      title: 'Premier Épargnant',
      description: 'Félicitations ! Vous avez fait votre première économie.',
      icon: '🎯',
      points: 10,
      rarity: 'common',
      requirement: JSON.stringify({ type: 'transactions', value: 1 })
    },
    {
      name: 'saver_rookie',
      title: 'Épargnant Débutant',
      description: 'Vous avez effectué 5 économies. Continuez sur cette lancée !',
      icon: '🌱',
      points: 25,
      rarity: 'common',
      requirement: JSON.stringify({ type: 'transactions', value: 5 })
    },
    {
      name: 'saver_pro',
      title: 'Épargnant Professionnel',
      description: 'Impressionnant ! 25 économies réalisées.',
      icon: '💪',
      points: 75,
      rarity: 'rare',
      requirement: JSON.stringify({ type: 'transactions', value: 25 })
    },
    {
      name: 'saver_expert',
      title: 'Expert de l\'Économie',
      description: 'Maître de l\'économie avec 50 transactions !',
      icon: '🎓',
      points: 150,
      rarity: 'epic',
      requirement: JSON.stringify({ type: 'transactions', value: 50 })
    },
    {
      name: 'saver_master',
      title: 'Maître Économe',
      description: 'Légende ! 100 économies accomplies.',
      icon: '👑',
      points: 300,
      rarity: 'legendary',
      requirement: JSON.stringify({ type: 'transactions', value: 100 })
    },

    // Badges de montants économisés
    {
      name: 'first_euro',
      title: 'Premier Euro',
      description: 'Votre premier euro économisé ! Le début d\'une belle aventure.',
      icon: '💰',
      points: 5,
      rarity: 'common',
      requirement: JSON.stringify({ type: 'savings', value: 1 })
    },
    {
      name: 'fifty_saver',
      title: 'Cinquante Étoiles',
      description: '50€ économisés ! Vous êtes sur la bonne voie.',
      icon: '⭐',
      points: 30,
      rarity: 'common',
      requirement: JSON.stringify({ type: 'savings', value: 50 })
    },
    {
      name: 'hundred_club',
      title: 'Club des 100',
      description: '100€ économisés ! Bienvenue dans le club des économes.',
      icon: '🏅',
      points: 50,
      rarity: 'rare',
      requirement: JSON.stringify({ type: 'savings', value: 100 })
    },
    {
      name: 'big_saver',
      title: 'Grand Épargnant',
      description: '500€ économisés ! Votre discipline paie.',
      icon: '💎',
      points: 150,
      rarity: 'epic',
      requirement: JSON.stringify({ type: 'savings', value: 500 })
    },
    {
      name: 'millionaire_mindset',
      title: 'Mentalité Millionnaire',
      description: '1000€ économisés ! Vous avez la mentalité d\'un millionnaire.',
      icon: '🦅',
      points: 300,
      rarity: 'legendary',
      requirement: JSON.stringify({ type: 'savings', value: 1000 })
    },

    // Badges de streak
    {
      name: 'daily_duo',
      title: 'Duo Quotidien',
      description: '2 jours consécutifs d\'économies. La régularité, clé du succès !',
      icon: '🔥',
      points: 15,
      rarity: 'common',
      requirement: JSON.stringify({ type: 'streak', value: 2 })
    },
    {
      name: 'week_warrior',
      title: 'Guerrier Hebdomadaire',
      description: '7 jours d\'affilée ! Votre constance est remarquable.',
      icon: '⚡',
      points: 40,
      rarity: 'rare',
      requirement: JSON.stringify({ type: 'streak', value: 7 })
    },
    {
      name: 'month_master',
      title: 'Maître Mensuel',
      description: '30 jours consécutifs ! Vous êtes une machine à économiser.',
      icon: '🚀',
      points: 200,
      rarity: 'epic',
      requirement: JSON.stringify({ type: 'streak', value: 30 })
    },

    // Badges spéciaux
    {
      name: 'early_adopter',
      title: 'Adopteur Précoce',
      description: 'Merci d\'être parmi les premiers utilisateurs de +Clair !',
      icon: '🎉',
      points: 50,
      rarity: 'rare',
      requirement: JSON.stringify({ type: 'manual', value: 0 })
    }
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge
    });
  }

  console.log(`✅ ${badges.length} badges créés`);

  // 2. Créer des utilisateurs de test
  console.log('👥 Création des utilisateurs de test...');

  const testUsers = [
    {
      email: 'demo@plusclair.com',
      password: 'demo123',
      name: 'Utilisateur Démo',
      isPremium: false,
      status: 'active',
      emailVerified: true,
      monthlyGoal: 200,
      savedAmount: 0,
      gamificationPoints: 0,
      level: 1,
      streak: 0
    },
    {
      email: 'premium@plusclair.com',
      password: 'premium123',
      name: 'Utilisateur Premium',
      isPremium: true,
      status: 'active',
      emailVerified: true,
      monthlyGoal: 500,
      savedAmount: 0,
      gamificationPoints: 0,
      level: 1,
      streak: 0
    }
  ];

  const createdUsers = [];

  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        ...userData,
        password: hashedPassword,
        updatedAt: new Date()
      },
      create: {
        ...userData,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    createdUsers.push(user);
  }

  console.log(`✅ ${createdUsers.length} utilisateurs de test créés`);

  // 3. Créer des données d'exemple pour l'utilisateur démo
  console.log('💰 Création des données d\'exemple...');

  const demoUser = createdUsers.find(u => u.email === 'demo@plusclair.com');

  if (demoUser) {
    // Créer des transactions d'exemple
    const today = new Date();
    const transactions = [];

    // Transactions des 30 derniers jours
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const categories = ['alimentation', 'habits', 'activite', 'deplacement'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const amount = Math.floor(Math.random() * 30) + 5; // Entre 5€ et 35€

      const descriptions = {
        alimentation: [
          'Repas fait maison au lieu de restaurant',
          'Courses avec liste, évité les achats impulsifs',
          'Cuisine en batch pour la semaine'
        ],
        habits: [
          'Acheté en seconde main',
          'Réparé au lieu de racheter',
          'Profité des soldes'
        ],
        activite: [
          'Soirée cinéma maison',
          'Balade gratuite en nature',
          'Lecture à la bibliothèque'
        ],
        deplacement: [
          'Vélo au lieu de voiture',
          'Marche au lieu de transport',
          'Covoiturage partagé'
        ]
      };

      transactions.push({
        userId: demoUser.id,
        amount,
        description: descriptions[category][Math.floor(Math.random() * descriptions[category].length)],
        category,
        type: 'saving',
        date,
        createdAt: date
      });
    }

    for (const transaction of transactions) {
      await prisma.transaction.create({
        data: transaction
      });
    }

    // Mettre à jour les stats de l'utilisateur
    const totalSaved = transactions.reduce((sum, t) => sum + t.amount, 0);

    await prisma.user.update({
      where: { id: demoUser.id },
      data: {
        savedAmount: totalSaved,
        gamificationPoints: totalSaved * 2, // 2 points par euro
        streak: 3,
        level: Math.floor(totalSaved / 50) + 1
      }
    });

    console.log(`✅ Données d'exemple créées pour ${demoUser.name}`);
  }

  console.log('🎉 Seed terminé avec succès !');
  console.log('\n📋 Comptes de test créés:');
  console.log('- demo@plusclair.com (demo123) - Utilisateur standard');
  console.log('- premium@plusclair.com (premium123) - Utilisateur premium');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur lors du seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });