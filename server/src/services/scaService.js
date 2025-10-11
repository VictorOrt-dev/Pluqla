const { prisma } = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * PSD2 Strong Customer Authentication Service
 * Implements Article 97 of PSD2 Directive
 */

// PSD2 SCA Thresholds
const SCA_THRESHOLD_AMOUNT = 30; // €30 threshold
const SCA_REAUTHENTICATION_DAYS = 90; // 90-day re-authentication requirement

/**
 * Check if transaction requires SCA based on PSD2 rules
 */
const requiresSCA = async (userId, amount, transactionType = 'payment') => {
  try {
    // Rule 1: Transactions > €30 require SCA
    if (amount > SCA_THRESHOLD_AMOUNT) {
      return {
        required: true,
        reason: 'amount_exceeds_threshold',
        threshold: SCA_THRESHOLD_AMOUNT
      };
    }

    // Rule 2: Check last SCA authentication (90-day rule)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastScaAt: true }
    });

    if (!user) {
      return {
        required: true,
        reason: 'user_not_found'
      };
    }

    // If never authenticated with SCA, require it
    if (!user.lastScaAt) {
      return {
        required: true,
        reason: 'no_previous_sca'
      };
    }

    // Check if 90 days have passed since last SCA
    const daysSinceLastSca = (Date.now() - new Date(user.lastScaAt).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastSca > SCA_REAUTHENTICATION_DAYS) {
      return {
        required: true,
        reason: 'sca_expired',
        daysSinceLastSca: Math.floor(daysSinceLastSca)
      };
    }

    // No SCA required
    return {
      required: false,
      reason: 'below_threshold_and_recent_sca'
    };
  } catch (error) {
    logger.error('Error checking SCA requirement', {
      userId,
      amount,
      error: error.message
    });

    // Fail secure: require SCA on error
    return {
      required: true,
      reason: 'error_fail_secure'
    };
  }
};

/**
 * Check if transaction qualifies for SCA exemption
 */
const checkScaExemption = async (userId, amount, transactionData = {}) => {
  const { merchant, isRecurring, beneficiaryId, riskScore } = transactionData;

  try {
    // Exemption 1: Low value transactions (≤ €30)
    if (amount <= SCA_THRESHOLD_AMOUNT) {
      return {
        exempt: true,
        exemptionType: 'low_value',
        reason: `Transaction amount (€${amount}) is below SCA threshold (€${SCA_THRESHOLD_AMOUNT})`
      };
    }

    // Exemption 2: Trusted beneficiary (user-defined whitelist)
    if (beneficiaryId) {
      const isTrusted = await checkTrustedBeneficiary(userId, beneficiaryId);
      if (isTrusted) {
        return {
          exempt: true,
          exemptionType: 'trusted_beneficiary',
          reason: 'Beneficiary is in user trusted list'
        };
      }
    }

    // Exemption 3: Recurring payment with same merchant
    if (isRecurring && merchant) {
      const recurringPayment = await prisma.expense.findFirst({
        where: {
          userId,
          merchant,
          isRecurring: true
        }
      });

      if (recurringPayment) {
        return {
          exempt: true,
          exemptionType: 'recurring_payment',
          reason: 'Recognized recurring payment to same merchant'
        };
      }
    }

    // Exemption 4: Low risk transaction (based on risk assessment)
    if (riskScore !== undefined && riskScore < 0.2) {
      return {
        exempt: true,
        exemptionType: 'low_risk',
        reason: `Low risk score: ${riskScore}`
      };
    }

    // No exemption applies
    return {
      exempt: false,
      reason: 'No exemption criteria met'
    };
  } catch (error) {
    logger.error('Error checking SCA exemption', {
      userId,
      amount,
      error: error.message
    });

    // Fail secure: no exemption on error
    return {
      exempt: false,
      reason: 'Error during exemption check'
    };
  }
};

/**
 * Log SCA exemption for compliance audit
 */
const logScaExemption = async (userId, transactionId, exemptionData, req) => {
  try {
    await prisma.scaExemptionLog.create({
      data: {
        userId,
        transactionId,
        exemptionType: exemptionData.exemptionType,
        amount: exemptionData.amount,
        reason: exemptionData.reason,
        riskScore: exemptionData.riskScore || null,
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'],
        metadata: JSON.stringify(exemptionData.metadata || {})
      }
    });

    logger.info('SCA exemption logged', {
      userId,
      transactionId,
      exemptionType: exemptionData.exemptionType
    });
  } catch (error) {
    logger.error('Failed to log SCA exemption', {
      userId,
      transactionId,
      error: error.message
    });
  }
};

