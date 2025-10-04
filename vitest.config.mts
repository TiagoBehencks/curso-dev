import { defineConfig } from 'vitest/config'

import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { expand } from 'dotenv-expand'
import { config } from 'dotenv'

expand(
  config({
    path: '.env.test',
  })
)

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    setupFiles: './tests/setup.ts',
    globals: true,
    fileParallelism: false,
    isolate: false,
    testTimeout: 60_000,
    hookTimeout: 30_000,
  },
})
