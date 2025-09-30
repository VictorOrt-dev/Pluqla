# 🤖 Pluqla AI Integration Setup Guide

**Version**: 1.0.0
**Last Updated**: September 29, 2025

This guide explains how to configure and use the new provider-agnostic AI system in Pluqla, designed for maximum security, flexibility, and compliance with financial regulations.

---

## 📋 Overview

The Pluqla AI system provides:
- **Provider-agnostic architecture** supporting multiple AI providers
- **Enterprise-grade security** with financial data anonymization
- **Advanced rate limiting** and cost controls
- **Compliance-ready** PII protection and audit logging
- **Graceful degradation** when AI is disabled

### Supported Providers
- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Mistral AI** (Mistral Large, Mistral Medium)
- **Azure OpenAI** (Enterprise deployment)

---

## 🚀 Quick Start

### 1. Disable AI (Default - Production Safe)
```env
# .env file
AI_PROVIDER=none
```
With this setting:
- ✅ App runs normally
- ✅ AI endpoints return safe disabled responses
- ✅ No external API calls made
- ✅ Zero cost incurred

### 2. Enable AI with OpenAI
```env
# .env file
AI_PROVIDER=openai
AI_API_KEY=sk-your-openai-api-key-here
AI_MODEL=gpt-4-0125-preview
```

### 3. Enable AI with Anthropic (Claude)
```env
# .env file
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-your-anthropic-key-here
AI_MODEL=claude-3-5-sonnet-20241022
```

### 4. Test AI Status
```bash
curl http://localhost:3004/api/ai-v2/status
```

**Expected Response (Disabled)**:
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "provider": "none",
    "ready": false,
    "features": [],
    "timestamp": "2025-09-29T13:30:00.000Z"
  },
  "message": "AI service status retrieved"
}
```

**Expected Response (Enabled)**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "provider": "openai",
    "ready": true,
    "features": [
      "financial_analysis",
      "transaction_classification",
      "financial_insights",
      "spending_recommendations"
    ],
    "timestamp": "2025-09-29T13:30:00.000Z"
  },
  "message": "AI service status retrieved"
}
```

---

## ⚙️ Configuration Reference

### Core AI Settings
```env
# Provider selection (REQUIRED)
AI_PROVIDER=none                # Options: none | openai | anthropic | mistral | azure

# API credentials (REQUIRED when enabled)
AI_API_KEY=""                   # Your provider's API key
AI_MODEL=""                     # Model name (optional, uses provider defaults)

# Performance settings
AI_MAX_TOKENS=4000              # Maximum tokens per request
AI_MAX_RETRIES=3                # Retry attempts for failed requests
AI_TIMEOUT=30000                # Request timeout in milliseconds
AI_MAX_REQUEST_SIZE=1048576     # Maximum request size (1MB)
```

### Cost Controls
```env
# Cost management (IMPORTANT for production)
AI_MAX_COST_PER_REQUEST=1.0     # Maximum cost per single request ($1.00)
AI_MAX_DAILY_COST_PER_USER=50.0 # Maximum daily cost per user ($50.00)
AI_MAX_MONTHLY_COST=5000.0      # Maximum monthly total cost ($5,000.00)
```

### Security Settings
```env
# Data anonymization (CRITICAL for compliance)
AI_ANONYMIZATION_SALT="pluqla-ai-anonymization-2024"

# User tier for rate limiting
DEFAULT_USER_TIER=free          # Options: free | premium | enterprise
```

### Provider-Specific Configuration

#### OpenAI
```env
AI_PROVIDER=openai
AI_API_KEY=sk-your-openai-key
AI_MODEL=gpt-4-0125-preview     # or gpt-3.5-turbo
OPENAI_ORG_ID=""                # Optional organization ID
```

#### Anthropic (Claude)
```env
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-your-key
AI_MODEL=claude-3-5-sonnet-20241022  # or claude-3-haiku-20240307
```

#### Mistral AI
```env
AI_PROVIDER=mistral
AI_API_KEY=your-mistral-key
AI_MODEL=mistral-large-latest   # or mistral-medium
```

#### Azure OpenAI
```env
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AI_MODEL=gpt-4                  # Your Azure deployment model
```

---

## 🔐 Security & Compliance

### Financial Data Protection
The AI system automatically anonymizes sensitive financial data before sending to external providers:

**Data Anonymization Features:**
- ✅ **Account numbers** removed completely
- ✅ **Personal identifiers** replaced with anonymous IDs
- ✅ **Financial amounts** rounded to nearest dollar
- ✅ **Transaction details** generalized while preserving analytical value
- ✅ **Timestamps** converted to general periods (Q1_2024)
- ✅ **Merchant names** categorized (COFFEE_SHOP, GROCERY_STORE)

