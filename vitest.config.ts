import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // Default node env keeps lib tests fast; React tests opt into jsdom
  // per-file with `// @vitest-environment jsdom`.
  test: { environment: 'node' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
