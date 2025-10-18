const express = require('express');

const router = express.Router();

// Import all route modules - fully restored functionality
const authRoutes = require('./auth'); // ✅ Essential for login
const userRoutes = require('./users'); // ✅ Re-enabled - all methods implemented
const transactionRoutes = require('./transactions'); // ✅ Re-enabled - createBulkTransactions implemented
const aiRoutes = require('./ai'); // ⚠️ LEGACY: Will be replaced by secure AI system
const aiRoutesV2 = require('./aiRoutes'); // 🤖 NEW: Provider-agnostic AI system
// const secureAiRoutes = require('./secureAi'); // 🔒 SECURE: Migration-ready AI endpoints (DISABLED: Better Auth not working with SQLite)
const analyticsRoutes = require('./analytics'); // ✅ Re-enabled
const uploadRoutes = require('./uploads'); // ✅ Re-enabled
const categoryRoutes = require('./categories'); // ✅ Re-enabled
const financialRoutes = require('./financialRoutes'); // ✅ Re-enabled for dashboard
// const financialAIRoutes = require('./financialAI'); // 💰 NEW: AI-Powered Financial Insights & Projections (TEMP DISABLED for debugging)
const oauthRoutes = require('./oauthRoutes'); // ✅ Re-enabled
const strikeRoutes = require('./strikes'); // ✅ Essential for core functionality
const shoppingListRoutes = require('./shoppingList'); // ✅ Re-enabled
const aiProxyRoutes = require('./ai-proxy'); // ✅ SECURITY: Secure AI proxy
const scaRoutes = require('./sca'); // 🔐 CRITICAL: Strong Customer Authentication for PSD2
const complianceRoutes = require('./compliance'); // 🔒 GDPR & PSD2 compliance endpoints
const photoMatchRoutes = require('./photoMatch'); // 📸 NEW: IA Photo Match feature
const transportOptimizationRoutes = require('./transportOptimization'); // 🚗 NEW: Transport Cost Optimization feature
const transportTripRoutes = require('./transportTrips'); // 🚗 NEW: User Transport Trip CRUD
const mealSuggestionsRoutes = require('./mealSuggestions'); // 🍽️ NEW: AI-powered Meal Suggestions feature
const mealPlanningRoutes = require('./mealPlanning'); // 🍽️ NEW: Jow-inspired Weekly Meal Planning feature
const recipeRoutes = require('./recipes'); // 🍽️ NEW: Recipe CRUD and favorites management
const bankAccountsRoutes = require('./bankAccounts'); // 🏦 NEW: Nordigen Bank Account Connections
// const performanceRoutes = require('./performance'); // ❌ TEMPORARILY DISABLED for setup

// ✨ Phase 1B - Security & Compliance Routes
const gdprRoutes = require('./gdpr'); // 🔒 Phase 1B: GDPR compliance (export, delete, audit)
const recipeInteractionsRoutes = require('./recipeInteractions'); // 📊 Phase 1B: Recipe interactions tracking with fraud detection
const webVitalsRoutes = require('./webVitals'); // 📊 Phase 3: Web Vitals monitoring for performance tracking

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'API OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount all routes - fully restored backend functionality
router.use('/auth', authRoutes); // ✅ Essential for login
router.use('/users', userRoutes); // ✅ All methods implemented including uploadProfilePicture
router.use('/transactions', transactionRoutes); // ✅ All methods implemented including createBulkTransactions
router.use('/ai', aiRoutes); // ⚠️ LEGACY: All methods implemented but insecure
router.use('/ai-v2', aiRoutesV2); // 🤖 NEW: Provider-agnostic AI endpoints
// router.use('/ai-secure', secureAiRoutes); // 🔒 SECURE: Migration-ready secure AI endpoints (DISABLED)
router.use('/analytics', analyticsRoutes); // ✅ All methods implemented
router.use('/uploads', uploadRoutes); // ✅ All methods implemented
router.use('/categories', categoryRoutes); // ✅ All methods implemented
router.use('/financial', financialRoutes); // ✅ All methods implemented
// router.use('/financial/ai', financialAIRoutes); // 💰 NEW: AI-Powered Financial Insights & Projections (TEMP DISABLED for debugging)
router.use('/oauth', oauthRoutes); // ✅ All methods implemented
router.use('/strikes', strikeRoutes); // ✅ All methods implemented
router.use('/shopping-list', shoppingListRoutes); // ✅ All methods implemented
router.use('/ai-proxy', aiProxyRoutes); // ✅ SECURITY: Secure AI proxy
router.use('/sca', scaRoutes); // 🔐 CRITICAL: Strong Customer Authentication endpoints
router.use('/compliance', complianceRoutes); // 🔒 GDPR & PSD2 compliance endpoints
router.use('/photo-match', photoMatchRoutes); // 📸 NEW: IA Photo Match feature
router.use('/transport-optimize', transportOptimizationRoutes); // 🚗 NEW: Transport Cost Optimization feature
router.use('/trips', transportTripRoutes); // 🚗 NEW: User Transport Trip CRUD
router.use('/meal-suggestions', mealSuggestionsRoutes); // 🍽️ NEW: AI-powered Meal Suggestions feature
router.use('/meal-planning', mealPlanningRoutes); // 🍽️ NEW: Jow-inspired Weekly Meal Planning feature
router.use('/recipes', recipeRoutes); // 🍽️ NEW: Recipe CRUD and favorites management
router.use('/bank-accounts', bankAccountsRoutes); // 🏦 NEW: Nordigen Bank Account Connections
// router.use('/performance', performanceRoutes); // ❌ TEMPORARILY DISABLED for setup

// ✨ Phase 1B - Security & Compliance Routes
router.use('/gdpr', gdprRoutes); // 🔒 Phase 1B: GDPR compliance endpoints
router.use('/recipe-interactions', recipeInteractionsRoutes); // 📊 Phase 1B: Recipe interactions with fraud detection
router.use('/web-vitals', webVitalsRoutes); // 📊 Phase 3: Web Vitals monitoring endpoints

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Pluqla API',
    version: '1.0.0',
    description: 'API pour l\'application Pluqla - Économies intelligentes avec IA',
    endpoints: {
      auth: '/api/auth - Authentification et gestion des utilisateurs',
      users: '/api/users - Profils utilisateurs',
      transactions: '/api/transactions - Historique des transactions',
      ai: '/api/ai - Suggestions IA et recommandations',
      analytics: '/api/analytics - Analytics et métriques',
      uploads: '/api/uploads - Upload de fichiers et images',
      categories: '/api/categories - Catégories d\'économies',
      financial: '/api/financial - Gestion financière et tableaux de bord',
      oauth: '/api/oauth - Intégration bancaire OAuth et consentements GDPR',
      strikes: '/api/strikes - Système de flammes quotidiennes et motivation',
      photoMatch: '/api/photo-match - IA Photo Match feature',
      transportOptimization: '/api/transport-optimize - Transport Cost Optimization feature',
      mealSuggestions: '/api/meal-suggestions - AI-powered Meal Suggestions feature',
      mealPlanning: '/api/meal-planning - Jow-inspired Weekly Meal Planning feature',
      bankAccounts: '/api/bank-accounts - Nordigen Bank Account Connections',
      performance: '/api/performance - Monitoring des performances et métriques',
      gdpr: '/api/gdpr - GDPR compliance (Phase 1B)',
      recipeInteractions: '/api/recipe-interactions - Recipe tracking with fraud detection (Phase 1B)',
      webVitals: '/api/web-vitals - Web Vitals monitoring for performance tracking (Phase 3)'
    },
    documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : null
  });
});

module.exports = router;
