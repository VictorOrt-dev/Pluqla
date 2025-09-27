/**
 * AI Helper Functions for Pluqla Frontend
 * Provides safe API calls to backend AI services with proper error handling
 */

/**
 * Get AI suggestions for a specific category
 * @param {string} category - Category (alimentation, habits, activite, deplacement)
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of AI suggestions
 */
export async function getAISuggestions(category = 'general', options = {}) {
  try {
    const { limit = 5, includeAnalysis = false } = options;

    // Build query parameters
    const params = new URLSearchParams({
      category,
      limit: limit.toString()
    });

    if (includeAnalysis) {
      params.append('includeAnalysis', 'true');
    }

    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Make API call
    const response = await fetch(`/api/ai/suggestions?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch AI suggestions');
    }

    const data = await response.json();

    // Ensure we return an array
    const suggestions = data?.data?.suggestions;
    return Array.isArray(suggestions) ? suggestions : [];

  } catch (error) {
    console.error('Error fetching AI suggestions:', error);

    // Return fallback suggestions for each category
    return getFallbackSuggestions(category);
  }
}

/**
 * Fallback suggestions for when API calls fail
 * @param {string} category - Category for fallback suggestions
 * @returns {Array} Static fallback suggestions
 */
function getFallbackSuggestions(category) {
  const fallbacks = {
    alimentation: [
      {
        id: 'fallback_food_1',
        title: 'Planifiez vos repas',
        description: 'Établissez un menu hebdomadaire pour éviter les achats impulsifs.',
        estimatedSavings: 30,
        difficulty: 'facile',
        category: 'alimentation',
        source: 'fallback'
      },
      {
        id: 'fallback_food_2',
        title: 'Cuisinez en grandes quantités',
        description: 'Préparez des plats en grande quantité et congelez les portions.',
        estimatedSavings: 50,
        difficulty: 'moyen',
        category: 'alimentation',
        source: 'fallback'
      }
    ],
    habits: [
      {
        id: 'fallback_habits_1',
        title: 'Suivez vos dépenses',
        description: 'Tenez un journal de vos dépenses quotidiennes pour identifier les économies.',
        estimatedSavings: 20,
        difficulty: 'facile',
        category: 'habits',
        source: 'fallback'
      }
    ],
    activite: [
      {
        id: 'fallback_activity_1',
        title: 'Explorez les activités gratuites',
        description: 'Découvrez les parcs, musées gratuits et événements de votre ville.',
        estimatedSavings: 40,
        difficulty: 'facile',
        category: 'activite',
        source: 'fallback'
      }
    ],
    deplacement: [
      {
        id: 'fallback_transport_1',
        title: 'Utilisez les transports en commun',
        description: 'Optez pour les transports en commun au lieu de la voiture.',
        estimatedSavings: 60,
        difficulty: 'moyen',
        category: 'deplacement',
        source: 'fallback'
      }
    ]
  };

  return fallbacks[category] || fallbacks.alimentation;
}

/**
 * Check if user has remaining AI plans
 * @returns {Promise<Object>} Plan status
 */
export async function checkAIPlanStatus() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { remainingPlans: 0, isPremium: false };
    }

    const response = await fetch('/api/users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { remainingPlans: 0, isPremium: false };
    }

    const data = await response.json();
    const user = data?.data;

    return {
      remainingPlans: user?.isPremium ? -1 : Math.max(0, 5 - (user?.plansUsedThisMonth || 0)),
      isPremium: user?.isPremium || false,
      plansUsedThisMonth: user?.plansUsedThisMonth || 0
    };

  } catch (error) {
    console.error('Error checking AI plan status:', error);
    return { remainingPlans: 0, isPremium: false };
  }
}