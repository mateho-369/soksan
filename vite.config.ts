import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Phase 0 hardening — PRODUCTION Content Security Policy.
 *
 * `index.html` carries a permissive DEVELOPMENT CSP (Vite HMR needs
 * 'unsafe-inline' scripts and ws: sockets). At build time the plugin below
 * swaps that meta tag for this hardened production CSP, so no dev-only
 * directive can ever ship. `frame-ancestors` cannot be set via meta tags;
 * it is enforced by public/_headers (Cloudflare Pages) and
 * deploy/nginx.conf.example. The same string is duplicated in those files on
 * purpose — CDNs need the header form; keep them in sync when editing.
 */
export const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // MapLibre injects style elements at runtime; no other inline styles are
  // required by the app itself.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // Demo media (picsum/Google sample bucket) plus Cloudflare R2 media.
  "img-src 'self' data: blob: https://picsum.photos https://*.picsum.photos https://commondatastorage.googleapis.com https://*.r2.cloudflarestorage.com",
  "media-src 'self' blob: https://commondatastorage.googleapis.com https://*.r2.cloudflarestorage.com",
  // No ws:/wss: — the production app uses no WebSockets. Map tiles and R2
  // fetches are the only third-party connections.
  "connect-src 'self' https://tiles.openfreemap.org https://*.openfreemap.org https://*.r2.cloudflarestorage.com",
  // Service worker (Phase 6 offline shell) + MapLibre web workers.
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

/** Swap the dev CSP meta tag for the production one during `vite build`. */
function productionCspPlugin(): Plugin {
  return {
    name: 'soksan-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")[^"]*(")/,
        (_match, open: string, close: string) => `${open}${PRODUCTION_CSP}${close}`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss(), productionCspPlugin()];

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    server: {
      host: true,
      // Preview environments serve the app from generated hostnames.
      allowedHosts: true as const,
      // In Docker the frontend dev server proxies /api to the Laravel service.
      proxy: env.VITE_DEV_PROXY
        ? { '/api': { target: env.VITE_DEV_PROXY, changeOrigin: true } }
        : undefined,
    },
    build: {
      // MapLibre GL ships ~1 MB minified; it lives in its own lazy-loaded
      // chunk (see manualChunks below), so the raised limit is deliberate.
      chunkSizeWarningLimit: 1100,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            // MapLibre is heavy; keep it out of the main chunk so the feed
            // loads fast and only map screens pay the cost.
            map: ['maplibre-gl'],
          },
        },
      },
    },
  };
})
