

# Meal Planning Frontend - Complete Integration Guide

## 📋 Overview

This document provides comprehensive documentation for the frontend implementation of the Jow-inspired meal planning system in Pluqla.

**Status:** ✅ Complete and Production-Ready

**Components:**
- ✅ `useMealPlanning` - Custom React hook for API integration
- ✅ `MealPreferencesOnboarding` - 5-step user onboarding wizard
- ✅ `WeeklyMealPlanner` - Interactive 7-day calendar view
- ✅ `GroceryListManager` - Category-grouped shopping list
- ✅ `MealPlanningDashboard` - Main wrapper component

---

## 🎯 Quick Start

### 1. Integration into Existing App

Add the meal planning feature to your `AlimentationScreen.jsx`:

```jsx
import MealPlanningDashboard from '../components/features/food/MealPlanningDashboard';

// Inside AlimentationScreen component
const categories = [
  { id: 'recettes', name: 'Recettes', icon: '📖' },
  { id: 'nutrition', name: 'Nutrition IA', icon: '🤖' },
  { id: 'planning', name: 'Planning Hebdo', icon: '📅' }, // NEW!
  { id: 'courses', name: 'Liste de courses', icon: '🛒' }
];

// In render:
{activeCategory === 'planning' && (
  <MealPlanningDashboard
    darkMode={darkMode}
    showNotification={showNotification}
  />
)}
```

### 2. Standalone Usage

```jsx
import { MealPlanningDashboard } from './components/features/food/MealPlanningDashboard';

function App() {
  return (
    <MealPlanningDashboard
      darkMode={false}
      showNotification={(msg, type) => console.log(msg, type)}
    />
  );
}
```

---

## 🔧 Component API Reference

### `useMealPlanning` Hook

**Location:** `client/src/hooks/useMealPlanning.js`

**Returns:**

```typescript
{
  // State
  preferences: UserMealPreferences | null,
  weeklyPlans: WeeklyMealPlan[],
  currentPlan: WeeklyMealPlan | null,
  groceryList: GroceryList | null,
  loading: {
    preferences: boolean,
    generatePlan: boolean,
    plans: boolean,
    groceryUpdate: boolean
  },
  errors: Record<string, string>,
  statistics: {
    totalPlans: number,
    activePlans: number,
    currentPlanProgress: {
      totalMeals: number,
      cookedMeals: number,
      groceryProgress: number, // percentage
      budgetUsed: number,
      budgetTotal: number
    } | null
  },
  hasCompletedOnboarding: boolean,

  // Actions
  loadPreferences: () => Promise<UserMealPreferences>,
  savePreferences: (prefs: Preferences) => Promise<UserMealPreferences>,
  generateWeeklyPlan: (options?) => Promise<WeeklyMealPlan>,
  loadWeeklyPlans: (options?) => Promise<WeeklyPlansResponse>,
  updateGroceryItem: (itemId, updates) => Promise<GroceryItem>,
  markMealAsCooked: (mealId, rating?, notes?) => Promise<void>,
  selectPlan: (plan: WeeklyMealPlan) => void,
  clearErrors: () => void
}
```

**Example Usage:**

```jsx
import { useMealPlanning } from '../hooks/useMealPlanning';

function MyComponent() {
  const {
    currentPlan,
    groceryList,
    loading,
    generateWeeklyPlan,
    updateGroceryItem
  } = useMealPlanning();

  const handleGenerate = async () => {
    try {
      await generateWeeklyPlan();
      console.log('Plan generated!');
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading.generatePlan}>
        Generate Plan
      </button>
      {currentPlan && <div>Meals: {currentPlan.mealsCount}</div>}
    </div>
  );
}
```

---

### `MealPreferencesOnboarding` Component

**Location:** `client/src/components/features/food/MealPreferencesOnboarding.jsx`

**Props:**

```typescript
{
  darkMode: boolean,
  onComplete: (preferences: Preferences) => void,
  showNotification?: (message: string, type: 'success' | 'error') => void
}
```

**Features:**
- 5-step wizard with progress bar
- Household size selector (1-20 people)
- 8 dietary restrictions (vegetarian, vegan, gluten-free, etc.)
- 8 cuisine preferences (French, Italian, Asian, etc.)
- 3 skill levels (beginner, intermediate, advanced)
- Weekly budget slider (0-300€)

