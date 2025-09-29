const express = require('express');

const router = express.Router();

// Import all route modules - fully restored functionality
const authRoutes = require('./auth'); // ✅ Essential for login
const userRoutes = require('./users'); // ✅ Re-enabled - all methods implemented
const transactionRoutes = require('./transactions'); // ✅ Re-enabled - createBulkTransactions implemented
const aiRoutes = require('./ai'); // ✅ Re-enabled
const analyticsRoutes = require('./analytics'); // ✅ Re-enabled
const uploadRoutes = require('./uploads'); // ✅ Re-enabled
const categoryRoutes = require('./categories'); // ✅ Re-enabled
const financialRoutes = require('./financialRoutes'); // ✅ Re-enabled for dashboard
const oauthRoutes = require('./oauthRoutes'); // ✅ Re-enabled
const strikeRoutes = require('./strikes'); // ✅ Essential for core functionality
const shoppingListRoutes = require('./shoppingList'); // ✅ Re-enabled
const aiProxyRoutes = require('./ai-proxy'); // ✅ SECURITY: Secure AI proxy
const scaRoutes = require('./sca'); // 🔐 CRITICAL: Strong Customer Authentication for PSD2
// const performanceRoutes = require('./performance'); // ❌ TEMPORARILY DISABLED for setup

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
router.use('/ai', aiRoutes); // ✅ All methods implemented
router.use('/analytics', analyticsRoutes); // ✅ All methods implemented
router.use('/uploads', uploadRoutes); // ✅ All methods implemented
router.use('/categories', categoryRoutes); // ✅ All methods implemented
router.use('/financial', financialRoutes); // ✅ All methods implemented
router.use('/oauth', oauthRoutes); // ✅ All methods implemented
router.use('/strikes', strikeRoutes); // ✅ All methods implemented
router.use('/shopping-list', shoppingListRoutes); // ✅ All methods implemented
router.use('/ai-proxy', aiProxyRoutes); // ✅ SECURITY: Secure AI proxy
router.use('/sca', scaRoutes); // 🔐 CRITICAL: Strong Customer Authentication endpoints
// router.use('/performance', performanceRoutes); // ❌ TEMPORARILY DISABLED for setup

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
      performance: '/api/performance - Monitoring des performances et métriques'
    },
    documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : null
  });
});

module.exports = router;
