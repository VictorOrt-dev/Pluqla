const aiService = require('../services/aiService');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Générer une liste de courses basée sur les recettes sélectionnées
 */
exports.generateShoppingList = async (req, res) => {
  try {
    const { selectedRecipes, language = 'fr' } = req.body;

    if (!Array.isArray(selectedRecipes) || selectedRecipes.length === 0) {
      return sendError(res, 'Veuillez sélectionner au moins une recette', 400);
    }

    logger.info(`Génération liste de courses pour ${selectedRecipes.length} recettes`);

    // Créer le prompt pour l'IA basé sur les recettes
    const recipeNames = selectedRecipes.map((r) => r.title || r.name).join(', ');
    const prompt = `Générez une liste de courses consolidée pour ces recettes : ${recipeNames}

    Contexte : Les recettes sélectionnées sont ${JSON.stringify(selectedRecipes)}.

    Format JSON attendu en ${language === 'fr' ? 'français' : language === 'en' ? 'anglais' : 'espagnol'} :
    {
      "items": [
        {
          "name": "Nom de l'ingrédient",
          "quantity": "Quantité totale nécessaire",
          "unit": "Unité (kg, L, pièces...)",
          "category": "fruits-legumes|viande-poisson|epicerie|frais|surgeles",
          "estimatedPrice": 2.50,
          "recipes": ["Recette 1", "Recette 2"]
        }
      ],
      "totalEstimatedCost": 45.80,
      "tips": [
        "Conseil d'achat économique 1",
        "Conseil d'achat économique 2"
      ]
    }

    Instructions :
    - Consolidez les ingrédients identiques (ex: 2 tomates + 3 tomates = 5 tomates)
    - Organisez par catégories de magasin
    - Ajoutez des conseils d'économie
    - Estimez les prix de manière réaliste`;

    // Utiliser le service IA pour générer la liste
    const suggestions = await aiService.generateSuggestionsFromPrompt(prompt, {
      userPreferences: { language },
      context: 'shopping_list'
    });

    // Parser et valider la réponse
    let shoppingList;
    try {
      // Essayer de parser la première suggestion comme JSON
      const firstSuggestion = suggestions[0];
      if (firstSuggestion?.description) {
        const jsonMatch = firstSuggestion.description.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          shoppingList = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (parseError) {
      logger.warn('Erreur parsing réponse IA pour liste de courses:', parseError);
    }

    // Fallback si l'IA ne répond pas correctement
    if (!shoppingList?.items) {
      shoppingList = generateFallbackShoppingList(selectedRecipes, language);
    }

    // Valider et nettoyer la liste
    const validatedList = validateShoppingList(shoppingList);

    logger.info(`Liste de courses générée avec ${validatedList.items.length} articles`);

    return sendSuccess(res, validatedList, 'Liste de courses générée avec succès');
  } catch (error) {
    logger.error('Erreur génération liste de courses:', error);
    return sendError(res, 'Erreur lors de la génération de la liste de courses', 500);
  }
};

/**
 * Générer une liste de courses de fallback
 */
function generateFallbackShoppingList(recipes, language = 'fr') {
  const translations = {
    fr: {
      items: 'articles',
      tips: [
        'Vérifiez les promotions avant d\'acheter',
        'Privilégiez les produits de saison',
        'Comparez les prix au kilogramme'
      ]
    },
    en: {
      items: 'items',
      tips: [
        'Check promotions before buying',
        'Choose seasonal products',
        'Compare prices per kilogram'
      ]
    },
    es: {
      items: 'artículos',
      tips: [
        'Revisa las promociones antes de comprar',
        'Elige productos de temporada',
        'Compara precios por kilogramo'
      ]
    }
  };

  const t = translations[language] || translations.fr;

  // Générer des ingrédients basiques basés sur les recettes
  const commonIngredients = [
    {
      name: 'Tomates', quantity: '1', unit: 'kg', category: 'fruits-legumes', estimatedPrice: 3.50
    },
    {
      name: 'Oignons', quantity: '500', unit: 'g', category: 'fruits-legumes', estimatedPrice: 1.20
    },
    {
      name: 'Huile d\'olive', quantity: '1', unit: 'L', category: 'epicerie', estimatedPrice: 4.50
    },
    {
      name: 'Sel', quantity: '1', unit: 'paquet', category: 'epicerie', estimatedPrice: 0.80
    },
    {
      name: 'Poivre', quantity: '1', unit: 'paquet', category: 'epicerie', estimatedPrice: 1.50
    }
  ];

  const items = commonIngredients.map((item) => ({
    ...item,
    recipes: recipes.map((r) => r.title || r.name)
  }));

  return {
    items,
    totalEstimatedCost: items.reduce((sum, item) => sum + item.estimatedPrice, 0),
    tips: t.tips
  };
}

/**
 * Valider et nettoyer la liste de courses
 */
function validateShoppingList(list) {
  const validCategories = ['fruits-legumes', 'viande-poisson', 'epicerie', 'frais', 'surgeles'];

  const validatedItems = (list.items || [])
    .filter((item) => item.name && item.quantity)
    .map((item) => ({
      name: String(item.name).substring(0, 100),
      quantity: String(item.quantity).substring(0, 20),
      unit: String(item.unit || 'pièce').substring(0, 20),
      category: validCategories.includes(item.category) ? item.category : 'epicerie',
      estimatedPrice: parseFloat(item.estimatedPrice) || 0,
      recipes: Array.isArray(item.recipes) ? item.recipes : []
    }));

  return {
    items: validatedItems,
    totalEstimatedCost: Math.round((list.totalEstimatedCost || 0) * 100) / 100,
    tips: Array.isArray(list.tips) ? list.tips.slice(0, 5) : [],
    generatedAt: new Date().toISOString()
  };
}

/**
 * Optimiser une liste de courses existante
 */
exports.optimizeShoppingList = async (req, res) => {
  try {
    const { shoppingList, budget, preferences = {} } = req.body;

    if (!shoppingList?.items || !Array.isArray(shoppingList.items)) {
      return sendError(res, 'Liste de courses invalide', 400);
    }

    // Créer le prompt d'optimisation
    const prompt = `Optimisez cette liste de courses selon le budget et les préférences :

    Liste actuelle : ${JSON.stringify(shoppingList)}
    Budget maximum : ${budget}€
    Préférences : ${JSON.stringify(preferences)}

    Proposez des alternatives moins chères et des conseils d'optimisation en français.`;

    const suggestions = await aiService.generateSuggestionsFromPrompt(prompt, preferences);

    return sendSuccess(res, {
      optimizedList: shoppingList, // Temporairement retourner la liste originale
      suggestions,
      savings: Math.max(0, shoppingList.totalEstimatedCost - (budget || 0))
    }, 'Liste optimisée avec succès');
  } catch (error) {
    logger.error('Erreur optimisation liste de courses:', error);
    return sendError(res, 'Erreur lors de l\'optimisation', 500);
  }
};
