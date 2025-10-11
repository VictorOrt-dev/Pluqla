---
# Input Validation & Centralized Error Handling - Integration Guide

Complete guide for implementing robust validation and error handling in the Pluqla backend.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Integration Steps](#integration-steps)
4. [Usage Examples](#usage-examples)
5. [Error Response Format](#error-response-format)
6. [Testing](#testing)
7. [Best Practices](#best-practices)

---

## 🎯 Overview

This implementation provides:

✅ **Input Validation**
- Zod schema-based validation
- Type-safe with excellent error messages
- Validates body, query, and params
- Rejects invalid input before business logic

✅ **Centralized Error Handling**
- Consistent JSON response format
- No stack traces in production
- Maps all error types to user-friendly messages
- Proper HTTP status codes

✅ **Security**
- No sensitive data in error messages
- XSS protection via sanitization
- Validation prevents injection attacks
- Server never crashes on bad input

---

## 📦 Installation

```bash
npm install zod
```

Zod is already installed in your project.

---

## 🔧 Integration Steps

### Step 1: Import Error Handler in app.js

Add **AFTER** all routes, **BEFORE** server start:

```javascript
// src/app.js
const express = require('express');
const app = express();

// ... other middlewares (helmet, cors, etc.)

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ai', aiRoutes);
// ... other routes

// ========================================
// ERROR HANDLING (MUST BE LAST)
// ========================================

const {
  centralizedErrorHandler,
  notFoundHandler
} = require('./middleware/centralizedErrorHandler');

// 404 handler (catches undefined routes)
app.use(notFoundHandler);

// Global error handler (catches all errors)
app.use(centralizedErrorHandler);

module.exports = app;
```

### Step 2: Update Route Files

**Example: Auth Routes**

```javascript
// src/routes/auth.js
const express = require('express');
const router = express.Router();

// Import schemas
const {
  registerSchema,
  loginSchema,
  changePasswordSchema
} = require('../validation/schemas');

// Import middleware
const {
  validate,
  asyncHandler
} = require('../middleware/validationMiddleware');

// Import error classes
const {
  UnauthorizedError,
  ConflictError
} = require('../middleware/centralizedErrorHandler');

/**
 * Register new user
 * POST /api/auth/register
 */
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    // Create user
    const user = await createUser({ email, password, name });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user
    });
  })
);

/**
 * Login user
 * POST /api/auth/login
 */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate credentials
    const user = await validateCredentials(email, password);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Create session/token
    const token = await createSession(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  })
);

module.exports = router;
```

### Step 3: Update Controllers (if using MVC pattern)

```javascript
// src/controllers/transactionController.js

const { prisma } = require('../lib/prisma');
const {
  NotFoundError,
  ForbiddenError
} = require('../middleware/centralizedErrorHandler');

/**
 * Get transaction by ID
 *
 * This controller doesn't need try/catch because:
 * - asyncHandler wraps the route
 * - Error handler catches all errors
 */
async function getTransaction(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  // Prisma will throw if not found - error handler catches it
  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id }
  });

  // Check ownership
  if (transaction.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  res.json({
    success: true,
    transaction
  });
}

/**
 * Update transaction
 */
async function updateTransaction(req, res) {
  const { id } = req.params;
  const userId = req.user.id;
  const updates = req.body; // Already validated by middleware

  // Check if exists and user owns it
  const existing = await prisma.transaction.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new NotFoundError('Transaction not found');
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  // Update
  const updated = await prisma.transaction.update({
    where: { id },
    data: updates
  });

  res.json({
    success: true,
    transaction: updated
  });
}

module.exports = {
  getTransaction,
  updateTransaction
};
```

---

## 📝 Usage Examples

### Basic Validation

```javascript
router.post(
  '/endpoint',
  validate(mySchema),
  asyncHandler(async (req, res) => {
    // req.body is validated and sanitized
    const data = req.body;
    // ... business logic
    res.json({ success: true, data });
  })
);
```

### Validate Different Parts

```javascript
const { z } = require('zod');
const { idSchema } = require('../validation/schemas');

// Validate URL params
router.get(
  '/users/:id',
  validate(z.object({ id: idSchema }), 'params'),
  asyncHandler(async (req, res) => {
    const { id } = req.params; // Validated
    // ...
  })
);

// Validate query string
router.get(
  '/search',
  validate(searchSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query; // Validated
    // ...
  })
);
```

### Validate Multiple Targets

```javascript
const { validateMultiple } = require('../middleware/validationMiddleware');

router.put(
  '/transactions/:id',
  validateMultiple({
    params: z.object({ id: idSchema }),
    body: updateTransactionSchema
  }),
  asyncHandler(async (req, res) => {
    // Both params and body are validated
    const { id } = req.params;
    const updates = req.body;
    // ...
  })
);
```

### Sanitize User Input

```javascript
const { sanitize } = require('../middleware/validationMiddleware');

router.post(
  '/comments',
  sanitize(['comment', 'title']),
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    // HTML stripped from comment and title fields
    // ...
  })
);
```

### Throw Custom Errors

```javascript
const {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError
} = require('../middleware/centralizedErrorHandler');

router.delete('/resource/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const resource = await prisma.resource.findUnique({ where: { id } });

  if (!resource) {
    throw new NotFoundError('Resource not found');
  }

  if (resource.userId !== req.user.id) {
    throw new ForbiddenError('You cannot delete this resource');
  }

  if (resource.protected) {
    throw new BadRequestError('Cannot delete protected resource');
  }

  await prisma.resource.delete({ where: { id } });

  res.json({ success: true });
}));
```

---

## 📋 Error Response Format

All errors return consistent JSON:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [] // Optional: additional error details
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `BAD_REQUEST` | 400 | Invalid request |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |

### Validation Error Details

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      },
      {
        "field": "password",
        "message": "Password must be at least 10 characters",
        "code": "too_small"
      }
    ]
  }
}
```

### Prisma Error Mapping

Prisma errors are automatically mapped:

```javascript
// P2002: Unique constraint violation
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ENTRY",
    "message": "Email already exists",
    "details": {
      "field": "email",
      "constraint": ["email"]
    }
  }
}

