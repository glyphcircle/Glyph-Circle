import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.API_KEY || '';

  // ✅ Use mkcert certs if they exist, otherwise plain HTTP
  const certPath = resolve(__dirname, 'localhost.pem');
  const keyPath = resolve(__dirname, 'localhost-key.pem');
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

  return {
    plugins: [react()],

    base: mode === 'production' ? '/Glyph-Circle/' : '/',

    server: {
      // ✅ Only enable HTTPS if mkcert certs exist
      ...(hasCerts && {
        https: {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        },
      }),
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
