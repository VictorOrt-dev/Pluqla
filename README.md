# +Clair

**Smart savings app with AI-powered insights and gamification**

[![Status](https://img.shields.io/badge/Status-Ready-brightgreen)]()
[![Version](https://img.shields.io/badge/Version-2.0.0-blue)]()
[![Architecture](https://img.shields.io/badge/Architecture-Monorepo-orange)]()

## Quick Start

```bash
# Install dependencies
npm run install:all

# Setup database
npm run db:setup

# Start development servers
npm start
```

**Access:** Frontend at [localhost:3000](http://localhost:3000) • Backend at [localhost:3004](http://localhost:3004)

## Features

- 💰 **Smart Savings** - AI-powered expense tracking and recommendations
- 🎮 **Gamification** - Daily streaks, badges, and progress levels
- 🤖 **Multi-AI Support** - Claude, OpenAI, Gemini integrations
- 🌍 **Multilingual** - French, English, Spanish with adaptive AI
- 📱 **PWA Ready** - Mobile-first progressive web app
- 🔒 **Secure** - JWT auth, encryption, rate limiting

## Project Structure

```
+Clair/
├── frontend/         # React app (port 3000)
│   ├── src/         # Components, hooks, services
│   └── public/      # Static assets
├── backend/         # Node.js API (port 3004)
│   ├── src/         # Controllers, routes, services
│   ├── prisma/      # Database schema & migrations
│   └── tests/       # API tests
└── package.json     # Monorepo scripts
```

## Available Scripts

### Development
```bash
npm start                  # Start both frontend & backend
npm run start:frontend     # Frontend only
npm run start:backend      # Backend only
```

### Build & Test
```bash
npm run build             # Production build
npm test                  # Run all tests
npm run lint              # Code linting
```

### Database
```bash
npm run db:setup          # Initialize database
npm run db:migrate        # Run migrations
npm run db:seed           # Seed test data
```

## Tech Stack

**Frontend:** React 18, Tailwind CSS, i18next, Chart.js, PWA
**Backend:** Node.js, Express, Prisma, JWT, SQLite/PostgreSQL
**AI:** Claude (Anthropic), OpenAI GPT, Google Gemini
**Tools:** npm workspaces, Jest, ESLint, Winston

## Environment Setup

1. **Copy environment files:**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. **Configure API keys** (optional):
   ```bash
   # In backend/.env
   OPENAI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```

3. **Initialize database:**
   ```bash
   npm run db:setup
   ```

## API Endpoints

**Core APIs:**
- `GET /api/health` - Health check
- `POST /api/auth/login` - User authentication
- `GET /api/transactions` - Transaction history
- `GET /api/ai/suggestions` - AI recommendations
- `GET /api/strikes/current` - Daily streak status

**Full API documentation:** [localhost:3004/api](http://localhost:3004/api)

## Performance

- **Test Coverage:** 80%+ backend, comprehensive frontend
- **Bundle Size:** Optimized with code splitting
- **Database:** Indexed queries, connection pooling
- **Security:** Helmet, CORS, rate limiting, input validation

## Troubleshooting

**Port conflicts:**
```bash
npm run clean && npm start
```

**Database issues:**
```bash
npm run db:setup
```

**Dependency problems:**
```bash
npm run install:all
```

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Run `npm test` before committing

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Technical implementation guide
- **[Backend API](./backend/README.md)** - API documentation
- **[Frontend Components](./frontend/src/)** - React component library

## License

MIT © +Clair Team

---

*Smart savings for the modern world* 🚀