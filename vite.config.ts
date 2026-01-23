
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure assets are loaded relatively so the app works on any domain/subdirectory (e.g. GitHub Pages)
  base: './', 
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 3000,
    host: true // Exposes the server to the network, allowing testing on mobile devices connected to the same WiFi
  }
});
