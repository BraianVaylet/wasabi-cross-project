import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * `@wasabi-cross/ui/tokens.css` (F10-02): la marca sola, sin los componentes React. La landing
 * (ADR-0013) la importa en vez de copiar colores. Se exporta el archivo fuente: es CSS plano,
 * no pasa por el build de la librería y no depende de que ésta se haya compilado antes.
 */

const RAIZ = resolve(import.meta.dirname, '..');
const paquete = JSON.parse(readFileSync(resolve(RAIZ, 'package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
};

describe('export ./tokens.css', () => {
  it('apunta a un archivo que existe', () => {
    const destino = paquete.exports['./tokens.css'];
    expect(typeof destino).toBe('string');
    expect(existsSync(resolve(RAIZ, destino as string))).toBe(true);
  });

  it('trae los tokens de la marca y la base de la app', () => {
    const css = readFileSync(resolve(RAIZ, paquete.exports['./tokens.css'] as string), 'utf8');
    expect(css).toContain('--wc-bg:');
    expect(css).toContain('--wc-accent:');
    expect(css).toContain('--wc-plate-shape:');
    expect(css).toContain('.wc-root');
  });

  it('no cambia el export del CSS completo de la librería', () => {
    expect(paquete.exports['./styles.css']).toBe('./dist/wasabi-cross-ui.css');
  });
});
