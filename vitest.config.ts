import { defineConfig } from 'vitest/config';

// Pure-function unit tests for src/lib/* — plain TS, no React components.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
