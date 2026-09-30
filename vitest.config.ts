import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Tests never boot a real WebGL map; SokSanMap imports maplibre-gl and
      // jsdom has no canvas/WebGL. Alias to a deterministic in-memory mock.
      'maplibre-gl/dist/maplibre-gl.css': new URL('./src/test/maplibre-mock.css', import.meta.url).pathname,
      'maplibre-gl': new URL('./src/test/maplibre-mock.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
