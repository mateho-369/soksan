import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installApi } from './lib/api';
import App from './App';
import './index.css';

installApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
