import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveInitialTheme } from '@wasabi-cross/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `import.meta.url` no sirve acá: en el entorno jsdom es una URL http, no un file://.
const INDEX_HTML = resolve(process.cwd(), 'index.html');
const BOOTSTRAP = resolve(process.cwd(), 'public', 'theme-bootstrap.js');

const html = readFileSync(INDEX_HTML, 'utf8');
const bootstrap = readFileSync(BOOTSTRAP, 'utf8');

/** Ejecuta el archivo del bootstrap como lo haría el browser: el real, no una copia. */
function runInlineScript(): void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- el punto del test es correr el script real, no una copia
  const run = new Function(bootstrap) as () => void;
  run();
}

/** Corre el script como lo correría el browser y devuelve el tema que dejó aplicado. */
function runBootstrap(options: { stored: string | null; prefersLight: boolean }): string {
  document.documentElement.removeAttribute('data-theme');
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(options.stored);
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: options.prefersLight, media: '' }),
  );

  runInlineScript();

  return document.documentElement.dataset.theme ?? '';
}

describe('bootstrap del tema en index.html', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('corre antes del bundle de la app, si no el flash ya pasó', () => {
    expect(html.indexOf('/theme-bootstrap.js')).toBeGreaterThan(-1);
    expect(html.indexOf('/theme-bootstrap.js')).toBeLessThan(html.indexOf('/src/main.tsx'));
  });

  it('se carga como archivo y sin defer ni async: tiene que correr antes de pintar', () => {
    expect(html).toMatch(/<script src="\/theme-bootstrap\.js"><\/script>/);
  });

  it('el HTML no tiene scripts inline: la CSP de la API los bloquearía (F3-03)', () => {
    expect(html).not.toMatch(/<script>/);
  });

  it.each([
    { stored: 'light', prefersLight: false },
    { stored: 'dark', prefersLight: true },
    { stored: null, prefersLight: true },
    { stored: null, prefersLight: false },
    { stored: 'basura', prefersLight: false },
  ])(
    'decide igual que resolveInitialTheme (guardado: $stored, sistema claro: $prefersLight)',
    ({ stored, prefersLight }) => {
      expect(runBootstrap({ stored, prefersLight })).toBe(
        resolveInitialTheme(stored, prefersLight),
      );
    },
  );

  it('si localStorage no está disponible, cae en oscuro en vez de romper', () => {
    document.documentElement.removeAttribute('data-theme');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('modo privado');
    });

    runInlineScript();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('el theme-color del navegador coincide con el fondo del tema oscuro', () => {
    expect(html).toContain('content="#24333d"');
  });
});
