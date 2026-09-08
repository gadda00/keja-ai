import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // GitHub Pages subpath hosting (CI --base flag overrides when needed).
  // keja.app (Netlify) builds with VITE_BASE=/ so the same tree serves both.
  base: process.env.VITE_BASE ?? '/keja-ai/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
})
