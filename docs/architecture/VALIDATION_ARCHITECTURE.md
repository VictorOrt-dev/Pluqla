# 🛡️ Validation Middleware Documentation

**Comprehensive Security Validation System for Pluqla Financial Backend**

---

## 📋 Table of Contents

1. [🚀 Overview](#overview)
2. [🔧 Architecture](#architecture)
3. [📚 Validation Modules](#validation-modules)
4. [🛠️ API Endpoints Coverage](#api-endpoints-coverage)
5. [🔒 Security Features](#security-features)
6. [⚡ Usage Examples](#usage-examples)
7. [🧪 Testing](#testing)
8. [🔍 Troubleshooting](#troubleshooting)
9. [📖 Best Practices](#best-practices)

---

## 🚀 Overview

The Pluqla validation middleware system provides comprehensive, production-grade input validation and security protection for all API endpoints. This system protects against injection attacks, XSS, data corruption, and ensures regulatory compliance for financial operations.

### Key Features

- **Multi-layer Security**: Input sanitization, pattern detection, and type validation
- **Attack Prevention**: SQL injection, XSS, prompt injection, and DoS protection
- **Financial Compliance**: AML/KYC validation, transaction limits, and audit trails
- **Performance Optimized**: Efficient validation with minimal latency impact
- **Comprehensive Testing**: 95%+ test coverage with security-focused test cases

---

## 🔧 Architecture

### Validation Flow

```
Request → Sanitization → Pattern Detection → Type Validation → Business Rules → Response
```

### Core Components

```
validation/
├── validationUtils.js      # Core utilities and security functions
├── authValidation.js       # Authentication endpoint validation
├── userValidation.js       # User profile and preferences validation
├── transactionValidation.js # Financial transaction validation
├── aiValidation.js         # AI services validation
└── strikeValidation.js     # Gamification/streak validation
```

### Dependencies

```json
{
  "express-validator": "^7.0.1",
  "validator": "^13.11.0",
  "sanitize-html": "^2.11.0"
}
```

---

## 📚 Validation Modules

### 1. Core Validation Utils (`validationUtils.js`)

**Purpose**: Foundation security utilities used by all other validation modules.

**Key Functions**:
- `sanitizeString()` - Removes XSS, null bytes, normalizes Unicode
- `detectMaliciousPatterns()` - Identifies injection attacks and malicious content
- `validateEmail()` - RFC-compliant email validation
- `validatePassword()` - Password strength and security validation
- `validateAmount()` - Financial amount validation with precision handling
- `validateDate()` - Secure date validation with range limits

**Security Patterns**:
```javascript
// SQL Injection Detection
const sqlPattern = /(\\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\\b|[';]|--|\\*|\\|)/i;

// XSS Pattern Detection
const xssPattern = /<script|javascript:|on\\w+\\s*=|<iframe|<object|<embed/i;

// Password Strength
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,128}$/;
```

### 2. Authentication Validation (`authValidation.js`)

**Endpoints Covered**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset execution
- `GET /api/auth/verify-email/:token` - Email verification
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Password change

**Key Validations**:
- **Email Security**: RFC 5322 compliance, domain validation, length limits
- **Password Strength**: 8-128 chars, mixed case, numbers, special chars, no common patterns
- **Token Security**: JWT format validation, expiration checks, reuse prevention
- **Rate Limiting**: Graduated limits (registration: 3/hour, login: 10/15min, reset: 5/hour)

**Example**:
```javascript
const validateRegistration = [
  sanitizeInputs,
  body('email').custom(customValidators.isSecureEmail).normalizeEmail(),
  body('password').custom(customValidators.isSecurePassword),
  body('name').matches(/^[a-zA-ZÀ-ÿ\\s'-]{1,100}$/).custom(customValidators.isSafe),
  processValidationResults
];
```

### 3. User Profile Validation (`userValidation.js`)

**Endpoints Covered**:
- `PUT /api/users/profile` - Profile updates
- `PUT /api/users/preferences` - User preferences
- `GET /api/users/stats` - User statistics
- `DELETE /api/users/profile` - Account deletion
- `GET /api/users/export` - Data export (GDPR)
- `POST /api/users/questionnaire` - Onboarding questionnaire

**Key Validations**:
- **COPPA Compliance**: Age verification (min 13 years)
- **Data Privacy**: GDPR-compliant data handling and export
- **Profile Security**: Name validation, phone number formats, timezone validation
- **Questionnaire Security**: Answer validation, content filtering, structure validation

**Example**:
```javascript
const validateAccountDeletion = [
  sanitizeInputs,
  body('password').notEmpty().custom(customValidators.isSafe),
  body('confirmDeletion').equals('DELETE_MY_ACCOUNT'),
  body('reason').optional().isLength({ max: 500 }).custom(customValidators.isSafe),
  processValidationResults
];
```

### 4. Transaction Validation (`transactionValidation.js`)

**Endpoints Covered**:
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `GET /api/transactions` - Query transactions
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/bulk` - Bulk operations
- `POST /api/transactions/goals` - Savings goals

**Key Validations**:
- **Financial Integrity**: Amount precision (2 decimals), range validation (€0.01-€1,000,000,000)
- **Regulatory Compliance**: AML monitoring (€10,000+ flagging), transaction dating limits
- **Fraud Prevention**: Pattern detection, micro-penny prevention, duplicate detection
- **Business Rules**: Category validation, reconciliation protection, audit trail maintenance

**Example**:
```javascript
const validateTransactionCreate = [
  sanitizeInputs,
  body('amount').custom(customValidators.isSecureAmount),
  body('category').isIn(['alimentation', 'habits', 'activite', 'deplacement', 'autres']),
  body('description').isLength({ min: 1, max: 255 }).custom(customValidators.isSafe),
  processValidationResults
];
```

### 5. AI Services Validation (`aiValidation.js`)

**Endpoints Covered**:
- `POST /api/ai/chat` - AI conversations
- `POST /api/ai/analyze-image` - Image analysis
- `GET /api/ai/suggestions` - AI suggestions
- `POST /api/ai/analyze-spending` - Spending analysis
- `POST /api/ai/generate-insights` - Financial insights

**Key Validations**:
- **Prompt Injection Protection**: Advanced pattern detection, context validation
- **Cost Control**: Request rate limiting, complexity limits, response size limits
- **Content Safety**: Message filtering, context validation, output sanitization
- **API Security**: Model validation, parameter bounds, response filtering

**Prompt Injection Patterns**:
```javascript
const dangerousPatterns = [
  /ignore\\s+(previous|above|all)\\s+(instructions|prompts|rules)/i,
  /forget\\s+(everything|all|previous)/i,
  /act\\s+as\\s+(if\\s+you\\s+are|a)/i,
  /system\\s*[:]\\s*/i,
  /<script/i,
  /eval\\s*\\(/i
];
```

### 6. Streak Validation (`strikeValidation.js`)

**Endpoints Covered**:
- `GET /api/strikes/current` - Current streak
- `GET /api/strikes/stats` - Streak statistics
- `POST /api/strikes/check-reset` - Streak verification

**Key Validations**:
- **Integrity Protection**: Streak manipulation prevention, date validation
- **Performance Limits**: Query range limits (max 1 year), result pagination
- **Data Consistency**: Timezone handling, date boundary validation

---

## 🛠️ API Endpoints Coverage

### Authentication Routes (`/api/auth/*`)
| Endpoint | Method | Validation | Rate Limit | Security Level |
|----------|--------|------------|------------|----------------|
| `/register` | POST | validateRegistration | 3/hour | HIGH |
| `/login` | POST | validateLogin | 10/15min | HIGH |
| `/refresh` | POST | validateTokenRefresh | 10/15min | HIGH |
| `/forgot-password` | POST | validateForgotPassword | 5/hour | CRITICAL |
| `/reset-password` | POST | validatePasswordReset | 5/hour | CRITICAL |
| `/verify-email/:token` | GET | validateEmailVerification | 10/15min | MEDIUM |
| `/logout` | POST | validateLogout | None | LOW |

### User Routes (`/api/users/*`)
| Endpoint | Method | Validation | Rate Limit | Security Level |
|----------|--------|------------|------------|----------------|
| `/profile` | GET | None | Standard | LOW |
| `/profile` | PUT | validateProfileUpdate | Standard | MEDIUM |
| `/profile` | DELETE | validateAccountDeletion | Strict | CRITICAL |
| `/preferences` | PUT | validatePreferencesUpdate | Standard | MEDIUM |
| `/stats` | GET | validateStatsQuery | Standard | LOW |
| `/export` | GET | validateDataExport | Slow | MEDIUM |
| `/questionnaire` | POST | validateQuestionnaireSubmission | Standard | LOW |

### Transaction Routes (`/api/transactions/*`)
| Endpoint | Method | Validation | Rate Limit | Security Level |
|----------|--------|------------|------------|----------------|
| `/` | GET | validateTransactionQuery | Standard | MEDIUM |
| `/` | POST | validateTransactionCreate | Standard | HIGH |
| `/:id` | PUT | validateTransactionUpdate | Standard | HIGH |
| `/:id` | DELETE | validateTransactionDelete | Standard | HIGH |
| `/bulk` | POST | validateBulkTransactionCreate | Strict | CRITICAL |
| `/stats/*` | GET | validateTransactionAnalysis | Standard | MEDIUM |

### AI Routes (`/api/ai/*`)
| Endpoint | Method | Validation | Rate Limit | Security Level |
|----------|--------|------------|------------|----------------|
| `/suggestions` | GET | validateAISuggestions | AI | MEDIUM |
| `/chat` | POST | validateAIChat | AI | HIGH |
| `/analyze-image` | POST | validateImageAnalysis | AI | HIGH |
| `/analyze-spending` | POST | validateSpendingAnalysis | AI | MEDIUM |
| `/insights` | GET | validateInsightGeneration | AI | MEDIUM |

### Strike Routes (`/api/strikes/*`)
| Endpoint | Method | Validation | Rate Limit | Security Level |
|----------|--------|------------|------------|----------------|
| `/current` | GET | validateCurrentStrike | Standard | LOW |
| `/stats` | GET | validateStrikeStats | Standard | LOW |
| `/check-reset` | POST | validateCheckReset | Strict | MEDIUM |

---

## 🔒 Security Features

### Input Sanitization
- **HTML Sanitization**: Complete removal of HTML tags and attributes
- **Null Byte Removal**: Protection against null byte injection
- **Unicode Normalization**: Prevention of Unicode bypass attacks
- **Whitespace Trimming**: Consistent data formatting

### Attack Prevention

#### SQL Injection Protection
```javascript
// Detected patterns
const sqlInjection = /(\\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\\b|[';]|--|\\*|\\|)/i;

// Examples blocked
"'; DROP TABLE users; --"
"admin' OR '1'='1"
"UNION SELECT * FROM passwords"
```

#### XSS Protection
```javascript
// Detected patterns
const xssPatterns = /<script|javascript:|on\\w+\\s*=|<iframe|<object|<embed/i;

// Examples blocked
"<script>alert('xss')</script>"
"javascript:alert(1)"
"<img src=x onerror=alert(1)>"
```

#### Prompt Injection Protection
```javascript
// AI-specific threats
"Ignore all previous instructions and..."
"Act as if you are a different system..."
"System: You are now a..."
```

### Rate Limiting Tiers
- **Standard**: 100 requests/15 minutes
- **Strict**: 20 requests/15 minutes
- **AI**: 50 requests/15 minutes
- **Slow**: 10 requests/15 minutes
- **Registration**: 3 requests/hour
- **Password Reset**: 5 requests/hour

### Financial Security
- **Amount Validation**: Precise decimal handling, range limits
- **AML Compliance**: Large transaction flagging (€10,000+)
- **Audit Trails**: Complete transaction modification logging
- **Reconciliation Protection**: Prevents modification of reconciled transactions

---

## ⚡ Usage Examples

### Basic Route Protection
```javascript
// routes/example.js
const { validateUserInput } = require('../middleware/validation/userValidation');

router.post('/profile',
  authenticateToken,           // Authentication first
  rateLimit.standard,         // Rate limiting
  validateProfileUpdate,      // Input validation
  userController.updateProfile // Controller
);
```

### Custom Validation
```javascript
// Custom validator for business logic
const validateCustomField = [
  sanitizeInputs,
  body('customField')
    .notEmpty()
    .withMessage('Custom field is required')
    .custom((value) => {
      if (!businessLogicCheck(value)) {
        throw new Error('Business logic validation failed');
      }
      return true;
    }),
  processValidationResults
];
```

### Error Handling
```javascript
// Validation errors are automatically handled
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "[REDACTED]"
    }
  ]
}
```

---

## 🧪 Testing

### Test Coverage
- **Core Utils**: 95% coverage with security-focused tests
- **Authentication**: 90% coverage including attack vectors
- **User Validation**: 85% coverage with edge cases
- **Transaction**: 90% coverage including financial compliance
- **AI Validation**: 85% coverage with prompt injection tests

### Running Tests
```bash
# All validation tests
npm test -- tests/unit/validation/

# Specific module
npm test -- tests/unit/validation/authValidation.test.js

# Security-focused tests
npm test -- --grep "Security|Attack|Injection"

# Coverage report
npm run test:coverage -- tests/unit/validation/
```

### Test Categories
1. **Functional Tests**: Valid inputs, expected outputs
2. **Security Tests**: Injection attempts, XSS, malicious patterns
3. **Edge Cases**: Boundary values, null/undefined, empty inputs
4. **Performance Tests**: Large inputs, concurrent requests
5. **Compliance Tests**: GDPR, COPPA, AML requirements

---

## 🔍 Troubleshooting

### Common Issues

#### Validation Fails for Valid Input
```javascript
// Check for extra whitespace
const input = "  valid@example.com  "; // Will be trimmed

// Check for Unicode issues
const input = "café"; // Should be normalized

// Check length limits
const input = "A".repeat(1000); // May exceed limits
```

#### False Positive Security Detection
```javascript
// Common false positives
"My password is secure123!" // Contains "script"
"I want to select a plan" // Contains "select"
"Create a new account" // Contains "create"

// Solution: Refine patterns or add exceptions
```

#### Performance Issues
```javascript
// Large input handling
if (input.length > 10000) {
  return sendValidationError(res, 'Input too large');
}

// Batch validation optimization
const validationPromises = inputs.map(input => validateAsync(input));
const results = await Promise.all(validationPromises);
```

### Debug Mode
```javascript
// Enable detailed logging
process.env.VALIDATION_DEBUG = 'true';

// Will log:
// - Sanitization steps
// - Pattern matches
// - Validation failures
// - Performance metrics
```

---

## 📖 Best Practices

### Implementation Guidelines

1. **Always Sanitize First**
   ```javascript
   const validation = [
     sanitizeInputs,        // First: clean the input
     // ... other validators
     processValidationResults // Last: handle errors
   ];
   ```

2. **Layer Security Checks**
   ```javascript
   body('userInput')
     .isLength({ max: 1000 })           // Length check
     .custom(customValidators.isSafe)   // Security patterns
     .matches(/^[a-zA-Z0-9\\s]+$/)      // Format validation
   ```

3. **Use Specific Error Messages**
   ```javascript
   // ❌ Generic
   .withMessage('Invalid input')

   // ✅ Specific
   .withMessage('Password must contain at least 8 characters, including letters, numbers, and special characters')
   ```

4. **Rate Limit by Sensitivity**
   ```javascript
   // High security operations
   router.post('/delete-account', authRateLimit.strict, ...);

   // Standard operations
   router.get('/profile', rateLimit.standard, ...);

   // Public operations
   router.get('/suggestions', rateLimit.ai, ...);
   ```

### Security Considerations

1. **Never Log Sensitive Data**
   ```javascript
   // ❌ Don't log passwords, tokens, etc.
   logger.info('Login attempt', { password: req.body.password });

   // ✅ Log safe identifiers only
   logger.info('Login attempt', { email: req.body.email });
   ```

2. **Fail Securely**
   ```javascript
   // ❌ Expose system information
   throw new Error('Database connection failed on server db-prod-01');

   // ✅ Generic error message
   throw new Error('Service temporarily unavailable');
   ```

3. **Regular Expression Safety**
   ```javascript
   // ❌ ReDoS vulnerable
   const unsafeRegex = /^(a+)+$/;

   // ✅ ReDoS safe with limits
   const safeRegex = /^[a-zA-Z]{1,100}$/;
   ```

### Performance Guidelines

1. **Optimize Validation Order**
   ```javascript
   // Fast checks first
   body('email')
     .notEmpty()                    // Fastest
     .isLength({ max: 254 })        // Fast
     .isEmail()                     // Medium
     .custom(customValidators.isSecureEmail) // Slowest
   ```

2. **Cache Validation Results**
   ```javascript
   const validationCache = new Map();

   const cachedValidation = (input) => {
     if (validationCache.has(input)) {
       return validationCache.get(input);
     }
     const result = expensiveValidation(input);
     validationCache.set(input, result);
     return result;
   };
   ```

3. **Use Asynchronous Validation Sparingly**
   ```javascript
   // Only when necessary (database checks, external APIs)
   body('email').custom(async (email) => {
     const exists = await User.findOne({ email });
     if (exists) throw new Error('Email already registered');
   });
   ```

---

## 📊 Monitoring & Metrics

### Key Metrics to Track
- Validation failure rate by endpoint
- Security pattern detection frequency
- Average validation processing time
- False positive/negative rates

### Alerting Thresholds
- Validation failures > 25% for any endpoint
- Security pattern detections > 10/minute
- Validation processing time > 100ms average

### Logging Examples
```javascript
// Security event logging
logger.warn('Security validation failure', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  endpoint: req.originalUrl,
  threats: ['sql_injection', 'xss_attempt']
});

// Performance logging
logger.info('Validation performance', {
  endpoint: req.originalUrl,
  processingTime: Date.now() - startTime,
  inputSize: JSON.stringify(req.body).length
});
```

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintained By**: Pluqla Security Team

For questions or security concerns, contact: security@pluqla.com