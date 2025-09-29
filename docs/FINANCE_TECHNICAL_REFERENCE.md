# Finance Feature - Technical Reference

## 🏗️ Component Architecture

### Main Component: Dashboard.jsx
```javascript
// Location: client/src/components/finance/Dashboard.jsx
// Purpose: Main container for Finance feature
// Dependencies: ExpensesChart, IncomeChart, LoadingSpinner

Props:
- darkMode: boolean

State:
- financialData: object | null
- loading: boolean
- error: string | null
- activeView: 'expenses' | 'income'
```

### Chart Components
```javascript
// ExpensesChart.jsx
Props: { data, darkMode, compact, detailed }
Features: Doughnut chart, category breakdown, trend analysis

// IncomeChart.jsx
Props: { data, darkMode, compact, detailed }
Features: Doughnut chart, income sources, frequency analysis
```

## 🎨 CSS Structure: finance-premium.css

### CSS Custom Properties
```css
:root {
  /* Pluqla Brand Colors */
  --pluqla-red: #F14545;
  --pluqla-red-light: #FF6B6B;
  --pluqla-red-dark: #D73030;
  --pluqla-red-subtle: #FFF5F5;

  /* Premium Gradients */
  --gradient-pluqla: linear-gradient(135deg, #F14545 0%, #FF6B6B 100%);
  --gradient-success: linear-gradient(135deg, #10B981 0%, #059669 100%);

  /* Glassmorphism */
  --glass-light: rgba(255, 255, 255, 0.25);
  --glass-dark: rgba(15, 23, 42, 0.25);

  /* Shadows */
  --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-strong: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

### Key CSS Classes

#### Layout Components
```css
.finance-hero {
  /* Hero balance section */
  background: var(--gradient-surface-light);
  backdrop-filter: blur(20px);
  border-radius: 32px;
  padding: 3rem 2rem;
}

.metric-grid {
  /* 3-column metric cards */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.chart-grid {
  /* 2-column chart layout */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}
```

#### Interactive Elements
```css
.finance-tab {
  /* Tab navigation */
  padding: 1rem 2rem;
  border-radius: 16px;
  font-weight: 600;
  transition: var(--transition-smooth);
}

.finance-tab.active {
  background: var(--gradient-pluqla);
  color: white;
  transform: translateY(-2px);
}

.metric-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-strong);
}
```

## 📱 Responsive Breakpoints

### Mobile-First Approach
```css
/* Base: Mobile (≤639px) */
.finance-hero { padding: 1.5rem 1rem; }
.metric-grid { grid-template-columns: 1fr; }
.chart-grid { grid-template-columns: 1fr; }

/* Tablet (640px-1023px) */
@media (min-width: 640px) and (max-width: 1023px) {
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
}

/* Desktop (768px-1024px intermediate) */
@media (min-width: 768px) and (max-width: 1024px) {
  .chart-grid { grid-template-columns: 1fr; }
}

/* Large Desktop (≥1024px) */
/* Uses default grid layouts */
```

## 🔄 Data Flow Architecture

### API Integration
```javascript
// Endpoint: GET /financial/summary
// Parameters: lang=${i18n.language}&period=month
// Response: { totals, income, expenses, byCategory }

// Fallback Data Structure
const sampleData = {
  totals: { netSavings: 3540, savingsRate: 12.5 },
  income: { total: 4750, sources: [...] },
  expenses: { total: 1210, byCategory: [...] }
};
```

### State Management Pattern
```javascript
// Loading States
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// Data States
const [financialData, setFinancialData] = useState(null);
const [activeView, setActiveView] = useState('expenses');

// Display Logic
const displayData = financialData || getSampleData();
```

## 🎯 Chart Configuration

### Chart.js Setup
```javascript
// chart-options.js patterns
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: compact ? 'bottom' : 'right',
      labels: {
        color: darkMode ? '#e5e7eb' : '#374151',
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
      borderColor: darkMode ? '#374151' : '#e5e7eb'
    }
  }
};
```

### Color Schemes
```javascript
// Expense Colors (Red variants)
const expenseColors = {
  alimentation: '#F14545',  // Primary
  transport: '#FF6B6B',     // Light
  logement: '#D73030',      // Dark
  loisirs: '#F85454',       // Medium
  // ...
};

// Income Colors (Green variants)
const incomeColors = {
  salary: '#10B981',        // Modern teal
  freelance: '#059669',     // Emerald
  investment: '#0D9488',    // Investment teal
  // ...
};
```

## 🛠️ Development Utilities

### Sample Data Generators
```javascript
// ExpensesChart.jsx
const getSampleData = () => [
  { category: 'alimentation', amount: 450, count: 12 },
  { category: 'transport', amount: 280, count: 8 },
  // ...
];

// IncomeChart.jsx
const getSampleIncomeData = () => [
  { id: 1, name: 'Salaire principal', type: 'salary', amount: 3200 },
  { id: 2, name: 'Freelance web', type: 'freelance', amount: 800 },
  // ...
];
```

### Currency Formatting
```javascript
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};
```

## 🎨 Animation System

### Hover Effects
```css
/* Card Lift Animation */
.metric-card:hover {
  transform: translateY(-8px);
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

/* Button Shimmer Effect */
.action-button::before {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 0.5s ease;
}

/* Pulse Animation */
.trend-dot {
  animation: pulse-glow 2s infinite;
}
```

### Transition Timing
```css
--transition-smooth: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
--transition-bounce: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
--transition-fast: all 0.15s ease-out;
```

## 🔍 Testing Checklist

### Visual Testing
- [ ] Hero balance displays correctly
- [ ] Tabs switch smoothly between Expenses/Revenue
- [ ] Charts render with proper colors
- [ ] Responsive behavior on all breakpoints
- [ ] Dark mode compatibility

### Functional Testing
- [ ] API data integration
- [ ] Fallback data when API fails
- [ ] Loading states
- [ ] Error handling
- [ ] Navigation between detailed views

### Performance Testing
- [ ] Bundle size acceptable
- [ ] Chart rendering performance
- [ ] Animation smoothness
- [ ] Memory usage stable

## 📦 Dependencies

### Core Dependencies
```json
{
  "chart.js": "^4.5.0",
  "react": "^18.2.0",
  "react-chartjs-2": "^5.3.0",
  "react-i18next": "^15.7.3"
}
```

### Styling Dependencies
- Native CSS with custom properties
- No external CSS frameworks
- Chart.js built-in theming

## 🎛️ Configuration Options

### Theme Customization
```javascript
// Available in Dashboard component props
const themeConfig = {
  darkMode: boolean,
  primaryColor: '#F14545',
  compactMode: false,
  animationsEnabled: true
};
```

### Chart Customization
```javascript
// Available in chart component props
const chartConfig = {
  compact: boolean,    // Smaller size for tight layouts
  detailed: boolean,   // Show additional analysis
  darkMode: boolean,   // Dark theme integration
  data: object        // API data override
};
```

---

**This technical reference provides implementation details for maintaining and extending the Finance feature.**