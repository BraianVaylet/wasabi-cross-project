import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { TestProject } from 'vitest/node';

/*
 * El build real de la landing, para todos los tests que miran su salida, a directorios temporales
 * (lo que se promete en spec §5.7 y §13 es una propiedad del resultado, no del código). Tres
 * builds, uno detrás del otro (comparten `.astro/`), uno por ambiente:
 *
 *   - `salida`: sin ninguna variable. Desarrollo y CI. (Las vacías pisan las del entorno de quien
 *     corre los tests.)
 *   - `salidaConApp`: staging. Con la app (`PUBLIC_APP_URL`), el sitio (`PUBLIC_SITE_URL`) y quién
 *     responde en las páginas legales (`PUBLIC_CONTACT_NAME` y `PUBLIC_CONTACT_EMAIL`), pero sin
 *     `LANDING_INDEXABLE`: no se indexa.
 *   - `salidaProduccion`: lo mismo y `LANDING_INDEXABLE=1`.
 *
 * Corre la CLI de Astro en otro proceso, igual que `pnpm build`: la API programática dentro de
 * Vitest carga los internos de Astro en el grafo de módulos de los tests y no devuelve `build`.
 */

declare module 'vitest' {
  export interface ProvidedContext {
    /** Sin variables: desarrollo y CI. */
    salida: string;
    /** Staging: con `PUBLIC_APP_URL` y `PUBLIC_SITE_URL`, sin `LANDING_INDEXABLE`. */
    salidaConApp: string;
    /** Producción: con las tres. */
    salidaProduccion: string;
    /** El valor de `PUBLIC_APP_URL` de `salidaConApp` y `salidaProduccion`. */
    appUrl: string;
    /** El valor de `PUBLIC_SITE_URL` de `salidaConApp` y `salidaProduccion`. */
    siteUrl: string;
    /** El valor de `PUBLIC_CONTACT_NAME` de `salidaConApp` y `salidaProduccion`. */
    contactoNombre: string;
    /** El valor de `PUBLIC_CONTACT_EMAIL` de `salidaConApp` y `salidaProduccion`. */
    contactoEmail: string;
  }
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASTRO = join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
const APP_URL = 'https://app.ejemplo.test';
const SITE_URL = 'https://wasabicross.ejemplo.test';
const CONTACT_NAME = 'Titular de Prueba';
const CONTACT_EMAIL = 'contacto@ejemplo.test';
const run = promisify(execFile);

interface Entorno {
  PUBLIC_APP_URL: string;
  PUBLIC_SITE_URL: string;
  PUBLIC_CONTACT_NAME: string;
  PUBLIC_CONTACT_EMAIL: string;
  LANDING_INDEXABLE: string;
}

async function construir(entorno: Entorno): Promise<string> {
  const salida = await mkdtemp(join(tmpdir(), 'wasabi-landing-'));
  await run(process.execPath, [ASTRO, 'build', '--root', ROOT, '--outDir', salida], {
    cwd: ROOT,
    env: { ...process.env, ...entorno },
  });
  return salida;
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const salida = await construir({
    PUBLIC_APP_URL: '',
    PUBLIC_SITE_URL: '',
    PUBLIC_CONTACT_NAME: '',
    PUBLIC_CONTACT_EMAIL: '',
    LANDING_INDEXABLE: '',
  });
  const salidaConApp = await construir({
    PUBLIC_APP_URL: APP_URL,
    PUBLIC_SITE_URL: SITE_URL,
    PUBLIC_CONTACT_NAME: CONTACT_NAME,
    PUBLIC_CONTACT_EMAIL: CONTACT_EMAIL,
    LANDING_INDEXABLE: '',
  });
  const salidaProduccion = await construir({
    PUBLIC_APP_URL: APP_URL,
    PUBLIC_SITE_URL: SITE_URL,
    PUBLIC_CONTACT_NAME: CONTACT_NAME,
    PUBLIC_CONTACT_EMAIL: CONTACT_EMAIL,
    LANDING_INDEXABLE: '1',
  });
  project.provide('salida', salida);
  project.provide('salidaConApp', salidaConApp);
  project.provide('salidaProduccion', salidaProduccion);
  project.provide('appUrl', APP_URL);
  project.provide('siteUrl', SITE_URL);
  project.provide('contactoNombre', CONTACT_NAME);
  project.provide('contactoEmail', CONTACT_EMAIL);
  return async () => {
    await Promise.all(
      [salida, salidaConApp, salidaProduccion].map((dir) =>
        rm(dir, { recursive: true, force: true }),
      ),
    );
  };
}
