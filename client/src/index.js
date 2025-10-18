import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import './styles/accessibility.css';
import App from './App';
import { initWebVitalsMonitoring } from './utils/webVitalsMonitoring';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ⚡ Phase 3: Initialize Web Vitals monitoring with backend reporting
initWebVitalsMonitoring();