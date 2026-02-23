// vite.config.ts — Fixed: basicSsl inside plugins, proper import

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.API_KEY || '';
  const useHttps = process.env.VITE_HTTPS === 'true';

  // ✅ Dynamically import only when HTTPS is needed
  const httpsPlugin = useHttps
    ? [(await import('@vitejs/plugin-basic-ssl')).default()]
    : [];

  return {
    plugins: [
      react(),
      ...httpsPlugin,   // ✅ Inside plugins array, not outside
    ],

    base: mode === 'production' ? '/Glyph-Circle/' : '/',

    server: {
      https: useHttps || undefined,   // ✅ Vite handles https: true automatically with basicSsl
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
      },
    },

    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    },
  };
});
