import { describe, expect, it } from 'vitest';
import { validatePercentages } from './percentages.ts';

describe('validatePercentages — los porcentajes del perfil', () => {
  it('acepta los de la spec §5', () => {
    expect(validatePercentages(['65', '75', '80', '85', '90', '95'])).toEqual({
      ok: true,
      percentages: [65, 75, 80, 85, 90, 95],
    });
  });

  it('marca el campo repetido, no todo el grupo', () => {
    const result = validatePercentages(['70', '80', '70']);

    expect(result).toMatchObject({ ok: false, fields: { 2: 'Ese porcentaje está repetido' } });
  });

  it('marca el campo fuera de rango, con el motivo de la API', () => {
    const result = validatePercentages(['0', '50', '101']);

    expect(result).toMatchObject({
      ok: false,
      fields: { 0: 'El porcentaje mínimo es 1', 2: 'El porcentaje máximo es 100' },
    });
  });

  it('un porcentaje vacío o que no es número se marca', () => {
    const result = validatePercentages(['65', '', 'ochenta']);

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(Object.keys(result.fields)).toEqual(['1', '2']);
    }
  });

  it('con decimales no: el porcentaje es entero', () => {
    expect(validatePercentages(['72,5']).ok).toBe(false);
  });

  it('demasiados porcentajes es un problema del grupo, no de un campo', () => {
    const result = validatePercentages(Array.from({ length: 13 }, (_, i) => String(i + 10)));

    expect(result).toMatchObject({ ok: false, group: 'Como máximo 12 porcentajes' });
  });

  it('sin ninguno, tampoco', () => {
    expect(validatePercentages([])).toMatchObject({
      ok: false,
      group: 'Tiene que haber al menos un porcentaje',
    });
  });
});
