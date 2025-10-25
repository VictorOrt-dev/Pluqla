/**
 * Prometheus Metrics Configuration
 *
 * Définit toutes les métriques pour monitoring et alerting
 * Exposées sur /metrics pour scraping par Prometheus
 */

const client = require('prom-client');
const logger = require('../utils/logger');

// Créer un registre pour toutes les métriques
const register = new client.Registry();

// Ajouter les métriques système par défaut (CPU, mémoire, etc.)
client.collectDefaultMetrics({ register });

// ============================================================================
// MÉTRIQUES HTTP
// ============================================================================

/**
 * Compteur de requêtes HTTP par méthode et status
 */
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

/**
 * Histogramme de durée des requêtes HTTP
 */
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Buckets en secondes
  registers: [register]
});

/**
 * Gauge des requêtes en cours
 */
const httpRequestsInProgress = new client.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method', 'route'],
  registers: [register]
});

// ============================================================================
// MÉTRIQUES RECETTES (Phase 1A)
// ============================================================================

/**
 * Gauge du score de popularité moyen
 */
const recipePopularityAvg = new client.Gauge({
  name: 'recipe_popularity_score_avg',
  help: 'Average popularity score of recipes',
  registers: [register]
});

/**
 * Gauge du score de popularité max
 */
const recipePopularityMax = new client.Gauge({
  name: 'recipe_popularity_score_max',
  help: 'Maximum popularity score among recipes',
  registers: [register]
});

/**
 * Compteur d'enrichissements de recettes
 */
const recipeEnrichmentsTotal = new client.Counter({
  name: 'recipe_enrichments_total',
  help: 'Total number of recipe enrichments processed',
  labelNames: ['status'], // success, failed
  registers: [register]
});

/**
 * Histogramme de durée d'enrichissement
 */
const recipeEnrichmentDuration = new client.Histogram({
  name: 'recipe_enrichment_duration_seconds',
  help: 'Duration of recipe enrichment processing',
  buckets: [0.5, 1, 2, 3, 5, 10, 30],
  registers: [register]
});

/**
 * Compteur d'interactions recettes
 */
const recipeInteractionsTotal = new client.Counter({
  name: 'recipe_interactions_total',
  help: 'Total number of recipe interactions',
  labelNames: ['type'], // view, cook, favorite
  registers: [register]
});

// ============================================================================
// MÉTRIQUES ALIMENTATION (Phase 8 - Monitoring)
// ============================================================================

/**
 * Histogramme de durée des recherches de recettes
 * ✨ Phase 8 - Target: <500ms p95
 */
const alimentationRecipeSearchDuration = new client.Histogram({
  name: 'alimentation_recipe_search_duration_seconds',
  help: 'Duration of recipe search operations',
  labelNames: ['provider', 'status'], // spoonacular/edamam/themealdb + success/error/timeout
  buckets: [0.1, 0.2, 0.5, 1, 2, 3, 5, 10],
  registers: [register]
});

/**
 * Histogramme de durée des suggestions IA
 * ✨ Phase 8 - Target: <1s p95
 */
const alimentationAiSuggestionDuration = new client.Histogram({
  name: 'alimentation_ai_suggestion_duration_seconds',
  help: 'Duration of AI-powered meal suggestions',
  labelNames: ['type', 'status'], // smart_suggestion/weekly_plan/meal_generation + success/error
  buckets: [0.5, 1, 2, 3, 5, 10, 15, 30],
  registers: [register]
});

/**
 * Compteur de favoris de recettes
 * ✨ Phase 8 - Track user engagement
 */
const alimentationFavoritesTotal = new client.Counter({
  name: 'alimentation_favorites_total',
  help: 'Total number of recipe favorites added/removed',
  labelNames: ['action', 'source'], // add/remove + search/meal_plan/suggestion
  registers: [register]
});

/**
 * Gauge de précision de matching forecast
 * ✨ Phase 8 - Track forecast accuracy (0-100%)
 */
const alimentationForecastMatchAccuracy = new client.Gauge({
  name: 'alimentation_forecast_match_accuracy',
  help: 'Accuracy percentage of forecast to reality matching',
  labelNames: ['time_window'], // 24h/7d/30d
  registers: [register]
});

/**
 * Gauge du taux d'erreur API externe
 * ✨ Phase 8 - Alert if > 5%
 */
const alimentationApiErrorRate = new client.Gauge({
  name: 'alimentation_api_error_rate',
  help: 'Error rate percentage for external recipe APIs',
  labelNames: ['provider'], // spoonacular/edamam/themealdb
  registers: [register]
});

// ============================================================================
// ✨ PHASE 9A - ML RECOMMENDATION METRICS
// ============================================================================

/**
 * Histogram de la durée des recommandations ML
 * Track performance of ML recommendation generation
 */
