/**
 * Validation Schemas using Zod
 *
 * Centralized schema definitions for input validation across the application.
 * Uses Zod for type-safe, runtime validation with excellent error messages.
 *
 * Benefits:
 * - Type-safe validation
 * - Clear, actionable error messages
 * - Reusable schemas
 * - Easy to maintain and extend
 *
 * @module validation/schemas
 */

const { z } = require('zod');

// ========================================
// COMMON SCHEMAS
// ========================================

/**
 * Email validation schema
 * - Required
 * - Valid email format
 * - Max 255 characters
 */
const emailSchema = z
  .string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string'
  })
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

/**
 * Password validation schema
 * - Required
 * - Min 10 characters (security requirement)
 * - Max 128 characters
 * - Must contain: uppercase, lowercase, number, special char
 */
const passwordSchema = z
  .string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string'
  })
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Name validation schema
 * - Required
 * - Min 2 characters
 * - Max 100 characters
 * - Only letters, spaces, hyphens, apostrophes
 */
const nameSchema = z
  .string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be a string'
  })
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

/**
 * MongoDB/CUID ID schema
 */
const idSchema = z
  .string({
    required_error: 'ID is required',
    invalid_type_error: 'ID must be a string'
  })
  .min(1, 'ID cannot be empty')
  .max(100, 'ID is invalid');

/**
 * Currency code schema (ISO 4217)
 */
const currencySchema = z
  .enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD'], {
    errorMap: () => ({ message: 'Currency must be EUR, USD, GBP, CHF, or CAD' })
  });

/**
 * Amount schema (financial)
 * - Must be a number
 * - Must be positive
 * - Max 2 decimal places
 */
const amountSchema = z
  .number({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a number'
  })
  .positive('Amount must be positive')
  .finite('Amount must be a finite number')
  .refine(
    (val) => /^\d+(\.\d{1,2})?$/.test(val.toFixed(2)),
    'Amount must have at most 2 decimal places'
  );

/**
 * Date schema (ISO 8601)
 */
const dateSchema = z
  .string({
    required_error: 'Date is required',
    invalid_type_error: 'Date must be a string'
  })
  .datetime('Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)')
  .or(z.date());

// ========================================
// AUTHENTICATION SCHEMAS
// ========================================

/**
 * User Registration Schema
 */
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  acceptTerms: z
    .boolean({
      required_error: 'You must accept the terms and conditions',
      invalid_type_error: 'acceptTerms must be a boolean'
    })
    .refine((val) => val === true, {
      message: 'You must accept the terms and conditions'
    })
    .optional()
}).strict(); // Reject unknown fields

/**
 * User Login Schema
 */
const loginSchema = z.object({
  email: emailSchema,
  password: z.string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string'
  }).min(1, 'Password is required')
}).strict();

/**
 * Password Change Schema
 */
const changePasswordSchema = z.object({
  currentPassword: z.string({
    required_error: 'Current password is required'
  }).min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string({
    required_error: 'Password confirmation is required'
  })
}).strict().refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword']
  }
);

/**
 * Password Reset Request Schema
 */
const passwordResetRequestSchema = z.object({
  email: emailSchema
}).strict();

/**
 * Password Reset Schema
 */
const passwordResetSchema = z.object({
  token: z.string({
    required_error: 'Reset token is required'
  }).min(1, 'Reset token is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string({
    required_error: 'Password confirmation is required'
  })
}).strict().refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

// ========================================
// TRANSACTION SCHEMAS
// ========================================

/**
 * Transaction Type Schema
 */
const transactionTypeSchema = z.enum(['income', 'expense', 'savings'], {
  errorMap: () => ({ message: 'Transaction type must be income, expense, or savings' })
});

/**
 * Create Transaction Schema
 */
