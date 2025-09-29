/**
 * Financial Utilities with Decimal Precision
 *
 * This module provides secure, precise financial calculations using decimal.js
 * to prevent floating-point arithmetic errors that could cause money loss.
 *
 * CRITICAL: All financial calculations must use these utilities instead of
 * native JavaScript math operations to ensure cent-perfect accuracy.
 */

const Decimal = require('decimal.js');
const logger = require('./logger');

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 20,          // 20 significant digits
  rounding: Decimal.ROUND_HALF_UP, // Standard rounding for currency
  toExpNeg: -7,          // Use exponential notation for numbers < 1e-7
  toExpPos: 21,          // Use exponential notation for numbers >= 1e21
  modulo: Decimal.ROUND_HALF_UP
});

/**
 * Financial calculation wrapper that ensures all operations are logged
 * and validated for audit compliance.
 */
class FinancialCalculator {
  constructor() {
    this.auditLog = [];
  }

  /**
   * Create a new Decimal instance from various input types
   * @param {number|string|Decimal} value - The value to convert
   * @param {string} context - Operation context for auditing
   * @returns {Decimal} Precise decimal value
   */
  createDecimal(value, context = 'unknown') {
    try {
      if (value === null || value === undefined) {
        throw new Error('Financial value cannot be null or undefined');
      }

      if (typeof value === 'string' && value.trim() === '') {
        throw new Error('Financial value cannot be empty string');
      }

      const decimal = new Decimal(value);

      if (!decimal.isFinite()) {
        throw new Error(`Invalid financial value: ${value} (${context})`);
      }

      return decimal;
    } catch (error) {
      const errorMsg = `Failed to create decimal for value: ${value} in context: ${context}`;
      logger.error(errorMsg, { value, context, error: error.message });
      throw new Error(errorMsg);
    }
  }

