import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // mongodb-memory-server descarga y arranca un binario la primera vez.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Entrypoints: no tienen lógica propia, sólo cablean lo que ya está probado.
      exclude: ['src/**/*.test.ts', 'src/server.ts', 'src/scripts/**', 'src/test/**'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