const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: amountSchema,
  currency: currencySchema.default('EUR'),
  category: z.string({
    required_error: 'Category is required'
  }).min(1, 'Category cannot be empty').max(50, 'Category must not exceed 50 characters'),
  description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  date: dateSchema.optional(),
  tags: z.array(z.string().max(30, 'Tag must not exceed 30 characters')).max(10, 'Maximum 10 tags allowed').optional()
}).strict();

/**
 * Update Transaction Schema
 */
const updateTransactionSchema = createTransactionSchema.partial().strict();

/**
 * Get Transactions Query Schema
 */
const getTransactionsQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  category: z.string().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  minAmount: amountSchema.optional(),
  maxAmount: amountSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
}).strict();

// ========================================
// AI FEATURE SCHEMAS
// ========================================

/**
 * AI Suggestion Request Schema
 */
const aiSuggestionSchema = z.object({
  category: z.string({
    required_error: 'Category is required for AI suggestions'
  }).min(1, 'Category cannot be empty').max(50, 'Category must not exceed 50 characters'),
  context: z.string().max(1000, 'Context must not exceed 1000 characters').optional(),
  preferences: z.object({
    tone: z.enum(['casual', 'formal', 'friendly']).optional(),
    length: z.enum(['short', 'medium', 'long']).optional()
  }).optional()
}).strict();

/**
 * AI Analysis Request Schema
 */
const aiAnalysisSchema = z.object({
  timeframe: z.enum(['week', 'month', 'quarter', 'year'], {
    errorMap: () => ({ message: 'Timeframe must be week, month, quarter, or year' })
  }).default('month'),
  includeRecommendations: z.boolean().default(true),
  focusAreas: z.array(
    z.enum(['spending', 'savings', 'budgeting', 'goals'])
  ).optional()
}).strict();

/**
 * AI Chat Message Schema
 */
const aiChatMessageSchema = z.object({
  message: z.string({
    required_error: 'Message is required'
  }).min(1, 'Message cannot be empty').max(2000, 'Message must not exceed 2000 characters'),
  conversationId: z.string().optional(),
  context: z.object({
    currentGoals: z.array(z.string()).optional(),
    recentTransactions: z.boolean().optional()
  }).optional()
}).strict();

// ========================================
// USER PROFILE SCHEMAS
// ========================================

/**
 * Update Profile Schema
 */
const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  monthlyGoal: amountSchema.optional(),
  currency: currencySchema.optional(),
  language: z.enum(['en', 'fr', 'es', 'de']).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional()
  }).optional()
}).strict();

// ========================================
// BUDGET SCHEMAS
// ========================================

/**
 * Create Budget Schema
 */
const createBudgetSchema = z.object({
  name: z.string({
    required_error: 'Budget name is required'
  }).min(1, 'Budget name cannot be empty').max(100, 'Budget name must not exceed 100 characters'),
  amount: amountSchema,
  currency: currencySchema.default('EUR'),
  category: z.string({
    required_error: 'Category is required'
  }).min(1, 'Category cannot be empty'),
  period: z.enum(['weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Period must be weekly, monthly, or yearly' })
  }),
  startDate: dateSchema,
  endDate: dateSchema.optional()
}).strict().refine(
  (data) => {
    if (data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
);

/**
 * Update Budget Schema
 */
const updateBudgetSchema = createBudgetSchema.partial().strict();

// ========================================
// PAGINATION SCHEMA
// ========================================

/**
 * Pagination Query Schema
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).strict();

// ========================================
// EXPORTS
// ========================================

module.exports = {
  // Common schemas
  emailSchema,
  passwordSchema,
  nameSchema,
  idSchema,
  currencySchema,
  amountSchema,
  dateSchema,

  // Auth schemas
  registerSchema,
  loginSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetSchema,

  // Transaction schemas
  transactionTypeSchema,
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsQuerySchema,

  // AI feature schemas
  aiSuggestionSchema,
  aiAnalysisSchema,
  aiChatMessageSchema,

  // User profile schemas
  updateProfileSchema,

  // Budget schemas
  createBudgetSchema,
  updateBudgetSchema,

  // Utility schemas
  paginationSchema
};
