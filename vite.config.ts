import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Rutas relativas: funciona en GitHub Pages (/FUTBOL-COACH-MANAGER/) y en cualquier subcarpeta
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
});
