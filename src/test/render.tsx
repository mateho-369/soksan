import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import App from '../App';

/** Renders the real app at the given route (BrowserRouter reads location). */
export function renderAppAt(route = '/') {
  window.history.pushState({}, '', route);
  return render(<App />);
}

/** Pre-authenticates the demo user by seeding the bearer token. */
export function loginAsDemoUser() {
  localStorage.setItem('soksan-token', 'mock-token-3');
}

export { type ReactElement };
