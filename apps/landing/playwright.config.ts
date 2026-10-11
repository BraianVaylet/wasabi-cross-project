import { defineConfig, devices } from '@playwright/test';
import {
  APP_URL,
  CONTACTO,
  DIST_CON_APP,
  DIST_SIN_APP,
  PUERTO_CON_APP,
  PUERTO_SIN_APP,
  URL_CON_APP,
  URL_SIN_APP,
} from './e2e/entorno.ts';

/*
 * E2E de la landing (F10-10, spec §10 y §11): el build servido por el **servidor de producción**
 * (`server/server.ts`, F10-11), a 390 y a 1280 px, en un Chromium de verdad. Es lo que mira lo que
 * jsdom y los tests del HTML no pueden: el contraste real (axe), el foco, las imágenes que cargan, las
 * quejas de la CSP en la consola y cuánto pesa lo que baja el navegador.
 *
 * Dos servidores, uno por modo de `PUBLIC_APP_URL` (con y sin app): cada uno compila su build y lo
 * sirve. Se levantan uno detrás del otro (comparten `.astro/`, y dos `astro build` a la vez se pisan).
 * Sin base de datos ni API: la landing no tiene backend.
 */

const enCI = process.env.CI !== undefined;

const build = 'pnpm exec astro build --outDir';

/** Las variables de build de un modo. Las vacías pisan las del entorno de quien corre el E2E. */
const sinVariables = {
  PUBLIC_APP_URL: '',
  PUBLIC_SITE_URL: '',
  PUBLIC_CONTACT_NAME: '',
  PUBLIC_CONTACT_EMAIL: '',
  LANDING_INDEXABLE: '',
};

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: enCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'con-app',
      testIgnore: 'sin-app.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: URL_CON_APP },
    },
    {
      name: 'sin-app',
      testMatch: 'sin-app.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: URL_SIN_APP },
    },
  ],

  webServer: [
    {
      // Con app, con quién responde (las páginas legales) y sin indexar, como staging.
      command: `${build} "${DIST_CON_APP}" && node server/server.ts`,
      url: `${URL_CON_APP}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...sinVariables,
        PUBLIC_APP_URL: APP_URL,
        PUBLIC_CONTACT_NAME: CONTACTO.nombre,
        PUBLIC_CONTACT_EMAIL: CONTACTO.email,
        PORT: String(PUERTO_CON_APP),
        HOST: '127.0.0.1',
        LANDING_DIST_DIR: DIST_CON_APP,
        LOG_LEVEL: 'silent',
      },
    },
    {
      // Sin app: lo que sale mientras la app no esté en producción (spec §5.7).
      command: `${build} "${DIST_SIN_APP}" && node server/server.ts`,
      url: `${URL_SIN_APP}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...sinVariables,
        PORT: String(PUERTO_SIN_APP),
        HOST: '127.0.0.1',
        LANDING_DIST_DIR: DIST_SIN_APP,
        LOG_LEVEL: 'silent',
      },
    },
  ],
});
