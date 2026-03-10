import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@vibe-media-lab/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'lib/step-actions/__tests__/**/*.test.ts',
      'lib/models/__tests__/**/*.test.ts',
      'lib/services/__tests__/**/*.test.ts',
      'lib/security/__tests__/**/*.test.ts',
      'lib/api/**/__tests__/**/*.test.ts',
      'app/api/**/__tests__/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'lib/step-actions/**/*.ts',
        'lib/models/**/*.ts',
        'lib/services/fal-client.ts',
      ],
      exclude: [
        'lib/step-actions/types.ts',
        'lib/step-actions/__tests__/**',
        'lib/models/types.ts',
        'lib/models/__tests__/**',
        'lib/services/__tests__/**',
      ],
    },
  },
})
