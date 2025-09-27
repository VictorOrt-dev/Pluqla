export const generateIASuggestions = (category, answers, suggestionsCache, setSuggestionsCache) => {
  const cacheKey = `${category}_${JSON.stringify(answers)}`;
  if (suggestionsCache[cacheKey]) {
    return suggestionsCache[cacheKey];
  }

  const suggestions = [];
  const userAge = Number(answers.age) || 25;
  const meals = Number(answers.mealsPerWeek) || 3;
  
  if (category === 'alimentation') {
    if (meals >= 5) {
      suggestions.push({
        id: 'batch-cooking',
        title: "Plan batch-cooking personnalisé",
        reason: `Tu prépares ${meals} repas/semaine — économise 2h et 20% sur tes courses`,
        savings: "80€/mois",
        score: 95,
        badge: "TOP IA"
      });
    } else if (meals >= 3) {
      suggestions.push({
        id: 'meal-prep',
        title: "Kit repas adaptés",
        reason: `Basé sur tes ${meals} repas maison par semaine`,
        savings: "50€/mois",
        score: 85,
        badge: "RECOMMANDÉ"
      });
    } else {
      suggestions.push({ 
        id: 'quick-recipes',
        title: "Recettes 15 min chrono", 
        reason: "Parfait pour ton rythme, sans compromis sur la qualité",
        savings: "40€/mois",
        score: 75,
        badge: "ADAPTÉ"
      });
    }

    if (answers.mainSpending === 'alimentation') {
      suggestions.push({
        id: 'grocery-optimizer',
        title: "Optimiseur de courses IA",
        reason: "L'alimentation est ta plus grosse dépense — optimisons ensemble",
        savings: "120€/mois",
        score: 98,
        badge: "PRIORITÉ"
      });
    }
  }
  
  if (category === 'habits') {
    if (answers.fashionHabit?.includes('seconde main')) {
      suggestions.push({ 
        id: 'thrift-network',
        title: 'Réseau friperies premium', 
        reason: 'Accès exclusif aux arrivages + alertes personnalisées',
        savings: "150€/mois",
        score: 92,
        badge: "MATCH PARFAIT"
      });
    } else if (answers.fashionHabit?.includes('marques')) {
      suggestions.push({
        id: 'brand-insider',
        title: 'Ventes privées VIP',
        reason: 'Tes marques préférées jusqu\'à -70%',
        savings: "200€/mois",
        score: 88,
        badge: "EXCLUSIF"
      });
    } else {
      suggestions.push({
        id: 'style-optimizer',
        title: 'Garde-robe capsule IA',
        reason: 'Moins d\'achats, plus de style',
        savings: "100€/mois",
        score: 80,
        badge: "SMART"
      });
    }
  }
  
  if (category === 'activite') {
    if (userAge < 26) {
      suggestions.push({
        id: 'youth-pass',
        title: 'Pass Culture Plus',
        reason: `Tu as ${userAge} ans — cumule tous les avantages jeunes`,
        savings: "30€/sortie",
        score: 96,
        badge: "ÉLIGIBLE"
      });
    }
    
    if (answers.mainSpending === 'sorties') {
      suggestions.push({
        id: 'social-optimizer',
        title: 'Agenda sorties optimisé',
        reason: 'Les meilleures offres selon tes goûts et ton planning',
        savings: "80€/mois",
        score: 90,
        badge: "PERSONNALISÉ"
      });
    }
  }
  
  if (category === 'deplacement') {
    if (answers.transportType === 'voiture') {
      suggestions.push({
        id: 'carpool-ai',
        title: 'Covoiturage intelligent',
        reason: 'Matching automatique sur tes trajets réguliers',
        savings: "180€/mois",
        score: 94,
        badge: "ÉCOLOGIQUE"
      });
      suggestions.push({
        id: 'fuel-optimizer',
        title: 'Essence au meilleur prix',
        reason: 'Alertes en temps réel sur ton trajet',
        savings: "40€/mois",
        score: 82,
        badge: "PRATIQUE"
      });
    } else if (answers.transportType === 'transport en commun') {
      suggestions.push({
        id: 'transit-optimizer',
        title: 'Abonnement optimisé',
        reason: 'Analyse de tes trajets pour le meilleur forfait',
        savings: "25€/mois",
        score: 87,
        badge: "ANALYSE IA"
      });
    }
  }
  
  suggestions.sort((a, b) => b.score - a.score);
  
  setSuggestionsCache(prev => ({ ...prev, [cacheKey]: suggestions }));
  
  return suggestions;
};