**Example Anonymization:**
```javascript
// Original data (NEVER sent to AI)
{
  "user": "john.doe@email.com",
  "accountNumber": "1234567890123456",
  "transactions": [
    {
      "amount": 4.73,
      "description": "STARBUCKS #1234 NEW YORK NY",
      "date": "2024-09-29T14:30:22Z"
    }
  ]
}

// Anonymized data (sent to AI)
{
  "anonymousUserId": "ANON_USERID_a7b2c3d4e5f6",
  "transactions": [
    {
      "amount": 5,
      "description": "COFFEE_SHOP",
      "date": "Q3_2024"
    }
  ],
  "_sanitization": {
    "anonymized": true,
    "rules": ["sensitive_removed", "pii_anonymized", "amounts_rounded"]
  }
}
```

### Rate Limiting
Comprehensive rate limiting prevents abuse and controls costs:

**Free Tier Limits:**
- 10 requests per hour
- 50,000 tokens per hour
- $50 daily cost limit

**Premium Tier Limits:**
- 100 requests per hour
- 500,000 tokens per hour
- $500 daily cost limit

**Enterprise Tier Limits:**
- 1,000 requests per hour
- 5,000,000 tokens per hour
- $5,000 daily cost limit

---

## 📡 API Endpoints

All AI endpoints are available at `/api/ai-v2/` and require authentication.

### 1. Status Check
```http
GET /api/ai-v2/status
```
**Public endpoint** - No authentication required.

### 2. Financial Analysis
```http
POST /api/ai-v2/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "transactions": [...],
    "accounts": [...],
    "summary": {...}
  },
  "analysisType": "spending_analysis",
  "options": {
    "maxTokens": 2000,
    "temperature": 0.7
  }
}
```

**Analysis Types:**
- `spending_analysis` - Analyze spending patterns and trends
- `budget_optimization` - Optimize budget allocation
- `risk_assessment` - Assess financial risks
- `investment_insights` - Investment portfolio analysis
- `debt_analysis` - Debt management strategies

### 3. Transaction Classification
```http
POST /api/ai-v2/classify
Authorization: Bearer <token>
Content-Type: application/json

{
  "transaction": {
    "description": "AMAZON.COM AMZN.COM/BILL WA",
    "amount": 29.99,
    "merchant": "Amazon",
    "date": "2024-09-29"
  }
}
```

### 4. Financial Insights
```http
POST /api/ai-v2/insights
Authorization: Bearer <token>
Content-Type: application/json

{
  "financialSummary": {
    "totalIncome": 5000,
    "totalExpenses": 3500,
    "savingsRate": 0.3,
    "spendingByCategory": {...}
  },
  "timeframe": "month",
  "includeRecommendations": true
}
```

### 5. Spending Recommendations
```http
POST /api/ai-v2/recommendations
Authorization: Bearer <token>
Content-Type: application/json

{
  "spendingPattern": {
    "categories": {
      "food": 800,
      "transport": 300,
      "entertainment": 200
    }
  },
  "goals": [
    {
      "type": "savings",
      "target": 1000,
      "priority": "high"
    }
  ],
  "constraints": {
    "budget": 4000,
    "fixedExpenses": 2000
  }
}
```

### 6. Health Check
```http
GET /api/ai-v2/health
Authorization: Bearer <token>
```

### 7. Rate Limits
```http
GET /api/ai-v2/limits
Authorization: Bearer <token>
```

---

## 🧪 Testing & Development

### 1. Test with Disabled AI
```bash
# Set in .env
AI_PROVIDER=none

# Test status endpoint
curl http://localhost:3004/api/ai-v2/status

# Expected: AI disabled response
```

### 2. Test with Mock Data
```javascript
// Example test request
const testAnalysis = {
  data: {
    transactions: [
      {
        amount: 25,
        description: "GROCERY_STORE",
        category: "food",
        date: "Q3_2024"
      }
    ],
    summary: {
      totalExpenses: 1500,
      savingsRate: 0.2
    }
  },
  analysisType: "spending_analysis"
};

const response = await fetch('/api/ai-v2/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testAnalysis)
});
```

### 3. Development Environment
```env
# .env.development
AI_PROVIDER=openai
AI_API_KEY=sk-test-key
AI_MODEL=gpt-3.5-turbo
AI_MAX_TOKENS=1000
AI_MAX_COST_PER_REQUEST=0.10
```

---

## 🚨 Error Handling

### Common Error Responses

#### AI Disabled
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "success": false,
  "data": {
    "status": "disabled",
    "message": "AI features are currently disabled. Configure AI_PROVIDER to enable.",
    "provider": "none",
    "enabled": false
  }
}
```

#### Rate Limit Exceeded
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "success": false,
  "error": "Rate limit exceeded for AI requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "message": "Request limit exceeded (10/10 per hour)",
    "retryAfter": 3600
  }
}
```

