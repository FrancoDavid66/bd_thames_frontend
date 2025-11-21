// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración oficial de Vite + React sin plugins innecesarios
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
    hmr: {
      overlay: true,
    },
  },
  plugins: [react()],
});
