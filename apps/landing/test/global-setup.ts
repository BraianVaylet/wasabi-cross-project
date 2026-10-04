import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { TestProject } from 'vitest/node';

/*
 * El build real de la landing, una sola vez para todos los tests que miran su salida, a un
 * directorio temporal (lo que se promete en spec §5.7 y §13 es una propiedad del resultado, no del
 * código).
 *
 * Corre la CLI de Astro en otro proceso, igual que `pnpm build`: la API programática dentro de
 * Vitest carga los internos de Astro en el grafo de módulos de los tests y no devuelve `build`.
 */

declare module 'vitest' {
  export interface ProvidedContext {
    /** El directorio donde quedó el build (`dist/` de la landing). */
    salida: string;
  }
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASTRO = join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
const run = promisify(execFile);

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const salida = await mkdtemp(join(tmpdir(), 'wasabi-landing-'));
  await run(process.execPath, [ASTRO, 'build', '--root', ROOT, '--outDir', salida], { cwd: ROOT });
  project.provide('salida', salida);
  return async () => {
    await rm(salida, { recursive: true, force: true });
  };
}
