import { defineConfig } from 'tsdown'
import { clientBundle } from './build/client-bundle.ts'

const packageName = 'dsh-models-input-modalities'

/** Build the Host and browser faces directly from source. */
export default defineConfig([
  {
    name: packageName,
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    tsconfig: 'tsconfig.host.json',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      neverBundle: [/^@deepseek-ai\//, 'react'],
    },
  },
  clientBundle(packageName),
])
