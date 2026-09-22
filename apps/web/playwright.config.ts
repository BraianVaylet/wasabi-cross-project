import { defineConfig, devices } from '@playwright/test';

/*
 * E2E del flujo principal (F1-18, spec §10). Levanta la app entera: la API contra un Mongo
 * efímero y el front apuntando a ella.
 *
 * Puertos propios (3100 / 5174) para no pelearse con un `pnpm dev` abierto, y los dos en
 * 127.0.0.1: la cookie de sesión es del mismo sitio y viaja sin excepciones de SameSite.
 */

const API_PORT = 3100;
const WEB_PORT = 5174;
const API_URL = `http://127.0.0.1:${String(API_PORT)}`;
const WEB_URL = `http://127.0.0.1:${String(WEB_PORT)}`;

const enCI = process.env.CI !== undefined;

export default defineConfig({
  testDir: './e2e',
  // Una sola base para todos: los tests se cruzarían los datos si corrieran en paralelo.
  workers: 1,
  fullyParallel: false,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: enCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --filter @wasabi-cross/api dev:ephemeral',
      url: `${API_URL}/ready`,
      // El primer arranque puede bajarse el binario de mongod.
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { PORT: String(API_PORT), HOST: '127.0.0.1', WEB_ORIGIN: WEB_URL },
    },
    {
      // `--host 127.0.0.1` explícito: por defecto vite escucha en "localhost", que en
      // Windows resuelve a ::1 y deja el 127.0.0.1 de la cookie sin nadie atendiendo.
      command: `pnpm exec vite --host 127.0.0.1 --port ${String(WEB_PORT)} --strictPort`,
      url: WEB_URL,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: API_URL },
    },
  ],
});
