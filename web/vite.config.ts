import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = 'http://localhost:3999';

export default defineConfig({
  base: '/painel/',
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(
      ['/status', '/recent', '/run', '/stop', '/auto', '/unblock', '/post'].map((path) => [path, api]),
    ),
  },
});
