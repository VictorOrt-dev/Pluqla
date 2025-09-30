# API Reference - Pluqla Backend

Complete API documentation for Pluqla's backend services with Better Auth integration.

## 🔗 Base URL

- **Development**: `http://localhost:3004`
- **Production**: `https://api.pluqla.com`

## 🔐 Authentication

All protected endpoints require authentication using Better Auth sessions.

### Authentication Methods

1. **Session Cookie** (Recommended for web)
   ```
   Cookie: better-auth.session-token=abc123...
   ```

2. **Authorization Header** (For API clients)
   ```
   Authorization: Bearer abc123...
   ```

3. **Legacy JWT** (During migration period)
   ```
   Authorization: Bearer jwt_token...
   ```

## 🏗️ API Structure

### Endpoint Categories

```
/api/auth/*          - Authentication endpoints (public)
/api/ai/*            - Legacy AI endpoints (public, rate-limited)
/api/ai-secure/*     - Protected AI endpoints (requires auth)
/api/users/*         - User management (protected)
/api/transactions/*  - Financial data (protected)
/api/analytics/*     - Usage analytics (protected)
/api/admin/*         - Admin functions (admin only)
```

## 🔓 Public Endpoints

### Authentication Routes

#### User Registration
```http
POST /api/auth/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "clp123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isPremium": false,
    "emailVerified": false
  },
  "session": {
    "id": "ses_123abc",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### User Login
```http
POST /api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure123"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "clp123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isPremium": false
  },
  "session": {
    "id": "ses_123abc",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### Check Session
```http
GET /api/auth/session
Cookie: better-auth.session-token=abc123...
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "clp123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isPremium": false
  },
  "session": {
    "id": "ses_123abc",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### User Logout
```http
POST /api/auth/sign-out
Cookie: better-auth.session-token=abc123...
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully signed out"
}
```

### Google OAuth Routes

#### Initiate Google OAuth
```http
GET /api/auth/sign-in/google
```
*Redirects to Google consent screen*

#### OAuth Callback
```http
GET /api/auth/callback/google?code=abc123&state=xyz789
```
*Handled automatically by Better Auth*

### Legacy AI Routes (Public)

#### Get AI Suggestions
```http
POST /api/ai/suggestions
Content-Type: application/json

{
  "category": "groceries",
  "amount": 50.00,
  "description": "Weekly shopping"
}
```

**Response** (200 OK):
```json
{
  "suggestions": [
    {
      "category": "groceries",
      "subcategory": "supermarket",
      "confidence": 0.95,
      "tags": ["weekly", "food", "essential"]
    }
  ],
  "processingTime": 245
}
```

## 🔒 Protected Endpoints

All endpoints in this section require authentication.

### AI Secure Routes

#### Get Personalized Suggestions
```http
POST /api/ai-secure/suggestions
Authorization: Bearer session_token
Content-Type: application/json

{
  "category": "groceries",
  "amount": 50.00,
  "description": "Weekly shopping"
}
```

**Rate Limits**:
- Free users: 10 requests per 15 minutes
- Premium users: 50 requests per 15 minutes
- Admin users: 1000 requests per 15 minutes

**Response** (200 OK):
```json
{
  "suggestions": [
    {
      "category": "groceries",
      "subcategory": "supermarket",
      "confidence": 0.95,
      "tags": ["weekly", "food", "essential"],
      "personalizedInsights": [
        "This matches your typical weekly grocery spending",
        "Consider buying in bulk to save 15% on average"
      ]
    }
  ],
  "userContext": {
    "spendingPattern": "consistent",
    "preferredStores": ["Walmart", "Target"],
    "budgetStatus": "on_track"
  },
  "processingTime": 312
}
```

#### Categorize Transaction
```http
POST /api/ai-secure/categorize
Authorization: Bearer session_token
Content-Type: application/json

{
  "description": "AMAZON.COM AMZN.COM/BILL WA",
  "amount": 29.99,
  "merchant": "Amazon"
}
```

**Response** (200 OK):
```json
{
  "category": "online_shopping",
  "subcategory": "general_merchandise",
  "confidence": 0.88,
  "suggestions": {
    "budgetCategory": "shopping",
    "tags": ["online", "amazon", "merchandise"],
    "notes": "Likely general merchandise purchase"
  }
}
```

#### Get Financial Insights
```http
POST /api/ai-secure/insights
Authorization: Bearer session_token
Content-Type: application/json