**Example:**

```jsx
<MealPreferencesOnboarding
  darkMode={true}
  onComplete={(prefs) => console.log('Preferences saved:', prefs)}
  showNotification={(msg, type) => alert(`${type}: ${msg}`)}
/>
```

**Screenshots Flow:**
1. **Step 1:** Household size with +/- buttons
2. **Step 2:** Grid of dietary restriction chips
3. **Step 3:** Grid of cuisine preference cards
4. **Step 4:** List of skill level options
5. **Step 5:** Budget slider with preview

---

### `WeeklyMealPlanner` Component

**Location:** `client/src/components/features/food/WeeklyMealPlanner.jsx`

**Props:**

```typescript
{
  weeklyPlan: WeeklyMealPlan | null,
  onMealClick?: (meal: Meal) => void,
  onMarkAsCooked?: (mealId: string) => Promise<void>,
  onRateMeal?: (mealId: string, rating: number, notes?: string) => Promise<void>,
  darkMode: boolean,
  loading?: boolean
}
```

**Features:**
- 7-day calendar grid (Monday-Sunday)
- Meals grouped by day
- Budget tracking per day and total
- Click meal to expand details (ingredients, recipe)
- Mark meals as cooked
- Rate meals with 1-5 stars + notes
- Visual indicators for difficulty, cuisine type
- Responsive: 1 column (mobile) → 4 columns (desktop)

**Layout:**
```
┌─────────────────────────────────────┐
│  Week Header + Total Budget         │
│  Progress Bar (if budget defined)   │
└─────────────────────────────────────┘
┌──────┬──────┬──────┬──────┐
│ Mon  │ Tue  │ Wed  │ Thu  │
│ 12€  │ 15€  │ 18€  │ 14€  │
│ ┌──┐ │ ┌──┐ │ ┌──┐ │ ┌──┐ │
│ │🍽️│ │ │🥐│ │ │🍷│ │ │🍪│ │
│ └──┘ │ └──┘ │ └──┘ │ └──┘ │
└──────┴──────┴──────┴──────┘
```

**Example:**

```jsx
<WeeklyMealPlanner
  weeklyPlan={currentPlan}
  onMarkAsCooked={async (mealId) => {
    await markMealAsCooked(mealId);
  }}
  onRateMeal={async (mealId, rating, notes) => {
    await markMealAsCooked(mealId, rating, notes);
  }}
  darkMode={false}
/>
```

---

### `GroceryListManager` Component

**Location:** `client/src/components/features/food/GroceryListManager.jsx`

**Props:**

```typescript
{
  groceryList: GroceryList | null,
  onUpdateItem?: (itemId: string, updates: Partial<GroceryItem>) => Promise<void>,
  darkMode: boolean,
  loading?: boolean
}
```

**Features:**
- Category grouping (Produce, Dairy, Meat, Pantry, Spices, Other)
- Collapsible categories with progress bars
- Check/uncheck items
- Edit actual cost vs estimated cost
- Budget comparison (estimated vs actual)
- Overall progress indicator
- Visual feedback for completed items

**Categories:**
```
🥬 Fruits & Légumes
  ☑ Tomatoes (500g) - 3.50€
  ☐ Lettuce (1 head) - ~2.00€

🥛 Produits Laitiers
  ☑ Milk (1L) - 1.20€
  ☑ Cheese (200g) - 4.50€

🥩 Viandes & Poissons
  ☐ Chicken breast (600g) - ~8.00€
```

**Example:**

```jsx
<GroceryListManager
  groceryList={groceryList}
  onUpdateItem={async (itemId, updates) => {
    await updateGroceryItem(itemId, updates);
  }}
  darkMode={true}
/>
```

---

### `MealPlanningDashboard` Component

**Location:** `client/src/components/features/food/MealPlanningDashboard.jsx`

**Props:**

```typescript
{
  darkMode: boolean,
  showNotification?: (message: string, type: 'success' | 'error') => void
}
```

**Features:**
- Automatic onboarding detection
- Tab navigation (Calendar, Grocery List, Preferences)
- Generate new plan button
- Statistics cards (meals cooked, grocery progress, budget)
- Error handling and display
- Responsive layout

