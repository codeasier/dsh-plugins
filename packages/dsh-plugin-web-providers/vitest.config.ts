import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// Tests run before `pnpm build` in CI. Resolve the workspace package to its
// source so a clean checkout needs no prior build; the published package still
// resolves the built `dist/` entry.
export default defineConfig({
  resolve: {
    alias: {
      '@codeasier/dsh-plugin-kit': fileURLToPath(
        new URL('../plugin-kit/src/index.ts', import.meta.url),
      ),
    },
  },
})
