import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { TestProject } from 'vitest/node';

/*
 * El build real de la landing, para todos los tests que miran su salida, a directorios temporales
 * (lo que se promete en spec §5.7 y §13 es una propiedad del resultado, no del código). Dos
 * builds, uno detrás del otro (comparten `.astro/`): sin la app a la que llevar (`PUBLIC_APP_URL`
 * vacía, aunque el entorno de quien corre los tests la tenga) y con ella.
 *
 * Corre la CLI de Astro en otro proceso, igual que `pnpm build`: la API programática dentro de
 * Vitest carga los internos de Astro en el grafo de módulos de los tests y no devuelve `build`.
 */

declare module 'vitest' {
  export interface ProvidedContext {
    /** El build sin `PUBLIC_APP_URL`: la landing mientras la app no esté en producción. */
    salida: string;
    /** El build con `PUBLIC_APP_URL`. */
    salidaConApp: string;
    /** El valor de `PUBLIC_APP_URL` con el que se hizo `salidaConApp`. */
    appUrl: string;
  }
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASTRO = join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
const APP_URL = 'https://app.ejemplo.test';
const run = promisify(execFile);

async function construir(publicAppUrl: string): Promise<string> {
  const salida = await mkdtemp(join(tmpdir(), 'wasabi-landing-'));
  await run(process.execPath, [ASTRO, 'build', '--root', ROOT, '--outDir', salida], {
    cwd: ROOT,
    env: { ...process.env, PUBLIC_APP_URL: publicAppUrl },
  });
  return salida;
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const salida = await construir('');
  const salidaConApp = await construir(APP_URL);
  project.provide('salida', salida);
  project.provide('salidaConApp', salidaConApp);
  project.provide('appUrl', APP_URL);
  return async () => {
    await Promise.all(
      [salida, salidaConApp].map((dir) => rm(dir, { recursive: true, force: true })),
    );
  };
}
