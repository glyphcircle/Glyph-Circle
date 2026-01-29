
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to ensure access to cwd() if the environment's Process type is incomplete
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.API_KEY || '';

  return {
    plugins: [react()],
    base: './', 
    
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
    }
  };
});
