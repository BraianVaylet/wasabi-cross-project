import { describe, expect, it } from 'vitest';
import { safeRedirect } from './redirect.ts';

describe('safeRedirect: a dónde volver después de entrar', () => {
  it.each(['/', '/perfil', '/ejercicios/mex_a1b2c3d4?tab=historial', '/perfil#tema'])(
    'una ruta interna se respeta: %s',
    (path) => {
      expect(safeRedirect(path)).toBe(path);
    },
  );

  it.each([
    ['sin nada', undefined],
    ['vacío', ''],
    ['otro sitio', 'https://evil.example'],
    ['protocolo relativo', '//evil.example'],
    ['barra invertida', '/\\evil.example'],
    ['javascript', 'javascript:alert(1)'],
    ['relativa', 'perfil'],
    ['el mismo login, que haría un bucle', '/login?redirect=/perfil'],
  ])('%s → a Home, nunca afuera', (_caso, value) => {
    expect(safeRedirect(value)).toBe('/');
  });
});
