/**
 * Financial AI Controller - AI-Powered Insights and Projections
 * Handles habit analysis, spending predictions, and what-if scenarios
 * Premium features with intelligent recommendations
 */

const asyncHandler = require('express-async-handler');
const prisma = require('../lib/prisma');

/**
 * @route   GET /api/financial/ai/insights
 * @desc    Get AI-powered financial insights and habit analysis
 * @access  Private (Premium for advanced insights)
 */
const getAIInsights = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = 'month' } = req.query;

  // Get user's transactions for analysis
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: getDateByPeriod(period),
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  // Get user's financial data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      savedAmount: true,
      monthlyGoal: true,
      isPremium: true,
    },
  });

  // Analyze spending by category
  const categorySpending = {};
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => {
      const category = t.category || 'other';
      categorySpending[category] = (categorySpending[category] || 0) + t.amount;
      return sum + t.amount;
    }, 0);

  const insights = [];

  // Overspending detection
  Object.entries(categorySpending).forEach(([category, amount]) => {
    const percentage = (amount / totalExpenses) * 100;
    if (percentage > 30) {
      insights.push({
        type: 'warning',
        category: 'overspending',
        icon: '⚠️',
        title: `Dépenses élevées en ${category}`,
        description: `Vous dépensez ${percentage.toFixed(0)}% de votre budget en ${category}. Réduire cette catégorie de 15% pourrait vous faire économiser ${(amount * 0.15).toFixed(0)}€/${period === 'month' ? 'mois' : 'an'}.`,
        actionable: true,
        impact: 'high',
        savings: amount * 0.15,
        premium: false,
      });
    }
  });

  // Weekend spending pattern
  const weekendSpending = transactions
    .filter((t) => {
      const day = new Date(t.date).getDay();
      return t.type === 'expense' && (day === 0 || day === 6);
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const weekdaySpending = totalExpenses - weekendSpending;

  if (weekendSpending > weekdaySpending * 0.4) {
    insights.push({
      type: 'info',
      category: 'pattern',
      icon: '📊',
      title: 'Dépenses de week-end élevées',
      description: `Vous dépensez ${weekendSpending.toFixed(0)}€ le week-end. Planifier vos activités pourrait réduire ces dépenses de 20%.`,
      actionable: true,
      impact: 'medium',
      savings: weekendSpending * 0.2,
      premium: false,
    });
  }

  // Recurring subscriptions detection
  const potentialSubscriptions = transactions.filter(
    (t) => t.amount >= 5 && t.amount <= 50 && t.type === 'expense'
  );

  if (potentialSubscriptions.length > 3) {
    insights.push({
      type: 'tip',
      category: 'optimization',
      icon: '💡',
      title: 'Optimisez vos abonnements',
      description: `${potentialSubscriptions.length} abonnements potentiels détectés. Revoyez-les pour économiser jusqu'à 30€/${period === 'month' ? 'mois' : 'an'}.`,
      actionable: true,
      impact: 'medium',
      savings: 30,
      premium: false,
    });
  }

  // Premium insights
  if (user.isPremium) {
    // Investment recommendations
    const monthlyIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsRate = ((monthlyIncome - totalExpenses) / monthlyIncome) * 100;

    if (savingsRate > 20 && user.savedAmount > 5000) {
      insights.push({
        type: 'premium',
        category: 'ai-recommendation',
        icon: '🤖',
        title: 'Recommandation IA Premium',
        description: `Basé sur votre épargne de ${user.savedAmount.toFixed(0)}€, investir 15% dans un fonds indexé pourrait générer +${(user.savedAmount * 0.15 * 0.07).toFixed(0)}€/an.`,
        actionable: true,
        impact: 'high',
        premium: true,
      });
    }

    // Fraud detection (mock)
    const unusualTransactions = transactions.filter((t) => t.amount > totalExpenses * 0.5);
    if (unusualTransactions.length > 0) {
      insights.push({
        type: 'warning',
        category: 'security',
        icon: '🔒',
        title: 'Transaction inhabituellement élevée détectée',
        description: `Une transaction de ${unusualTransactions[0].amount.toFixed(2)}€ semble inhabituelle. Vérifiez votre compte.`,
        actionable: true,
        impact: 'high',
        premium: true,
      });
    }
  }

  res.json({
    success: true,
    insights,
    summary: {
      totalInsights: insights.length,
      totalPotentialSavings: insights.reduce((sum, i) => sum + (i.savings || 0), 0),
      period,
    },
  });
});

/**
 * @route   GET /api/financial/ai/projections
 * @desc    Get financial projections and what-if scenarios
 * @access  Private (Premium required)
 */
