import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import './styles/accessibility.css';
import App from './App';
import { initWebVitalsMonitoring } from './utils/webVitalsMonitoring';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
// ✨ Phase 8 - Sentry error tracking initialization
import { initSentry } from './config/sentry';

// Initialize Sentry BEFORE rendering the app
initSentry();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ⚡ Phase 3: Initialize Web Vitals monitoring with backend reporting
initWebVitalsMonitoring();

// ⚡ Phase 4A: Register Service Worker for offline mode
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('[PWA] App is ready to work offline');
  },
  onUpdate: (registration) => {
    console.log('[PWA] New content available, please refresh');
    // The OfflineIndicator component will handle the update UI
  },
  onOffline: () => {
    console.log('[PWA] App is offline, using cached content');
  },
  onOnline: () => {
    console.log('[PWA] App is back online');
  },
});