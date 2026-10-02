/**
 * Phase 0 hardening — runtime guards for the demo seam and API base.
 *
 * The in-browser mock API (`src/lib/api.ts`) is a DEVELOPMENT/DEMO tool.
 * It must never be active in a production build:
 *
 *  - default in dev/test: seam ON (`npm run dev` works offline);
 *  - default in production: seam OFF, requests go to Laravel;
 *  - `VITE_USE_MOCK=true` in a production build is a HARD ERROR (fail fast
 *    on app boot instead of silently serving fake data to real users).
 */

const env = import.meta.env;

/**
 * Should the in-browser demo API handle /api requests?
 * Throws in production when someone explicitly opted the mock in.
 */
export function shouldUseMock(): boolean {
  if (env.VITE_USE_MOCK === 'true') {
    if (env.PROD) {
      throw new Error(
        '[SokSan] VITE_USE_MOCK=true is forbidden in production builds. ' +
          'The in-browser demo API must never ship to production. ' +
          'Set VITE_USE_MOCK=false (see .env.production) and serve the Laravel API at VITE_API_BASE_URL.',
      );
    }
    return true;
  }
  if (env.VITE_USE_MOCK === 'false') return false;
  // Unset: demo mode in development/tests, real API in production.
  return env.DEV;
}

/**
 * Production-only startup check: the app needs a reachable API base.
 * A relative base (default `/api/v1`) is fine IF the web server proxies it
 * to Laravel — that proxy is documented in docs/DEPLOYMENT.md, so a missing
 * variable is a warning, not an error.
 */
export function assertProductionRuntime(): void {
  if (!env.PROD) return;
  if (env.VITE_USE_MOCK === 'true') {
    throw new Error(
      '[SokSan] VITE_USE_MOCK=true is forbidden in production builds. ' +
        'The in-browser demo API must never ship to production. ' +
        'Set VITE_USE_MOCK=false (see .env.production) and serve the Laravel API at VITE_API_BASE_URL.',
    );
  }
  const base = env.VITE_API_BASE_URL;
  if (!base) {
    // eslint-disable-next-line no-console
    console.warn(
      '[SokSan] VITE_API_BASE_URL is not set; assuming the web server proxies ' +
        '/api/v1 to the Laravel API (see docs/DEPLOYMENT.md). Set it explicitly to silence this warning.',
    );
  } else if (base.startsWith('http://') && !base.startsWith('http://localhost')) {
    // eslint-disable-next-line no-console
    console.warn('[SokSan] VITE_API_BASE_URL uses plain http:// — production must use https://.');
  }
}
