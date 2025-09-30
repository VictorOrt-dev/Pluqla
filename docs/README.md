# Pluqla Documentation

> Comprehensive technical documentation for the development team

## 🚀 Quick Start

**New to Pluqla?** Start here:
1. [**Setup Guide**](guides/SETUP.md) - Complete installation and configuration
2. [**Authentication Guide**](features/AUTH.md) - Better Auth implementation details
3. [**API Reference**](api/API.md) - Complete API documentation
4. [**Security Guidelines**](security/SECURITY.md) - Security best practices

## 📁 Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── CHANGELOG.md                 # Project version history
│
├── guides/                      # Core development guides
│   ├── SETUP.md                 # Development environment setup
│   ├── DEPLOYMENT.md            # Production deployment guide
│   ├── DEPLOYMENT_CHECKLIST.md # Pre-deployment verification
│   ├── DEVELOPER_GUIDE.md       # Developer onboarding
│   ├── PRODUCTION_CHECKLIST.md # Production readiness checklist
│   └── COLLABORATION.md         # Team collaboration guide
│
├── features/                    # Feature-specific documentation
│   ├── AUTH.md                  # Authentication system (Better Auth)
│   ├── UX_AUTH.md               # Authentication UX guidelines
│   ├── AI_SETUP.md              # AI service integration
│   ├── AI_MIGRATION.md          # AI migration guide
│   ├── AI_CONTEXT.md            # AI system context
│   ├── FINANCE_FEATURE_DOCUMENTATION.md
│   ├── FINANCE_TECHNICAL_REFERENCE.md
│   └── VISUAL_IDENTITY.md       # Design system & branding
│
├── api/                         # API documentation
│   ├── API.md                   # REST API reference
│   └── openapi.json             # OpenAPI 3.0 specification
│
├── architecture/                # System architecture docs
│   ├── DIRECTORY_STRUCTURE_GUIDE.md
│   ├── DATABASE_INDEXES.md
│   ├── RATE_LIMITING_ARCHITECTURE.md
│   └── VALIDATION_ARCHITECTURE.md
│
├── security/                    # Security documentation
│   ├── SECURITY.md              # Security guidelines & best practices
│   └── SECURITY_FIXES_CHECKLIST.md
│
├── development/                 # Development tools & practices
│   ├── TESTS.md                 # Testing procedures
│   └── MONITORING.md            # Monitoring & observability
│
└── reports/                     # Historical reports & audits
    ├── audits/
    │   └── SECURITY_AUDIT.md    # Security assessment
    ├── completed/               # Implementation completion reports
    │   ├── AI_IMPLEMENTATION_COMPLETE.md
    │   ├── BACKEND_AUTHENTICATION_FIX.md
    │   ├── BETTER_AUTH_VALIDATION_REPORT.md
    │   ├── DEPLOY_REPORT.md
    │   ├── MONITORING_IMPLEMENTATION_COMPLETE.md
    │   ├── POSTGRESQL_MIGRATION.md
    │   └── PRISMA_SINGLETON_COMPLETE.md
    └── archive/
        └── QUERY_PERFORMANCE_EXAMPLES.md
```

## 📋 Core Documentation

### 🛠️ Setup & Development
- **[Setup Guide](guides/SETUP.md)** - Complete development environment setup
- **[Developer Guide](guides/DEVELOPER_GUIDE.md)** - Onboarding for new developers
- **[Testing Guide](development/TESTS.md)** - Comprehensive testing procedures
- **[Deployment Guide](guides/DEPLOYMENT.md)** - Production deployment guide
- **[Deployment Checklist](guides/DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification

### 🔐 Authentication & Security
- **[Authentication System](features/AUTH.md)** - Better Auth integration guide
- **[Security Guidelines](security/SECURITY.md)** - Comprehensive security documentation
- **[Security Audit](reports/audits/SECURITY_AUDIT.md)** - Latest security assessment
- **[API Reference](api/API.md)** - Protected endpoints and authentication

### 🤖 AI Features
- **[AI Setup Guide](features/AI_SETUP.md)** - AI service integration
- **[AI Migration Guide](features/AI_MIGRATION.md)** - Migration to new AI system
- **[AI Context](features/AI_CONTEXT.md)** - AI system architecture

### 💰 Finance Features
- **[Finance Features](features/FINANCE_FEATURE_DOCUMENTATION.md)** - Financial features overview
- **[Finance Technical Reference](features/FINANCE_TECHNICAL_REFERENCE.md)** - Technical implementation

### 🏗️ Architecture & Implementation
- **[Directory Structure](architecture/DIRECTORY_STRUCTURE_GUIDE.md)** - Project organization
- **[Database Design](architecture/DATABASE_INDEXES.md)** - Schema and optimizations
- **[Rate Limiting](architecture/RATE_LIMITING_ARCHITECTURE.md)** - Rate limiting architecture
- **[Validation System](architecture/VALIDATION_ARCHITECTURE.md)** - Input validation framework

### 📊 Monitoring & Operations
- **[Monitoring Guide](development/MONITORING.md)** - Observability and monitoring
- **[Production Checklist](guides/PRODUCTION_CHECKLIST.md)** - Pre-deployment checklist

### 🎨 Design & UX
- **[Visual Identity](features/VISUAL_IDENTITY.md)** - Design system and branding
- **[Auth UX Guidelines](features/UX_AUTH.md)** - Authentication user experience

## 💻 Development Workflow

For new developers:

1. **Clone and Setup**: Follow the [Setup Guide](guides/SETUP.md)
2. **Authentication**: Understand [Better Auth Integration](features/AUTH.md)
3. **Testing**: Run tests with [Testing Guide](development/TESTS.md)
4. **Development**: Build features using [API Reference](api/API.md)
5. **Security**: Follow [Security Guidelines](security/SECURITY.md)
6. **Deploy**: Use [Deployment Guide](guides/DEPLOYMENT.md)

## 🔄 Recent Updates

### Documentation Reorganization (September 2025)
- ✅ Organized docs into logical categories (guides, features, security, etc.)
- ✅ Moved completed reports to `reports/completed/`
- ✅ Centralized security documentation in `security/`
- ✅ Separated feature docs into `features/`

### Better Auth Integration (v2.0.0)
- ✅ Complete session-based authentication system
- ✅ Role-based access control (User/Premium/Admin)
- ✅ AI endpoint protection with PII sanitization
- ✅ Legacy JWT compatibility layer
- ✅ Comprehensive testing suite
- ✅ Production-ready deployment procedures

## 📞 Support

- **Documentation Issues**: Create an issue in the repository
- **Development Questions**: Check [COLLABORATION.md](guides/COLLABORATION.md)
- **Security Concerns**: Follow [Security Guidelines](security/SECURITY.md)

## 📝 Contributing to Documentation

When adding new documentation:
- Place **guides** in `guides/`
- Place **feature docs** in `features/`
- Place **API specs** in `api/`
- Place **architecture docs** in `architecture/`
- Place **completed reports** in `reports/completed/`
- Update this README with new document links

---

**Last Updated**: September 30, 2025 | **Version**: 2.1.0 | **Status**: Production Ready
