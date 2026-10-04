import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * Las guardas del IdP falso de desarrollo (F9-03, ADR-0012). Un IdP que acepta a cualquiera, en
 * producción, es un bypass de la autenticación: no alcanza con una sola barrera.
 *
 *  1. El build sólo compila `src/`: `dev-support/` no entra a `dist/`.            ← este archivo
 *  2. `src/` no importa nada de `dev-support/`.                                  ← este archivo
 *  3. `parseEnv` no deja arrancar con `OAUTH_DEV_IDP=on` en producción.          ← env.test.ts
 *  4. `createAuth` no admite plugins extra en producción.                        ← better-auth.test.ts
 *
 * Se leen los fuentes y la configuración del build en vez de mirar `dist/`: `pnpm verify` corre los
 * tests antes del build, y `dist/` puede no existir o ser de otra corrida.
 */

const API_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = join(API_ROOT, 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function inBuild(): string[] {
  const configPath = join(API_ROOT, 'tsconfig.build.json');
  const read = ts.readConfigFile(configPath, (path) => ts.sys.readFile(path));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(configPath));
  return parsed.fileNames.map((name) => relative(API_ROOT, name).split(sep).join('/'));
}

describe('guardas del IdP falso de desarrollo', () => {
  it('el build de producción sólo compila src/: no hay nada de dev-support ni de scripts', () => {
    const compiled = inBuild();

    expect(compiled.length).toBeGreaterThan(0);
    expect(compiled.filter((file) => !file.startsWith('src/'))).toEqual([]);
    expect(compiled.filter((file) => file.includes('dev-support'))).toEqual([]);
  });

  it('el build no incluye ningún test: no se despliega el código de prueba', () => {
    expect(inBuild().filter((file) => file.endsWith('.test.ts'))).toEqual([]);
  });

  it('ningún archivo de src/ importa de dev-support', () => {
    const importers = sourceFiles(SRC).filter((file) => {
      // Este archivo nombra la carpeta para poder buscarla.
      if (file.endsWith('dev-idp-guards.test.ts')) return false;
      return /from\s+['"][^'"]*dev-support/.test(readFileSync(file, 'utf8'));
    });

    expect(importers.map((file) => relative(API_ROOT, file))).toEqual([]);
  });

  it('tampoco con un import() dinámico', () => {
    const importers = sourceFiles(SRC).filter(
      (file) =>
        !file.endsWith('dev-idp-guards.test.ts') &&
        /import\(['"][^'"]*dev-support/.test(readFileSync(file, 'utf8')),
    );

    expect(importers).toEqual([]);
  });
});
