import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from './utils/storage';
import { autoDiagnose } from './utils/debugApp';
import { INITIAL_ANSWERS } from './utils/constants';
import { useUserData } from './hooks/useUserData';
import { useNotifications } from './hooks/useNotifications';
import { useTransactions } from './hooks/useTransactions';
import { useAISuggestions } from './hooks/useAISuggestions';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { initFinancialApi } from './services/financialApi';
import { featureFlags, FeatureGate } from './utils/featureFlags';
import Notifications from './components/common/Notifications';
import LoadingSpinner from './components/common/LoadingSpinner';
import SuspenseFallback from './components/common/SuspenseFallback';
import ErrorBoundary from './components/common/ErrorBoundary';
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary';
import PWAManager from './components/common/PWAManager';
// FinancePage import direct pour éviter ChunkLoadError avec react-chartjs-2
import FinancePage from './pages/FinancePage';
import ActivityScreen from './screens/ActivityScreen';
import HabitsScreen from './screens/HabitsScreen';
import AlimentationScreen from './screens/AlimentationScreen';
import DeplacementScreen from './screens/DeplacementScreen';
import ExpensesDetailScreen from './components/finance/ExpensesDetailScreen';
import IncomeDetailScreen from './components/finance/IncomeDetailScreen';
import SuggestionsDetailScreen from './components/finance/SuggestionsDetailScreen';
import ProgressionDetailScreen from './components/progression/ProgressionDetailScreen';
import './styles/animations.css';

// Lazy loading des composants lourds pour optimisation bundle
// Force reload to apply new .env settings
const LandingPage = React.lazy(() => import('./components/landing/LandingPage'));
const OnboardingManager = React.lazy(() => import('./components/onboarding/OnboardingManager'));
const HomeScreen = React.lazy(() => import('./components/home/HomeScreen'));
const CategoryScreen = React.lazy(() => import('./components/category/CategoryScreen'));
const Profile = React.lazy(() => import('./components/profile/Profile'));
const FeatureFlagsDebug = React.lazy(() => import('./components/dev/FeatureFlagsDebug'));

// Lazy loading conditionnel pour les gros composants des features (pour usage futur)
// const FinancialDashboard = React.lazy(() => import('./components/features/FinancialDashboard'));
// const Dashboard = React.lazy(() => import('./components/finance/Dashboard'));

