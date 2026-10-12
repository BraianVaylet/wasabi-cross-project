import { describe, expect, it } from 'vitest';
import { listaConY } from '../src/lib/lista.ts';

describe('listaConY()', () => {
  it('un elemento: tal cual', () => {
    expect(listaConY(['CrossFit'])).toBe('CrossFit');
  });

  it('dos: separados por "y"', () => {
    expect(listaConY(['CrossFit', 'Hyrox'])).toBe('CrossFit y Hyrox');
  });

  it('más de dos: comas y "y" antes del último, sin coma delante', () => {
    expect(listaConY(['CrossFit', 'musculación', 'Hyrox'])).toBe('CrossFit, musculación y Hyrox');
    expect(listaConY(['a', 'b', 'c', 'd'])).toBe('a, b, c y d');
  });

  it('una lista vacía es un texto vacío, no un error', () => {
    expect(listaConY([])).toBe('');
  });
});