// P2025: Record not found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

---

## 🧪 Testing

### Run Tests

```bash
# All validation tests
npm test -- tests/validation.test.js

# Watch mode
npm run test:watch -- tests/validation.test.js

# With coverage
npm run test:coverage
```

### Manual Testing

**Valid Request:**
```bash
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "ValidPass123!",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "John Doe"
  }
}
```

**Invalid Request:**
```bash
curl -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "weak",
    "name": "A"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "invalid_string"
      },
      {
        "field": "password",
        "message": "Password must be at least 10 characters",
        "code": "too_small"
      },
      {
        "field": "name",
        "message": "Name must be at least 2 characters",
        "code": "too_small"
      }
    ]
  }
}
```

---

## ✅ Best Practices

### 1. Always Use asyncHandler

```javascript
// ❌ Bad: No error handling
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

// ✅ Good: asyncHandler catches errors
router.get('/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
}));
```

### 2. Validate Early

```javascript
// ✅ Good: Validate BEFORE business logic
router.post(
  '/transactions',
  validate(createTransactionSchema),
  asyncHandler(async (req, res) => {
    // req.body is already validated
    const transaction = await createTransaction(req.body);
    res.json({ success: true, transaction });
  })
);
```

### 3. Use Semantic Error Classes

```javascript
// ❌ Bad: Generic errors
if (!user) {
  throw new Error('Not found');
}

// ✅ Good: Semantic errors with proper status codes
if (!user) {
  throw new NotFoundError('User not found');
}

if (user.id !== req.user.id) {
  throw new ForbiddenError('Access denied');
}
```

### 4. Don't Leak Sensitive Info

```javascript
// ❌ Bad: Exposes whether user exists
if (!user) {
  throw new NotFoundError('User with this email not found');
}
if (!isValidPassword) {
  throw new UnauthorizedError('Invalid password');
}

// ✅ Good: Generic error message
if (!user || !isValidPassword) {
  throw new UnauthorizedError('Invalid credentials');
}
```

### 5. Sanitize User Input

```javascript
// ✅ Good: Sanitize before storing
router.post(
  '/comments',
  sanitize(['comment']),
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    // HTML tags stripped from comment
    const comment = await prisma.comment.create({
      data: req.body
    });
    res.json({ success: true, comment });
  })
);
```

### 6. Never Use Try/Catch in Routes

```javascript
// ❌ Bad: Manual try/catch (defeats purpose of error handler)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Good: Let error handler do its job
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id }
  });
  res.json({ success: true, user });
}));
```

---

## 📚 Additional Resources

- **Zod Documentation**: https://zod.dev
- **Express Error Handling**: https://expressjs.com/en/guide/error-handling.html
- **OWASP Input Validation**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

---

## 🆘 Troubleshooting

### Validation always fails

- Check schema is imported correctly
- Verify request Content-Type is `application/json`
- Check body parser is enabled (`app.use(express.json())`)

### Errors not caught by handler

- Ensure `asyncHandler` wraps the route
- Check error handler is LAST middleware
- Verify error handler has 4 parameters: `(err, req, res, next)`

### Stack traces in production

- Ensure `NODE_ENV=production`
- Error handler automatically hides stack in production

---

**Status**: ✅ Production-Ready
**Version**: 1.0.0
**Last Updated**: 2025-10-01
