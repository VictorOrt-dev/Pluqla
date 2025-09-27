# 📁 Pluqla Directory Structure Guide

**Professional monorepo structure following industry best practices for financial applications**

---

## 🎯 Overview

This document outlines the comprehensive directory structure for the Pluqla application, designed with separation of concerns, scalability, and maintainability in mind.

## 🏗️ Root Level Structure

```
pluqla/
├── 🖥️  client/                    # React frontend application
├── 🚀  server/                    # Node.js backend API
├── 📚  docs/                      # Technical documentation
├── 🔧  infra/                     # Infrastructure & deployment
├── 🤝  shared/                    # Shared resources & utilities
├── 📋  package.json               # Root workspace configuration
├── 📖  README.md                  # Main project documentation
├── 🔒  .env                       # Environment variables
├── 🎭  playwright.config.js       # E2E testing configuration
└── 🧪  .github/                   # CI/CD workflows
```

---

## 🖥️ Client Directory (`/client`)

**React frontend application with modern development practices**

```
client/
├── src/
│   ├── components/              # React components organized by feature
│   │   ├── auth/               # Authentication components
│   │   ├── common/             # Reusable UI components
│   │   ├── features/           # Feature-specific components
│   │   │   ├── activity/       # Physical activity tracking
│   │   │   ├── dashboard/      # Financial dashboard
│   │   │   ├── finance/        # Financial management
│   │   │   ├── food/           # Food recommendations
│   │   │   ├── habits/         # Habit tracking
│   │   │   └── transport/      # Transportation optimization
│   │   ├── home/               # Home screen components
│   │   ├── onboarding/         # User onboarding flow
│   │   ├── profile/            # User profile management
│   │   └── ui/                 # Base UI components (Button, Input, etc.)
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.js      # Authentication state
│   │   ├── NavigationContext.js # Navigation management
│   │   └── ThemeContext.js     # Theme configuration
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAISuggestions.js # AI suggestions logic
│   │   ├── useOnboarding.js    # Onboarding flow management
│   │   └── useTransactions.js  # Transaction management
│   ├── services/               # API services & business logic
│   │   ├── api/                # API layer
│   │   ├── authService.js      # Authentication service
│   │   ├── financialApi.js     # Financial data service
│   │   └── pwaService.js       # PWA functionality
│   ├── utils/                  # Utility functions
│   │   ├── aiHelpers.js        # AI integration helpers
│   │   ├── analytics.js        # Analytics tracking
│   │   └── navigation.js       # Navigation utilities
│   ├── i18n/                   # Internationalization
│   │   ├── index.js            # i18n configuration
│   │   └── locales/            # Translation files
│   │       ├── en/             # English translations
│   │       ├── es/             # Spanish translations
│   │       └── fr/             # French translations
│   ├── styles/                 # CSS and styling
│   │   ├── accessibility.css   # Accessibility styles
│   │   └── pluqla-theme.css    # Pluqla design system
│   └── App.jsx                 # Main application component
├── public/                     # Static assets
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   └── index.html              # HTML template
├── package.json                # Client dependencies
└── build/                      # Production build output
```

### Key Principles - Client

- **Feature-based organization**: Components grouped by business domain
- **Reusable components**: Common UI elements in shared directories
- **Service layer**: Clean separation between UI and API logic
- **Context management**: Centralized state management with React Context
- **Internationalization**: Multi-language support with i18next

---

## 🚀 Server Directory (`/server`)

**Node.js backend API with security-first approach**

