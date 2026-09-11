import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration — the Phase-2 unit suite (audit Ch. 22).
 *
 * jsdom environment: most modules under test read/write localStorage and
 * touch document.head (SEO meta upserts); the setup file polyfills the
 * WebCrypto pieces jsdom lacks (subtle) from Node so the PBKDF2 password
 * tests run the real algorithm, not a mock.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // the repo's static-export build artifacts must never be picked up
    exclude: ['node_modules/**', '.next/**', 'dist/**'],
    restoreMocks: true,
  },
});