  /**
   * Add two financial values with precision
   * @param {number|string|Decimal} a - First value
   * @param {number|string|Decimal} b - Second value
   * @param {string} context - Operation context
   * @returns {Decimal} Sum result
   */
  add(a, b, context = 'addition') {
    const decimalA = this.createDecimal(a, `${context}_operand_a`);
    const decimalB = this.createDecimal(b, `${context}_operand_b`);

    const result = decimalA.plus(decimalB);

    this.auditLog.push({
      operation: 'add',
      operands: [a, b],
      result: result.toString(),
      context,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Subtract two financial values with precision
   * @param {number|string|Decimal} a - Minuend
   * @param {number|string|Decimal} b - Subtrahend
   * @param {string} context - Operation context
   * @returns {Decimal} Difference result
   */
  subtract(a, b, context = 'subtraction') {
    const decimalA = this.createDecimal(a, `${context}_minuend`);
    const decimalB = this.createDecimal(b, `${context}_subtrahend`);

    const result = decimalA.minus(decimalB);

    this.auditLog.push({
      operation: 'subtract',
      operands: [a, b],
      result: result.toString(),
      context,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Multiply two financial values with precision
   * @param {number|string|Decimal} a - Multiplicand
   * @param {number|string|Decimal} b - Multiplier
   * @param {string} context - Operation context
   * @returns {Decimal} Product result
   */
  multiply(a, b, context = 'multiplication') {
    const decimalA = this.createDecimal(a, `${context}_multiplicand`);
    const decimalB = this.createDecimal(b, `${context}_multiplier`);

    const result = decimalA.times(decimalB);

    this.auditLog.push({
      operation: 'multiply',
      operands: [a, b],
      result: result.toString(),
      context,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Divide two financial values with precision
   * @param {number|string|Decimal} a - Dividend
   * @param {number|string|Decimal} b - Divisor
   * @param {string} context - Operation context
   * @returns {Decimal} Quotient result
   */
  divide(a, b, context = 'division') {
    const decimalA = this.createDecimal(a, `${context}_dividend`);
    const decimalB = this.createDecimal(b, `${context}_divisor`);

    if (decimalB.isZero()) {
      throw new Error(`Division by zero in context: ${context}`);
    }

    const result = decimalA.dividedBy(decimalB);

    this.auditLog.push({
      operation: 'divide',
      operands: [a, b],
      result: result.toString(),
      context,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Calculate percentage of a value
   * @param {number|string|Decimal} value - Base value
   * @param {number|string|Decimal} percentage - Percentage (e.g., 15 for 15%)
   * @param {string} context - Operation context
   * @returns {Decimal} Percentage result
   */
  percentage(value, percentage, context = 'percentage') {
    const decimalValue = this.createDecimal(value, `${context}_base`);
    const decimalPercentage = this.createDecimal(percentage, `${context}_percent`);

    const result = decimalValue.times(decimalPercentage).dividedBy(100);

    this.auditLog.push({
      operation: 'percentage',
      operands: [value, percentage],
      result: result.toString(),
      context,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Round to currency precision (2 decimal places)
   * @param {number|string|Decimal} value - Value to round
   * @param {string} context - Operation context
   * @returns {Decimal} Rounded value
   */
  roundToCurrency(value, context = 'currency_rounding') {
    const decimal = this.createDecimal(value, context);
    return decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  /**
   * Convert Decimal to safe number for database storage
   * @param {Decimal} decimal - Decimal value
   * @returns {number} Safe number representation
   */
  toNumber(decimal) {
    if (!(decimal instanceof Decimal)) {
      throw new Error('Expected Decimal instance');
    }

    const number = decimal.toNumber();

    // Validate the conversion didn't lose precision
    if (!new Decimal(number).equals(decimal)) {
      logger.warn('Precision loss detected in decimal to number conversion', {
        original: decimal.toString(),
        converted: number
      });
    }

    return number;
  }

  /**
   * Convert Decimal to string for safe transmission
   * @param {Decimal} decimal - Decimal value
   * @returns {string} String representation
   */
  toString(decimal) {
    if (!(decimal instanceof Decimal)) {
      throw new Error('Expected Decimal instance');
    }

    return decimal.toString();
  }

  /**
   * Compare two financial values
   * @param {number|string|Decimal} a - First value
   * @param {number|string|Decimal} b - Second value
   * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
   */
  compare(a, b) {
    const decimalA = this.createDecimal(a, 'comparison_a');
    const decimalB = this.createDecimal(b, 'comparison_b');

    return decimalA.comparedTo(decimalB);
  }

  /**
   * Check if two financial values are equal
   * @param {number|string|Decimal} a - First value
   * @param {number|string|Decimal} b - Second value
   * @returns {boolean} True if equal
   */
  equals(a, b) {
    return this.compare(a, b) === 0;
  }

  /**
   * Get audit log for compliance tracking
   * @returns {Array} Array of audit log entries
   */
  getAuditLog() {
    return [...this.auditLog];
  }

  /**
   * Clear audit log (use with caution)
   */
  clearAuditLog() {
    this.auditLog = [];
  }
}

/**
 * Specific financial calculation functions
 */

/**
 * Calculate asset total value (quantity × unit price)
 * @param {number|string} quantity - Asset quantity
 * @param {number|string} unitValue - Price per unit
 * @returns {number} Total value as safe number
 */
function calculateAssetValue(quantity, unitValue) {
  const calc = new FinancialCalculator();
  const total = calc.multiply(quantity, unitValue, 'asset_valuation');
  return calc.toNumber(calc.roundToCurrency(total));
}

/**
 * Calculate net worth (assets - liabilities)
 * @param {number|string} totalAssets - Total asset value
 * @param {number|string} totalLiabilities - Total liability value
 * @returns {number} Net worth as safe number
 */
function calculateNetWorth(totalAssets, totalLiabilities) {
  const calc = new FinancialCalculator();
  const netWorth = calc.subtract(totalAssets, totalLiabilities, 'net_worth_calculation');
  return calc.toNumber(calc.roundToCurrency(netWorth));
}

/**
 * Calculate savings rate percentage
 * @param {number|string} income - Monthly income
 * @param {number|string} expenses - Monthly expenses
 * @returns {number} Savings rate percentage
 */
function calculateSavingsRate(income, expenses) {
  const calc = new FinancialCalculator();

  const incomeDecimal = calc.createDecimal(income, 'savings_rate_income');
  const expensesDecimal = calc.createDecimal(expenses, 'savings_rate_expenses');

  if (incomeDecimal.lessThanOrEqualTo(0)) {
    return 0;
  }

  const savings = calc.subtract(income, expenses, 'savings_calculation');
  const rate = calc.divide(savings, income, 'savings_rate_division');
  const percentage = calc.multiply(rate, 100, 'savings_rate_percentage');

  return calc.toNumber(calc.roundToCurrency(percentage));
}

/**
 * Calculate monthly payment for loan
 * @param {number|string} principal - Loan principal
 * @param {number|string} annualRate - Annual interest rate (as percentage)
 * @param {number} months - Number of months
 * @returns {number} Monthly payment
 */
function calculateMonthlyPayment(principal, annualRate, months) {
  const calc = new FinancialCalculator();

  const principalDecimal = calc.createDecimal(principal, 'loan_principal');
  const monthlyRate = calc.divide(annualRate, 1200, 'monthly_rate'); // Convert annual % to monthly decimal
  const monthsDecimal = calc.createDecimal(months, 'loan_months');

  if (monthlyRate.equals(0)) {
    return calc.toNumber(calc.divide(principal, months, 'simple_monthly_payment'));
  }

  // PMT formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  const onePlusRate = calc.add(1, monthlyRate, 'one_plus_rate');
  const powerTerm = onePlusRate.pow(monthsDecimal);
  const numerator = calc.multiply(principalDecimal, calc.multiply(monthlyRate, powerTerm, 'rate_power'), 'numerator');
  const denominator = calc.subtract(powerTerm, 1, 'denominator');

  const payment = calc.divide(numerator, denominator, 'monthly_payment');
  return calc.toNumber(calc.roundToCurrency(payment));
}

// Global calculator instance for simple operations
const globalCalculator = new FinancialCalculator();

module.exports = {
  FinancialCalculator,
  calculateAssetValue,
  calculateNetWorth,
  calculateSavingsRate,
  calculateMonthlyPayment,

  // Direct access to global calculator for simple operations
  add: (a, b, context) => globalCalculator.add(a, b, context),
  subtract: (a, b, context) => globalCalculator.subtract(a, b, context),
  multiply: (a, b, context) => globalCalculator.multiply(a, b, context),
  divide: (a, b, context) => globalCalculator.divide(a, b, context),
  roundToCurrency: (value, context) => globalCalculator.roundToCurrency(value, context),
  toNumber: (decimal) => globalCalculator.toNumber(decimal),
  toString: (decimal) => globalCalculator.toString(decimal),
  compare: (a, b) => globalCalculator.compare(a, b),
  equals: (a, b) => globalCalculator.equals(a, b),

  // Decimal constructor for advanced operations
  Decimal
};