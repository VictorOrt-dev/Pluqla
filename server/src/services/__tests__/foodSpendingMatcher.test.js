/**
 * Unit Tests - foodSpendingMatcher Service
 *
 * Phase 5: Prévision vs Réalité
 *
 * Coverage:
 * - isAmountWithinTolerance: Tolerance calculations
 * - isDateWithinRange: Date range validation
 * - isFoodCategory: Category detection
 * - findPotentialMatches: Score-based matching algorithm
 * - matchSingleForecast: Single forecast matching
 * - matchUserForecasts: Batch user matching
 * - getForecastVsRealityStats: Statistics calculation
 */

const foodSpendingMatcher = require('../foodSpendingMatcher');
const { prisma } = require('../../lib/prisma');
const logger = require('../../utils/logger');

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  prisma: {
    foodSpendingLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    accountTransaction: {
      findMany: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('foodSpendingMatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAmountWithinTolerance', () => {
    it('should return true for exact match', () => {
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 100, 10)).toBe(true);
    });

    it('should return true for amount within +10% tolerance', () => {
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 109, 10)).toBe(true);
    });

    it('should return true for amount within -10% tolerance', () => {
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 91, 10)).toBe(true);
    });

    it('should return false for amount above +10% tolerance', () => {
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 111, 10)).toBe(false);
    });

    it('should return false for amount below -10% tolerance', () => {
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 89, 10)).toBe(false);
    });

    it('should handle edge case at exact boundary', () => {
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 110, 10)).toBe(true);
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 90, 10)).toBe(true);
    });

    it('should use default 10% tolerance if not provided', () => {
      expect(foodSpendingMatcher.isAmountWithinTolerance(100, 105)).toBe(true);
    });
  });

  describe('isDateWithinRange', () => {
    it('should return true for same date', () => {
      const date = new Date('2025-01-15');
      expect(foodSpendingMatcher.isDateWithinRange(date, date, 3)).toBe(true);
    });

    it('should return true for date within +3 days', () => {
      const plannedDate = new Date('2025-01-15');
      const actualDate = new Date('2025-01-17'); // +2 days
      expect(foodSpendingMatcher.isDateWithinRange(plannedDate, actualDate, 3)).toBe(true);
    });

    it('should return true for date within -3 days', () => {
      const plannedDate = new Date('2025-01-15');
      const actualDate = new Date('2025-01-13'); // -2 days
      expect(foodSpendingMatcher.isDateWithinRange(plannedDate, actualDate, 3)).toBe(true);
    });

    it('should return false for date beyond +3 days', () => {
      const plannedDate = new Date('2025-01-15');
      const actualDate = new Date('2025-01-19'); // +4 days
      expect(foodSpendingMatcher.isDateWithinRange(plannedDate, actualDate, 3)).toBe(false);
    });

    it('should return false for date beyond -3 days', () => {
      const plannedDate = new Date('2025-01-15');
      const actualDate = new Date('2025-01-11'); // -4 days
      expect(foodSpendingMatcher.isDateWithinRange(plannedDate, actualDate, 3)).toBe(false);
    });

    it('should handle edge case at exact boundary (3 days)', () => {
      const plannedDate = new Date('2025-01-15');
      const actualDate = new Date('2025-01-18'); // Exactly +3 days
      expect(foodSpendingMatcher.isDateWithinRange(plannedDate, actualDate, 3)).toBe(true);
    });
  });

  describe('isFoodCategory', () => {
    it('should return true for "alimentation"', () => {
      expect(foodSpendingMatcher.isFoodCategory('alimentation')).toBe(true);
    });

    it('should return true for "Supermarché" (case insensitive)', () => {
      expect(foodSpendingMatcher.isFoodCategory('Supermarché')).toBe(true);
    });

    it('should return true for "Restaurant"', () => {
      expect(foodSpendingMatcher.isFoodCategory('Restaurant')).toBe(true);
    });

    it('should return true for "food"', () => {
      expect(foodSpendingMatcher.isFoodCategory('food')).toBe(true);
    });

    it('should return true for "grocery"', () => {
      expect(foodSpendingMatcher.isFoodCategory('grocery')).toBe(true);
    });

    it('should return true for "épicerie"', () => {
      expect(foodSpendingMatcher.isFoodCategory('épicerie')).toBe(true);
    });

    it('should return true for partial match "Courses Alimentaires"', () => {
      expect(foodSpendingMatcher.isFoodCategory('Courses Alimentaires')).toBe(true);
    });

    it('should return false for non-food category', () => {
      expect(foodSpendingMatcher.isFoodCategory('Transport')).toBe(false);
    });

    it('should return false for null category', () => {
      expect(foodSpendingMatcher.isFoodCategory(null)).toBe(false);
    });

    it('should return false for undefined category', () => {
      expect(foodSpendingMatcher.isFoodCategory(undefined)).toBe(false);
    });

    it('should handle extra whitespace', () => {
      expect(foodSpendingMatcher.isFoodCategory('  Restaurant  ')).toBe(true);
    });
  });

  describe('findPotentialMatches', () => {
    const mockForecast = {
      id: 'forecast-1',
      userId: 'user-1',
      date: new Date('2025-01-15T12:00:00Z'),
      estimatedPriceEur: 50.0,
      status: 'forecast',
    };

    it('should find exact match with score 100', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-15T12:00:00Z'),
          amount: -50.0,
          category: 'Alimentation',
          linkedForecastId: null,
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchScore).toBe(100);
      expect(matches[0].transaction.id).toBe('txn-1');
      expect(matches[0].amountDiff).toBe(0);
      expect(matches[0].dateDiffDays).toBe(0);
    });

    it('should skip transactions with non-food categories', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-15T12:00:00Z'),
          amount: -50.0,
          category: 'Transport',
          linkedForecastId: null,
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);
      expect(matches).toHaveLength(0);
    });

    it('should skip transactions already linked to another forecast', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-15T12:00:00Z'),
          amount: -50.0,
          category: 'Alimentation',
          linkedForecastId: 'other-forecast-id',
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);
      expect(matches).toHaveLength(0);
    });

    it('should skip transactions outside date range (±3 days)', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-20T12:00:00Z'), // +5 days
          amount: -50.0,
          category: 'Alimentation',
          linkedForecastId: null,
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);
      expect(matches).toHaveLength(0);
    });

    it('should skip transactions outside amount tolerance (±10%)', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-15T12:00:00Z'),
          amount: -60.0, // 20% more
          category: 'Alimentation',
          linkedForecastId: null,
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);
      expect(matches).toHaveLength(0);
    });

    it('should calculate lower score for less accurate matches', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-16T12:00:00Z'), // +1 day
          amount: -52.0, // +4% amount
          category: 'Alimentation',
          linkedForecastId: null,
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchScore).toBeLessThan(100);
      expect(matches[0].matchScore).toBeGreaterThan(80); // Should still be relatively high
    });

    it('should sort matches by score (best first)', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-17T12:00:00Z'), // +2 days
          amount: -52.0, // +4%
          category: 'Alimentation',
          linkedForecastId: null,
        },
        {
          id: 'txn-2',
          date: new Date('2025-01-15T12:00:00Z'), // Exact date
          amount: -50.5, // +1%
          category: 'Restaurant',
          linkedForecastId: null,
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);

      expect(matches).toHaveLength(2);
      expect(matches[0].transaction.id).toBe('txn-2'); // Better match first
      expect(matches[0].matchScore).toBeGreaterThan(matches[1].matchScore);
    });

    it('should handle absolute value of transaction amount', () => {
      const transactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-15T12:00:00Z'),
          amount: -50.0, // Negative (expense)
          category: 'Alimentation',
          linkedForecastId: null,
        },
      ];

      const matches = foodSpendingMatcher.findPotentialMatches(mockForecast, transactions);
      expect(matches).toHaveLength(1);
      expect(matches[0].matchScore).toBe(100);
    });
  });

  describe('matchSingleForecast', () => {
    it('should successfully match forecast with best transaction', async () => {
      const mockForecast = {
        id: 'forecast-1',
        userId: 'user-1',
        date: new Date('2025-01-15'),
        estimatedPriceEur: 50.0,
        status: 'forecast',
        recipeName: 'Pasta Carbonara',
      };

      const mockTransactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-15'),
          amount: -50.0,
          category: 'Alimentation',
          linkedForecastId: null,
        },
      ];

      prisma.foodSpendingLog.findUnique.mockResolvedValueOnce(mockForecast);
      prisma.foodSpendingLog.update.mockResolvedValueOnce({
        ...mockForecast,
        status: 'matched',
        actualPriceEur: 50.0,
        linkedTransactionId: 'txn-1',
        dateMatched: new Date(),
      });

      const result = await foodSpendingMatcher.matchSingleForecast('forecast-1', mockTransactions);

      expect(result).toBeDefined();
      expect(result.status).toBe('matched');
      expect(result.actualPriceEur).toBe(50.0);
      expect(result.linkedTransactionId).toBe('txn-1');
      expect(prisma.foodSpendingLog.update).toHaveBeenCalledWith({
        where: { id: 'forecast-1' },
        data: expect.objectContaining({
          status: 'matched',
          actualPriceEur: 50.0,
          linkedTransactionId: 'txn-1',
          dateMatched: expect.any(Date),
        }),
      });
    });

    it('should return null if forecast not found', async () => {
      prisma.foodSpendingLog.findUnique.mockResolvedValueOnce(null);

      const result = await foodSpendingMatcher.matchSingleForecast('nonexistent', []);

      expect(result).toBeNull();
      expect(prisma.foodSpendingLog.update).not.toHaveBeenCalled();
    });

    it('should return null if forecast status is not "forecast"', async () => {
      const mockForecast = {
        id: 'forecast-1',
        status: 'matched', // Already matched
      };

      prisma.foodSpendingLog.findUnique.mockResolvedValueOnce(mockForecast);

      const result = await foodSpendingMatcher.matchSingleForecast('forecast-1', []);

      expect(result).toBeNull();
    });

    it('should return null if no matching transactions found', async () => {
      const mockForecast = {
        id: 'forecast-1',
        userId: 'user-1',
        date: new Date('2025-01-15'),
        estimatedPriceEur: 50.0,
        status: 'forecast',
      };

      const mockTransactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-25'), // Far future
          amount: -50.0,
          category: 'Alimentation',
        },
      ];

      prisma.foodSpendingLog.findUnique.mockResolvedValueOnce(mockForecast);

      const result = await foodSpendingMatcher.matchSingleForecast('forecast-1', mockTransactions);

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(
        'No matches found for forecast',
        expect.any(Object)
      );
    });
  });

  describe('matchUserForecasts', () => {
    it('should match multiple forecasts for a user', async () => {
      const mockForecasts = [
        {
          id: 'forecast-1',
          userId: 'user-1',
          date: new Date('2025-01-15'),
          estimatedPriceEur: 50.0,
          status: 'forecast',
        },
        {
          id: 'forecast-2',
          userId: 'user-1',
          date: new Date('2025-01-16'),
          estimatedPriceEur: 30.0,
          status: 'forecast',
        },
      ];

      const mockTransactions = [
        {
          id: 'txn-1',
          date: new Date('2025-01-15'),
          amount: -50.0,
          category: 'Alimentation',
          account: { id: 'acc-1', name: 'Main Account' },
        },
        {
          id: 'txn-2',
          date: new Date('2025-01-16'),
          amount: -30.0,
          category: 'Restaurant',
          account: { id: 'acc-1', name: 'Main Account' },
        },
      ];

      prisma.foodSpendingLog.findMany.mockResolvedValueOnce(mockForecasts);
      prisma.accountTransaction.findMany.mockResolvedValueOnce(mockTransactions);

      // Mock findUnique and update for each forecast
      prisma.foodSpendingLog.findUnique
        .mockResolvedValueOnce(mockForecasts[0])
        .mockResolvedValueOnce(mockForecasts[1]);

      prisma.foodSpendingLog.update
        .mockResolvedValueOnce({ ...mockForecasts[0], status: 'matched' })
        .mockResolvedValueOnce({ ...mockForecasts[1], status: 'matched' });

      const result = await foodSpendingMatcher.matchUserForecasts('user-1');

      expect(result.matched).toBe(2);
      expect(result.archived).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.forecasts).toHaveLength(2);
    });

    it('should archive old forecasts without matches', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const mockForecasts = [
        {
          id: 'forecast-old',
          userId: 'user-1',
          date: oldDate,
          estimatedPriceEur: 50.0,
          status: 'forecast',
        },
      ];

      prisma.foodSpendingLog.findMany.mockResolvedValueOnce(mockForecasts);
      prisma.accountTransaction.findMany.mockResolvedValueOnce([]);
      prisma.foodSpendingLog.findUnique.mockResolvedValueOnce(mockForecasts[0]);
      prisma.foodSpendingLog.update.mockResolvedValueOnce({
        ...mockForecasts[0],
        status: 'archived',
      });

      const result = await foodSpendingMatcher.matchUserForecasts('user-1');

      expect(result.matched).toBe(0);
      expect(result.archived).toBe(1);
      expect(result.pending).toBe(0);
      expect(prisma.foodSpendingLog.update).toHaveBeenCalledWith({
        where: { id: 'forecast-old' },
        data: { status: 'archived' },
      });
    });

    it('should keep recent forecasts as pending if no match', async () => {
      const recentDate = new Date();

      const mockForecasts = [
        {
          id: 'forecast-recent',
          userId: 'user-1',
          date: recentDate,
          estimatedPriceEur: 50.0,
          status: 'forecast',
        },
      ];

      prisma.foodSpendingLog.findMany.mockResolvedValueOnce(mockForecasts);
      prisma.accountTransaction.findMany.mockResolvedValueOnce([]);
      prisma.foodSpendingLog.findUnique.mockResolvedValueOnce(mockForecasts[0]);

      const result = await foodSpendingMatcher.matchUserForecasts('user-1');

      expect(result.matched).toBe(0);
      expect(result.archived).toBe(0);
      expect(result.pending).toBe(1);
    });
  });

  describe('getForecastVsRealityStats', () => {
    it('should calculate accurate statistics with matches', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          status: 'matched',
          estimatedPriceEur: 50.0,
          actualPriceEur: 52.0,
        },
        {
          id: 'log-2',
          status: 'matched',
          estimatedPriceEur: 30.0,
          actualPriceEur: 28.0,
        },
        {
          id: 'log-3',
          status: 'forecast',
          estimatedPriceEur: 20.0,
          actualPriceEur: null,
        },
      ];

      prisma.foodSpendingLog.findMany.mockResolvedValueOnce(mockLogs);

      const result = await foodSpendingMatcher.getForecastVsRealityStats('user-1');

      expect(result.forecast.total).toBe(100.0); // 50 + 30 + 20
      expect(result.forecast.count).toBe(1); // Only pending forecast
      expect(result.matched.total).toBe(80.0); // 52 + 28
      expect(result.matched.count).toBe(2);
      expect(result.variance.amount).toBe(0); // 80 - 80 (estimated for matched)
      expect(result.accuracy).toBeGreaterThan(90); // High accuracy
    });

    it('should handle period with no data', async () => {
      prisma.foodSpendingLog.findMany.mockResolvedValueOnce([]);

      const result = await foodSpendingMatcher.getForecastVsRealityStats('user-1');

      expect(result.forecast.total).toBe(0);
      expect(result.forecast.count).toBe(0);
      expect(result.matched.total).toBe(0);
      expect(result.matched.count).toBe(0);
      expect(result.variance.amount).toBe(0);
      expect(result.accuracy).toBe(0);
    });

    it('should calculate variance correctly', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          status: 'matched',
          estimatedPriceEur: 100.0,
          actualPriceEur: 120.0, // 20% more expensive
        },
      ];

      prisma.foodSpendingLog.findMany.mockResolvedValueOnce(mockLogs);

      const result = await foodSpendingMatcher.getForecastVsRealityStats('user-1');

      expect(result.variance.amount).toBe(20.0); // 120 - 100
      expect(result.variance.percent).toBe(20.0); // 20% over
      expect(result.accuracy).toBe(80.0); // 100 - 20
    });
  });
});