const mlRecommendationDuration = new client.Histogram({
  name: 'ml_recommendation_duration_seconds',
  help: 'Duration of ML recommendation generation',
  labelNames: ['source'], // 'ml' | 'fallback'
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // seconds
  registers: [register]
});

/**
 * Counter de la source des recommandations
 * Track whether ML or fallback is being used
 */
const mlRecommendationSource = new client.Counter({
  name: 'ml_recommendation_source_total',
  help: 'Total number of recommendations by source',
  labelNames: ['source'], // 'ml' | 'fallback'
  registers: [register]
});

/**
 * Histogram des scores de recommandation
 * Track distribution of recommendation scores
 */
const mlRecommendationScore = new client.Histogram({
  name: 'ml_recommendation_score',
  help: 'Distribution of ML recommendation scores',
  labelNames: ['source'],
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [register]
});

/**
 * Counter du feedback utilisateur
 * Track user engagement with recommendations
 */
const mlRecommendationFeedback = new client.Counter({
  name: 'ml_recommendation_feedback_total',
  help: 'Total user feedback on recommendations',
  labelNames: ['action'], // 'like' | 'dislike' | 'view' | 'favorite'
  registers: [register]
});

/**
 * Gauge du taux de modèle entraîné
 * Track if ML model is available
 */
const mlModelStatus = new client.Gauge({
  name: 'ml_model_available',
  help: 'Whether ML model is trained and available (1=yes, 0=no)',
  registers: [register]
});

// ============================================================================
// MÉTRIQUES FRAUDE (Phase 1B)
// ============================================================================

/**
 * Compteur d'interactions suspectes détectées
 */
const fraudDetectionsTotal = new client.Counter({
  name: 'fraud_detections_total',
  help: 'Total number of suspicious interactions detected',
  labelNames: ['severity'], // low, medium, high
  registers: [register]
});

/**
 * Histogramme des scores de fraude
 */
const fraudScoreDistribution = new client.Histogram({
  name: 'fraud_score_distribution',
  help: 'Distribution of fraud scores',
  buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [register]
});

/**
 * Gauge du ratio d'interactions suspectes
 */
const fraudSuspiciousRatio = new client.Gauge({
  name: 'fraud_suspicious_ratio',
  help: 'Ratio of suspicious interactions (0-1)',
  registers: [register]
});

// ============================================================================
// MÉTRIQUES RATE LIMITING (Phase 1B)
// ============================================================================

/**
 * Compteur de rate limit hits
 */
const rateLimitHitsTotal = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limiter_type'], // general, auth, ai, recipe
  registers: [register]
});

/**
 * Gauge des utilisateurs près de leur limite
 */
const rateLimitNearLimit = new client.Gauge({
  name: 'rate_limit_near_limit',
  help: 'Number of users near their rate limit (< 10 remaining)',
  labelNames: ['limiter_type'],
  registers: [register]
});

// ============================================================================
// MÉTRIQUES GDPR (Phase 1B)
// ============================================================================

/**
 * Compteur d'exports de données GDPR
 */
const gdprExportsTotal = new client.Counter({
  name: 'gdpr_exports_total',
  help: 'Total number of GDPR data exports',
  registers: [register]
});

/**
 * Compteur de suppressions de comptes
 */
const gdprDeletionsTotal = new client.Counter({
  name: 'gdpr_deletions_total',
  help: 'Total number of account deletions',
  registers: [register]
});

/**
 * Histogramme de taille des exports (en bytes)
 */
const gdprExportSize = new client.Histogram({
  name: 'gdpr_export_size_bytes',
  help: 'Size of GDPR exports in bytes',
  buckets: [1000, 10000, 50000, 100000, 500000, 1000000, 5000000],
  registers: [register]
});

// ============================================================================
// MÉTRIQUES WORKERS & QUEUES (Phase 1A)
// ============================================================================

/**
 * Gauge des jobs en attente dans les queues
 */
const queueJobsWaiting = new client.Gauge({
  name: 'queue_jobs_waiting',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue_name'], // enrichment, popularity
  registers: [register]
});

/**
 * Gauge des jobs actifs
 */
const queueJobsActive = new client.Gauge({
  name: 'queue_jobs_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue_name'],
  registers: [register]
});

/**
 * Compteur de jobs complétés
 */
const queueJobsCompleted = new client.Counter({
  name: 'queue_jobs_completed_total',
  help: 'Total number of completed jobs',
  labelNames: ['queue_name', 'status'], // success, failed
  registers: [register]
});

/**
 * Histogramme de durée de traitement des jobs
 */
const queueJobDuration = new client.Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Duration of job processing',
  labelNames: ['queue_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});

// ============================================================================
// MÉTRIQUES BASE DE DONNÉES
// ============================================================================

/**
 * Compteur de requêtes Prisma
 */
const dbQueriesTotal = new client.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model'], // findMany, create, update, delete + Recipe, User, etc.
  registers: [register]
});