// Composant principal de l'app qui utilise NavigationContext et AuthContext
function AppContent() {
  const { currentScreen, setCurrentScreen } = useNavigation();
  const { apiCall } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hooks personnalisés
  const [userData, setUserData] = useUserData();
  const notificationSystem = useNotifications();
  const { transactions, addTransaction, removeTransaction } = useTransactions();

  // Réponses du questionnaire avec persistance localStorage
  const [answers] = useState(() =>
    loadFromLocalStorage('userAnswers', INITIAL_ANSWERS)
  );

  // Cache pour les suggestions IA
  const [suggestionsCache, setSuggestionsCache] = useState({});
  const aiSuggestionsHook = useAISuggestions(answers);

  // Initialisation de l'API financière et des feature flags
  useEffect(() => {
    if (apiCall) {
      // Initialiser financialApi avec la fonction apiCall de AuthContext
      initFinancialApi(apiCall);
    }
  }, [apiCall]);

  // Initialisation des feature flags et sauvegarde des réponses
  useEffect(() => {
    const initializeApp = async () => {
      // Initialiser les feature flags avec les données utilisateur
      await featureFlags.initialize(userData);
      setIsInitialized(true);
    };

    initializeApp();
  }, [userData]);

  // Auto-diagnostic pour détecter l'écran noir
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      autoDiagnose();
    }
  }, []);

  // Sauvegarde des réponses
  useEffect(() => {
    saveToLocalStorage('userAnswers', answers);
  }, [answers]);

  // Animation du cercle de progression
  useEffect(() => {
    if (currentScreen === 'home') {
      const timer = setTimeout(() => {
        setProgress((userData.savedAmount / userData.monthlyGoal) * 100);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, userData]);

  // Utilisation d'un plan
  const usePlan = useCallback(
    (plan, category) => {
      if (!userData.isPremium && userData.plansUsedThisMonth >= 5) {
        notificationSystem.warning('Limite atteinte ! Passez Premium pour continuer');
        return false;
      }

      setUserData(prev => ({
        ...prev,
        plansUsedThisMonth: prev.plansUsedThisMonth + 1
      }));

      // Tracking pour développement
      if (process.env.NODE_ENV === 'development') {
        console.log('Plan usage tracked:', {
          planId: plan.id,
          category,
          timestamp: Date.now(),
          userProfile: answers
        });
      }

      const savingAmount = parseInt(plan.savings) || 10;
      addTransaction(savingAmount, category, plan.title);

      notificationSystem.success(`Plan activé ! ${plan.title}`);
      return true;
    },
    [userData, answers, addTransaction, notificationSystem, setUserData]
  );

  // Optimisation avec useMemo pour éviter les re-calculs
  const categoryConfig = useMemo(() => ({
    alimentation: { icon: '👨‍🍳', title: 'Alimentation' },
    habits: { icon: '👕', title: 'Habits' },
    activite: { icon: '🎭', title: 'Activités' },
    deplacement: { icon: '🚗', title: 'Déplacements' }
  }), []);

  // Rendu conditionnel des écrans - optimisé avec useMemo
  const renderScreen = useMemo(() => {
    // Fallback d'urgence si currentScreen est invalide
    if (!currentScreen || currentScreen === 'undefined') {
      console.warn('🚨 currentScreen invalide, fallback vers home');
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">+Clair</h1>
            <p className="mb-4">Chargement en cours...</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Redémarrer l'app
            </button>
          </div>
        </div>
      );
    }

    switch (currentScreen) {
      case 'landing':
        return <LandingPage />;

      case 'debug':
        return (
          <div className="min-h-screen bg-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">🔧 +Clair Debug</h1>
            <div className="space-y-4">
              <p>Current Screen: {currentScreen}</p>
              <p>Dark Mode: {darkMode ? 'Activé' : 'Désactivé'}</p>
              <p>Initialized: {isInitialized ? 'Oui' : 'Non'}</p>
              <button
                onClick={() => setCurrentScreen('home')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg"
              >
                Aller à l'accueil
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-6 py-3 bg-red-500 text-white rounded-lg ml-4"
              >
                Reset complet
              </button>
            </div>
          </div>
        );

      case 'onboarding':
        return (
          <OnboardingManager
            darkMode={darkMode}
            setUserData={setUserData}
            userData={userData}
            showNotification={notificationSystem.showNotification}
          />
        );

      case 'finance':
        return (
          <FinancePage
            userData={userData}
            darkMode={darkMode}
          />
        );

      case 'activity':
      case 'activite':  // Support ancien nom français
        return (
          <ActivityScreen
            darkMode={darkMode}
          />
        );

      case 'habits':
        return (
          <HabitsScreen
            userData={userData}
            setUserData={setUserData}
            usePlan={usePlan}
            showNotification={notificationSystem.showNotification}
            addTransaction={addTransaction}
            darkMode={darkMode}
          />
        );

      case 'alimentation':
        return (
          <AlimentationScreen
            userData={userData}
            setUserData={setUserData}
            usePlan={usePlan}
            showNotification={notificationSystem.showNotification}
            addTransaction={addTransaction}
            darkMode={darkMode}
          />
        );

      case 'deplacement':
        return (
          <DeplacementScreen
            userData={userData}
            setUserData={setUserData}
            usePlan={usePlan}
            showNotification={notificationSystem.showNotification}
            addTransaction={addTransaction}
            darkMode={darkMode}
          />
        );

      case 'expenses-detail':
        return (
          <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
            <ExpensesDetailScreen darkMode={darkMode} />
          </div>
        );

      case 'income-detail':
        return (
          <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
            <IncomeDetailScreen darkMode={darkMode} />
          </div>
        );

      case 'suggestions-detail':
        return (
          <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
            <SuggestionsDetailScreen darkMode={darkMode} />
          </div>
        );

      case 'progression-detail':
        return (
          <ProgressionDetailScreen userData={userData} darkMode={darkMode} />
        );

      case 'profile':
        return (
          <Profile
            darkMode={darkMode}
          />
        );

      case 'home':
        if (currentCategory) {
          const config = categoryConfig[currentCategory];

          return (
            <CategoryScreen
              category={currentCategory}
              icon={config.icon}
              title={config.title}
              setCurrentCategory={setCurrentCategory}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              getAISuggestions={aiSuggestionsHook.getAISuggestions}
              userData={userData}
              setUserData={setUserData}
              usePlan={usePlan}
              notificationSystem={notificationSystem}
              addTransaction={addTransaction}
              removeTransaction={removeTransaction}
              showRecipeDetail={showRecipeDetail}
              setShowRecipeDetail={setShowRecipeDetail}
              suggestionsCache={suggestionsCache}
              setSuggestionsCache={setSuggestionsCache}
              answers={answers}
            />
          );
        }

        return (
          <HomeScreen
            userData={userData}
            setUserData={setUserData}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setCurrentCategory={setCurrentCategory}
            transactions={transactions}
            addTransaction={addTransaction}
            removeTransaction={removeTransaction}
            progress={progress}
          />
        );

      default:
        console.warn(`🚨 Écran inconnu: ${currentScreen}. Redirection vers home.`);
        // Corriger automatiquement et rediriger vers home
        setTimeout(() => setCurrentScreen('home'), 100);
        return (
          <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">+Clair</h1>
              <p className="mb-4">Écran "{currentScreen}" non trouvé</p>
              <p className="text-sm text-gray-500 mb-4">Redirection vers l'accueil...</p>
              <button
                onClick={() => setCurrentScreen('home')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Aller à l'accueil
              </button>
            </div>
          </div>
        );
    }
  }, [currentScreen, setCurrentScreen, darkMode, currentCategory, categoryConfig, userData, notificationSystem, aiSuggestionsHook, usePlan, addTransaction, removeTransaction, showRecipeDetail, suggestionsCache, answers, transactions, progress, setUserData, setDarkMode, setCurrentCategory, setShowRecipeDetail, setSuggestionsCache]);

  // Loading pendant l'initialisation
  if (!isInitialized) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Initialisation..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ChunkErrorBoundary>
        <AppProvider>
          <ThemeProvider>
            <div className="max-w-md mx-auto bg-white dark:bg-black min-h-screen relative font-system transition-colors duration-300" style={{minHeight: '100vh', backgroundColor: darkMode ? '#000000' : '#ffffff'}}>
          <style jsx>{`
            @keyframes slide-down {
              from { transform: translateY(-100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from { transform: translateX(-10px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-down { animation: slide-down 0.3s ease-out; }
            .animate-float { animation: float 3s ease-in-out infinite; }
            .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
            .animate-slideIn { animation: slideIn 0.3s ease-out; }
            .font-system { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          `}</style>

          <Notifications
            notifications={notificationSystem.notifications}
            onDismiss={notificationSystem.dismissNotification}
          />

          {/* PWA Manager pour fonctionnalités natives */}
          <PWAManager />

          <Suspense fallback={<SuspenseFallback component="l'application" fullScreen={true} />}>
            {renderScreen}
          </Suspense>

          {/* Feature Flags Debug - Développement uniquement */}
          <FeatureGate flag="dev.debug_mode">
            <Suspense fallback={<SuspenseFallback component="les outils de debug" />}>
              <FeatureFlagsDebug userData={userData} />
            </Suspense>
          </FeatureGate>
              </div>
            </ThemeProvider>
        </AppProvider>
      </ChunkErrorBoundary>
    </ErrorBoundary>
  );
}

// Composant racine avec NavigationProvider et AuthProvider
export default function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NavigationProvider>
  );
}
