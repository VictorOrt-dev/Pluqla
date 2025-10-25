/**
 * ShoppingListGenerator Component
 *
 * Generates aggregated shopping lists from multiple recipes
 * Features:
 * - Ingredient aggregation (combine quantities)
 * - Export to PDF
 * - Print functionality
 * - Share via Web Share API
 * - Categorization by food type
 * - Check/uncheck items
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  X,
  Check,
  Printer,
  Download,
  Share2,
  ChefHat,
  Trash2,
} from 'lucide-react';

/**
 * Food categories for organization
 */
const FOOD_CATEGORIES = {
  produce: { name: 'Fruits & Légumes', icon: '🥬', order: 1 },
  meat: { name: 'Viandes & Poissons', icon: '🥩', order: 2 },
  dairy: { name: 'Produits Laitiers', icon: '🥛', order: 3 },
  pantry: { name: 'Épicerie', icon: '🏪', order: 4 },
  bakery: { name: 'Boulangerie', icon: '🥖', order: 5 },
  condiments: { name: 'Condiments & Épices', icon: '🧂', order: 6 },
  other: { name: 'Autres', icon: '📦', order: 7 },
};

/**
 * Categorize ingredient by keyword matching
 */
const categorizeIngredient = (ingredientName) => {
  const name = ingredientName.toLowerCase();

  // Produce
  if (/(tomat|onion|oignon|carrot|carotte|lettuce|salade|pepper|poivron|potato|pomme|fruit|vegetable|légume|celery|céleri|garlic|ail|herb|herbe|parsley|persil|basil|basilic)/i.test(name)) {
    return 'produce';
  }

  // Meat & Fish
  if (/(chicken|poulet|beef|boeuf|pork|porc|fish|poisson|salmon|saumon|turkey|dinde|meat|viande|bacon|ham|jambon)/i.test(name)) {
    return 'meat';
  }

  // Dairy
  if (/(milk|lait|cheese|fromage|butter|beurre|cream|crème|yogurt|yaourt|egg|oeuf)/i.test(name)) {
    return 'dairy';
  }

  // Bakery
  if (/(bread|pain|roll|petit pain|bun|baguette|pastry|pâtisserie|croissant)/i.test(name)) {
    return 'bakery';
  }

  // Condiments & Spices
  if (/(salt|sel|pepper|poivre|spice|épice|sauce|oil|huile|vinegar|vinaigre|mustard|moutarde|ketchup|mayo|mayonnaise)/i.test(name)) {
    return 'condiments';
  }

  // Pantry
  if (/(pasta|pâtes|rice|riz|flour|farine|sugar|sucre|bean|haricot|lentil|lentille|can|conserve|stock|bouillon)/i.test(name)) {
    return 'pantry';
  }

  return 'other';
};

/**
 * Aggregate ingredients from multiple recipes
 */
const aggregateIngredients = (recipes) => {
  const ingredientMap = new Map();

  recipes.forEach((recipe) => {
    const ingredients = recipe.ingredients || [];

    ingredients.forEach((ing) => {
      const name = (ing.name || ing.original || '').toLowerCase().trim();
      if (!name) return;

      const key = name;

      if (ingredientMap.has(key)) {
        // Aggregate quantities (if possible)
        const existing = ingredientMap.get(key);
        const newAmount = parseFloat(ing.amount) || 0;
        const existingAmount = existing.amount || 0;

        ingredientMap.set(key, {
          ...existing,
          amount: existingAmount + newAmount,
          recipes: [...existing.recipes, recipe.title],
        });
      } else {
        ingredientMap.set(key, {
          name: ing.name || ing.original,
          amount: parseFloat(ing.amount) || null,
          unit: ing.unit || '',
          category: categorizeIngredient(name),
          recipes: [recipe.title],
          checked: false,
        });
      }
    });
  });

  return Array.from(ingredientMap.values());
};

/**
 * Group ingredients by category
 */
const groupByCategory = (ingredients) => {
  const grouped = {};

  ingredients.forEach((ing) => {
    const category = ing.category || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(ing);
  });

  // Sort categories by defined order
  return Object.entries(grouped).sort((a, b) => {
    const orderA = FOOD_CATEGORIES[a[0]]?.order || 999;
    const orderB = FOOD_CATEGORIES[b[0]]?.order || 999;
    return orderA - orderB;
  });
};

/**
 * ShoppingListGenerator Component
 */
