// Service IA avancé avec API externes, fallbacks intelligents et gestion d'erreurs
// Impact: Suggestions IA personnalisées via APIs externes avec fallbacks locaux
// Intégré avec: CacheService, useAISuggestions, notifications système

import { cacheService } from '../utils/cacheService';
import { generateIASuggestions } from '../utils/aiSuggestions';
import { analyticsService } from './analyticsService';

// Configuration du service IA
const AI_CONFIG = {
  // APIs disponibles (désactivées par défaut pour éviter les coûts)
  OPENAI_ENABLED: false,
  CLAUDE_ENABLED: false,
  LOCAL_FALLBACK: true,

  // Timeouts et retry
  REQUEST_TIMEOUT: 10000, // 10 secondes
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 seconde

  // Limits pour éviter les abus
  MAX_REQUESTS_PER_HOUR: 30,
  MAX_REQUESTS_PER_DAY: 100,

  // Cache spécialisé pour API externes
  API_CACHE_TTL: 60 * 60 * 1000, // 1 heure
  FALLBACK_CACHE_TTL: 10 * 60 * 1000, // 10 minutes
};

class AIService {
  constructor() {
    this.requestCounts = {
      hourly: { count: 0, resetTime: Date.now() + 3600000 },
      daily: { count: 0, resetTime: Date.now() + 86400000 }
    };
    this.isOnline = navigator.onLine;
    this.setupNetworkListeners();
  }

