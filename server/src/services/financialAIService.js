const aiService = require('./aiService');
const logger = require('../utils/logger');
const { prisma } = require('../lib/prisma'); // FIXED: Use singleton to prevent connection pool exhaustion in financial AI operations

/**
 * Financial AI Service
 * Provides sophisticated AI-powered financial analysis and insights
 */
class FinancialAIService {
  constructor() {
    this.insightTypes = {
      SPENDING_ANALYSIS: 'spending_analysis',
      INVESTMENT_ADVICE: 'investment_advice',
      DEBT_OPTIMIZATION: 'debt_optimization',
      SAVINGS_STRATEGY: 'savings_strategy',
      RISK_ASSESSMENT: 'risk_assessment',
      GOAL_GUIDANCE: 'goal_guidance',
      TAX_OPTIMIZATION: 'tax_optimization',
      BUDGET_RECOMMENDATIONS: 'budget_recommendations'
    };

    this.riskLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Generate comprehensive financial insights for a user
   */
  async generateFinancialInsights(userId, lang = 'fr') {
    try {
      const financialProfile = await this.buildUserFinancialProfile(userId);

      if (!financialProfile) {
        return [];
      }

      const insights = await Promise.all([
        this.analyzeSpendingPatterns(financialProfile, lang),
        this.generateInvestmentAdvice(financialProfile, lang),
        this.analyzeDebtSituation(financialProfile, lang),
        this.optimizeSavingsStrategy(financialProfile, lang),
        this.assessFinancialRisks(financialProfile, lang),
        this.provideGoalGuidance(financialProfile, lang)
      ]);

      // Filter out null insights and sort by priority
      return insights
        .filter(insight => insight !== null)
        .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
        .slice(0, 5); // Limit to top 5 insights

    } catch (error) {
      logger.error('Error generating financial insights:', error);
      return [];
    }
  }

  /**
   * Build comprehensive financial profile for AI analysis
   */
  async buildUserFinancialProfile(userId) {
    try {
      const [user, accounts, assets, liabilities, incomes, goals, transactions, latestSnapshot] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.account.findMany({ where: { userId, isActive: true } }),
        prisma.asset.findMany({ where: { userId } }),
        prisma.liability.findMany({ where: { userId } }),
        prisma.income.findMany({ where: { userId, isActive: true } }),
        prisma.financialGoal.findMany({ where: { userId, status: 'active' } }),
        prisma.accountTransaction.findMany({
          where: {
            account: { userId },
            date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
          },
          orderBy: { date: 'desc' },
          take: 200
        }),
        prisma.netWorthSnapshot.findFirst({
          where: { userId },
          orderBy: { date: 'desc' }
        })
      ]);

      if (!user) return null;

      // Calculate key metrics
      const totalAssets = assets.reduce((sum, asset) => sum + asset.totalValue, 0) +
                         accounts.reduce((sum, acc) => sum + Math.max(0, acc.balance), 0);

      const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0) +
                              accounts.reduce((sum, acc) => sum + Math.abs(Math.min(0, acc.balance)), 0);

      const netWorth = totalAssets - totalLiabilities;

      const monthlyIncome = incomes.reduce((sum, income) => {
        const factor = income.frequency === 'weekly' ? 4.33 :
                      income.frequency === 'annual' ? 1/12 :
                      income.frequency === 'quarterly' ? 1/3 : 1;
        return sum + (income.amount * factor);
      }, 0);

