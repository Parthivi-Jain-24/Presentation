import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiOrigin = process.env.API_ORIGIN || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: apiOrigin, changeOrigin: true },
      '/health': { target: apiOrigin, changeOrigin: true },
    },
  },
});
