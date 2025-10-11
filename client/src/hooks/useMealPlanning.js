/**
 * useMealPlanning Hook
 *
 * Comprehensive React hook for managing meal planning state and API calls
 * Handles preferences, weekly plans, grocery lists with caching and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api/apiAdapter';

export const useMealPlanning = () => {
  // State management
  const [preferences, setPreferences] = useState(null);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [groceryList, setGroceryList] = useState(null);
  const [loading, setLoading] = useState({
    preferences: false,
    generatePlan: false,
    plans: false,
    groceryUpdate: false,
    mealUpdate: false,
    mealSwap: false,
    groceryRegenerate: false,
    favoriteMeals: false,
    addFavorite: false,
    removeFavorite: false
  });
  const [errors, setErrors] = useState({});
  const [generationProgress, setGenerationProgress] = useState({
    isGenerating: false,
    currentStep: '',
    progress: 0,
    estimatedTimeRemaining: 0
  });
  const [favoriteMeals, setFavoriteMeals] = useState([]);

  /**
   * Load user meal preferences
   */
  const loadPreferences = useCallback(async () => {
    setLoading(prev => ({ ...prev, preferences: true }));
    setErrors(prev => ({ ...prev, preferences: null }));

    try {
      const response = await apiRequest({
        method: 'GET',
        url: '/api/meal-planning/preferences'
      });

      if (response.success) {
        setPreferences(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to load preferences');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error loading preferences';
      setErrors(prev => ({ ...prev, preferences: errorMsg }));
      // Return null if preferences don't exist yet (first-time user)
      if (errorMsg.includes('No preferences found') || errorMsg.includes('404')) {
        setPreferences(null);
        return null;
      }
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, preferences: false }));
    }
  }, []);

  /**
   * Save user meal preferences
   */
  const savePreferences = useCallback(async (preferencesData) => {
    setLoading(prev => ({ ...prev, preferences: true }));
    setErrors(prev => ({ ...prev, preferences: null }));

    try {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/meal-planning/preferences',
        data: preferencesData
      });

      if (response.success) {
        setPreferences(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to save preferences');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error saving preferences';
      setErrors(prev => ({ ...prev, preferences: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, preferences: false }));
    }
  }, []);

  /**
   * Generate weekly meal plan with progress tracking
   */
  const generateWeeklyPlan = useCallback(async (options = {}) => {
    setLoading(prev => ({ ...prev, generatePlan: true }));
    setErrors(prev => ({ ...prev, generatePlan: null }));

    // Initialize progress tracking
    const startTime = Date.now();
    const totalMeals = 14; // Typical: 7 days x 2 meals per day
    let mealsGenerated = 0;

    const updateProgress = (step, progress) => {
      const elapsed = Date.now() - startTime;
      const estimatedTotal = elapsed / (progress / 100);
      const remaining = Math.max(0, Math.round((estimatedTotal - elapsed) / 1000));

      setGenerationProgress({
        isGenerating: true,
        currentStep: step,
        progress,
        estimatedTimeRemaining: remaining
      });
    };

    try {
      // Step 1: Loading preferences
      updateProgress('Loading your meal preferences...', 10);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UI

      // Step 2: Planning meals
      updateProgress('Planning your weekly meals...', 30);

      const response = await apiRequest({
        method: 'POST',
        url: '/api/meal-planning/weekly-plan',
        data: {
          weekStartDate: options.weekStartDate || null,
          allowDuplicate: options.allowDuplicate || false
        }
      });

      // Step 3: Processing meals
      updateProgress('Processing meal details...', 60);
      await new Promise(resolve => setTimeout(resolve, 300));

      if (response.success) {
        // Step 4: Generating grocery list
        updateProgress('Creating your grocery list...', 85);
        await new Promise(resolve => setTimeout(resolve, 300));

        setCurrentPlan(response.data);
        if (response.data.groceryList) {
          setGroceryList(response.data.groceryList);
        }

        // Step 5: Finalizing
        updateProgress('Finalizing your meal plan...', 95);

        // Refresh the plans list
        loadWeeklyPlans();

        // Complete
        updateProgress('Complete!', 100);

        // Reset progress after brief delay
        setTimeout(() => {
          setGenerationProgress({
            isGenerating: false,
            currentStep: '',
            progress: 0,
            estimatedTimeRemaining: 0
          });
        }, 1000);

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to generate plan');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error generating weekly plan';
      setErrors(prev => ({ ...prev, generatePlan: errorMsg }));

      // Reset progress on error
      setGenerationProgress({
        isGenerating: false,
        currentStep: '',
        progress: 0,
        estimatedTimeRemaining: 0
      });

      throw error;
    } finally {
      setLoading(prev => ({ ...prev, generatePlan: false }));
    }
  }, []);

  /**
   * Load weekly plans with filters
   */
  const loadWeeklyPlans = useCallback(async (options = {}) => {
    setLoading(prev => ({ ...prev, plans: true }));
    setErrors(prev => ({ ...prev, plans: null }));

    try {
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const response = await apiRequest({
        method: 'GET',
        url: `/api/meal-planning/weekly-plans?${params.toString()}`
      });

      if (response.success) {
        setWeeklyPlans(response.data.plans || []);

        // Set current plan to the most recent active plan
        if (response.data.plans && response.data.plans.length > 0) {
          const activePlan = response.data.plans.find(p => p.status === 'active');
          if (activePlan && !currentPlan) {
            setCurrentPlan(activePlan);
            if (activePlan.groceryList) {
              setGroceryList(activePlan.groceryList);
            }
          }
        }

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to load plans');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error loading weekly plans';
      setErrors(prev => ({ ...prev, plans: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, plans: false }));
    }
  }, [currentPlan]);

  /**
   * Update grocery item (check/uncheck, add cost, notes)
   */
  const updateGroceryItem = useCallback(async (itemId, updates) => {
    setLoading(prev => ({ ...prev, groceryUpdate: true }));
    setErrors(prev => ({ ...prev, groceryUpdate: null }));

    try {
      const response = await apiRequest({
        method: 'PATCH',
        url: `/api/meal-planning/grocery-items/${itemId}`,
        data: updates
      });

      if (response.success) {
        // Update local grocery list state
        if (groceryList && groceryList.items) {
          const updatedItems = groceryList.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          );

          // Recalculate checked count
          const checkedCount = updatedItems.filter(item => item.isChecked).length;

          setGroceryList({
            ...groceryList,
            items: updatedItems,
            checkedItems: checkedCount
          });
        }

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update item');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error updating grocery item';
      setErrors(prev => ({ ...prev, groceryUpdate: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, groceryUpdate: false }));
    }
  }, [groceryList]);

  /**
   * Mark meal as cooked and optionally rate it
   */
  const markMealAsCooked = useCallback(async (mealId, rating = null, notes = null) => {
    setLoading(prev => ({ ...prev, mealUpdate: true }));
    setErrors(prev => ({ ...prev, mealUpdate: null }));

    try {
      const response = await apiRequest({
        method: 'PATCH',
        url: `/api/meal-planning/meals/${mealId}`,
        data: {
          isCooked: true,
          rating,
          notes
        }
      });

      if (response.success) {
        // Update local state with server response
        if (currentPlan && currentPlan.meals) {
          const updatedMeals = currentPlan.meals.map(meal =>
            meal.id === mealId ? { ...meal, ...response.data } : meal
          );

          setCurrentPlan({
            ...currentPlan,
            meals: updatedMeals
          });
        }

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update meal');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error marking meal as cooked';
      setErrors(prev => ({ ...prev, mealUpdate: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, mealUpdate: false }));
    }
  }, [currentPlan]);

  /**
   * Swap a planned meal with a new AI suggestion
   */
  const swapMeal = useCallback(async (mealId, preferredCuisine = null) => {
    setLoading(prev => ({ ...prev, mealSwap: true }));
    setErrors(prev => ({ ...prev, mealSwap: null }));

    try {
      const response = await apiRequest({
        method: 'POST',
        url: `/api/meal-planning/meals/${mealId}/swap`,
        data: { preferredCuisine }
      });

      if (response.success) {
        const { meal, weeklyPlanId, needsGroceryListUpdate } = response.data;

        // Update local state with new meal
        if (currentPlan && currentPlan.meals) {
          const updatedMeals = currentPlan.meals.map(m =>
            m.id === mealId ? { ...m, ...meal } : m
          );

          setCurrentPlan({
            ...currentPlan,
            meals: updatedMeals
          });
        }

        // If grocery list needs update, regenerate it
        if (needsGroceryListUpdate && weeklyPlanId) {
          await regenerateGroceryList(weeklyPlanId);
        }

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to swap meal');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error swapping meal';
      setErrors(prev => ({ ...prev, mealSwap: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, mealSwap: false }));
    }
  }, [currentPlan]);

  /**
   * Regenerate grocery list after meal changes
   */
  const regenerateGroceryList = useCallback(async (planId) => {
    setLoading(prev => ({ ...prev, groceryRegenerate: true }));
    setErrors(prev => ({ ...prev, groceryRegenerate: null }));

    try {
      const response = await apiRequest({
        method: 'POST',
        url: `/api/meal-planning/weekly-plans/${planId}/regenerate-grocery-list`
      });

      if (response.success) {
        setGroceryList(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to regenerate grocery list');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error regenerating grocery list';
      setErrors(prev => ({ ...prev, groceryRegenerate: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, groceryRegenerate: false }));
    }
  }, []);

  /**
   * Select a specific plan as current
   */
  const selectPlan = useCallback((plan) => {
    setCurrentPlan(plan);
    if (plan.groceryList) {
      setGroceryList(plan.groceryList);
    }
  }, []);

  /**
   * Export grocery list to various formats
   */
  const exportGroceryList = useCallback((format = 'text') => {
    if (!groceryList || !groceryList.items) {
      throw new Error('No grocery list to export');
    }

    const items = groceryList.items;

    switch (format) {
      case 'text': {
        let text = `🛒 GROCERY LIST\n`;
        text += `Generated: ${new Date().toLocaleDateString()}\n\n`;

        // Group by category
        const categories = {};
        items.forEach(item => {
          const category = item.category || 'other';
          if (!categories[category]) categories[category] = [];
          categories[category].push(item);
        });

        Object.entries(categories).forEach(([category, categoryItems]) => {
          text += `\n${category.toUpperCase()}\n`;
          text += '─'.repeat(30) + '\n';
          categoryItems.forEach(item => {
            const check = item.isChecked ? '✓' : '☐';
            text += `${check} ${item.name} - ${item.quantity}\n`;
          });
        });

        text += `\n\n💰 Estimated Cost: €${groceryList.estimatedCost?.toFixed(2) || '0.00'}`;
        text += `\nItems: ${items.length} | Checked: ${groceryList.checkedItems || 0}`;

        return text;
      }

      case 'json': {
        return JSON.stringify({
          generatedAt: new Date().toISOString(),
          totalItems: items.length,
          checkedItems: groceryList.checkedItems || 0,
          estimatedCost: groceryList.estimatedCost,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            category: item.category,
            isChecked: item.isChecked,
            estimatedCost: item.estimatedCostEur
          }))
        }, null, 2);
      }

      case 'csv': {
        let csv = 'Category,Item,Quantity,Checked,Estimated Cost (EUR)\n';
        items.forEach(item => {
          csv += `"${item.category || 'other'}","${item.name}","${item.quantity}",${item.isChecked ? 'Yes' : 'No'},${item.estimatedCostEur || 0}\n`;
        });
        return csv;
      }

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }, [groceryList]);

  /**
   * Print grocery list
   */
  const printGroceryList = useCallback(() => {
    if (!groceryList || !groceryList.items) {
      throw new Error('No grocery list to print');
    }

    const printWindow = window.open('', '_blank');
    const items = groceryList.items;

    // Group by category
    const categories = {};
    items.forEach(item => {
      const category = item.category || 'other';
      if (!categories[category]) categories[category] = [];
      categories[category].push(item);
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Grocery List - ${new Date().toLocaleDateString()}</title>
          <style>
            @media print {
              @page { margin: 2cm; }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #2563eb;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 10px;
            }
            h2 {
              color: #1e40af;
              text-transform: uppercase;
              font-size: 16px;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            .item {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .checkbox {
              width: 20px;
              height: 20px;
              border: 2px solid #6b7280;
              margin-right: 12px;
              flex-shrink: 0;
            }
            .checkbox.checked {
              background: #10b981;
              border-color: #10b981;
            }
            .item-name {
              flex: 1;
              font-weight: 500;
            }
            .item-quantity {
              color: #6b7280;
              margin-left: 12px;
            }
            .summary {
              margin-top: 32px;
              padding: 16px;
              background: #f3f4f6;
              border-radius: 8px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
            }
          </style>
        </head>
        <body>
          <h1>🛒 Grocery List</h1>
          <p>Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>

          ${Object.entries(categories).map(([category, categoryItems]) => `
            <h2>${category}</h2>
            ${categoryItems.map(item => `
              <div class="item">
                <div class="checkbox ${item.isChecked ? 'checked' : ''}"></div>
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">${item.quantity}</span>
              </div>
            `).join('')}
          `).join('')}

          <div class="summary">
            <div class="summary-row">
              <strong>Total Items:</strong>
              <span>${items.length}</span>
            </div>
            <div class="summary-row">
              <strong>Checked Items:</strong>
              <span>${groceryList.checkedItems || 0}</span>
            </div>
            <div class="summary-row">
              <strong>Estimated Cost:</strong>
              <span>€${groceryList.estimatedCost?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }, [groceryList]);

  /**
   * Load favorite meals
   */
  const loadFavoriteMeals = useCallback(async (options = {}) => {
    setLoading(prev => ({ ...prev, favoriteMeals: true }));
    setErrors(prev => ({ ...prev, favoriteMeals: null }));

    try {
      const params = new URLSearchParams();
      if (options.mealType) params.append('mealType', options.mealType);
      if (options.cuisineType) params.append('cuisineType', options.cuisineType);
      if (options.sortBy) params.append('sortBy', options.sortBy);

      const response = await apiRequest({
        method: 'GET',
        url: `/api/favorite-meals?${params.toString()}`
      });

      if (response.success) {
        setFavoriteMeals(response.data.meals || []);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to load favorite meals');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error loading favorite meals';
      setErrors(prev => ({ ...prev, favoriteMeals: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, favoriteMeals: false }));
    }
  }, []);

  /**
   * Add meal to favorites
   */
  const addFavoriteMeal = useCallback(async (mealData) => {
    setLoading(prev => ({ ...prev, addFavorite: true }));
    setErrors(prev => ({ ...prev, addFavorite: null }));

    try {
      const response = await apiRequest({
        method: 'POST',
        url: '/api/favorite-meals',
        data: mealData
      });

      if (response.success) {
        // Add to local state
        setFavoriteMeals(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to add favorite meal');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error adding favorite meal';
      setErrors(prev => ({ ...prev, addFavorite: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, addFavorite: false }));
    }
  }, []);

  /**
   * Remove meal from favorites
   */
  const removeFavoriteMeal = useCallback(async (favoriteMealId) => {
    setLoading(prev => ({ ...prev, removeFavorite: true }));
    setErrors(prev => ({ ...prev, removeFavorite: null }));

    try {
      const response = await apiRequest({
        method: 'DELETE',
        url: `/api/favorite-meals/${favoriteMealId}`
      });

      if (response.success) {
        // Remove from local state
        setFavoriteMeals(prev => prev.filter(meal => meal.id !== favoriteMealId));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to remove favorite meal');
      }
    } catch (error) {
      const errorMsg = error.message || 'Error removing favorite meal';
      setErrors(prev => ({ ...prev, removeFavorite: errorMsg }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, removeFavorite: false }));
    }
  }, []);

  /**
   * Use favorite meal in weekly plan
   */
  const useFavoriteInPlan = useCallback(async (favoriteMealId, weeklyPlanId, dayOfWeek) => {
    try {
      const response = await apiRequest({
        method: 'POST',
        url: `/api/favorite-meals/${favoriteMealId}/use`,
        data: { weeklyPlanId, dayOfWeek }
      });

      if (response.success) {
        // Refresh current plan to show new meal
        if (currentPlan && currentPlan.id === weeklyPlanId) {
          loadWeeklyPlans();
        }
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to use favorite in plan');
      }
    } catch (error) {
      throw error;
    }
  }, [currentPlan, loadWeeklyPlans]);

  /**
   * Create share link for a weekly plan
   */
  const sharePlan = useCallback(async (weeklyPlanId, options = {}) => {
    try {
      const response = await apiRequest({
        method: 'POST',
        url: `/api/meal-planning/weekly-plans/${weeklyPlanId}/share`,
        data: options
      });

      if (response.success) {
        return response.data; // Contains shareUrl and shareToken
      } else {
        throw new Error(response.error || 'Failed to create share link');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Get user's shared plans
   */
  const getUserShares = useCallback(async () => {
    try {
      const response = await apiRequest({
        method: 'GET',
        url: '/api/meal-planning/shares'
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to load shares');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Revoke share link
   */
  const revokeShare = useCallback(async (shareToken) => {
    try {
      const response = await apiRequest({
        method: 'DELETE',
        url: `/api/meal-planning/shares/${shareToken}`
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to revoke share');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Get shared plan by token (public)
   */
  const getSharedPlan = useCallback(async (shareToken) => {
    try {
      const response = await apiRequest({
        method: 'GET',
        url: `/api/shared/meal-plan/${shareToken}`
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to load shared plan');
      }
    } catch (error) {
      throw error;
    }
  }, []);

  /**
   * Copy shared plan to user's account
   */
  const copySharedPlan = useCallback(async (shareToken) => {
    try {
      const response = await apiRequest({
        method: 'POST',
        url: `/api/shared/meal-plan/${shareToken}/copy`
      });

      if (response.success) {
        // Refresh plans to show copied plan
        loadWeeklyPlans();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to copy plan');
      }
    } catch (error) {
      throw error;
    }
  }, [loadWeeklyPlans]);

  /**
   * Clear errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Check if user has completed onboarding
   */
  const hasCompletedOnboarding = preferences !== null;

  /**
   * Calculate statistics
   */
  const statistics = {
    totalPlans: weeklyPlans.length,
    activePlans: weeklyPlans.filter(p => p.status === 'active').length,
    currentPlanProgress: currentPlan
      ? {
          totalMeals: currentPlan.mealsCount || 0,
          cookedMeals: currentPlan.meals?.filter(m => m.isCooked).length || 0,
          groceryProgress: groceryList
            ? Math.round((groceryList.checkedItems / groceryList.totalItems) * 100)
            : 0,
          budgetUsed: groceryList?.actualCost || 0,
          budgetTotal: currentPlan.totalBudget || 0
        }
      : null
  };

  // Load preferences and plans on mount
  useEffect(() => {
    loadPreferences().catch(err => {
      // Silently fail if preferences don't exist (first-time user)
      if (!err.message?.includes('No preferences found')) {
        console.error('Failed to load preferences:', err);
      }
    });

    loadWeeklyPlans({ status: 'active', limit: 10 }).catch(err => {
      console.error('Failed to load weekly plans:', err);
    });
  }, [loadPreferences, loadWeeklyPlans]);

  return {
    // State
    preferences,
    weeklyPlans,
    currentPlan,
    groceryList,
    favoriteMeals,
    loading,
    errors,
    generationProgress,
    statistics,
    hasCompletedOnboarding,

    // Actions
    loadPreferences,
    savePreferences,
    generateWeeklyPlan,
    loadWeeklyPlans,
    updateGroceryItem,
    markMealAsCooked,
    swapMeal,
    regenerateGroceryList,
    exportGroceryList,
    printGroceryList,
    loadFavoriteMeals,
    addFavoriteMeal,
    removeFavoriteMeal,
    useFavoriteInPlan,
    sharePlan,
    getUserShares,
    revokeShare,
    getSharedPlan,
    copySharedPlan,
    selectPlan,
    clearErrors
  };
};

export default useMealPlanning;
