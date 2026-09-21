import { describe, expect, it } from 'vitest';
import { nameMatches, normalizeName, sameName } from './names.ts';

describe('nombres de ejercicios', () => {
  it('no distingue mayúsculas, acentos ni espacios de más', () => {
    expect(normalizeName('  Elevación   DE gemelos ')).toBe('elevacion de gemelos');
    expect(sameName('Elevacion de gemelos', 'Elevación de gemelos')).toBe(true);
    expect(sameName('back SQUAT', 'Back squat')).toBe(true);
  });

  it('nombres distintos siguen siendo distintos', () => {
    expect(sameName('Back squat', 'Front squat')).toBe(false);
  });

  it('busca por parte del nombre con la misma regla', () => {
    expect(nameMatches('Elevación de gemelos', 'GEMELO')).toBe(true);
    expect(nameMatches('Back squat', 'dead')).toBe(false);
  });
});
