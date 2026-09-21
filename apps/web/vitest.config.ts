import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // El módulo virtual lo inyecta vite-plugin-pwa recién en el build; en los tests, un stub.
      'virtual:pwa-register/react': new URL('./src/test/pwa-register-stub.ts', import.meta.url)
        .pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/test/**'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
