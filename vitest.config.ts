import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // Default node env keeps lib tests fast; React tests opt into jsdom
  // per-file with `// @vitest-environment jsdom`.
  test: { environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