```
server/
├── src/
│   ├── controllers/            # API endpoint controllers
│   │   ├── aiController.js     # AI suggestions endpoints
│   │   ├── analyticsController.js # Analytics endpoints
│   │   ├── authController.js   # Authentication endpoints
│   │   ├── badgeController.js  # Gamification badges
│   │   ├── categoryController.js # Category management
│   │   ├── financialController.js # Financial data
│   │   ├── transactionController.js # Transaction management
│   │   ├── uploadController.js # File upload handling
│   │   └── userController.js   # User management
│   ├── services/               # Business logic services
│   │   ├── aiService.js        # AI integration service
│   │   ├── bankIntegrationService.js # Banking API integration
│   │   ├── emailService.js     # Email notifications
│   │   ├── financialAIService.js # Financial AI analysis
│   │   ├── gdprService.js      # GDPR compliance
│   │   ├── refreshTokenService.js # JWT token management
│   │   └── strikeService.js    # Streak management
│   ├── routes/                 # API route definitions
│   │   ├── ai.js               # AI-related routes
│   │   ├── auth.js             # Authentication routes
│   │   ├── financialRoutes.js  # Financial routes
│   │   ├── index.js            # Route aggregation
│   │   ├── oauthRoutes.js      # OAuth integration
│   │   ├── strikes.js          # Streak routes
│   │   ├── transactions.js     # Transaction routes
│   │   └── users.js            # User routes
│   ├── middleware/             # Express middleware
│   │   ├── validation/         # Input validation middleware
│   │   ├── auth.js             # Authentication middleware
│   │   ├── errorHandler.js     # Global error handling
│   │   ├── financialRateLimit.js # Financial endpoint rate limiting
│   │   └── rateLimit.js        # General rate limiting
│   ├── lib/                    # Shared libraries
│   │   └── prisma.js           # Prisma client singleton
│   └── utils/                  # Utility functions
│       ├── jwt.js              # JWT token utilities
│       ├── logger.js           # Logging configuration
│       ├── responseHelper.js   # Standardized API responses
│       ├── secureLogger.js     # Security-focused logging
│       └── tokenUtils.js       # Token management utilities
├── prisma/                     # Database configuration
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seed.js                 # Database seeding
├── tests/                      # Test suites
│   ├── critical/               # Critical security tests
│   ├── integration/            # Integration tests
│   ├── performance/            # Performance tests
│   ├── security/               # Security tests
│   ├── unit/                   # Unit tests
│   ├── e2e/                    # End-to-end tests
│   │   ├── helpers/            # Test utilities
│   │   └── scripts/            # Test setup/teardown
│   └── setup.js                # Test configuration
├── logs/                       # Application logs
├── config/                     # Configuration files
├── package.json                # Server dependencies
└── openapi.json                # API documentation
```

### Key Principles - Server

- **Layered architecture**: Controllers → Services → Data Access
- **Security-first**: Comprehensive middleware for validation and protection
- **Database optimization**: Prisma ORM with singleton pattern
- **Comprehensive testing**: Unit, integration, and security tests
- **Structured logging**: Security-aware logging with data sanitization

---

## 📚 Documentation Directory (`/docs`)

**Comprehensive technical documentation organized by purpose**

```
docs/
├── architecture/               # System architecture documentation
│   ├── CLAUDE_TECHNICAL_GUIDE.md # Complete technical guide
│   ├── DATABASE_INDEXES.md    # Database optimization guide
│   ├── DIRECTORY_STRUCTURE_GUIDE.md # This document
│   ├── QUERY_PERFORMANCE_EXAMPLES.md # Query optimization
│   ├── RATE_LIMITING_ARCHITECTURE.md # Rate limiting design
│   └── VALIDATION_ARCHITECTURE.md # Input validation design
├── api/                        # API documentation
│   └── openapi.json            # OpenAPI 3.0 specification
├── guides/                     # User and developer guides
│   ├── E2E_TESTING_GUIDE.md    # End-to-end testing guide
│   ├── FRONTEND_TEST_GUIDE.md  # Frontend testing guide
│   ├── RATE_LIMITING_VERIFICATION_GUIDE.md # Rate limiting testing
│   ├── VALIDATION_VERIFICATION_GUIDE.md # Validation testing
│   └── VISUAL_IDENTITY_GUIDE.md # Design system guide
├── changelog/                  # Project history and reports
│   ├── AUDIT_REPORT.md         # Security audit reports
│   ├── BACKEND_ACTION_PLAN.md  # Backend roadmap
│   ├── CRITICAL_FIX_STATUS.md  # Critical fixes status
│   ├── FRONTEND_AUDIT_REPORT.md # Frontend audit
│   └── PHASE_2_TESTING_SUMMARY.md # Testing phase summary
└── setup/                      # Installation and deployment
    └── DEPLOYMENT_CHECKLIST.md # Production deployment guide
```

### Documentation Principles

- **Purpose-driven organization**: Docs categorized by use case
- **Comprehensive coverage**: Architecture, API, guides, and history
- **Developer-friendly**: Clear examples and step-by-step guides
- **Maintainable**: Regular updates with project evolution

---

## 🔧 Infrastructure Directory (`/infra`)

**Infrastructure as Code and deployment automation**

```
infra/
├── docker/                     # Docker configurations
│   ├── Dockerfile              # Application container
│   ├── docker-compose.yml      # Multi-service setup
│   └── nginx.conf              # Reverse proxy configuration
├── ci-cd/                      # Continuous integration/deployment
│   ├── deploy.sh               # Deployment scripts
│   ├── health-check.sh         # Health monitoring
│   └── rollback.sh             # Rollback procedures
├── monitoring/                 # Observability and monitoring
│   ├── grafana/                # Grafana dashboards
│   ├── prometheus/             # Prometheus configuration
│   └── alerts.yml              # Alert rules
├── deployment/                 # Deployment configurations
│   ├── production.yml          # Production environment
│   ├── staging.yml             # Staging environment
│   └── kubernetes/             # K8s manifests
└── scripts/                    # Utility scripts
    ├── setup-branch-protection.sh # Git branch protection
    └── backup-database.sh      # Database backup
```

