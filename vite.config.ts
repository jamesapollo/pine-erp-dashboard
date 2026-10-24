/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
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
});
