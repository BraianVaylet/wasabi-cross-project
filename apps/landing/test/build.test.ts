import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, inject } from 'vitest';

/*
 * Lo que se promete en spec §5.7 y §13 sobre el resultado del build: HTML y CSS, nada de
 * JavaScript, y ningún estilo dentro del HTML (la CSP de F10-11 no admite `unsafe-inline`). El
 * build lo hace `global-setup.ts`.
 */

const salida = inject('salida');

describe('build de la landing', () => {
  let archivos: string[] = [];

  beforeAll(async () => {
    const entradas = await readdir(salida, { withFileTypes: true, recursive: true });
    archivos = entradas.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
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
