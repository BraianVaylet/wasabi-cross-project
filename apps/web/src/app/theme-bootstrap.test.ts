import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveInitialTheme } from '@wasabi-cross/ui';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `import.meta.url` no sirve acá: en el entorno jsdom es una URL http, no un file://.
const INDEX_HTML = resolve(process.cwd(), 'index.html');

const html = readFileSync(INDEX_HTML, 'utf8');

/** El script inline del `<head>`, tal cual está en el HTML. */
function bootstrapScript(): string {
  const match = /<script>([\s\S]*?)<\/script>/.exec(html);
  if (!match?.[1]) {
    throw new Error('No hay script inline de bootstrap del tema en index.html');
  }

  return match[1];
}

/** Ejecuta el script del HTML como lo haría el browser. */
function runInlineScript(): void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- el punto del test es correr el script real del HTML, no una copia
  const run = new Function(bootstrapScript()) as () => void;
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
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('/src/main.tsx'));
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