**Tab Structure:**
```
┌────────────────────────────────────┐
│  📅 Calendar | 🛒 Grocery | ⚙️ Prefs │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│                                    │
│  [Active Tab Content]              │
│                                    │
└────────────────────────────────────┘
```

**Example:**

```jsx
<MealPlanningDashboard
  darkMode={false}
  showNotification={(msg, type) => {
    // Your notification system
    toast[type](msg);
  }}
/>
```

---

## 🎨 UI/UX Design Patterns

### Color Scheme

```css
/* Primary */
--red-500: #EF4444;
--red-600: #DC2626;

/* Success */
--green-500: #10B981;
--green-600: #059669;

/* Warning */
--yellow-500: #F59E0B;

/* Info */
--blue-500: #3B82F6;

/* Dark Mode */
--gray-800: #1F2937;
--gray-900: #111827;
```

### Glassmorphism Effect

Both light and dark modes use a glassmorphism effect:

```jsx
<div className={`glass-effect ${darkMode ? 'glass-effect-dark' : ''}`}>
  Content
</div>
```

### Responsive Breakpoints

```css
/* Mobile: < 640px */
grid-cols-1

/* Tablet: 640-1024px */
md:grid-cols-2

/* Desktop: > 1024px */
lg:grid-cols-3 xl:grid-cols-4
```

### Animations

All interactive elements use smooth transitions:

```css
transition-all duration-300
hover:scale-105
hover:shadow-xl
```

---

## 🔄 User Flow

### First-Time User

```
1. User opens Meal Planning
   ↓
2. No preferences found → Show onboarding
   ↓
3. Complete 5 steps
   ↓
4. Save preferences to backend
   ↓
5. Show dashboard with "Generate Plan" button
   ↓
6. User clicks generate
   ↓
7. AI generates 14-21 meals (2-3/day × 7 days)
   ↓
8. Show calendar + grocery list
```

### Returning User

```
1. User opens Meal Planning
   ↓
2. Load existing plan (if active)
   ↓
3. Show calendar with meals
   ↓
4. User can:
   - View meal details
   - Mark as cooked
   - Rate meals
   - Check grocery items
   - Generate new plan
```

### Shopping Flow

```
1. User opens Grocery List tab
   ↓
2. View categorized items
   ↓
3. While shopping:
   - Check items as found
   - Edit actual prices
   - Add notes
   ↓
4. Progress bar updates in real-time
   ↓
5. Budget comparison shows over/under spending
```

---

## 📱 Mobile Optimization

### Calendar View Mobile

```
Desktop (4 columns):
┌─────┬─────┬─────┬─────┐
│ Mon │ Tue │ Wed │ Thu │
└─────┴─────┴─────┴─────┘

Mobile (1 column):
┌─────────┐
│ Monday  │
├─────────┤
│ Tuesday │
├─────────┤
│ Wednes  │
└─────────┘
```

### Touch Targets

All interactive elements have minimum 48px touch targets:

```jsx
className="w-12 h-12" // Minimum for touch
className="py-3 px-4" // Comfortable padding
```

### Scroll Optimization

Long lists use `overflow-y-auto` with `max-h`:

```jsx
<div className="max-h-96 overflow-y-auto">
  {items.map(item => <Item key={item.id} />)}
</div>
```

---

## 🧪 Testing Guide

### Unit Tests

**File:** `client/src/hooks/__tests__/useMealPlanning.test.js`

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useMealPlanning } from '../useMealPlanning';

describe('useMealPlanning', () => {
  it('should load preferences on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useMealPlanning());

    expect(result.current.loading.preferences).toBe(true);
    await waitForNextUpdate();
    expect(result.current.loading.preferences).toBe(false);
  });

  it('should generate weekly plan', async () => {
    const { result } = renderHook(() => useMealPlanning());

    await act(async () => {
      await result.current.generateWeeklyPlan();
    });

    expect(result.current.currentPlan).not.toBeNull();
  });
});
```

### Component Tests

**File:** `client/src/components/features/food/__tests__/WeeklyMealPlanner.test.jsx`

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import WeeklyMealPlanner from '../WeeklyMealPlanner';

describe('WeeklyMealPlanner', () => {
  const mockPlan = {
    id: 'plan-1',
    mealsCount: 14,
    totalBudget: 150,
    meals: [
      {
        id: 'meal-1',
        dayOfWeek: 0,
        mealType: 'lunch',
        name: 'Pasta',
        totalCostEur: 12,
        isCooked: false
      }
    ]
  };

  it('should render meals grouped by day', () => {
    render(<WeeklyMealPlanner weeklyPlan={mockPlan} darkMode={false} />);

    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('12.00€')).toBeInTheDocument();
  });

  it('should mark meal as cooked', async () => {
    const onMarkAsCooked = jest.fn();

    render(
      <WeeklyMealPlanner
        weeklyPlan={mockPlan}
        onMarkAsCooked={onMarkAsCooked}
        darkMode={false}
      />
    );

    // Click meal to expand
    fireEvent.click(screen.getByText('Pasta'));

    // Click "Mark as cooked" button
    fireEvent.click(screen.getByText('✓ Cuisiner'));

    expect(onMarkAsCooked).toHaveBeenCalledWith('meal-1');
  });
});
```