/**
 * Histogramme de durée des requêtes DB
 */
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

// ============================================================================
// MÉTRIQUES WEB VITALS (Phase 2 - Performance)
// ============================================================================

/**
 * Histogramme des Core Web Vitals
 */
const webVitalsLCP = new client.Histogram({
  name: 'web_vitals_lcp_milliseconds',
  help: 'Largest Contentful Paint (LCP) in milliseconds',
  buckets: [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 10000],
  registers: [register]
});

const webVitalsFID = new client.Histogram({
  name: 'web_vitals_fid_milliseconds',
  help: 'First Input Delay (FID) in milliseconds',
  buckets: [10, 25, 50, 75, 100, 150, 200, 300, 500],
  registers: [register]
});

const webVitalsCLS = new client.Histogram({
  name: 'web_vitals_cls_score',
  help: 'Cumulative Layout Shift (CLS) score',
  buckets: [0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1],
  registers: [register]
});

const webVitalsFCP = new client.Histogram({
  name: 'web_vitals_fcp_milliseconds',
  help: 'First Contentful Paint (FCP) in milliseconds',
  buckets: [500, 1000, 1500, 1800, 2000, 3000, 4000, 5000],
  registers: [register]
});

const webVitalsTTFB = new client.Histogram({
  name: 'web_vitals_ttfb_milliseconds',
  help: 'Time to First Byte (TTFB) in milliseconds',
  buckets: [100, 200, 300, 400, 600, 800, 1000, 1500, 2000],
  registers: [register]
});

/**
 * Compteur de Web Vitals par rating
 */
const webVitalsByRating = new client.Counter({
  name: 'web_vitals_by_rating_total',
  help: 'Total Web Vitals measurements by rating',
  labelNames: ['metric', 'rating'], // LCP/FID/CLS/FCP/TTFB + good/needs-improvement/poor
  registers: [register]
});

// ============================================================================
// MÉTRIQUES REDIS
// ============================================================================

/**
 * Compteur d'opérations Redis
 */
const redisOpsTotal = new client.Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['command'], // get, set, zadd, zcount, etc.
  registers: [register]
});

/**
 * Histogramme de durée des opérations Redis
 */
const redisOpsDuration = new client.Histogram({
  name: 'redis_operations_duration_seconds',
  help: 'Duration of Redis operations',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// ============================================================================
// FONCTIONS HELPER
// ============================================================================

/**
 * Enregistrer une requête HTTP
 */
function recordHttpRequest(method, route, statusCode, duration) {
  httpRequestsTotal.inc({ method, route, status_code: statusCode });
  httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
}

/**
 * Middleware Express pour enregistrer automatiquement les métriques HTTP
 */
function prometheusMiddleware(req, res, next) {
  const start = Date.now();
  const route = req.route?.path || req.path || 'unknown';
  const method = req.method;

  // Incrémenter le gauge des requêtes en cours
  httpRequestsInProgress.inc({ method, route });

  // Hook sur fin de réponse
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // en secondes
    const statusCode = res.statusCode;

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestsInProgress.dec({ method, route });
  });

  next();
}

/**
 * Endpoint pour exposer les métriques
 */
async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating Prometheus metrics', {
      error: error.message
    });
    res.status(500).end();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  register,
  prometheusMiddleware,
  metricsEndpoint,

  // Métriques HTTP
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInProgress,

  // Métriques Recettes
  recipePopularityAvg,
  recipePopularityMax,
  recipeEnrichmentsTotal,
  recipeEnrichmentDuration,
  recipeInteractionsTotal,

  // ✨ Phase 8 - Métriques Alimentation
  alimentationRecipeSearchDuration,
  alimentationAiSuggestionDuration,
  alimentationFavoritesTotal,
  alimentationForecastMatchAccuracy,
  alimentationApiErrorRate,

  // ✨ Phase 9A - Métriques ML
  mlRecommendationDuration,
  mlRecommendationSource,
  mlRecommendationScore,
  mlRecommendationFeedback,
  mlModelStatus,

  // Métriques Fraude
  fraudDetectionsTotal,
  fraudScoreDistribution,
  fraudSuspiciousRatio,

  // Métriques Rate Limiting
  rateLimitHitsTotal,
  rateLimitNearLimit,

  // Métriques GDPR
  gdprExportsTotal,
  gdprDeletionsTotal,
  gdprExportSize,

  // Métriques Workers
  queueJobsWaiting,
  queueJobsActive,
  queueJobsCompleted,
  queueJobDuration,

  // Métriques DB
  dbQueriesTotal,
  dbQueryDuration,

  // Métriques Redis
  redisOpsTotal,
  redisOpsDuration,

  // Métriques Web Vitals
  webVitalsLCP,
  webVitalsFID,
  webVitalsCLS,
  webVitalsFCP,
  webVitalsTTFB,
  webVitalsByRating,

  // Helpers
  recordHttpRequest
};
