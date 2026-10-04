/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/*
 * `getViteConfig` carga la configuración de Astro dentro de Vitest: así los tests de los
 * componentes (el Container API de Astro, F10-03) resuelven los `.astro` como el build.
 *
 * El coverage mide los `.ts`. Los `.astro` no los ve V8: se cubren con el Container API y con el
 * E2E (F10-10).
 */
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // El build real, una sola vez para los tests que miran su salida.
    globalSetup: ['./test/global-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
