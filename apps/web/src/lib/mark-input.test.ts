import { describe, expect, it } from 'vitest';
import { extraFieldKindFor, parsePlainNumber } from './mark-input.ts';

describe('extraFieldKindFor — qué campo extra pide una marca (spec §5.1)', () => {
  it('hipertrofia pide el peso', () => {
    expect(extraFieldKindFor('weighted_reps')).toBe('weightKg');
  });

  it('running pide el desnivel', () => {
    expect(extraFieldKindFor('time')).toBe('elevationGainM');
  });

  it('fuerza y gimnástico no tienen segundo campo', () => {
    expect(extraFieldKindFor('rm')).toBeNull();
    expect(extraFieldKindFor('reps')).toBeNull();
  });

  it('sin kind todavía elegido, tampoco', () => {
    expect(extraFieldKindFor(null)).toBeNull();
  });
});

describe('parsePlainNumber — el peso o el desnivel, sin reglas de kind', () => {
  it('acepta enteros y decimales con coma', () => {
    expect(parsePlainNumber('80')).toBe(80);
    expect(parsePlainNumber('92,5')).toBe(92.5);
  });

  it('acepta 0: una carrera plana es 0, no vacío', () => {
    expect(parsePlainNumber('0')).toBe(0);
  });

  it('vacío o no numérico es inválido', () => {
    expect(parsePlainNumber('')).toBeNull();
    expect(parsePlainNumber('ochenta')).toBeNull();
  });
});
