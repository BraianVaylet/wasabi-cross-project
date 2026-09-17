import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      // spec §10: coverage > 90%. El umbral rompe el build, no avisa.
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
