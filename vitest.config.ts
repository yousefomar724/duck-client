import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    setupFiles: ['./tests/setup/env.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/server/**'],
      exclude: ['**/*.d.ts', 'src/server/models/**'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 38,
        statements: 45,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./tests/setup/env.ts', './tests/setup/dom.tsx'],
          include: ['tests/components/**/*.test.tsx', 'tests/stores/**/*.test.ts', 'tests/client/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api',
          environment: 'node',
          globalSetup: ['./tests/setup/mongo.global.ts'],
          setupFiles: ['./tests/setup/env.ts', './tests/setup/db.ts'],
          include: ['tests/api/**/*.test.ts'],
          testTimeout: 30_000,
          fileParallelism: false,
          sequence: { concurrent: false },
        },
      },
    ],
  },
});
