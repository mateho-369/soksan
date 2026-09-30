import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];

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
