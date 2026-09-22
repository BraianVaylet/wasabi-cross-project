import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

/*
 * E2E del flujo principal (F1-18, spec §10). Levanta la app entera contra un Mongo efímero,
 * de una de dos formas:
 *
 * - **Desarrollo** (`pnpm e2e`): la API y, aparte, el servidor de Vite apuntando a ella.
 * - **Producción** (`pnpm e2e:prod`, F3-05): el front compilado y servido por la API, en el
 *   mismo origen, como va a correr en Railway (ADR-0007). Es el que corre en CI.
 *
 * Puertos propios (3100 / 5174) para no pelearse con un `pnpm dev` abierto, todo en
 * 127.0.0.1: la cookie de sesión es del mismo sitio y viaja sin excepciones de SameSite.
 */

const API_PORT = 3100;
const WEB_PORT = 5174;
const API_URL = `http://127.0.0.1:${String(API_PORT)}`;
const WEB_URL = `http://127.0.0.1:${String(WEB_PORT)}`;

const enCI = process.env.CI !== undefined;

export type E2eTarget = 'dev' | 'prod';

/** Dónde deja Vite el front compilado. */
const DIST = fileURLToPath(new URL('./dist', import.meta.url));

/*
 * Un atleta nuevo por test, todos desde 127.0.0.1: con el límite de 5 registros por minuto
 * (spec §13) el sexto test ya no entra. Sólo acá se apaga; en producción no se puede (ver
 * parseEnv).
 */
const apiEnv = {
  PORT: String(API_PORT),
  HOST: '127.0.0.1',
  AUTH_RATE_LIMIT: 'off',
};

function servidoresPara(target: E2eTarget) {
  return target === 'prod'
    ? [
        {
          // El build primero, con la API en el mismo origen (VITE_API_URL vacío), y después la
          // API sirviéndolo. Lo mismo que va a hacer el deploy.
          command:
            'pnpm --filter @wasabi-cross/web build && pnpm --filter @wasabi-cross/api dev:ephemeral',
          url: `${API_URL}/ready`,
          // Build más el primer arranque, que puede bajarse el binario de mongod.
          timeout: 300_000,
          reuseExistingServer: false,
          stdout: 'pipe' as const,
          stderr: 'pipe' as const,
          env: {
            ...apiEnv,
            VITE_API_URL: '',
            WEB_DIST_DIR: DIST,
            WEB_ORIGIN: API_URL,
            BETTER_AUTH_URL: API_URL,
          },
        },
      ]
    : [
        {
          command: 'pnpm --filter @wasabi-cross/api dev:ephemeral',
          url: `${API_URL}/ready`,
          // El primer arranque puede bajarse el binario de mongod.
          timeout: 180_000,
          reuseExistingServer: false,
          stdout: 'pipe' as const,
          stderr: 'pipe' as const,
          env: { ...apiEnv, WEB_ORIGIN: WEB_URL },
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
      ];
}

/** La config de un modo. `playwright.prod.config.ts` pide la de producción. */
export function crearConfig(target: E2eTarget) {
  return defineConfig({
    testDir: './e2e',
    // Una sola base para todos: los tests se cruzarían los datos si corrieran en paralelo.
    workers: 1,
    fullyParallel: false,
    forbidOnly: enCI,
    retries: enCI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: enCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

    // Los specs que sólo tienen sentido contra el build (produccion.spec.ts) miran esto.
    metadata: { target },

    use: {
      // En producción el front vive en la API: la misma URL para las dos cosas.
      baseURL: target === 'prod' ? API_URL : WEB_URL,
      trace: 'retain-on-failure',
      video: 'retain-on-failure',
    },

    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

    webServer: servidoresPara(target),
  });
}

export default crearConfig('dev');
