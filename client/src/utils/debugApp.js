// Utilitaire de débogage pour diagnostiquer l'écran noir
export const debugApp = () => {
  console.log('🔍 DEBUG APP - État actuel:');

  // 1. Vérifier localStorage
  const localStorageKeys = Object.keys(localStorage);
  console.log('📦 LocalStorage keys:', localStorageKeys);

  localStorageKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value);
  });

  // 2. Vérifier l'état de navigation
  const currentScreen = localStorage.getItem('currentScreen');
  console.log('🧭 Current screen:', currentScreen);

  // 3. Vérifier si React s'est bien monté
  const rootElement = document.getElementById('root');
  console.log('🌳 Root element:', rootElement);
  console.log('🌳 Root innerHTML length:', rootElement?.innerHTML?.length || 0);

  // 4. Vérifier les erreurs console
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => {
    errors.push(args);
    originalError(...args);
  };

  return {
    localStorage: localStorageKeys,
    currentScreen,
    rootElement: !!rootElement,
    rootContent: rootElement?.innerHTML?.length || 0,
    errors
  };
};

// Nettoyer le localStorage problématique
export const clearProblemData = () => {
  console.log('🧹 Nettoyage des données problématiques...');

  // Supprimer les clés potentiellement corrompues
  const keysToRemove = [
    'currentScreen',
    'onboardingProgress',
    'userAnswers',
    'userData',
    'navigationHistory'
  ];

  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`  Suppression: ${key}`);
      localStorage.removeItem(key);
    }
  });

  // Forcer l'écran d'accueil
  localStorage.setItem('currentScreen', 'home');
  console.log('✅ Nettoyage terminé - Rechargez la page');
};

// Auto-diagnostic au chargement
export const autoDiagnose = () => {
  const debug = debugApp();

  // Si root est vide après 2 secondes, il y a un problème
  setTimeout(() => {
    const rootElement = document.getElementById('root');
    if (!rootElement?.innerHTML || rootElement.innerHTML.length < 100) {
      console.error('❌ ÉCRAN NOIR DÉTECTÉ - Root element vide');
      console.log('🔧 Lancement du nettoyage automatique...');
      clearProblemData();

      // Recharger après nettoyage
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.log('✅ App chargée correctement');
    }
  }, 2000);

  return debug;
};

// Rendre disponible globalement pour le debugging
if (typeof window !== 'undefined') {
  window.debugApp = debugApp;
  window.clearProblemData = clearProblemData;
  window.autoDiagnose = autoDiagnose;
}