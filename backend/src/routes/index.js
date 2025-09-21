const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const transactionRoutes = require('./transactions');
const aiRoutes = require('./ai');
const analyticsRoutes = require('./analytics');
const uploadRoutes = require('./uploads');
const categoryRoutes = require('./categories');
const financialRoutes = require('./financialRoutes');
const oauthRoutes = require('./oauthRoutes');
const strikeRoutes = require('./strikes');
const shoppingListRoutes = require('./shoppingList');

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'API OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/uploads', uploadRoutes);
router.use('/categories', categoryRoutes);
router.use('/financial', financialRoutes);
router.use('/oauth', oauthRoutes);
router.use('/strikes', strikeRoutes);
router.use('/shopping-list', shoppingListRoutes);

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: '+Clair API',
    version: '1.0.0',
    description: 'API pour l\'application +Clair - Économies intelligentes avec IA',
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
      strikes: '/api/strikes - Système de flammes quotidiennes et motivation'
    },
    documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : null
  });
});

module.exports = router;