{
  "timeframe": "month",
  "categories": ["groceries", "dining", "entertainment"]
}
```

**Response** (200 OK):
```json
{
  "insights": [
    {
      "type": "spending_trend",
      "message": "Your grocery spending decreased by 12% this month",
      "impact": "positive",
      "actionable": true,
      "suggestions": ["Continue current grocery habits", "Consider meal planning"]
    },
    {
      "type": "budget_alert",
      "message": "Dining expenses are 23% above monthly budget",
      "impact": "negative",
      "actionable": true,
      "suggestions": ["Reduce restaurant visits", "Try cooking at home more"]
    }
  ],
  "summary": {
    "totalAnalyzed": 156,
    "categoriesAnalyzed": 8,
    "timeframe": "2024-11-01 to 2024-11-30"
  }
}
```

### Premium AI Routes

*Requires Premium subscription or Admin role*

#### Investment Analysis
```http
POST /api/ai-secure/analyze/investment
Authorization: Bearer session_token
Content-Type: application/json

{
  "portfolio": [
    { "symbol": "AAPL", "shares": 10, "purchasePrice": 150.00 },
    { "symbol": "GOOGL", "shares": 5, "purchasePrice": 2800.00 }
  ],
  "riskTolerance": "moderate"
}
```

**Response** (200 OK):
```json
{
  "analysis": {
    "diversification": {
      "score": 6.5,
      "recommendations": [
        "Consider adding bonds to reduce volatility",
        "Increase international exposure"
      ]
    },
    "riskAssessment": {
      "level": "moderate_high",
      "factors": ["Tech concentration", "Market cap bias"],
      "suggestions": ["Add defensive stocks", "Consider sector ETFs"]
    },
    "performance": {
      "expectedReturn": 8.2,
      "volatility": 18.5,
      "sharpeRatio": 0.45
    }
  },
  "recommendations": [
    {
      "action": "add",
      "asset": "VTI",
      "allocation": 0.15,
      "reason": "Broad market diversification"
    }
  ]
}
```

#### Portfolio Optimization
```http
POST /api/ai-secure/optimize/portfolio
Authorization: Bearer session_token
Content-Type: application/json

{
  "currentPortfolio": [...],
  "investmentGoals": ["retirement", "growth"],
  "timeHorizon": "long_term",
  "monthlyContribution": 1000
}
```

#### Spending Forecast
```http
POST /api/ai-secure/forecast/spending
Authorization: Bearer session_token
Content-Type: application/json

{
  "timeframe": "next_quarter",
  "categories": ["all"],
  "events": ["vacation", "home_renovation"]
}
```

### User Management Routes

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer session_token
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "clp123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "isPremium": false,
    "emailVerified": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-11-30T14:22:15Z"
  },
  "subscription": {
    "tier": "free",
    "usage": {
      "aiRequestsThisMonth": 45,
      "aiRequestsLimit": 100
    }
  }
}
```

#### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer session_token
Content-Type: application/json

{
  "name": "John Smith",
  "preferences": {
    "currency": "USD",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "push": false
    }
  }
}
```

#### Change Password
```http
PUT /api/users/password
Authorization: Bearer session_token
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

### Transaction Management Routes

#### Get Transactions
```http
GET /api/transactions?page=1&limit=50&category=groceries&startDate=2024-11-01
Authorization: Bearer session_token
```

**Response** (200 OK):
```json
{
  "transactions": [
    {
      "id": "txn_123abc",
      "amount": -45.67,
      "description": "WHOLE FOODS MARKET",
      "category": "groceries",
      "subcategory": "supermarket",
      "date": "2024-11-28T18:30:00Z",
      "merchant": "Whole Foods",
      "account": "checking_001",
      "tags": ["organic", "weekly_shopping"],
      "aiGenerated": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

#### Create Transaction
```http
POST /api/transactions
Authorization: Bearer session_token
Content-Type: application/json

{
  "amount": -23.45,
  "description": "Coffee shop purchase",
  "category": "dining",
  "date": "2024-11-30T09:15:00Z",
  "merchant": "Starbucks"
}
```

#### Update Transaction
```http
PUT /api/transactions/:id
Authorization: Bearer session_token
Content-Type: application/json

{
  "category": "coffee",
  "subcategory": "beverages",
  "tags": ["morning", "caffeine"],
  "notes": "Daily coffee run"
}
```

#### Delete Transaction
```http
DELETE /api/transactions/:id
Authorization: Bearer session_token
```

### Analytics Routes

#### Get Spending Analytics
```http
GET /api/analytics/spending?timeframe=month&groupBy=category
Authorization: Bearer session_token
```

**Response** (200 OK):
```json
{
  "analytics": {
    "timeframe": "2024-11-01 to 2024-11-30",
    "totalSpent": 2456.78,
    "categoriesBreakdown": [
      {
        "category": "groceries",
        "amount": 523.45,
        "percentage": 21.3,
        "transactionCount": 12,
        "trend": "stable"
      },
      {
        "category": "dining",
        "amount": 387.92,
        "percentage": 15.8,
        "transactionCount": 23,
        "trend": "increasing"
      }
    ],
    "insights": [
      "Dining expenses increased 23% compared to last month",
      "Grocery spending is within budget"
    ]
  }
}
```

#### Get Budget Status
```http
GET /api/analytics/budget?month=2024-11
Authorization: Bearer session_token
```

#### Export Data
```http
GET /api/analytics/export?format=csv&startDate=2024-01-01&endDate=2024-11-30
Authorization: Bearer session_token
```

## 🔧 Admin Routes

*Requires Admin role*

### User Management

#### List All Users
```http
GET /api/admin/users?page=1&limit=50&role=user&status=active
Authorization: Bearer admin_session_token
```

#### Update User Role
```http
PUT /api/admin/users/:id/role
Authorization: Bearer admin_session_token
Content-Type: application/json