### Infrastructure Principles

- **Environment parity**: Consistent configurations across environments
- **Automation-first**: Scripted deployments and monitoring
- **Security hardening**: Secure defaults and access controls
- **Observability**: Comprehensive monitoring and alerting

---

## 🤝 Shared Directory (`/shared`)

**Cross-platform utilities and shared resources**

```
shared/
├── types/                      # TypeScript type definitions
│   ├── api.types.ts            # API request/response types
│   ├── auth.types.ts           # Authentication types
│   └── financial.types.ts      # Financial data types
├── constants/                  # Global constants
│   ├── api.constants.js        # API endpoints and codes
│   ├── financial.constants.js  # Financial calculation constants
│   └── ui.constants.js         # UI configuration constants
└── utils/                      # Cross-platform utilities
    ├── validation.utils.js     # Shared validation functions
    ├── formatting.utils.js     # Data formatting utilities
    └── crypto.utils.js         # Cryptographic utilities
```

### Shared Resources Principles

- **DRY principle**: Single source of truth for shared code
- **Type safety**: TypeScript definitions for better development experience
- **Platform agnostic**: Code that works in both client and server
- **Centralized constants**: Consistent values across the application

---

## 🧪 GitHub Directory (`/.github`)

**CI/CD workflows and repository configuration**

```
.github/
├── workflows/                  # GitHub Actions workflows
│   ├── ci.yml                  # Continuous integration
│   ├── e2e-tests.yml           # End-to-end testing
│   └── security-scan.yml       # Security scanning
├── ISSUE_TEMPLATE/             # Issue templates
├── PULL_REQUEST_TEMPLATE.md    # PR template
└── labels.yml                  # Repository labels configuration
```

---

## 📋 Configuration Files

### Root Level Configuration

| File | Purpose |
|------|---------|
| `package.json` | Monorepo workspace configuration |
| `.env` / `.env.example` | Environment variables |
| `playwright.config.js` | E2E testing configuration |
| `.gitignore` | Git ignore patterns |
| `.audit-ci.json` | Security audit configuration |
| `README.md` | Main project documentation |
| `CLAUDE.md` | Technical development guide |

### Environment-Specific

| Environment | Configuration |
|-------------|---------------|
| **Development** | SQLite database, mock services, debug logging |
| **Testing** | In-memory database, mock external APIs, detailed logging |
| **Staging** | PostgreSQL, real services, production-like config |
| **Production** | PostgreSQL, optimized settings, minimal logging |

---

## 🔄 Migration from Old Structure

### Before (Legacy Structure)
```
old-structure/
├── frontend/    # → client/
├── backend/     # → server/
├── tests/       # → server/tests/
├── scripts/     # → infra/scripts/
└── docs/        # → organized in docs/ subdirectories
```

### After (Professional Structure)
```
professional-structure/
├── client/      # Frontend application
├── server/      # Backend API + tests
├── docs/        # Organized documentation
├── infra/       # Infrastructure code
└── shared/      # Common utilities
```

### Migration Benefits

1. **Clear separation of concerns**: Each directory has a single responsibility
2. **Industry standards**: Follows established patterns for enterprise applications
3. **Scalability**: Structure supports growth and team expansion
4. **Maintainability**: Easier to navigate and understand codebase
5. **Deployment ready**: Clear boundaries for containerization and deployment

---

## 🎯 Best Practices

### Naming Conventions

- **Directories**: `kebab-case` for top-level, `camelCase` for nested
- **Files**: `camelCase.js` for code, `UPPER_CASE.md` for documentation
- **Components**: `PascalCase.jsx` for React components
- **Constants**: `UPPER_SNAKE_CASE` for global constants

### File Organization

- **Feature-based**: Group related files by business domain
- **Layer separation**: Separate presentation, business, and data layers
- **Shared resources**: Extract common code to shared directories
- **Configuration**: Centralize environment-specific configuration

### Documentation Standards

- **README files**: Each major directory should have a README
- **Inline documentation**: JSDoc for functions and complex logic
- **Architecture decisions**: Document major design choices
- **API documentation**: Maintain OpenAPI specifications

---

## 🚀 Future Considerations

### Potential Additions

```
future-additions/
├── packages/                   # Micro-frontend packages
├── tools/                      # Custom development tools
├── e2e/                        # Dedicated E2E testing directory
└── mobile/                     # React Native mobile app
```

### Scalability Planning

- **Microservices**: Server directory can be split into service-specific directories
- **Micro-frontends**: Client can be split into feature-specific packages
- **Shared libraries**: Extract common code into npm packages
- **Infrastructure growth**: Add environment-specific directories

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Maintainer**: Pluqla Architecture Team