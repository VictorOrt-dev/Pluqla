# +Clair Backend API

REST API Node.js pour l'application d'économies intelligentes avec IA multi-providers.

## 🚀 Quick Start

```bash
npm install                    # Install dependencies
npm run db:generate           # Generate Prisma client
npm run db:migrate            # Run database migrations
npm run dev                   # Start development server
```

**API URL**: `http://localhost:3004`

## 📋 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18
- **Database**: Prisma ORM + SQLite/PostgreSQL
- **Auth**: JWT + Refresh Tokens
- **AI**: Multi-provider (OpenAI, Claude, Gemini)
- **Tests**: Jest + Supertest
- **Security**: Helmet, Rate Limiting, CORS

## 🗄️ Database

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Create/run migrations
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed test data
npm run db:reset       # Reset database
```

## 🛣️ API Endpoints

### Authentication `/api/auth`
```
POST /register         # User registration
POST /login           # User login
POST /logout          # User logout
POST /refresh         # Refresh JWT token
```

### Users `/api/users`
```
GET  /profile         # Get user profile
PUT  /profile         # Update profile
GET  /stats           # User statistics
```

### Transactions `/api/transactions`
```
GET  /                # List transactions
POST /                # Create transaction
PUT  /:id             # Update transaction
DELETE /:id           # Delete transaction
```

### AI Suggestions `/api/ai`
```
GET  /suggestions     # Get AI suggestions
POST /analyze-image   # Analyze uploaded image
POST /chat            # Chat with AI
```

### Strikes/Streaks `/api/strikes`
```
GET  /current         # Get current streak
GET  /stats           # Streak statistics
```

## ⚙️ Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Tokens
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="refresh-secret"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3004
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

# AI APIs (optional)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GEMINI_API_KEY=""

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Current Status**: 54/162 tests passing (108 failing - needs fixing)

## 🛡️ Security Features

- JWT authentication with refresh tokens
- Password hashing (bcrypt)
- Rate limiting per endpoint
- Input validation (express-validator)
- CORS protection
- Helmet security headers
- Request sanitization

## 📊 Key Services

### AI Service
Multi-provider AI integration with fallback:
```javascript
const suggestions = await aiService.getSuggestions(category, lang);
const analysis = await aiService.analyzeImage(imageBuffer);
```

### Strike Service
Gamification streak tracking:
```javascript
const currentStreak = await strikeService.getCurrentStreak(userId);
const updated = await strikeService.updateStreak(userId);
```

### Cache Service
Intelligent caching with TTL:
```javascript
await cacheService.set('key', data, 3600); // 1 hour TTL
const cached = await cacheService.get('key');
```

## 🐳 Docker

```bash
npm run docker:build    # Build image
npm run docker:run      # Run with docker-compose
npm run docker:stop     # Stop services
```

## 📦 Production Deployment

```bash
npm run production:setup    # Install + generate + migrate
npm start                   # Production server
```

Required production env vars:
```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
TRUST_PROXY=true
```

## 🔧 Scripts

```bash
npm run dev           # Development server (nodemon)
npm start             # Production server
npm run build         # No build step (Node.js)
npm test              # Run tests
npm run lint          # ESLint check
npm run lint:fix      # Fix ESLint issues
npm run format        # Prettier formatting
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Express middleware
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   └── server.js       # App entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # DB migrations
├── tests/              # Jest tests
└── uploads/            # File storage
```

## 🚨 Known Issues

1. **Tests**: 108/162 tests failing (foreign key constraint violations)
2. **Dependencies**: All secure (0 vulnerabilities)
3. **Performance**: No known issues

## 📈 Monitoring

- Winston logging with rotation
- Request/response time tracking
- Error rate monitoring
- Database query performance

---

**Version**: 1.0.0 | **Port**: 3004 | **Maintainer**: Victor - +Clair Team