const getProjections = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { adjustmentAmount = 0 } = req.query;

  // Check premium status
  if (!req.user.isPremium) {
    return res.status(403).json({
      error: 'Premium subscription required',
      message: 'Upgrade to premium to access projections',
      upgradeUrl: '/subscription',
    });
  }

  // Get user's financial data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      savedAmount: true,
      monthlyGoal: true,
    },
  });

  // Get recent transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
  });

  const monthlyIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = user.savedAmount;

  // Calculate projections
  const daysInMonth = 30;
  const daysElapsed = new Date().getDate();
  const daysRemaining = daysInMonth - daysElapsed;

  const dailyExpenses = monthlyExpenses / daysElapsed;
  const projectedExpenses = dailyExpenses * daysRemaining;
  const projectedEndBalance = currentBalance + monthlyIncome - projectedExpenses;

  // Scenarios
  const scenarios = {
    current: {
      name: 'Tendance actuelle',
      endBalance: projectedEndBalance,
      savings: projectedEndBalance - currentBalance,
      confidence: 0.85,
    },
    optimistic: {
      name: 'Scénario optimiste',
      endBalance: currentBalance + monthlyIncome - projectedExpenses * 0.8,
      savings: currentBalance + monthlyIncome - projectedExpenses * 0.8 - currentBalance,
      confidence: 0.65,
    },
    pessimistic: {
      name: 'Scénario prudent',
      endBalance: currentBalance + monthlyIncome - projectedExpenses * 1.1,
      savings: currentBalance + monthlyIncome - projectedExpenses * 1.1 - currentBalance,
      confidence: 0.75,
    },
    custom: {
      name: 'Simulation personnalisée',
      endBalance: projectedEndBalance + parseFloat(adjustmentAmount),
      savings: projectedEndBalance + parseFloat(adjustmentAmount) - currentBalance,
      confidence: 0.70,
    },
  };

  // AI recommendations
  const recommendations = [];

  if (projectedEndBalance < 0) {
    recommendations.push({
      type: 'critical',
      message: 'Votre balance pourrait devenir négative. Réduisez vos dépenses immédiatement.',
      action: 'Réduire les dépenses de 20%',
    });
  } else if (projectedEndBalance < 200) {
    recommendations.push({
      type: 'warning',
      message: 'Balance faible prévue. Soyez prudent avec vos dépenses.',
      action: 'Surveiller les dépenses',
    });
  } else {
    recommendations.push({
      type: 'success',
      message: `Vous êtes sur la bonne voie pour économiser ${(projectedEndBalance - currentBalance).toFixed(0)}€ ce mois.`,
      action: 'Continuer comme ça',
    });
  }

  res.json({
    success: true,
    currentBalance,
    projections: scenarios,
    recommendations,
    metadata: {
      period: 'month',
      daysElapsed,
      daysRemaining,
      monthlyIncome,
      monthlyExpenses,
    },
  });
});

/**
 * @route   GET /api/financial/ai/health-score
 * @desc    Calculate financial health score
 * @access  Private
 */
const getHealthScore = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      savedAmount: true,
      monthlyGoal: true,
    },
  });

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  const monthlyIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate factors
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const incomeStability = 0.85; // Mock - would calculate from historical data
  const expenseRatio = monthlyIncome > 0 ? monthlyExpenses / monthlyIncome : 1;
  const monthsOfExpenses = monthlyExpenses > 0 ? user.savedAmount / monthlyExpenses : 0;

  // Score calculation
  let totalScore = 0;

  // Factor 1: Savings Rate (30 points max)
  const savingsScore = Math.min(30, (savingsRate / 20) * 30);
  totalScore += savingsScore;

  // Factor 2: Income Stability (25 points max)
  const stabilityScore = incomeStability * 25;
  totalScore += stabilityScore;

  // Factor 3: Expense Control (25 points max)
  const expenseScore = Math.max(0, 25 - expenseRatio * 25);
  totalScore += expenseScore;

  // Factor 4: Emergency Fund (20 points max)
  const emergencyScore = Math.min(20, (monthsOfExpenses / 6) * 20);
  totalScore += emergencyScore;

  const score = Math.round(totalScore);

  res.json({
    success: true,
    score,
    factors: {
      savingsRate: { score: Math.round(savingsScore), max: 30, value: savingsRate },
      incomeStability: { score: Math.round(stabilityScore), max: 25, value: incomeStability },
      expenseControl: { score: Math.round(expenseScore), max: 25, value: expenseRatio },
      emergencyFund: { score: Math.round(emergencyScore), max: 20, value: monthsOfExpenses },
    },
    grade: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Average' : 'Needs Improvement',
  });
});

/**
 * Helper function to get date by period
 */
function getDateByPeriod(period) {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

module.exports = {
  getAIInsights,
  getProjections,
  getHealthScore,
};
