import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin in dev: cookies just work and the Gemini key never leaves the server.
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
