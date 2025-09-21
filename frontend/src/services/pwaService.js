// Service PWA pour gestion hors-ligne, notifications et installation
// Impact: Expérience native, rétention utilisateur, fonctionnement hors-ligne
// Intégré avec: Service Worker, notifications, analytics

import { analyticsService } from './analyticsService';

class PWAService {
  constructor() {
    this.registration = null;
    this.deferredPrompt = null;
    this.isOnline = navigator.onLine;
    this.isInstalled = false;
    this.notificationPermission = 'default';

    this.init();
  }

  // Initialisation du service PWA
  async init() {
    try {
      // Enregistrer le service worker
      await this.registerServiceWorker();

      // Configurer les événements PWA
      this.setupInstallPrompt();
      this.setupNetworkListeners();
      this.setupNotificationHandlers();

      // Vérifier l'état d'installation
      this.checkInstallationStatus();

      console.log('🎉 Service PWA initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation PWA:', error);
    }
  }

  // Enregistrement du service worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('✅ Service Worker enregistré:', this.registration.scope);

        // Écouter les mises à jour
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.notifyUpdate();
              }
            });
          }
        });

        // Analytics
        analyticsService.trackUserAction('service_worker_registered', 'pwa');

        return this.registration;
      } catch (error) {
        console.error('❌ Erreur enregistrement Service Worker:', error);
        analyticsService.trackError(error, 'service_worker_registration');
        throw error;
      }
    } else {
      console.warn('⚠️ Service Worker non supporté');
    }
  }

  // Configuration du prompt d'installation
  setupInstallPrompt() {
    // Capturer l'événement beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;

      console.log('📱 Prompt d\'installation PWA capturé');
      analyticsService.trackUserAction('install_prompt_available', 'pwa');

      // Déclencher automatiquement après un délai
      setTimeout(() => {
        this.suggestInstall();
      }, 30000); // 30 secondes
    });

    // Détecter l'installation réussie
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installée avec succès !');
      this.isInstalled = true;
      this.deferredPrompt = null;

      analyticsService.trackUserAction('pwa_installed', 'pwa');
      this.showInstallSuccessMessage();
    });
  }

  // Écouter les changements de connectivité
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Connexion rétablie');

      analyticsService.trackUserAction('connection_restored', 'network');
      this.showConnectionRestored();

      // Déclencher la synchronisation
      this.triggerBackgroundSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Mode hors-ligne');

      analyticsService.trackUserAction('connection_lost', 'network');
      this.showOfflineMessage();
    });
  }

  // Configuration des notifications
  setupNotificationHandlers() {
    // Vérifier le support des notifications
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;

      if (this.notificationPermission === 'default') {
        // Demander la permission après un délai
        setTimeout(() => {
          this.requestNotificationPermission();
        }, 60000); // 1 minute
      }
    }
  }

  // Vérifier l'état d'installation
  checkInstallationStatus() {
    // Vérifier si l'app est lancée depuis l'écran d'accueil
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('📱 Application lancée en mode standalone');
      analyticsService.trackUserAction('launched_standalone', 'pwa');
    }

    // Vérifier via l'API navigator
    if (navigator.getInstalledRelatedApps) {
      navigator.getInstalledRelatedApps().then(relatedApps => {
        if (relatedApps.length > 0) {
          this.isInstalled = true;
        }
      });
    }
  }

  // === MÉTHODES PUBLIQUES ===

  // Proposer l'installation
  async suggestInstall() {
    if (!this.deferredPrompt) {
      console.log('❌ Aucun prompt d\'installation disponible');
      return false;
    }

    try {
      analyticsService.trackUserAction('install_prompt_shown', 'pwa');

      // Afficher le prompt natif
      this.deferredPrompt.prompt();

      // Attendre la réponse de l'utilisateur
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log(`📱 Réponse installation: ${outcome}`);
      analyticsService.trackUserAction('install_prompt_response', 'pwa', { outcome });

      if (outcome === 'accepted') {
        console.log('✅ Installation acceptée');
      } else {
        console.log('❌ Installation refusée');
      }

      this.deferredPrompt = null;
      return outcome === 'accepted';

    } catch (error) {
      console.error('❌ Erreur lors du prompt d\'installation:', error);
      analyticsService.trackError(error, 'install_prompt');
      return false;
    }
  }

  // Forcer l'installation manuelle
  showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let instructions = '';

    if (isIOS) {
      instructions = `
        <div class="install-instructions ios">
          <h3>📱 Installer +Clair sur iOS</h3>
          <ol>
            <li>Appuyez sur l'icône de partage 📤</li>
            <li>Sélectionnez "Sur l'écran d'accueil"</li>
            <li>Appuyez sur "Ajouter"</li>
          </ol>
        </div>
      `;
    } else if (isAndroid) {
      instructions = `
        <div class="install-instructions android">
          <h3>📱 Installer +Clair sur Android</h3>
          <ol>
            <li>Ouvrez le menu du navigateur ⋮</li>
            <li>Sélectionnez "Installer l'application"</li>
            <li>Confirmez l'installation</li>
          </ol>
        </div>
      `;
    } else {
      instructions = `
        <div class="install-instructions desktop">
          <h3>💻 Installer +Clair sur desktop</h3>
          <ol>
            <li>Cliquez sur l'icône d'installation dans la barre d'adresse</li>
            <li>Ou utilisez le menu Chrome > "Installer +Clair"</li>
          </ol>
        </div>
      `;
    }

    // Afficher dans une modal ou notification
    this.showInstallModal(instructions);

    analyticsService.trackUserAction('install_instructions_shown', 'pwa', {
      platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
    });
  }

  // Demander permission notifications
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications non supportées');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;

      console.log(`🔔 Permission notifications: ${permission}`);
      analyticsService.trackUserAction('notification_permission_request', 'notifications', {
        permission
      });

      if (permission === 'granted') {
        this.setupPushNotifications();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur demande permission notifications:', error);
      return false;
    }
  }

  // Configuration push notifications
  async setupPushNotifications() {
    if (!this.registration || !this.registration.pushManager) {
      console.warn('⚠️ Push Manager non disponible');
      return;
    }

    try {
      // Vérifier l'abonnement existant
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        // Créer un nouvel abonnement
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          // Clé VAPID publique - à remplacer par vraie clé
          applicationServerKey: this.urlBase64ToUint8Array(
            'BGxJEjsu8XDg3YZ_-KnWY7gA5NaKt1wgeDFJgJd5g6KKMwmq6LfE-wHKu2PNzXRdE_E2KUL5p7b8dQg3J3E9HQk'
          )
        });

        console.log('✅ Abonnement push créé');
      }

      // Envoyer l'abonnement au serveur (si besoin)
      this.sendSubscriptionToServer(subscription);

      analyticsService.trackUserAction('push_subscription_created', 'notifications');

    } catch (error) {
      console.error('❌ Erreur setup push notifications:', error);
      analyticsService.trackError(error, 'push_notification_setup');
    }
  }

  // Envoyer notification locale
  showNotification(title, options = {}) {
    if (this.notificationPermission !== 'granted') {
      console.warn('⚠️ Permission notifications non accordée');
      return;
    }

    const defaultOptions = {
      body: '',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'general',
      requireInteraction: false,
      silent: false
    };

    const notificationOptions = { ...defaultOptions, ...options };

    if (this.registration) {
      // Utiliser le service worker pour les notifications
      this.registration.showNotification(title, notificationOptions);
    } else {
      // Fallback notification native
      new Notification(title, notificationOptions);
    }

    analyticsService.trackUserAction('notification_shown', 'notifications', {
      title,
      tag: notificationOptions.tag
    });
  }

  // Déclencher synchronisation en arrière-plan
  async triggerBackgroundSync() {
    if (!this.registration || !this.registration.sync) {
      console.warn('⚠️ Background Sync non supporté');
      return;
    }

    try {
      await this.registration.sync.register('background-sync');
      console.log('🔄 Synchronisation en arrière-plan programmée');

      analyticsService.trackUserAction('background_sync_triggered', 'sync');
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
    }
  }

  // === MÉTHODES DE CACHE ===

  // Précharger ressources importantes
  async prefetchResources(urls) {
    if (!this.registration || !this.registration.active) {
      console.warn('⚠️ Service Worker non actif');
      return;
    }

    try {
      for (const url of urls) {
        this.registration.active.postMessage({
          type: 'PREFETCH_RESOURCE',
          url
        });
      }

      console.log(`⚡ Préchargement de ${urls.length} ressources`);
      analyticsService.trackUserAction('resources_prefetched', 'cache', { count: urls.length });

    } catch (error) {
      console.error('❌ Erreur préchargement:', error);
    }
  }

  // Vider le cache
  async clearCache(cacheType = 'all') {
    if (!this.registration || !this.registration.active) {
      console.warn('⚠️ Service Worker non actif');
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'CLEAR_CACHE',
        cacheType
      });

      console.log(`🗑️ Cache ${cacheType} vidé`);
      analyticsService.trackUserAction('cache_cleared', 'cache', { cacheType });

    } catch (error) {
      console.error('❌ Erreur vidage cache:', error);
    }
  }

  // === UTILITAIRES ===

  // Convertir clé VAPID
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Envoyer abonnement au serveur
  sendSubscriptionToServer(subscription) {
    // Placeholder - implémenter selon l'architecture backend
    console.log('📤 Abonnement à envoyer au serveur:', subscription);
  }

  // === MÉTHODES D'INTERFACE UTILISATEUR ===

  // Message de connexion rétablie
  showConnectionRestored() {
    this.showNotification('Connexion rétablie', {
      body: 'Vos données sont maintenant synchronisées',
      tag: 'connection',
      silent: true
    });
  }

  // Message mode hors-ligne
  showOfflineMessage() {
    this.showNotification('Mode hors-ligne', {
      body: 'Vos données restent accessibles',
      tag: 'offline',
      silent: true
    });
  }

  // Message installation réussie
  showInstallSuccessMessage() {
    this.showNotification('Installation réussie !', {
      body: '+Clair est maintenant installé sur votre appareil',
      tag: 'install-success'
    });
  }

  // Modal d'installation
  showInstallModal(content) {
    // Créer modal simple (ou intégrer avec système de modal existant)
    const modal = document.createElement('div');
    modal.className = 'install-modal';
    modal.innerHTML = `
      <div class="install-modal-backdrop">
        <div class="install-modal-content">
          ${content}
          <button onclick="this.closest('.install-modal').remove()">
            Fermer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Style inline basique
    const style = document.createElement('style');
    style.textContent = `
      .install-modal {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 9999; display: flex; align-items: center; justify-content: center;
      }
      .install-modal-backdrop {
        background: rgba(0,0,0,0.8); position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
      }
      .install-modal-content {
        background: white; padding: 2rem; border-radius: 12px;
        max-width: 400px; margin: 1rem; position: relative; z-index: 1;
      }
      .install-modal button {
        background: #10B981; color: white; padding: 0.75rem 1.5rem;
        border: none; border-radius: 6px; cursor: pointer; margin-top: 1rem;
      }
    `;
    document.head.appendChild(style);
  }

  // Notifier mise à jour disponible
  notifyUpdate() {
    this.showNotification('Mise à jour disponible', {
      body: 'Redémarrez l\'application pour la mettre à jour',
      tag: 'update',
      requireInteraction: true,
      actions: [
        { action: 'update', title: 'Mettre à jour' },
        { action: 'dismiss', title: 'Plus tard' }
      ]
    });
  }

  // === GETTERS ===

  get isOffline() {
    return !this.isOnline;
  }

  get canInstall() {
    return !!this.deferredPrompt;
  }

  get canNotify() {
    return this.notificationPermission === 'granted';
  }

  get installationStatus() {
    return {
      isInstalled: this.isInstalled,
      canInstall: this.canInstall,
      isOnline: this.isOnline,
      canNotify: this.canNotify
    };
  }
}

// Instance globale
export const pwaService = new PWAService();

// Hook React pour PWA
export const usePWA = () => {
  return {
    isOffline: pwaService.isOffline,
    isInstalled: pwaService.isInstalled,
    canInstall: pwaService.canInstall,
    canNotify: pwaService.canNotify,
    installationStatus: pwaService.installationStatus,

    suggestInstall: pwaService.suggestInstall.bind(pwaService),
    showInstallInstructions: pwaService.showInstallInstructions.bind(pwaService),
    requestNotificationPermission: pwaService.requestNotificationPermission.bind(pwaService),
    showNotification: pwaService.showNotification.bind(pwaService),
    prefetchResources: pwaService.prefetchResources.bind(pwaService),
    clearCache: pwaService.clearCache.bind(pwaService),
    triggerBackgroundSync: pwaService.triggerBackgroundSync.bind(pwaService)
  };
};