#### Invalid API Key
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "success": false,
  "error": "AI analysis failed",
  "code": "AI_REQUEST_FAILED",
  "details": {
    "provider": "openai"
  }
}
```

#### Validation Error
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": "Invalid request context",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": ["Authentication required for this request type"]
  }
}
```

---

## 🎯 Best Practices

### 1. Security
- ✅ Always use `AI_PROVIDER=none` by default
- ✅ Never hardcode API keys in code
- ✅ Use environment-specific configurations
- ✅ Monitor API usage and costs regularly
- ✅ Implement proper error handling

### 2. Performance
- ✅ Set appropriate token limits for your use case
- ✅ Use caching for repeated requests
- ✅ Implement request queuing for high-volume scenarios
- ✅ Monitor response times and adjust timeouts

### 3. Cost Management
```env
# Production cost controls
AI_MAX_COST_PER_REQUEST=0.50     # $0.50 per request
AI_MAX_DAILY_COST_PER_USER=10.0  # $10 per user per day
AI_MAX_MONTHLY_COST=1000.0       # $1,000 per month total
```

### 4. Monitoring
```javascript
// Log AI usage for monitoring
logger.info('AI request completed', {
  userId: req.user.id,
  provider: 'openai',
  requestType: 'financial_analysis',
  duration: 1234,
  tokensUsed: 850,
  estimatedCost: 0.02
});
```

---

## 🔧 Troubleshooting

### Issue: AI Always Returns "Disabled"
**Solution**: Check your environment configuration:
```bash
# Verify AI_PROVIDER is set
echo $AI_PROVIDER

# Verify API key is set
echo $AI_API_KEY | head -c 20  # Only show first 20 chars

# Check application logs
tail -f logs/app.log | grep -i "ai"
```

### Issue: "Connection Failed" Errors
**Possible Causes:**
1. Invalid API key format
2. Network connectivity issues
3. Provider service outage
4. Incorrect endpoint configuration

**Solution**:
```bash
# Test API key manually
curl -H "Authorization: Bearer $AI_API_KEY" \
     https://api.openai.com/v1/models

# Check network connectivity
curl -I https://api.openai.com

# Verify environment variables
npm run config:check
```

### Issue: Rate Limits Too Restrictive
**Solution**: Adjust rate limiting for your tier:
```env
# Increase limits for development
DEFAULT_USER_TIER=premium

# Or adjust cost controls
AI_MAX_DAILY_COST_PER_USER=100.0
```

### Issue: Slow Response Times
**Solutions:**
1. Reduce token limits
2. Use faster models (gpt-3.5-turbo vs gpt-4)
3. Implement request caching
4. Optimize data payload size

---

## 📊 Monitoring & Analytics

### Key Metrics to Track
- **Request Volume**: Requests per hour/day
- **Response Time**: Average and P95 response times
- **Success Rate**: Percentage of successful requests
- **Cost Tracking**: Daily/monthly spending
- **Error Rates**: Failed requests by error type

### Logging Examples
```javascript
// Success metrics
logger.info('AI analysis completed', {
  userId: 'user123',
  provider: 'openai',
  model: 'gpt-4',
  requestType: 'spending_analysis',
  duration: 2341,
  tokensUsed: 1250,
  cost: 0.025,
  success: true
});

// Error metrics
logger.error('AI request failed', {
  userId: 'user123',
  provider: 'openai',
  error: 'Rate limit exceeded',
  duration: 234,
  retryable: true
});
```

---

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] Set `AI_PROVIDER=none` initially
- [ ] Configure cost limits appropriately
- [ ] Set up monitoring and alerting
- [ ] Test with disabled AI functionality
- [ ] Verify data anonymization is working

### Initial AI Rollout
- [ ] Start with single provider (e.g., OpenAI)
- [ ] Enable for limited user segment
- [ ] Monitor costs and performance
- [ ] Gradually increase rate limits
- [ ] Add additional providers as needed

### Monitoring Setup
- [ ] API usage tracking
- [ ] Cost monitoring alerts
- [ ] Performance metrics collection
- [ ] Error rate monitoring
- [ ] Security audit logging

---

## 📞 Support & Resources

### Documentation
- **API Reference**: `/docs/API.md`
- **Security Guide**: `/docs/SECURITY_AUDIT.md`
- **Deployment Guide**: `/docs/DEPLOYMENT.md`

### Provider Documentation
- **OpenAI**: https://platform.openai.com/docs
- **Anthropic**: https://docs.anthropic.com
- **Mistral**: https://docs.mistral.ai
- **Azure OpenAI**: https://docs.microsoft.com/azure/cognitive-services/openai

### Community
- **GitHub Issues**: Report bugs and feature requests
- **Developer Slack**: #pluqla-ai-integration

---

**🤖 AI Integration Complete!**

Your Pluqla backend is now equipped with a secure, scalable, and compliant AI system ready for production deployment.