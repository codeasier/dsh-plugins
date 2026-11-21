import { fileURLToPath } from 'node:url'

import { defineConfig } from 'tsdown'

// The shared kit is a source package: it is compiled into each plugin so an
// installed tarball has no dependency on an unpublished workspace package.
const kitSource = fileURLToPath(new URL('../plugin-kit/src/index.ts', import.meta.url))

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  fixedExtension: false,
  dts: true,
  sourcemap: true,
  alias: {
    '@codeasier/dsh-plugin-kit': kitSource,
  },
})
