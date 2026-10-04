import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/*
 * El build real de la landing, a un directorio temporal. Lo que se promete en spec §5.7 y §13 es
 * una propiedad del resultado, no del código: HTML y CSS, nada de JavaScript, y ningún estilo
 * dentro del HTML (la CSP de F10-11 no admite `unsafe-inline`).
 *
 * Corre la CLI de Astro en otro proceso, igual que `pnpm build`: la API programática dentro de
 * Vitest carga los internos de Astro en el grafo de módulos de los tests y no devuelve `build`.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ASTRO = join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
const run = promisify(execFile);

async function listar(dir: string): Promise<string[]> {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

describe('build de la landing', () => {
  let salida = '';
  let archivos: string[] = [];

  beforeAll(async () => {
    salida = await mkdtemp(join(tmpdir(), 'wasabi-landing-'));
    await run(process.execPath, [ASTRO, 'build', '--root', ROOT, '--outDir', salida], {
      cwd: ROOT,
    });
    archivos = await listar(salida);
  }, 120_000);

  afterAll(async () => {
    await rm(salida, { recursive: true, force: true });
  });

  it('genera el index.html', () => {
    expect(archivos).toContain(join(salida, 'index.html'));
  });

  it('no emite JavaScript: ni .js, ni .mjs, ni .cjs', () => {
    expect(archivos.filter((a) => /\.(?:m|c)?js$/.test(a))).toEqual([]);
  });

  it('declara el idioma es-AR en el HTML', async () => {
    const html = await readFile(join(salida, 'index.html'), 'utf8');
    expect(html).toMatch(/<html[^>]*\blang="es-AR"/);
  });

  it('no deja ningún <style> ni <script> dentro del HTML', async () => {
    const html = await readFile(join(salida, 'index.html'), 'utf8');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script[\s>]/);
  });
});