  // Écouter les changements de connectivité
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Connexion rétablie - API IA disponibles');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Mode hors-ligne - Utilisation des fallbacks locaux');
    });
  }

  // Vérifier les limites de requêtes
  checkRateLimits() {
    const now = Date.now();

    // Reset compteurs si nécessaire
    if (now > this.requestCounts.hourly.resetTime) {
      this.requestCounts.hourly = { count: 0, resetTime: now + 3600000 };
    }
    if (now > this.requestCounts.daily.resetTime) {
      this.requestCounts.daily = { count: 0, resetTime: now + 86400000 };
    }

    // Vérifier les limites
    if (this.requestCounts.hourly.count >= AI_CONFIG.MAX_REQUESTS_PER_HOUR) {
      throw new Error('Limite horaire atteinte pour les requêtes IA');
    }
    if (this.requestCounts.daily.count >= AI_CONFIG.MAX_REQUESTS_PER_DAY) {
      throw new Error('Limite quotidienne atteinte pour les requêtes IA');
    }

    // Incrémenter les compteurs
    this.requestCounts.hourly.count++;
    this.requestCounts.daily.count++;
  }

  // Construire le prompt pour l'API externe
  buildPrompt(category, userAnswers, context = {}) {
    const prompts = {
      alimentation: `En tant qu'expert en nutrition et économies domestiques, génère 3 suggestions d'économies alimentaires personnalisées pour un utilisateur avec ce profil : ${JSON.stringify(userAnswers)}.
      Contexte additionnel: ${JSON.stringify(context)}.
      Format attendu: JSON avec titre, description, économies estimées, difficulté, et conseils pratiques.`,

      habits: `En tant qu'expert en mode et économies, génère 3 suggestions vestimentaires personnalisées pour optimiser le budget vêtements basées sur : ${JSON.stringify(userAnswers)}.
      Inclus des conseils sur les achats intelligents, l'entretien, et les alternatives économiques.
      Format: JSON avec titre, description, économies, saisonnalité.`,

      activite: `En tant qu'expert en loisirs économiques, suggère 3 activités gratuites ou peu coûteuses adaptées au profil : ${JSON.stringify(userAnswers)}.
      Focus sur des activités locales, saisonnières et sociales.
      Format: JSON avec titre, description, coût, durée, niveau social.`,

      deplacement: `En tant qu'expert en mobilité durable, génère 3 solutions de transport économiques pour : ${JSON.stringify(userAnswers)}.
      Considère les transports publics, covoiturage, vélo, marche selon la localisation et besoins.
      Format: JSON avec titre, description, économies mensuelles, impact écologique.`
    };

    return prompts[category] || prompts.alimentation;
  }

  // Appel API OpenAI (désactivé par défaut)
  async callOpenAI(prompt, category) {
    if (!AI_CONFIG.OPENAI_ENABLED) {
      throw new Error('API OpenAI désactivée');
    }

    // Simuler un appel API (à remplacer par vraie implémentation)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.REQUEST_TIMEOUT);

    try {
      // SECURITY FIX: Use secure backend proxy instead of direct API calls
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/ai-proxy/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          model: 'gpt-3.5-turbo',
          maxTokens: 500,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`AI proxy error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      // Backend proxy returns response in data.data.response
      const content = data.data?.response || data.response || 'AI response generated';
      return this.parseAIResponse(content, category);

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Timeout OpenAI API');
      }
      throw error;
    }
  }

  // Parser la réponse de l'API IA
  parseAIResponse(content, category) {
    try {
      // Nettoyer la réponse et extraire le JSON
      const cleanContent = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanContent);

      // Valider la structure
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          ...item,
          source: 'api_external',
          category,
          timestamp: Date.now()
        }));
      }

      return [{ ...parsed, source: 'api_external', category, timestamp: Date.now() }];
    } catch (error) {
      console.error('Erreur parsing réponse IA:', error);
      throw new Error('Format de réponse IA invalide');
    }
  }

  // Stratégie de retry avec backoff exponentiel
  async retryWithBackoff(apiCall, retries = AI_CONFIG.MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        if (attempt === retries) {
          throw error; // Dernière tentative échouée
        }

        // Attendre avec backoff exponentiel
        const delay = AI_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`🔄 Retry API IA dans ${delay}ms (tentative ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Méthode principale pour obtenir des suggestions IA
  async getSuggestions(category, userAnswers, options = {}) {
    const startTime = Date.now();
    const userId = options.userId || 'default';
    let source = 'fallback_local';

    try {
      // Générer clé de cache
      const cacheKey = cacheService.generateCacheKey(userId, category, {
        answers: userAnswers,
        version: '1.0',
        external: true
      });

      // 1. Vérifier d'abord le cache API (plus long TTL)
      let suggestions = await cacheService.get(cacheKey, `ai_external_${category}`);
      if (suggestions) {
        console.log(`⚡ Suggestions IA API récupérées du cache pour ${category}`);
        return {
          suggestions,
          source: 'cache_external',
          responseTime: Date.now() - startTime,
          fromCache: true
        };
      }

      // 2. Si connecté et API activée, essayer l'API externe
      if (this.isOnline && (AI_CONFIG.OPENAI_ENABLED || AI_CONFIG.CLAUDE_ENABLED)) {
        try {
          this.checkRateLimits();

          // Tracker le début d'appel API externe
          analyticsService.trackAIRequest('start', category, {
            userId,
            apiType: AI_CONFIG.OPENAI_ENABLED ? 'openai' : 'claude',
            source: 'external_api'
          });

          const prompt = this.buildPrompt(category, userAnswers, options.context);

          // Essayer les APIs disponibles avec retry
          suggestions = await this.retryWithBackoff(async () => {
            if (AI_CONFIG.OPENAI_ENABLED) {
              return await this.callOpenAI(prompt, category);
            } else if (AI_CONFIG.CLAUDE_ENABLED) {
              // Placeholder pour Claude API
              throw new Error('Claude API pas encore implémentée');
            }
            throw new Error('Aucune API externe activée');
          });

          // Mettre en cache les résultats API (TTL plus long)
          await cacheService.set(
            cacheKey,
            suggestions,
            AI_CONFIG.API_CACHE_TTL,
            `ai_external_${category}`
          );

          // Tracker le succès de l'API externe
          const apiDuration = Date.now() - startTime;
          analyticsService.trackAIRequest('success', category, {
            userId,
            duration: apiDuration,
            suggestionsCount: suggestions?.length || 0,
            apiType: AI_CONFIG.OPENAI_ENABLED ? 'openai' : 'claude',
            source: 'external_api'
          });

          source = 'api_external';
          console.log(`🤖 Suggestions IA générées via API externe pour ${category}`);

        } catch (apiError) {
          console.warn('⚠️ Erreur API IA:', apiError.message);

          // Tracker l'échec de l'API externe
          const apiDuration = Date.now() - startTime;
          analyticsService.trackAIRequest('error', category, {
            userId,
            duration: apiDuration,
            error: apiError.message,
            apiType: AI_CONFIG.OPENAI_ENABLED ? 'openai' : 'claude',
            source: 'external_api'
          });

          // Continuer vers le fallback local
        }
      }

      // 3. Fallback local si API échoue ou indisponible
      if (!suggestions && AI_CONFIG.LOCAL_FALLBACK) {
        suggestions = generateIASuggestions(category, userAnswers, options.context || {}, () => {});

        // Mettre en cache les suggestions locales (TTL plus court)
        await cacheService.set(
          cacheKey.replace('external', 'local'),
          suggestions,
          AI_CONFIG.FALLBACK_CACHE_TTL,
          `ai_local_${category}`
        );

        source = 'fallback_local';
        console.log(`🏠 Suggestions IA locales générées pour ${category}`);
      }

      // 4. Si tout échoue, retourner suggestions minimales
      if (!suggestions) {
        suggestions = this.getEmergencySuggestions(category);
        source = 'emergency_fallback';
      }

      return {
        suggestions,
        source,
        responseTime: Date.now() - startTime,
        fromCache: false
      };

    } catch (error) {
      console.error('❌ Erreur complète AIService:', error);

      // Fallback d'urgence
      return {
        suggestions: this.getEmergencySuggestions(category),
        source: 'emergency_fallback',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // Suggestions d'urgence en cas d'échec complet
  getEmergencySuggestions(category) {
    const emergency = {
      alimentation: [
        {
          title: "Planifiez vos repas",
          description: "Établissez un menu hebdomadaire pour éviter les achats impulsifs",
          savings: "20-30€/mois",
          difficulty: "facile"
        }
      ],
      habits: [
        {
          title: "Achetez en soldes",
          description: "Profitez des soldes saisonnières pour renouveler votre garde-robe",
          savings: "50-100€/saison",
          difficulty: "facile"
        }
      ],
      activite: [
        {
          title: "Activités gratuites",
          description: "Découvrez les parcs, musées gratuits et événements culturels de votre ville",
          savings: "30-50€/mois",
          difficulty: "facile"
        }
      ],
      deplacement: [
        {
          title: "Transports en commun",
          description: "Comparez les abonnements transports avec vos frais de carburant",
          savings: "100-200€/mois",
          difficulty: "moyen"
        }
      ]
    };

    return emergency[category] || emergency.alimentation;
  }

  // Obtenir les statistiques d'utilisation
  getUsageStats() {
    return {
      requestCounts: this.requestCounts,
      isOnline: this.isOnline,
      config: {
        openaiEnabled: AI_CONFIG.OPENAI_ENABLED,
        claudeEnabled: AI_CONFIG.CLAUDE_ENABLED,
        localFallback: AI_CONFIG.LOCAL_FALLBACK
      }
    };
  }

  // Invalider le cache pour une catégorie
  async invalidateCache(category, userId = 'default') {
    await cacheService.invalidateCategory(`ai_external_${category}`);
    await cacheService.invalidateCategory(`ai_local_${category}`);
  }

  // Précharger les suggestions pour une meilleure UX
  async preloadSuggestions(categories, userAnswers, userId = 'default') {
    const preloadPromises = categories.map(category =>
      this.getSuggestions(category, userAnswers, { userId, preload: true })
        .catch(error => console.warn(`Préchargement échoué pour ${category}:`, error))
    );

    return Promise.allSettled(preloadPromises);
  }
}

// Instance globale du service IA
export const aiService = new AIService();

// Hook React pour utiliser le service IA
export const useAIService = () => {
  return {
    getSuggestions: aiService.getSuggestions.bind(aiService),
    getUsageStats: aiService.getUsageStats.bind(aiService),
    invalidateCache: aiService.invalidateCache.bind(aiService),
    preloadSuggestions: aiService.preloadSuggestions.bind(aiService)
  };
};