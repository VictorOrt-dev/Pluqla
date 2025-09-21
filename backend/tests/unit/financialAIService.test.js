const financialAIService = require('../../src/services/financialAIService');

// Mock the AI providers
jest.mock('../../src/services/aiService', () => ({
  generateResponse: jest.fn()
}));

const aiService = require('../../src/services/aiService');

describe('FinancialAIService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeFinancialProfile', () => {
    const mockProfile = {
      accounts: [
        { type: 'checking', balance: 1500, currency: 'EUR' },
        { type: 'savings', balance: 10000, currency: 'EUR' }
      ],
      transactions: [
        { amount: -50, category: 'alimentation', date: '2024-01-15' },
        { amount: -200, category: 'deplacement', date: '2024-01-14' }
      ],
      assets: [
        { type: 'stock', totalValue: 5000, currency: 'EUR' }
      ],
      liabilities: [
        { type: 'mortgage', balance: 150000, interestRate: 2.5 }
      ],
      goals: [
        { type: 'emergency_fund', targetAmount: 15000, currentAmount: 5000 }
      ]
    };

    test('should analyze complete financial profile in French', async () => {
      const mockAIResponse = {
        insights: [
          {
            type: 'spending_analysis',
            title: 'Analyse des dépenses',
            content: 'Vos dépenses alimentaires représentent un pourcentage raisonnable.',
            confidence: 0.85,
            priority: 'medium',
            actionable: true,
            category: 'spending'
          }
        ],
        recommendations: [
          {
            type: 'savings_optimization',
            title: 'Optimisation épargne',
            description: 'Augmentez votre épargne de précaution',
            impact: 'high',
            effort: 'low',
            confidence: 0.9
          }
        ],
        risks: [
          {
            type: 'emergency_fund',
            level: 'medium',
            description: 'Fonds d\'urgence insuffisant',
            mitigation: 'Augmenter le fonds d\'urgence à 6 mois d\'expenses'
          }
        ]
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.analyzeFinancialProfile(mockProfile, 'fr');

      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('summary');

      expect(result.insights).toHaveLength(1);
      expect(result.insights[0]).toHaveProperty('confidence');
      expect(result.insights[0].confidence).toBeGreaterThan(0);
      expect(result.insights[0].confidence).toBeLessThanOrEqual(1);

      expect(aiService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Analysez ce profil financier'),
        expect.objectContaining({
          provider: 'claude',
          temperature: 0.3
        })
      );
    });

    test('should analyze profile in English', async () => {
      const mockAIResponse = {
        insights: [
          {
            type: 'spending_analysis',
            title: 'Spending Analysis',
            content: 'Your food expenses are within reasonable limits.',
            confidence: 0.85,
            priority: 'medium',
            actionable: true,
            category: 'spending'
          }
        ],
        recommendations: [],
        risks: []
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.analyzeFinancialProfile(mockProfile, 'en');

      expect(aiService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Analyze this financial profile'),
        expect.any(Object)
      );
    });

    test('should handle AI service errors gracefully', async () => {
      aiService.generateResponse.mockRejectedValue(new Error('AI service unavailable'));

      const result = await financialAIService.analyzeFinancialProfile(mockProfile, 'fr');

      expect(result).toEqual({
        insights: [],
        recommendations: [],
        risks: [],
        summary: {
          overallHealth: 'unknown',
          confidence: 0,
          analysisDate: expect.any(String)
        }
      });
    });

    test('should handle empty profile', async () => {
      const emptyProfile = {
        accounts: [],
        transactions: [],
        assets: [],
        liabilities: [],
        goals: []
      };

      const result = await financialAIService.analyzeFinancialProfile(emptyProfile, 'fr');

      expect(result.insights).toEqual([]);
      expect(result.summary.overallHealth).toBe('unknown');
    });
  });

  describe('analyzeSpendingPatterns', () => {
    const mockSpendingProfile = {
      spendingByCategory: {
        alimentation: { total: 400, transactions: 15 },
        deplacement: { total: 200, transactions: 8 },
        habits: { total: 100, transactions: 5 }
      },
      financial: {
        monthlyIncome: 3000,
        totalSpending: 700
      }
    };

    test('should analyze spending patterns with actionable insights', async () => {
      const mockAIResponse = {
        patterns: [
          {
            category: 'alimentation',
            insight: 'Dépenses alimentaires élevées comparé au revenu',
            trend: 'increasing',
            confidence: 0.8
          }
        ],
        recommendations: [
          {
            category: 'alimentation',
            action: 'Planifier les repas pour réduire les achats impulsifs',
            potentialSavings: 80,
            difficulty: 'easy'
          }
        ]
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.analyzeSpendingPatterns(mockSpendingProfile, 'fr');

      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('recommendations');
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toHaveProperty('confidence');
    });

    test('should provide Spanish language analysis', async () => {
      const mockAIResponse = {
        patterns: [
          {
            category: 'alimentacion',
            insight: 'Gastos de alimentación altos comparado con ingresos',
            trend: 'increasing',
            confidence: 0.8
          }
        ],
        recommendations: []
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.analyzeSpendingPatterns(mockSpendingProfile, 'es');

      expect(aiService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Analiza estos patrones de gasto'),
        expect.any(Object)
      );
    });
  });

  describe('generateInvestmentAdvice', () => {
    const mockInvestmentProfile = {
      riskTolerance: 'moderate',
      investmentHorizon: 'long_term',
      currentAssets: [
        { type: 'stock', symbol: 'AAPL', totalValue: 5000 },
        { type: 'etf', symbol: 'SPY', totalValue: 3000 }
      ],
      financialGoals: [
        { type: 'retirement', targetAmount: 500000, targetDate: '2050-01-01' }
      ],
      monthlyInvestmentCapacity: 500
    };

    test('should generate personalized investment advice', async () => {
      const mockAIResponse = {
        recommendations: [
          {
            type: 'diversification',
            advice: 'Diversifiez votre portefeuille avec des ETF européens',
            reasoning: 'Réduire le risque de concentration géographique',
            allocation: { stocks: 70, bonds: 20, other: 10 },
            confidence: 0.85
          }
        ],
        riskAssessment: {
          currentRisk: 'high',
          recommendedRisk: 'moderate',
          adjustments: ['Ajouter des obligations', 'Réduire l\'exposition aux actions individuelles']
        }
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.generateInvestmentAdvice(mockInvestmentProfile, 'fr');

      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('riskAssessment');
      expect(result.recommendations[0]).toHaveProperty('confidence');
      expect(result.recommendations[0].confidence).toBeGreaterThan(0);
    });

    test('should adjust advice based on risk tolerance', async () => {
      const conservativeProfile = {
        ...mockInvestmentProfile,
        riskTolerance: 'conservative'
      };

      const mockAIResponse = {
        recommendations: [
          {
            type: 'conservative_allocation',
            advice: 'Privilégiez les obligations et fonds monétaires',
            allocation: { stocks: 30, bonds: 60, cash: 10 },
            confidence: 0.9
          }
        ],
        riskAssessment: {
          currentRisk: 'low',
          recommendedRisk: 'low'
        }
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.generateInvestmentAdvice(conservativeProfile, 'fr');

      expect(aiService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('conservative'),
        expect.any(Object)
      );
    });
  });

  describe('optimizeDebtStrategy', () => {
    const mockDebtProfile = {
      liabilities: [
        {
          type: 'credit_card',
          balance: 2000,
          interestRate: 18.5,
          minimumPayment: 50
        },
        {
          type: 'personal_loan',
          balance: 15000,
          interestRate: 8.2,
          minimumPayment: 300
        }
      ],
      monthlyExtraPaymentCapacity: 200
    };

    test('should optimize debt payment strategy', async () => {
      const mockAIResponse = {
        strategy: 'avalanche',
        paymentPlan: [
          {
            debt: 'credit_card',
            priority: 1,
            reason: 'Taux d\'intérêt le plus élevé',
            recommendedPayment: 250
          },
          {
            debt: 'personal_loan',
            priority: 2,
            reason: 'Taux d\'intérêt plus faible',
            recommendedPayment: 300
          }
        ],
        projectedSavings: 2500,
        timeToDebtFree: 24
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.optimizeDebtStrategy(mockDebtProfile, 'fr');

      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('paymentPlan');
      expect(result).toHaveProperty('projectedSavings');
      expect(result.paymentPlan).toHaveLength(2);
      expect(result.paymentPlan[0].priority).toBe(1);
    });

    test('should handle single debt scenario', async () => {
      const singleDebtProfile = {
        liabilities: [
          {
            type: 'mortgage',
            balance: 200000,
            interestRate: 3.5,
            minimumPayment: 1200
          }
        ],
        monthlyExtraPaymentCapacity: 300
      };

      const mockAIResponse = {
        strategy: 'extra_payment',
        paymentPlan: [
          {
            debt: 'mortgage',
            priority: 1,
            recommendedPayment: 1500
          }
        ],
        projectedSavings: 45000,
        timeToDebtFree: 300
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.optimizeDebtStrategy(singleDebtProfile, 'fr');

      expect(result.paymentPlan).toHaveLength(1);
    });
  });

  describe('detectAnomalies', () => {
    const mockTransactions = [
      { amount: -50, description: 'Grocery Store', category: 'alimentation', date: '2024-01-15' },
      { amount: -1500, description: 'Expensive Purchase', category: 'habits', date: '2024-01-14' },
      { amount: -25, description: 'Coffee Shop', category: 'alimentation', date: '2024-01-13' }
    ];

    test('should detect spending anomalies', async () => {
      const mockAIResponse = {
        anomalies: [
          {
            transaction: {
              amount: -1500,
              description: 'Expensive Purchase'
            },
            type: 'unusual_amount',
            severity: 'high',
            reason: 'Dépense 30x supérieure à la moyenne de cette catégorie',
            confidence: 0.95
          }
        ],
        summary: {
          totalAnomalies: 1,
          highSeverity: 1,
          mediumSeverity: 0,
          lowSeverity: 0
        }
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.detectAnomalies(mockTransactions, 'fr');

      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('summary');
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0]).toHaveProperty('confidence');
      expect(result.anomalies[0].severity).toBe('high');
    });

    test('should handle transactions with no anomalies', async () => {
      const normalTransactions = [
        { amount: -50, description: 'Grocery Store', category: 'alimentation' },
        { amount: -45, description: 'Supermarket', category: 'alimentation' }
      ];

      const mockAIResponse = {
        anomalies: [],
        summary: {
          totalAnomalies: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0
        }
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.detectAnomalies(normalTransactions, 'fr');

      expect(result.anomalies).toHaveLength(0);
      expect(result.summary.totalAnomalies).toBe(0);
    });
  });

  describe('generateBudgetOptimization', () => {
    const mockBudgetData = {
      monthlyIncome: 3500,
      currentSpending: {
        alimentation: 400,
        deplacement: 300,
        habits: 200,
        activite: 150
      },
      savingsGoal: 500
    };

    test('should generate budget optimization suggestions', async () => {
      const mockAIResponse = {
        optimizations: [
          {
            category: 'deplacement',
            currentAmount: 300,
            recommendedAmount: 250,
            potentialSavings: 50,
            difficulty: 'easy',
            suggestions: ['Utiliser les transports en commun plus souvent']
          }
        ],
        newBudgetAllocation: {
          alimentation: 380,
          deplacement: 250,
          habits: 180,
          activite: 150,
          savings: 540
        },
        feasibility: 0.85
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.generateBudgetOptimization(mockBudgetData, 'fr');

      expect(result).toHaveProperty('optimizations');
      expect(result).toHaveProperty('newBudgetAllocation');
      expect(result).toHaveProperty('feasibility');
      expect(result.feasibility).toBeGreaterThan(0);
      expect(result.feasibility).toBeLessThanOrEqual(1);
    });

    test('should handle unrealistic savings goals', async () => {
      const unrealisticBudget = {
        ...mockBudgetData,
        savingsGoal: 2000 // More than half of income
      };

      const mockAIResponse = {
        optimizations: [],
        newBudgetAllocation: mockBudgetData.currentSpending,
        feasibility: 0.1,
        warning: 'Objectif d\'épargne trop élevé par rapport aux revenus'
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.generateBudgetOptimization(unrealisticBudget, 'fr');

      expect(result.feasibility).toBeLessThan(0.5);
      expect(result).toHaveProperty('warning');
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle malformed AI responses', async () => {
      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: 'invalid_json_string'
      });

      const mockProfile = {
        accounts: [],
        transactions: [],
        assets: [],
        liabilities: [],
        goals: []
      };

      const result = await financialAIService.analyzeFinancialProfile(mockProfile, 'fr');

      expect(result.insights).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(result.risks).toEqual([]);
    });

    test('should handle network timeouts gracefully', async () => {
      aiService.generateResponse.mockRejectedValue(new Error('TIMEOUT'));

      const result = await financialAIService.analyzeSpendingPatterns({
        spendingByCategory: {},
        financial: {}
      }, 'fr');

      expect(result).toEqual({
        patterns: [],
        recommendations: []
      });
    });

    test('should validate confidence scores', async () => {
      const mockAIResponse = {
        insights: [
          {
            type: 'test',
            confidence: 1.5 // Invalid confidence > 1
          },
          {
            type: 'test2',
            confidence: -0.1 // Invalid confidence < 0
          },
          {
            type: 'test3',
            confidence: 0.8 // Valid confidence
          }
        ]
      };

      aiService.generateResponse.mockResolvedValue({
        success: true,
        data: mockAIResponse
      });

      const result = await financialAIService.analyzeFinancialProfile({
        accounts: [],
        transactions: [],
        assets: [],
        liabilities: [],
        goals: []
      }, 'fr');

      // Should filter out invalid confidence scores
      const validInsights = result.insights.filter(insight =>
        insight.confidence >= 0 && insight.confidence <= 1
      );
      expect(validInsights).toHaveLength(1);
      expect(validInsights[0].confidence).toBe(0.8);
    });
  });
});