### Integration Tests

**File:** `client/src/__tests__/integration/mealPlanning.test.jsx`

```javascript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MealPlanningDashboard from '../../components/features/food/MealPlanningDashboard';

describe('Meal Planning Integration', () => {
  it('should complete full flow: onboarding → generate → grocery', async () => {
    const showNotification = jest.fn();

    render(<MealPlanningDashboard darkMode={false} showNotification={showNotification} />);

    // Should show onboarding for first-time user
    await waitFor(() => {
      expect(screen.getByText(/Combien êtes-vous/)).toBeInTheDocument();
    });

    // Complete onboarding
    // Step 1: Household size (already at 2)
    fireEvent.click(screen.getByText('Suivant →'));

    // Step 2: Skip dietary restrictions
    fireEvent.click(screen.getByText('Suivant →'));

    // Step 3: Skip cuisines
    fireEvent.click(screen.getByText('Suivant →'));

    // Step 4: Keep intermediate
    fireEvent.click(screen.getByText('Suivant →'));

    // Step 5: Set budget
    fireEvent.click(screen.getByText('✅ Terminer'));

    // Should show dashboard
    await waitFor(() => {
      expect(screen.getByText('✨ Générer nouveau plan')).toBeInTheDocument();
    });

    // Generate plan
    fireEvent.click(screen.getByText('✨ Générer nouveau plan'));

    // Should show calendar
    await waitFor(() => {
      expect(screen.getByText(/Semaine du/)).toBeInTheDocument();
    });

    // Switch to grocery list
    fireEvent.click(screen.getByText('🛒'));

    // Should show grocery list
    await waitFor(() => {
      expect(screen.getByText('Liste de courses')).toBeInTheDocument();
    });
  });
});
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Preferences not loading

**Symptom:** Onboarding shows every time

**Solution:**
```javascript
// Check if API endpoint is correct
const response = await apiRequest({
  method: 'GET',
  url: '/api/meal-planning/preferences' // Ensure correct path
});

// Check authentication token
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);
```

### Issue 2: Plan generation fails

**Symptom:** Error during weekly plan generation

**Solution:**
```javascript
// Check if AI provider is configured
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);

// Use mock mode for testing
AI_PROVIDER=mock npm start

// Check backend logs for AI errors
```

### Issue 3: Grocery items not updating

**Symptom:** Checkboxes don't persist

**Solution:**
```javascript
// Ensure updateGroceryItem returns updated data
const handleToggle = async (item) => {
  try {
    const updated = await updateGroceryItem(item.id, {
      isChecked: !item.isChecked
    });
    console.log('Updated:', updated);
  } catch (error) {
    console.error('Update failed:', error);
  }
};
```

### Issue 4: Dark mode not working

**Symptom:** Components don't respect dark mode

**Solution:**
```jsx
// Ensure darkMode prop is passed down
<MealPlanningDashboard darkMode={theme === 'dark'} />

// Check Tailwind dark mode config
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
  // ...
};
```

---

## 🚀 Performance Optimization

### Lazy Loading

```jsx
import { lazy, Suspense } from 'react';

const MealPlanningDashboard = lazy(() =>
  import('./components/features/food/MealPlanningDashboard')
);

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MealPlanningDashboard />
    </Suspense>
  );
}
```

### Memoization

```jsx
import { useMemo } from 'react';

const MealCard = React.memo(({ meal, darkMode }) => {
  return <div>...</div>;
});