      // Analyze spending patterns
      const spendingByCategory = transactions
        .filter(t => t.amount < 0)
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
          return acc;
        }, {});

      const monthlyExpenses = Object.values(spendingByCategory).reduce((sum, amount) => sum + amount, 0);

      return {
        user,
        financial: {
          netWorth,
          totalAssets,
          totalLiabilities,
          monthlyIncome,
          monthlyExpenses,
          savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0,
          liquidAssets: accounts.filter(acc => ['checking', 'savings'].includes(acc.type))
                               .reduce((sum, acc) => sum + acc.balance, 0)
        },
        accounts,
        assets,
        liabilities,
        incomes,
        goals,
        transactions,
        spendingByCategory,
        latestSnapshot,
        age: user.age || 30, // Default age for calculations
        riskTolerance: user.riskTolerance || 'medium'
      };

    } catch (error) {
      logger.error('Error building financial profile:', error);
      return null;
    }
  }

  /**
   * Analyze spending patterns and provide insights
   */
  async analyzeSpendingPatterns(profile, lang) {
    try {
      const { spendingByCategory, financial } = profile;

      if (Object.keys(spendingByCategory).length === 0) {
        return null;
      }

      const totalSpending = Object.values(spendingByCategory).reduce((sum, amount) => sum + amount, 0);
      const largestCategory = Object.entries(spendingByCategory)
        .sort(([,a], [,b]) => b - a)[0];

      const largestCategoryPercent = (largestCategory[1] / totalSpending) * 100;

      let insight = {
        type: this.insightTypes.SPENDING_ANALYSIS,
        priority: largestCategoryPercent > 50 ? this.riskLevels.HIGH : this.riskLevels.MEDIUM,
        confidence: 0.9
      };

      if (lang === 'en') {
        insight.title = 'Spending Pattern Analysis';
        insight.description = `Your largest spending category is ${largestCategory[0]} (${largestCategoryPercent.toFixed(1)}% of total spending). `;

        if (largestCategoryPercent > 50) {
          insight.description += 'This high concentration suggests reviewing this category for optimization opportunities.';
          insight.actions = [
            `Review ${largestCategory[0]} expenses for potential savings`,
            'Set a monthly budget limit for this category',
            'Consider alternatives to reduce costs'
          ];
        } else {
          insight.description += 'Your spending appears well-distributed across categories.';
          insight.actions = [
            'Continue monitoring spending patterns',
            'Look for small optimizations in each category'
          ];
        }
      } else {
        insight.title = 'Analyse des habitudes de dépenses';
        insight.description = `Votre plus grande catégorie de dépenses est ${largestCategory[0]} (${largestCategoryPercent.toFixed(1)}% du total). `;

        if (largestCategoryPercent > 50) {
          insight.description += 'Cette forte concentration suggère de revoir cette catégorie pour des opportunités d\'optimisation.';
          insight.actions = [
            `Réviser les dépenses ${largestCategory[0]} pour des économies potentielles`,
            'Définir un budget mensuel limite pour cette catégorie',
            'Considérer des alternatives pour réduire les coûts'
          ];
        } else {
          insight.description += 'Vos dépenses semblent bien réparties entre les catégories.';
          insight.actions = [
            'Continuer à surveiller les habitudes de dépenses',
            'Chercher de petites optimisations dans chaque catégorie'
          ];
        }
      }

      insight.metrics = {
        'Largest Category': `${largestCategory[0]} (${largestCategoryPercent.toFixed(1)}%)`,
        'Monthly Spending': `€${totalSpending.toFixed(0)}`,
        'Categories': Object.keys(spendingByCategory).length
      };

      return insight;

    } catch (error) {
      logger.error('Error analyzing spending patterns:', error);
      return null;
    }
  }

  /**
   * Generate investment advice based on profile
   */
  async generateInvestmentAdvice(profile, lang) {
    try {
      const { financial, assets, age, riskTolerance } = profile;

      if (financial.liquidAssets < 1000) {
        return null; // Not enough capital for investment advice
      }

      const stockPercent = assets.filter(a => a.type === 'stock').reduce((sum, a) => sum + a.totalValue, 0) / financial.totalAssets * 100;
      const bondPercent = assets.filter(a => a.type === 'bond').reduce((sum, a) => sum + a.totalValue, 0) / financial.totalAssets * 100;

      const recommendedStockPercent = Math.max(20, 100 - age);
      const stockDeviation = Math.abs(stockPercent - recommendedStockPercent);

      let insight = {
        type: this.insightTypes.INVESTMENT_ADVICE,
        priority: stockDeviation > 20 ? this.riskLevels.MEDIUM : this.riskLevels.LOW,
        confidence: 0.8
      };

      if (lang === 'en') {
        insight.title = 'Investment Portfolio Optimization';
        insight.description = `Based on your age (${age}) and risk tolerance, you might consider adjusting your portfolio allocation. `;

        if (stockPercent < recommendedStockPercent - 10) {
          insight.description += `Consider increasing your stock allocation to ${recommendedStockPercent}% for long-term growth.`;
          insight.actions = [
            'Gradually increase equity exposure',
            'Consider low-cost index funds',
            'Diversify across different sectors'
          ];
        } else if (stockPercent > recommendedStockPercent + 10) {
          insight.description += `Consider rebalancing towards more conservative investments.`;
          insight.actions = [
            'Rebalance portfolio to reduce risk',
            'Add bonds or stable investments',
            'Consider your investment timeline'
          ];
        } else {
          insight.description += 'Your current allocation appears well-suited to your profile.';
          insight.actions = [
            'Review and rebalance quarterly',
            'Consider tax-advantaged accounts'
          ];
        }
      } else {
        insight.title = 'Optimisation du portefeuille d\'investissement';
        insight.description = `Basé sur votre âge (${age}) et votre tolérance au risque, vous pourriez considérer ajuster l\'allocation de votre portefeuille. `;

        if (stockPercent < recommendedStockPercent - 10) {
          insight.description += `Considérez augmenter votre allocation en actions à ${recommendedStockPercent}% pour la croissance à long terme.`;
          insight.actions = [
            'Augmenter progressivement l\'exposition aux actions',
            'Considérer les fonds indiciels à faible coût',
            'Diversifier entre différents secteurs'
          ];
        } else if (stockPercent > recommendedStockPercent + 10) {
          insight.description += `Considérez rééquilibrer vers des investissements plus conservateurs.`;
          insight.actions = [
            'Rééquilibrer le portefeuille pour réduire le risque',
            'Ajouter des obligations ou investissements stables',
            'Considérer votre horizon d\'investissement'
          ];
        } else {
          insight.description += 'Votre allocation actuelle semble bien adaptée à votre profil.';
          insight.actions = [
            'Réviser et rééquilibrer trimestriellement',
            'Considérer les comptes avantagés fiscalement'
          ];
        }
      }

      insight.metrics = {
        'Current Stocks': `${stockPercent.toFixed(1)}%`,
        'Recommended Stocks': `${recommendedStockPercent}%`,
        'Available Capital': `€${financial.liquidAssets.toFixed(0)}`
      };

      return insight;

    } catch (error) {
      logger.error('Error generating investment advice:', error);
      return null;
    }
  }

  /**
   * Analyze debt situation and provide optimization advice
   */
  async analyzeDebtSituation(profile, lang) {
    try {
      const { financial, liabilities } = profile;

      if (liabilities.length === 0) {
        return null; // No debt to analyze
      }

      const totalDebt = financial.totalLiabilities;
      const debtToIncomeRatio = financial.monthlyIncome > 0 ? (totalDebt / (financial.monthlyIncome * 12)) * 100 : 0;
      const highInterestDebt = liabilities.filter(l => (l.interestRate || 0) > 10);

      let insight = {
        type: this.insightTypes.DEBT_OPTIMIZATION,
        priority: debtToIncomeRatio > 200 ? this.riskLevels.HIGH :
                 debtToIncomeRatio > 100 ? this.riskLevels.MEDIUM : this.riskLevels.LOW,
        confidence: 0.9
      };

      if (lang === 'en') {
        insight.title = 'Debt Optimization Strategy';
        insight.description = `Your debt-to-income ratio is ${debtToIncomeRatio.toFixed(1)}%. `;

        if (debtToIncomeRatio > 200) {
          insight.description += 'This high ratio suggests prioritizing debt reduction.';
          insight.actions = [
            'Create a debt repayment plan',
            'Consider debt consolidation',
            'Focus on high-interest debt first',
            'Avoid taking on new debt'
          ];
        } else if (highInterestDebt.length > 0) {
          insight.description += `You have ${highInterestDebt.length} high-interest debt(s) to prioritize.`;
          insight.actions = [
            'Pay off high-interest debt first',
            'Consider balance transfers for lower rates',
            'Make extra payments when possible'
          ];
        } else {
          insight.description += 'Your debt levels appear manageable.';
          insight.actions = [
            'Continue regular payments',
            'Consider extra payments to reduce total interest'
          ];
        }
      } else {
        insight.title = 'Stratégie d\'optimisation des dettes';
        insight.description = `Votre ratio dette/revenus est de ${debtToIncomeRatio.toFixed(1)}%. `;

        if (debtToIncomeRatio > 200) {
          insight.description += 'Ce ratio élevé suggère de prioriser la réduction des dettes.';
          insight.actions = [
            'Créer un plan de remboursement des dettes',
            'Considérer la consolidation de dettes',
            'Se concentrer d\'abord sur les dettes à taux élevé',
            'Éviter de contracter de nouvelles dettes'
          ];
        } else if (highInterestDebt.length > 0) {
          insight.description += `Vous avez ${highInterestDebt.length} dette(s) à taux élevé à prioriser.`;
          insight.actions = [
            'Rembourser d\'abord les dettes à taux élevé',
            'Considérer les transferts de solde pour des taux plus bas',
            'Faire des paiements supplémentaires quand possible'
          ];
        } else {
          insight.description += 'Vos niveaux de dette semblent gérables.';
          insight.actions = [
            'Continuer les paiements réguliers',
            'Considérer des paiements supplémentaires pour réduire les intérêts totaux'
          ];
        }
      }

      insight.metrics = {
        'Total Debt': `€${totalDebt.toFixed(0)}`,
        'Debt-to-Income': `${debtToIncomeRatio.toFixed(1)}%`,
        'High Interest Debts': highInterestDebt.length
      };

      return insight;

    } catch (error) {
      logger.error('Error analyzing debt situation:', error);
      return null;
    }
  }

  /**
   * Optimize savings strategy
   */
  async optimizeSavingsStrategy(profile, lang) {
    try {
      const { financial, goals } = profile;

      if (financial.savingsRate < 0) {
        return {
          type: this.insightTypes.SAVINGS_STRATEGY,
          title: lang === 'en' ? 'Emergency: Negative Savings Rate' : 'Urgence: Taux d\'épargne négatif',
          description: lang === 'en'
            ? 'You\'re spending more than you earn. Immediate budget review required.'
            : 'Vous dépensez plus que vous ne gagnez. Révision immédiate du budget nécessaire.',
          priority: this.riskLevels.CRITICAL,
          confidence: 1.0,
          actions: lang === 'en'
            ? ['Review all expenses immediately', 'Cut non-essential spending', 'Consider additional income sources']
            : ['Réviser toutes les dépenses immédiatement', 'Couper les dépenses non-essentielles', 'Considérer des sources de revenus supplémentaires']
        };
      }

      const recommendedSavingsRate = financial.totalLiabilities > 0 ? 15 : 20; // Lower if debt exists
      const hasEmergencyFund = financial.liquidAssets >= financial.monthlyExpenses * 3;

      let insight = {
        type: this.insightTypes.SAVINGS_STRATEGY,
        priority: financial.savingsRate < 10 ? this.riskLevels.HIGH : this.riskLevels.MEDIUM,
        confidence: 0.85
      };

      if (lang === 'en') {
        insight.title = 'Savings Strategy Optimization';
        insight.description = `Your current savings rate is ${financial.savingsRate.toFixed(1)}%. `;

        if (!hasEmergencyFund) {
          insight.description += 'Priority: Build emergency fund (3-6 months of expenses).';
          insight.actions = [
            'Build emergency fund first',
            'Aim for 3-6 months of expenses',
            'Keep in high-yield savings account'
          ];
        } else if (financial.savingsRate < recommendedSavingsRate) {
          insight.description += `Consider increasing to ${recommendedSavingsRate}% for optimal long-term wealth building.`;
          insight.actions = [
            'Automate savings transfers',
            'Review budget for optimization',
            'Consider the 50/30/20 budgeting rule'
          ];
        } else {
          insight.description += 'Excellent savings rate! Focus on investment optimization.';
          insight.actions = [
            'Consider investment opportunities',
            'Maximize tax-advantaged accounts',
            'Review asset allocation'
          ];
        }
      } else {
        insight.title = 'Optimisation de la stratégie d\'épargne';
        insight.description = `Votre taux d\'épargne actuel est de ${financial.savingsRate.toFixed(1)}%. `;

        if (!hasEmergencyFund) {
          insight.description += 'Priorité: Constituer un fonds d\'urgence (3-6 mois de dépenses).';
          insight.actions = [
            'Constituer d\'abord un fonds d\'urgence',
            'Viser 3-6 mois de dépenses',
            'Garder dans un compte épargne rémunéré'
          ];
        } else if (financial.savingsRate < recommendedSavingsRate) {
          insight.description += `Considérez augmenter à ${recommendedSavingsRate}% pour une construction optimale de patrimoine.`;
          insight.actions = [
            'Automatiser les virements d\'épargne',
            'Réviser le budget pour optimisation',
            'Considérer la règle budgétaire 50/30/20'
          ];
        } else {
          insight.description += 'Excellent taux d\'épargne! Concentrez-vous sur l\'optimisation des investissements.';
          insight.actions = [
            'Considérer les opportunités d\'investissement',
            'Maximiser les comptes avantagés fiscalement',
            'Réviser l\'allocation d\'actifs'
          ];
        }
      }

      insight.metrics = {
        'Savings Rate': `${financial.savingsRate.toFixed(1)}%`,
        'Emergency Fund': hasEmergencyFund ? 'Yes' : 'No',
        'Liquid Assets': `€${financial.liquidAssets.toFixed(0)}`
      };

      return insight;

    } catch (error) {
      logger.error('Error optimizing savings strategy:', error);
      return null;
    }
  }

  /**
   * Assess financial risks
   */
  async assessFinancialRisks(profile, lang) {
    try {
      const { financial, accounts, assets } = profile;

      const risks = [];

      // Check concentration risk
      const singleAssetExposure = assets.reduce((max, asset) =>
        Math.max(max, asset.totalValue / financial.totalAssets), 0) * 100;

      if (singleAssetExposure > 20) {
        risks.push(lang === 'en' ? 'High concentration in single asset' : 'Forte concentration dans un seul actif');
      }

      // Check liquidity risk
      const liquidityRatio = financial.liquidAssets / financial.totalAssets * 100;
      if (liquidityRatio < 10) {
        risks.push(lang === 'en' ? 'Low liquidity ratio' : 'Ratio de liquidité faible');
      }

      // Check debt service coverage
      const debtPayments = financial.totalLiabilities * 0.05; // Estimate 5% annual payment
      if (debtPayments > financial.monthlyIncome * 12 * 0.3) {
        risks.push(lang === 'en' ? 'High debt service ratio' : 'Ratio de service de dette élevé');
      }

      if (risks.length === 0) {
        return null;
      }

      return {
        type: this.insightTypes.RISK_ASSESSMENT,
        title: lang === 'en' ? 'Financial Risk Assessment' : 'Évaluation des risques financiers',
        description: lang === 'en'
          ? `${risks.length} potential risk(s) identified in your financial profile.`
          : `${risks.length} risque(s) potentiel(s) identifié(s) dans votre profil financier.`,
        priority: risks.length > 2 ? this.riskLevels.HIGH : this.riskLevels.MEDIUM,
        confidence: 0.8,
        actions: risks,
        metrics: {
          'Risk Count': risks.length,
          'Asset Concentration': `${singleAssetExposure.toFixed(1)}%`,
          'Liquidity Ratio': `${liquidityRatio.toFixed(1)}%`
        }
      };

    } catch (error) {
      logger.error('Error assessing financial risks:', error);
      return null;
    }
  }

  /**
   * Provide guidance on financial goals
   */
  async provideGoalGuidance(profile, lang) {
    try {
      const { goals, financial } = profile;

      if (goals.length === 0) {
        return {
          type: this.insightTypes.GOAL_GUIDANCE,
          title: lang === 'en' ? 'Set Financial Goals' : 'Définir des objectifs financiers',
          description: lang === 'en'
            ? 'Setting clear financial goals helps guide your savings and investment decisions.'
            : 'Définir des objectifs financiers clairs aide à guider vos décisions d\'épargne et d\'investissement.',
          priority: this.riskLevels.MEDIUM,
          confidence: 0.9,
          actions: lang === 'en'
            ? ['Set emergency fund goal', 'Define retirement savings target', 'Plan for major purchases']
            : ['Définir un objectif de fonds d\'urgence', 'Définir un objectif d\'épargne retraite', 'Planifier les achats importants']
        };
      }

      const behindGoals = goals.filter(g => (g.progressPercentage || 0) < 50);

      if (behindGoals.length > 0) {
        return {
          type: this.insightTypes.GOAL_GUIDANCE,
          title: lang === 'en' ? 'Goal Progress Review' : 'Révision de la progression des objectifs',
          description: lang === 'en'
            ? `${behindGoals.length} of your goals are behind schedule. Consider adjusting timelines or savings amounts.`
            : `${behindGoals.length} de vos objectifs sont en retard. Considérez ajuster les échéances ou les montants d\'épargne.`,
          priority: this.riskLevels.MEDIUM,
          confidence: 0.8,
          actions: lang === 'en'
            ? ['Review goal timelines', 'Increase savings rate', 'Prioritize most important goals']
            : ['Réviser les échéances des objectifs', 'Augmenter le taux d\'épargne', 'Prioriser les objectifs les plus importants'],
          metrics: {
            'Behind Schedule': behindGoals.length,
            'Total Goals': goals.length
          }
        };
      }

      return null;

    } catch (error) {
      logger.error('Error providing goal guidance:', error);
      return null;
    }
  }

  /**
   * Generate market-specific insights using AI
   */
  async generateMarketInsights(profile, lang) {
    try {
      const prompt = lang === 'en'
        ? `Based on current market conditions and this user profile:
           - Net worth: €${profile.financial.netWorth}
           - Age: ${profile.age}
           - Risk tolerance: ${profile.riskTolerance}
           - Asset allocation: ${JSON.stringify(profile.assets.reduce((acc, a) => {
             acc[a.type] = (acc[a.type] || 0) + a.totalValue;
             return acc;
           }, {}))}

           Provide 2-3 actionable market insights in English. Format as JSON array with objects having 'title', 'description', 'priority', 'actions' fields.`
        : `Basé sur les conditions de marché actuelles et ce profil utilisateur:
           - Patrimoine net: ${profile.financial.netWorth}€
           - Âge: ${profile.age}
           - Tolérance au risque: ${profile.riskTolerance}
           - Allocation d'actifs: ${JSON.stringify(profile.assets.reduce((acc, a) => {
             acc[a.type] = (acc[a.type] || 0) + a.totalValue;
             return acc;
           }, {}))}

           Fournissez 2-3 insights de marché actionnables en français. Format JSON array avec objets ayant les champs 'title', 'description', 'priority', 'actions'.`;

      const aiInsights = await aiService.getAISuggestions('financial_market', prompt, lang);

      return Array.isArray(aiInsights) ? aiInsights.map(insight => ({
        ...insight,
        type: this.insightTypes.INVESTMENT_ADVICE,
        confidence: 0.7 // AI-generated insights have lower confidence
      })) : [];

    } catch (error) {
      logger.error('Error generating market insights:', error);
      return [];
    }
  }

  /**
   * Get priority weight for sorting insights
   */
  getPriorityWeight(priority) {
    const weights = {
      [this.riskLevels.CRITICAL]: 4,
      [this.riskLevels.HIGH]: 3,
      [this.riskLevels.MEDIUM]: 2,
      [this.riskLevels.LOW]: 1
    };
    return weights[priority] || 1;
  }

  /**
   * Cache insights for performance
   */
  async cacheInsights(userId, insights) {
    try {
      const cacheKey = `financial_insights_${userId}`;
      await cacheService.set(cacheKey, insights, 3600); // Cache for 1 hour
    } catch (error) {
      logger.error('Error caching insights:', error);
    }
  }

  /**
   * Get cached insights
   */
  async getCachedInsights(userId) {
    try {
      const cacheKey = `financial_insights_${userId}`;
      return await cacheService.get(cacheKey);
    } catch (error) {
      logger.error('Error getting cached insights:', error);
      return null;
    }
  }
}

module.exports = new FinancialAIService();