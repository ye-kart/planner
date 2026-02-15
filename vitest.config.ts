import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@planner/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@planner/ai': resolve(__dirname, 'packages/ai/src/index.ts'),
      '@planner/cli': resolve(__dirname, 'packages/cli/src/index.ts'),
      '@planner/tui': resolve(__dirname, 'packages/tui/src/index.ts'),
    },
  },
  test: {
    globals: true,
    testTimeout: 10000,
  },
});