function WeeklyPlanner({ meals }) {
  const sortedMeals = useMemo(() => {
    return meals.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [meals]);

  return sortedMeals.map(meal => <MealCard key={meal.id} meal={meal} />);
}
```

### Debounced Updates

```jsx
import { debounce } from 'lodash';

const handleCostUpdate = useMemo(
  () =>
    debounce(async (itemId, cost) => {
      await updateGroceryItem(itemId, { actualCostEur: cost });
    }, 500),
  [updateGroceryItem]
);
```

---

## 🎓 Best Practices

### 1. Error Handling

Always handle errors gracefully:

```jsx
const handleGenerate = async () => {
  try {
    await generateWeeklyPlan();
    showNotification('Success!', 'success');
  } catch (error) {
    console.error('Generation failed:', error);
    showNotification(
      error.message || 'Something went wrong',
      'error'
    );
  }
};
```

### 2. Loading States

Provide visual feedback during async operations:

```jsx
{loading.generatePlan ? (
  <div className="flex items-center space-x-2">
    <Spinner />
    <span>Génération en cours...</span>
  </div>
) : (
  <button onClick={handleGenerate}>
    Générer plan
  </button>
)}
```

### 3. Accessibility

Use semantic HTML and ARIA labels:

```jsx
<button
  aria-label="Mark meal as cooked"
  onClick={handleMarkAsCooked}
>
  ✓ Cuisiner
</button>

<input
  type="checkbox"
  aria-label={`Check ${item.name}`}
  checked={item.isChecked}
  onChange={handleToggle}
/>
```

### 4. State Management

Keep state close to where it's used:

```jsx
// ✅ Good: Local state for UI
const [selectedMeal, setSelectedMeal] = useState(null);

// ✅ Good: Hook for server state
const { currentPlan, loading } = useMealPlanning();

// ❌ Avoid: Global state for everything
```

---

## 📦 File Structure

```
client/src/
├── components/
│   └── features/
│       └── food/
│           ├── MealPlanningDashboard.jsx       (Main wrapper)
│           ├── MealPreferencesOnboarding.jsx   (5-step wizard)
│           ├── WeeklyMealPlanner.jsx           (Calendar view)
│           ├── GroceryListManager.jsx          (Shopping list)
│           ├── MealSuggestions.jsx             (Existing)
│           ├── RecipeList.jsx                  (Existing)
│           └── RecipeCard.jsx                  (Existing)
├── hooks/
│   ├── useMealPlanning.js                      (NEW - API hook)
│   ├── useMealSuggestions.js                   (Existing)
│   └── useRecipes.js                           (Existing)
├── services/
│   └── api/
│       └── apiAdapter.js                       (Existing)
└── screens/
    └── AlimentationScreen.jsx                  (Updated)
```

---

## 🔗 API Endpoints Used

### Preferences

```
POST   /api/meal-planning/preferences
GET    /api/meal-planning/preferences
```

### Weekly Plans

```
POST   /api/meal-planning/weekly-plan
GET    /api/meal-planning/weekly-plans
```

### Grocery Lists

```
PATCH  /api/meal-planning/grocery-items/:itemId
```

---

## 📝 Changelog

### Version 1.0.0 (Current)

**Added:**
- Complete meal planning system with onboarding
- Weekly calendar view with meal details
- Category-grouped grocery list manager
- Budget tracking and cost comparison
- Mark meals as cooked and rate them
- Real-time progress indicators
- Full dark mode support
- Mobile-responsive layouts

**Components:**
- `useMealPlanning` hook
- `MealPlanningDashboard` component
- `MealPreferencesOnboarding` component
- `WeeklyMealPlanner` component
- `GroceryListManager` component

---

## 🤝 Contributing

### Adding New Features

1. Create feature branch: `git checkout -b feature/meal-planning-[feature]`
2. Add component to appropriate folder
3. Update this documentation
4. Write tests
5. Create pull request

### Code Style

- Use functional components with hooks
- Use TypeScript for type safety (if enabled)
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Keep components under 500 lines

---

## 📞 Support

**Issues:** Create GitHub issue with `meal-planning-frontend` label

**Questions:** Add comment to PR or discussion thread

**Documentation:** Update this file for any changes

---

**Last Updated:** December 3, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
**Maintainer:** Pluqla Development Team