{
  "role": "admin",
  "reason": "Promoted to administrator"
}
```

#### Grant Premium Access
```http
PUT /api/admin/users/:id/premium
Authorization: Bearer admin_session_token
Content-Type: application/json

{
  "isPremium": true,
  "expiresAt": "2024-12-31T23:59:59Z",
  "reason": "Promotional upgrade"
}
```

### System Management

#### Get System Stats
```http
GET /api/admin/stats
Authorization: Bearer admin_session_token
```

**Response** (200 OK):
```json
{
  "users": {
    "total": 15420,
    "active": 12380,
    "premium": 2140,
    "newThisMonth": 890
  },
  "usage": {
    "aiRequestsToday": 8750,
    "apiCallsToday": 45320,
    "avgResponseTime": 245,
    "errorRate": 0.12
  },
  "system": {
    "uptime": "15d 4h 32m",
    "cpuUsage": 34.5,
    "memoryUsage": 62.1,
    "diskUsage": 45.8
  }
}
```

#### Get AI Usage Stats
```http
GET /api/admin/ai/usage?timeframe=week
Authorization: Bearer admin_session_token
```

#### Update AI Model Settings
```http
PUT /api/admin/ai/model
Authorization: Bearer admin_session_token
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4",
  "maxTokens": 4000,
  "temperature": 0.7
}
```

## 📊 Response Formats

### Success Response Structure

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-11-30T14:22:15Z",
    "requestId": "req_123abc",
    "version": "v1"
  }
}
```

### Error Response Structure

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required",
    "details": "Valid session token must be provided",
    "action": "Please sign in to continue"
  },
  "meta": {
    "timestamp": "2024-11-30T14:22:15Z",
    "requestId": "req_123abc"
  }
}
```

### Common Error Codes

| Code | Status | Description | Action |
|------|--------|-------------|---------|
| `AUTH_REQUIRED` | 401 | Authentication required | Sign in to continue |
| `SESSION_INVALID` | 401 | Invalid or expired session | Sign in again |
| `PREMIUM_REQUIRED` | 403 | Premium subscription required | Upgrade account |
| `ADMIN_REQUIRED` | 403 | Administrator access required | Contact admin |
| `RATE_LIMITED` | 429 | Too many requests | Wait before retrying |
| `VALIDATION_ERROR` | 400 | Invalid request data | Fix request format |
| `NOT_FOUND` | 404 | Resource not found | Check resource ID |
| `SERVER_ERROR` | 500 | Internal server error | Try again later |

## 🚀 Rate Limiting

### Limits by User Tier

| Tier | AI Endpoints | API Calls | Burst Limit |
|------|-------------|-----------|-------------|
| **Free** | 10/15min | 100/hour | 20/min |
| **Premium** | 50/15min | 500/hour | 100/min |
| **Admin** | 1000/15min | Unlimited | 1000/min |

### Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1701360000
X-RateLimit-Retry-After: 60
```

## 🔧 Request/Response Examples

### Authentication Flow Example

```javascript
// 1. Register new user
const registerResponse = await fetch('/api/auth/sign-up', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'secure123',
    name: 'John Doe'
  })
});

// 2. Session cookie is automatically set
// 3. Make authenticated request
const suggestionsResponse = await fetch('/api/ai-secure/suggestions', {
  method: 'POST',
  credentials: 'include', // Include session cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'groceries',
    amount: 50.00
  })
});
```

### Error Handling Example

```javascript
const apiCall = async (url, options) => {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include'
    });

    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    if (response.status === 403) {
      const error = await response.json();
      if (error.code === 'PREMIUM_REQUIRED') {
        // Show upgrade prompt
        showUpgradeModal();
        return;
      }
    }

    if (response.status === 429) {
      // Handle rate limiting
      const retryAfter = response.headers.get('X-RateLimit-Retry-After');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return apiCall(url, options); // Retry
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
```

## 📚 Related Documentation

- [Authentication Guide](./AUTH.md)
- [Security Guidelines](./SECURITY.md)
- [Setup Instructions](./SETUP.md)
- [Testing Procedures](./TESTS.md)

---

**Last Updated**: December 2024 | **Version**: 2.0.0 | **API Version**: v1