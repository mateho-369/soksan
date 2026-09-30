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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
