import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installApi } from './lib/api';
import App from './App';
import './index.css';

// The in-browser demo backend serves every /api request when no real API is
// configured. Against a real backend (Docker / production) set
// VITE_USE_MOCK=false so requests reach Laravel through /api/v1.
if (import.meta.env?.VITE_USE_MOCK !== 'false') {
  installApi();
}

// Phase 6 — offline app shell. Registered in production builds only: dev
// servers and tests should never be intercepted by a service worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline shell is progressive enhancement — the app works without it */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
