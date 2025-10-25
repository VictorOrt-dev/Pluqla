import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from './utils/storage';
import { INITIAL_ANSWERS } from './utils/constants';
import { useUserData } from './hooks/useUserData';
import { useNotifications } from './hooks/useNotifications';
import { useTransactions } from './hooks/useTransactions';
import { useAISuggestions } from './hooks/useAISuggestions';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { ToastProvider } from './components/common/PluqlaToast';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './config/queryClient';
import { initFinancialApi } from './services/financialApi';
import { featureFlags, FeatureGate } from './utils/featureFlags';
import Notifications from './components/common/Notifications';
import LoadingSpinner from './components/common/LoadingSpinner';
import SuspenseFallback from './components/common/SuspenseFallback';
import ErrorBoundary from './components/common/ErrorBoundary';
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary';
import PWAManager from './components/common/PWAManager';
import OfflineIndicator from './components/common/OfflineIndicator';
import { PerformanceDebugPanel, ProfilerWrapper, usePageLoadTracking } from './components/common/PerformanceProfiler';
import './styles/animations.css';
import './styles/unified-theme.css';

// Lazy loading des composants lourds pour optimisation bundle
const LandingPage = React.lazy(() => import('./components/landing/LandingPage'));
const OnboardingManager = React.lazy(() => import('./components/onboarding/OnboardingManager'));
const HomeScreen = React.lazy(() => import('./components/home/HomeScreen'));
const CategoryScreen = React.lazy(() => import('./components/category/CategoryScreen'));
const Profile = React.lazy(() => import('./components/profile/Profile'));
const FeatureFlagsDebug = React.lazy(() => import('./components/dev/FeatureFlagsDebug'));

// Lazy loading des pages et écrans
const FinancePage = React.lazy(() => import('./pages/FinancePage'));
const ActivityScreen = React.lazy(() => import('./screens/ActivityScreen'));
const HabitsScreen = React.lazy(() => import('./screens/HabitsScreen'));
const AlimentationScreen = React.lazy(() => import('./screens/AlimentationScreenNew')); // ✨ Updated to new API-based screen
const AlimentationScreenLegacy = React.lazy(() => import('./screens/AlimentationScreen')); // Legacy version (backup)
const DeplacementScreen = React.lazy(() => import('./screens/DeplacementScreen'));

// Lazy loading des écrans de détail
const ExpensesDetailScreen = React.lazy(() => import('./components/finance/ExpensesDetailScreen'));
const IncomeDetailScreen = React.lazy(() => import('./components/finance/IncomeDetailScreen'));
const SuggestionsDetailScreen = React.lazy(() => import('./components/finance/SuggestionsDetailScreen'));
const ProgressionDetailScreen = React.lazy(() => import('./components/progression/ProgressionDetailScreen'));

// Lazy loading auth screens
const LoginScreen = React.lazy(() => import('./components/auth/LoginScreen'));