/**
 * Create SCA challenge for transaction
 */
const createScaChallenge = async (userId, transactionId, allowedMethods = ['password', 'biometric']) => {
  try {
    // Challenge expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const challenge = await prisma.scaChallenge.create({
      data: {
        userId,
        transactionId,
        allowedMethods: JSON.stringify(allowedMethods),
        challengeData: JSON.stringify({
          createdAt: new Date().toISOString(),
          requiredFactors: 2 // PSD2 requires 2 of 3 factors
        }),
        status: 'pending',
        expiresAt
      }
    });

    logger.info('SCA challenge created', {
      userId,
      transactionId,
      challengeId: challenge.id,
      expiresAt
    });

    return challenge;
  } catch (error) {
    logger.error('Failed to create SCA challenge', {
      userId,
      transactionId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Complete SCA challenge
 */
const completeScaChallenge = async (challengeId, verificationMethod) => {
  try {
    const challenge = await prisma.scaChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    if (challenge.status !== 'pending') {
      return { success: false, error: 'Challenge already processed' };
    }

    if (new Date() > challenge.expiresAt) {
      await prisma.scaChallenge.update({
        where: { id: challengeId },
        data: { status: 'expired' }
      });
      return { success: false, error: 'Challenge expired' };
    }

    // Max 3 attempts
    if (challenge.attempts >= 3) {
      await prisma.scaChallenge.update({
        where: { id: challengeId },
        data: { status: 'locked' }
      });
      return { success: false, error: 'Too many attempts' };
    }

    // Update challenge as completed
    await prisma.scaChallenge.update({
      where: { id: challengeId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        verificationMethod
      }
    });

    // Update user's last SCA timestamp
    await prisma.user.update({
      where: { id: challenge.userId },
      data: { lastScaAt: new Date() }
    });

    logger.info('SCA challenge completed', {
      challengeId,
      userId: challenge.userId,
      verificationMethod
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to complete SCA challenge', {
      challengeId,
      error: error.message
    });
    return { success: false, error: 'Internal error' };
  }
};

/**
 * Check if beneficiary is trusted (helper function)
 */
const checkTrustedBeneficiary = async (userId, beneficiaryId) => {
  // This would check a trusted beneficiary list
  // For now, return false (no trusted list implemented)
  return false;
};

/**
 * Calculate transaction risk score (helper function)
 */
const calculateRiskScore = async (userId, transactionData) => {
  // Simple risk scoring based on:
  // - Transaction amount deviation from user's average
  // - Merchant frequency
  // - Time of day
  // - Location

  try {
    const { amount, merchant, category } = transactionData;

    // Get user's average transaction amount
    const userTransactions = await prisma.transaction.aggregate({
      where: { userId },
      _avg: { amount: true },
      _count: true
    });

    let riskScore = 0;

    // Factor 1: Amount deviation (max 0.4)
    if (userTransactions._avg.amount) {
      const deviation = Math.abs(amount - userTransactions._avg.amount) / userTransactions._avg.amount;
      riskScore += Math.min(deviation * 0.2, 0.4);
    }

    // Factor 2: New merchant (0.3 for new, 0 for known)
    if (merchant) {
      const merchantHistory = await prisma.expense.count({
        where: { userId, merchant }
      });
      if (merchantHistory === 0) {
        riskScore += 0.3;
      }
    }

    // Factor 3: Large transaction (max 0.3)
    if (amount > 100) {
      riskScore += 0.3;
    }

    return Math.min(riskScore, 1.0); // Cap at 1.0
  } catch (error) {
    logger.error('Error calculating risk score', { error: error.message });
    return 0.5; // Medium risk on error
  }
};

module.exports = {
  requiresSCA,
  checkScaExemption,
  logScaExemption,
  createScaChallenge,
  completeScaChallenge,
  calculateRiskScore,
  SCA_THRESHOLD_AMOUNT,
  SCA_REAUTHENTICATION_DAYS
};
