import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { assertProductionRuntime, shouldUseMock } from './lib/runtime';
import App from './App';
import './index.css';

/*
 * DEMO GUARD (Phase 0 hardening).
 *
 * The in-browser demo API serves every /api request in `npm run dev` and in
 * the test suite. In a production build this whole branch is removed by the
 * bundler (import.meta.env.PROD is statically replaced), so the demo seam
 * can never activate in production — and an explicit VITE_USE_MOCK=true in
 * a production build throws instead (see src/lib/runtime.ts).
 */
if (import.meta.env.PROD) {
  assertProductionRuntime();
} else if (shouldUseMock()) {
  const { installApi } = await import('./lib/api');
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
