export const INITIAL_USER_DATA = {
  id: null,
  name: 'Utilisateur',
  email: null,
  savedAmount: 0,
  monthlyGoal: 0,
  streak: 0,
  level: 1,
  xp: 0,
  plansUsedThisMonth: 0,
  isPremium: false,
  joinDate: new Date().toISOString(),
  badges: [],
  recentTransactions: [],
  accounts: [],
  financialGoals: [],
  todayChallenges: [],
  progressToGoal: 0,
  lastLoginAt: null
};

export const INITIAL_ANSWERS = {
  age: '',
  mainSpending: '',
  mealsPerWeek: '',
  transportType: '',
  fashionHabit: ''
};

export const QUESTIONS = [
  {
    key: 'age',
    question: 'Quel âge as-tu ?',
    type: 'number',
    placeholder: 'Ex: 25',
    validation: (val) => val > 0 && val < 120
  },
  {
    key: 'mainSpending',
    question: 'Où dépenses-tu le plus ?',
    type: 'select',
    options: ['Alimentation', 'Shopping', 'Sorties', 'Transport', 'Autre']
  },
  {
    key: 'mealsPerWeek',
    question: 'Combien de repas prépares-tu par semaine ?',
    type: 'slider',
    min: 0,
    max: 21,
    default: 7
  },
  {
    key: 'transportType',
    question: 'Ton moyen de transport principal ?',
    type: 'select',
    options: ['Voiture', 'Transport en commun', 'Vélo', 'Marche', 'Mixte']
  },
  {
    key: 'fashionHabit',
    question: 'Ton style shopping ?',
    type: 'select',
    options: ['Fast fashion', 'Seconde main', 'Marques', 'Mixte', 'Peu d\'achats']
  }
];