// Composant principal de l'app qui utilise NavigationContext et AuthContext
function AppContent() {
  const { currentScreen, setCurrentScreen } = useNavigation();
  const { apiCall, isAuthenticated, authState, AUTH_STATES } = useAuth();
  const [darkMode, setDarkMode] = useState(true);

  // Track page load performance
  usePageLoadTracking(currentScreen);
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

  // 🔒 Gestion session expirée → redirection login
  useEffect(() => {
    if (!isAuthenticated && authState === AUTH_STATES.UNAUTHENTICATED) {
      const wasAuthenticated = localStorage.getItem('accessToken');

      // Si l'utilisateur avait un token mais n'est plus authentifié = session expirée
      if (wasAuthenticated && currentScreen !== 'login' && currentScreen !== 'landing' && currentScreen !== 'onboarding') {
        notificationSystem.warning('Session expirée. Veuillez vous reconnecter.');
        setCurrentScreen('login');
      }
    }
  }, [isAuthenticated, authState, AUTH_STATES.UNAUTHENTICATED, currentScreen, setCurrentScreen, notificationSystem]);

  // Simplified authentication-based navigation
  useEffect(() => {
    if (isAuthenticated && authState === AUTH_STATES.AUTHENTICATED) {
      // If user is authenticated but still on landing/login, redirect to home
      if (currentScreen === 'landing' || currentScreen === 'login') {
        setCurrentScreen('home');
      }
    }

    // If user is not authenticated and not on public screens, redirect to landing
    if (!isAuthenticated && authState === AUTH_STATES.UNAUTHENTICATED) {
      const publicScreens = ['landing', 'login', 'register'];
      if (!publicScreens.includes(currentScreen)) {
        setCurrentScreen('landing');
      }
    }
  }, [isAuthenticated, authState, AUTH_STATES.AUTHENTICATED, currentScreen, setCurrentScreen]);


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
        console.log('Plan used:', {
          planId: plan.id,
          category,
          timestamp: Date.now(),
          userProfile: answers,
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
            <h1 className="text-2xl font-bold mb-4">Pluqla</h1>
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
      case 'debug':
        return (
          <div className="min-h-screen bg-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">🔧 Pluqla Debug</h1>
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
          <Suspense fallback={<SuspenseFallback component="la page Finance" fullScreen={true} />}>
            <FinancePage
              userData={userData}
              darkMode={darkMode}
            />
          </Suspense>
        );


      case 'activity':
      case 'activite':  // Support ancien nom français
        return (
          <Suspense fallback={<SuspenseFallback component="l'écran Activité" fullScreen={true} />}>
            <ActivityScreen
              darkMode={darkMode}
            />
          </Suspense>
        );

      case 'habits':
        return (
          <Suspense fallback={<SuspenseFallback component="l'écran Habits" fullScreen={true} />}>
            <HabitsScreen
              userData={userData}
              setUserData={setUserData}
              usePlan={usePlan}
              showNotification={notificationSystem.showNotification}
              addTransaction={addTransaction}
              darkMode={darkMode}
            />
          </Suspense>
        );

      case 'alimentation':
        return (
          <Suspense fallback={<SuspenseFallback component="l'écran Alimentation" fullScreen={true} />}>
            <AlimentationScreen
              showNotification={notificationSystem.showNotification}
              darkMode={darkMode}
            />
          </Suspense>
        );

      case 'deplacement':
        return (
          <Suspense fallback={<SuspenseFallback component="l'écran Déplacement" fullScreen={true} />}>
            <DeplacementScreen
              userData={userData}
              setUserData={setUserData}
              usePlan={usePlan}
              showNotification={notificationSystem.showNotification}
              addTransaction={addTransaction}
              darkMode={darkMode}
            />
          </Suspense>
        );

      case 'expenses-detail':
        return (
          <Suspense fallback={<SuspenseFallback component="les détails des dépenses" fullScreen={true} />}>
            <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
              <ExpensesDetailScreen darkMode={darkMode} />
            </div>
          </Suspense>
        );

      case 'income-detail':
        return (
          <Suspense fallback={<SuspenseFallback component="les détails des revenus" fullScreen={true} />}>
            <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
              <IncomeDetailScreen darkMode={darkMode} />
            </div>
          </Suspense>
        );

      case 'suggestions-detail':
        return (
          <Suspense fallback={<SuspenseFallback component="les suggestions" fullScreen={true} />}>
            <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
              <SuggestionsDetailScreen darkMode={darkMode} />
            </div>
          </Suspense>
        );

      case 'progression-detail':
        return (
          <Suspense fallback={<SuspenseFallback component="la progression" fullScreen={true} />}>
            <ProgressionDetailScreen userData={userData} darkMode={darkMode} />
          </Suspense>
        );

      case 'profile':
        return (
          <Suspense fallback={<SuspenseFallback component="le profil" fullScreen={true} />}>
            <Profile
              darkMode={darkMode}
            />
          </Suspense>
        );

      case 'login':
        return (
          <Suspense fallback={<SuspenseFallback component="la page de connexion" fullScreen={true} />}>
            <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
              <LoginScreen darkMode={darkMode} />
            </div>
          </Suspense>
        );

      case 'landing':
        return (
          <Suspense fallback={<SuspenseFallback component="la page d'accueil" fullScreen={true} />}>
            <LandingPage />
          </Suspense>
        );

      case 'home':
        if (currentCategory) {
          const config = categoryConfig[currentCategory];

          return (
            <Suspense fallback={<SuspenseFallback component="la catégorie" fullScreen={true} />}>
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
            </Suspense>
          );
        }

        return (
          <Suspense fallback={<SuspenseFallback component="l'écran d'accueil" fullScreen={true} />}>
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
          </Suspense>
        );

      default: {
        const availableScreens = [
          'debug', 'onboarding', 'finance', 'activity', 'activite', 'habits',
          'alimentation', 'deplacement', 'expenses-detail', 'income-detail',
          'suggestions-detail', 'progression-detail', 'profile', 'login', 'landing', 'home'
        ];
        console.error(`🚨 Écran inconnu: ${currentScreen}. Redirection vers home.`, {
          currentScreen,
          isAuthenticated,
          authState,
          availableScreens,
          timestamp: Date.now()
        });
        // Corriger automatiquement et rediriger vers home
        setTimeout(() => setCurrentScreen('home'), 100);
        return (
          <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Pluqla</h1>
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
    }
  }, [currentScreen, setCurrentScreen, darkMode, currentCategory, categoryConfig, userData, notificationSystem, aiSuggestionsHook, usePlan, addTransaction, removeTransaction, showRecipeDetail, suggestionsCache, answers, transactions, progress, setUserData, setDarkMode, setCurrentCategory, setShowRecipeDetail, setSuggestionsCache, isInitialized]);

  // Loading pendant l'initialisation ou la vérification d'authentification
  if (!isInitialized || authState === AUTH_STATES.LOADING) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Initialisation..." />
      </div>
    );
  }

  // 🎯 FLUX OPTIMISÉ SELON SPÉCIFICATIONS

  // Si utilisateur AUTHENTIFIÉ - permettre toutes les navigations d'écrans authentifiés
  if (isAuthenticated) {

    // Liste des écrans autorisés pour les utilisateurs authentifiés
    const authenticatedScreens = [
      'home', 'finance', 'activity', 'activite', 'habits', 'alimentation',
      'deplacement', 'expenses-detail', 'income-detail', 'suggestions-detail',
      'progression-detail', 'profile', 'debug'
    ];

    // Si pas sur un écran autorisé, rediriger vers home
    if (!authenticatedScreens.includes(currentScreen)) {
      setTimeout(() => setCurrentScreen('home'), 100);
      return (
        <div className="max-w-md mx-auto bg-white dark:bg-black min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" message="Redirection vers votre tableau de bord..." />
        </div>
      );
    }

    // Afficher l'écran approprié pour l'utilisateur authentifié
    return (
      <>
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
        <div className="max-w-md mx-auto bg-white dark:bg-black min-h-screen relative font-system transition-colors duration-300" style={{minHeight: '100vh', backgroundColor: darkMode ? '#000000' : '#ffffff'}}>
          <Notifications
            notifications={notificationSystem.notifications}
            onDismiss={notificationSystem.dismissNotification}
          />
          <PWAManager />
          <OfflineIndicator />
          <Suspense fallback={<SuspenseFallback component="l'application" fullScreen={true} />}>
            {renderScreen}
          </Suspense>
          <FeatureGate flag="dev.debug_mode">
            <Suspense fallback={<SuspenseFallback component="les outils de debug" />}>
              <FeatureFlagsDebug userData={userData} />
            </Suspense>
          </FeatureGate>
        </div>
      </>
    );
  } else {
    // Si utilisateur NON AUTHENTIFIÉ → gestion des écrans publics

    // Cas spécial : token présent mais pas encore vérifié par AuthContext
    const hasToken = localStorage.getItem('token') || localStorage.getItem('accessToken');

    if (hasToken && authState === AUTH_STATES.LOADING) {
      return (
        <div className="max-w-md mx-auto bg-white dark:bg-black min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" message="Connexion en cours..." />
        </div>
      );
    }

    // Si on a un token et qu'on est sur home, permettre l'affichage (cas après onboarding)
    if (hasToken && currentScreen === 'home') {
      // Afficher temporairement l'écran home en attendant la vérification d'auth
      return (
        <>
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
          <div className="max-w-md mx-auto bg-white dark:bg-black min-h-screen relative font-system transition-colors duration-300" style={{minHeight: '100vh', backgroundColor: darkMode ? '#000000' : '#ffffff'}}>
            <Notifications
              notifications={notificationSystem.notifications}
              onDismiss={notificationSystem.dismissNotification}
            />
            <PWAManager />
            <OfflineIndicator />
            <Suspense fallback={<SuspenseFallback component="l'application" fullScreen={true} />}>
              {renderScreen}
            </Suspense>
          </div>
        </>
      );
    }

    // Écrans accessibles aux non-connectés
    switch (currentScreen) {
      case 'login':
        return (
          <div className="max-w-md mx-auto bg-white dark:bg-black min-h-screen relative font-system transition-colors duration-300" style={{minHeight: '100vh', backgroundColor: darkMode ? '#000000' : '#ffffff'}}>
            <Suspense fallback={<SuspenseFallback component="la page de connexion" fullScreen={true} />}>
              <LoginScreen darkMode={darkMode} />
            </Suspense>
          </div>
        );

      case 'onboarding':
        return (
          <div className="max-w-md mx-auto bg-white dark:bg-black min-h-screen relative font-system transition-colors duration-300" style={{minHeight: '100vh', backgroundColor: darkMode ? '#000000' : '#ffffff'}}>
            <Suspense fallback={<SuspenseFallback component="l'onboarding" fullScreen={true} />}>
              <OnboardingManager
                darkMode={darkMode}
                setUserData={setUserData}
                userData={userData}
                showNotification={notificationSystem.showNotification}
              />
            </Suspense>
          </div>
        );

      case 'landing':
      default:
        // 🏁 Landing Page Pluqla pour visiteurs


        return (
          <Suspense fallback={<SuspenseFallback component="la page d'accueil" fullScreen={true} />}>
            <LandingPage />
          </Suspense>
        );
    }
  }
}

// Composant racine avec tous les providers dans le bon ordre
export default function App() {
  return (
    <ErrorBoundary>
      <ChunkErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProvider position="top-right" maxToasts={3}>
            <NavigationProvider>
              <AuthProvider>
                <AppProvider>
                  <ThemeProvider>
                    <ProfilerWrapper id="App">
                      <AppContent />
                      <PerformanceDebugPanel />
                    </ProfilerWrapper>
                  </ThemeProvider>
                </AppProvider>
              </AuthProvider>
            </NavigationProvider>
          </ToastProvider>
          <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
        </QueryClientProvider>
      </ChunkErrorBoundary>
    </ErrorBoundary>
  );
}
