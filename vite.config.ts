/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

const API_ORIGIN = 'http://localhost:8000';

// These paths are both SPA pages (GET) and Laravel form endpoints (POST), so only POST is proxied.
const postOnlyProxy: ProxyOptions = {
  target: API_ORIGIN,
  bypass: (request) => (request.method === 'POST' ? undefined : '/index.html'),
};

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': API_ORIGIN,
      '/sanctum': API_ORIGIN,
      '/login': postOnlyProxy,
      '/logout': postOnlyProxy,
      '/forgot-password': postOnlyProxy,
      '/reset-password': postOnlyProxy,
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    execArgv: ['--no-experimental-webstorage'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:5173' } },
    setupFiles: ['src/tests/setupTest.ts'],
    testTimeout: 20000,
  },
}));
