/**
 * Feature Flags Configuration
 * Centralise l'activation/désactivation des features pour chaque version
 *
 * Pour réactiver une feature: passer sa valeur de false à true
 *
 * @version 1.0.0 - V1 Pluqla (Finance + Alimentation + Transport)
 */

export const FEATURE_FLAGS = {
  // ✅ V1 - Features actives
  finance: true,        // Finance intelligente - Gestion budget, économies, transactions
  alimentation: true,   // Alimentation - Planification repas, courses, suggestions IA
  deplacement: true,    // Transport - Optimisation trajets, coûts, mobilité

  // ⏸️ Post-V1 - Features en attente (code conservé, prêt à réactiver)
  habits: false,        // Mode/vêtements - Garde-robe intelligente, suggestions tenues
  activite: false       // Activité physique/lifestyle - Tracking sport, bien-être, santé
};

/**
 * Helper pour vérifier si une feature est active
 * @param {string} featureId - ID de la feature (ex: 'finance', 'habits')
 * @returns {boolean} - true si la feature est activée
 *
 * @example
 * if (isFeatureEnabled('habits')) {
 *   // Code exécuté uniquement si habits est actif
 * }
 */
export const isFeatureEnabled = (featureId) => {
  return FEATURE_FLAGS[featureId] ?? false;
};

/**
 * Helper pour filtrer les catégories actives selon les flags
 * @param {Array} categories - Liste complète des catégories
 * @returns {Array} - Catégories filtrées selon les feature flags actifs
 *
 * @example
 * const allCategories = [finance, alimentation, deplacement, habits, activite];
 * const enabledCategories = getEnabledCategories(allCategories);
 * // → [finance, alimentation, deplacement] si habits et activite sont désactivés
 */
export const getEnabledCategories = (categories) => {
  return categories.filter(cat => isFeatureEnabled(cat.id));
};

/**
 * Helper pour obtenir le nombre de features actives
 * @returns {number} - Nombre de features activées
 */
export const getEnabledFeaturesCount = () => {
  return Object.values(FEATURE_FLAGS).filter(Boolean).length;
};

/**
 * Notes de déploiement:
 *
 * V1 (Actuel):
 * - 3 features actives: Finance, Alimentation, Transport
 * - Layout: 1 carte premium + 2 cartes normales (grid 1x2)
 *
 * V2 (Futur - À définir):
 * - Réactiver habits et/ou activite selon feedback utilisateurs
 * - Layout automatiquement adapté: 1 premium + 4 normales (grid 2x2)
 *
 * Pour tester en local:
 * - Passer habits: true et activite: true
 * - Reload l'app → Les 5 features réapparaissent
 */