const ShoppingListGenerator = ({
  recipes = [],
  isOpen = false,
  onClose,
  className = '',
}) => {
  const [checkedItems, setCheckedItems] = useState(new Set());

  // Aggregate and group ingredients
  const aggregatedIngredients = useMemo(() => aggregateIngredients(recipes), [recipes]);
  const groupedIngredients = useMemo(() => groupByCategory(aggregatedIngredients), [aggregatedIngredients]);

  /**
   * Toggle item checked
   */
  const toggleItem = (ingredientName) => {
    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientName)) {
        newSet.delete(ingredientName);
      } else {
        newSet.add(ingredientName);
      }
      return newSet;
    });
  };

  /**
   * Format ingredient display
   */
  const formatIngredient = (ing) => {
    const amountStr = ing.amount ? `${ing.amount.toFixed(1)} ${ing.unit}`.trim() : '';
    return amountStr ? `${ing.name} - ${amountStr}` : ing.name;
  };

  /**
   * Print shopping list
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Export to text file
   */
  const handleExport = () => {
    let content = '🛒 LISTE DE COURSES PLUQLA\n\n';
    content += `Générée à partir de ${recipes.length} recette(s)\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    groupedIngredients.forEach(([categoryKey, items]) => {
      const category = FOOD_CATEGORIES[categoryKey];
      content += `\n${category.icon} ${category.name.toUpperCase()}\n`;
      content += '─'.repeat(40) + '\n';

      items.forEach((ing) => {
        const checked = checkedItems.has(ing.name) ? '✓' : '☐';
        content += `${checked} ${formatIngredient(ing)}\n`;
      });
    });

    content += `\n\n📊 Total: ${aggregatedIngredients.length} ingrédients\n`;
    content += `✓ Cochés: ${checkedItems.size}\n`;

    // Create download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pluqla-shopping-list-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Share shopping list
   */
  const handleShare = async () => {
    if (!navigator.share) return;

    const text = `🛒 Ma liste de courses Pluqla\n\n${aggregatedIngredients.length} ingrédients pour ${recipes.length} recettes`;

    try {
      await navigator.share({
        title: 'Liste de courses Pluqla',
        text,
      });
    } catch (error) {
      console.log('Share cancelled or failed:', error);
    }
  };

  /**
   * Clear all checked items
   */
  const handleClearChecked = () => {
    setCheckedItems(new Set());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className={`
              fixed inset-4 md:inset-8 lg:inset-16
              bg-white/95 backdrop-blur-xl
              rounded-3xl shadow-2xl border border-white/20
              z-50 overflow-hidden flex flex-col
              ${className}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E63946] to-[#d32f3a] flex items-center justify-center">
                  <ShoppingCart size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Liste de Courses
                  </h2>
                  <p className="text-sm text-gray-500">
                    {recipes.length} recette(s) • {aggregatedIngredients.length} ingrédients
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="flex-shrink-0 flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-200">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Imprimer</span>
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Exporter</span>
              </button>

              {navigator.share && (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Share2 size={16} />
                  <span className="hidden sm:inline">Partager</span>
                </button>
              )}

              <div className="flex-1" />

              {checkedItems.size > 0 && (
                <button
                  onClick={handleClearChecked}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Décocher tout</span>
                </button>
              )}

              <div className="text-sm text-gray-500">
                {checkedItems.size}/{aggregatedIngredients.length} coché(s)
              </div>
            </div>

            {/* Shopping List Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {groupedIngredients.map(([categoryKey, items]) => {
                const category = FOOD_CATEGORIES[categoryKey];

                return (
                  <div key={categoryKey} className="mb-8">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
                      <span className="text-2xl">{category.icon}</span>
                      {category.name}
                      <span className="text-sm font-normal text-gray-500">
                        ({items.length})
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {items.map((ing, index) => {
                        const isChecked = checkedItems.has(ing.name);

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`
                              flex items-start gap-3 p-3 rounded-lg
                              border transition-all duration-200
                              ${isChecked
                                ? 'bg-gray-50 border-gray-200 opacity-60'
                                : 'bg-white border-gray-200 hover:border-[#E63946] hover:shadow-md'
                              }
                            `}
                          >
                            <button
                              onClick={() => toggleItem(ing.name)}
                              className={`
                                flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all
                                ${isChecked
                                  ? 'bg-[#E63946] border-[#E63946]'
                                  : 'border-gray-300 hover:border-[#E63946]'
                                }
                              `}
                            >
                              {isChecked && <Check size={16} className="text-white" />}
                            </button>

                            <div className="flex-1">
                              <p className={`font-medium ${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {formatIngredient(ing)}
                              </p>
                              {ing.recipes.length > 1 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Utilisé dans {ing.recipes.length} recettes
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Recipes List */}
              <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                  <ChefHat size={18} className="text-blue-600" />
                  Recettes incluses
                </h4>
                <ul className="space-y-1">
                  {recipes.map((recipe, index) => (
                    <li key={index} className="text-sm text-gray-700">
                      • {recipe.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

ShoppingListGenerator.propTypes = {
  /** Array of recipes to generate shopping list from */
  recipes: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      ingredients: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          original: PropTypes.string,
          amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
          unit: PropTypes.string,
        })
      ),
    })
  ),
  /** Is modal open */
  isOpen: PropTypes.bool,
  /** Callback when modal is closed */
  onClose: PropTypes.func.isRequired,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default ShoppingListGenerator;
