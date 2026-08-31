import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // Default node env keeps lib tests fast; React tests opt into jsdom
  // per-file with `// @vitest-environment jsdom`.
  test: { environment: 'node' },
  // import.meta.dirname avoids the deprecated __dirname escape that forces
  // Vite's legacy config loader (warning under Vite 8).
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
})
