import { describe, expect, it } from 'vitest';
import {
  estimatedOneRm,
  referenceValue,
  roundToHalfKg,
  seriesUnitFor,
  seriesValueFor,
} from './estimated-rm.ts';
import { percentageTable } from './percentages.ts';

describe('estimatedOneRm — Epley: peso × (1 + repeticiones / 30)', () => {
  it.each([
    // [peso, reps, RM estimado, por qué]
    [80, 10, 80 * (1 + 10 / 30), '10 × 80 kg → 106,67 (el ejemplo de la tarea)'],
    [90, 6, 108, '6 × 90 kg → 108'],
    [100, 1, 100, 'con una repetición el RM es el peso'],
    [100, 2, 100 * (1 + 2 / 30), 'con dos ya estima'],
    [60, 30, 120, '30 repeticiones duplican el peso'],
  ])('%s kg × %s → %s (%s)', (weight, reps, expected) => {
    expect(estimatedOneRm(weight, reps)).toBeCloseTo(expected, 10);
  });

  it('no redondea: la carga sale del RM sin redondear y sólo se redondea lo que se muestra', () => {
    expect(estimatedOneRm(80, 10)).toBeCloseTo(106.6667, 4);
  });

  it('un peso o unas repeticiones inválidos son un error de quien llama', () => {
    expect(() => estimatedOneRm(0, 10)).toThrow(RangeError);
    expect(() => estimatedOneRm(-5, 10)).toThrow(RangeError);
    expect(() => estimatedOneRm(Number.NaN, 10)).toThrow(RangeError);
    expect(() => estimatedOneRm(80, 0)).toThrow(RangeError);
    expect(() => estimatedOneRm(80, 2.5)).toThrow(RangeError);
  });
});

describe('roundToHalfKg', () => {
  it.each([
    [106.6667, 106.5],
    [108, 108],
    [85.3333, 85.5],
    [100.25, 100.5],
    [100.24, 100],
  ])('%s → %s', (value, expected) => {
    expect(roundToHalfKg(value)).toBe(expected);
  });
});

describe('referenceValue — sobre qué se calculan los porcentajes', () => {
  it('en hipertrofia es el RM estimado, sin redondear', () => {
    expect(referenceValue('weighted_reps', { value: 10, weightKg: 80 })).toBeCloseTo(106.6667, 4);
  });

  it('en el resto es el valor de la marca', () => {
    expect(referenceValue('rm', { value: 100 })).toBe(100);
    expect(referenceValue('reps', { value: 20 })).toBe(20);
    expect(referenceValue('time', { value: 272 })).toBe(272);
  });

  it('una marca de hipertrofia sin peso no rompe: usa el valor tal cual', () => {
    expect(referenceValue('weighted_reps', { value: 10 })).toBe(10);
  });
});

describe('seriesValueFor y seriesUnitFor — lo que se grafica', () => {
  it('en hipertrofia el punto es el RM estimado al 0,5 kg, en kg', () => {
    expect(seriesValueFor('weighted_reps', { value: 10, weightKg: 80 })).toBe(106.5);
    expect(seriesUnitFor('weighted_reps')).toBe('kg');
  });

  it('en el resto es el valor de la marca, con la unidad de siempre', () => {
    expect(seriesValueFor('rm', { value: 102.5 })).toBe(102.5);
    expect(seriesUnitFor('rm')).toBe('kg');
    expect(seriesUnitFor('reps')).toBe('reps');
    expect(seriesUnitFor('time')).toBe('s');
    expect(seriesUnitFor('distance')).toBe('m');
    expect(seriesUnitFor('weighted_distance')).toBe('m');
  });
});

describe('percentageTable en hipertrofia — carga en kg sobre el RM estimado', () => {
  it('10 × 80 kg: el RM estimado es 106,5 kg y el 80% da 85,5 kg', () => {
    const reference = referenceValue('weighted_reps', { value: 10, weightKg: 80 });

    expect(roundToHalfKg(reference)).toBe(106.5);
    expect(percentageTable('weighted_reps', reference, [80])).toEqual([
      { percentage: 80, target: 85.5, band: 'media' },
    ]);
  });

  it('1 × 100 kg: el RM estimado es 100 kg y el 65% da 65 kg', () => {
    const reference = referenceValue('weighted_reps', { value: 1, weightKg: 100 });

    expect(reference).toBe(100);
    expect(percentageTable('weighted_reps', reference, [65])?.[0]?.target).toBe(65);
  });

  it('la mejor marca es la de mayor RM estimado: 6 × 90 kg le gana a 10 × 80 kg', () => {
    const diezPorOchenta = estimatedOneRm(80, 10);
    const seisPorNoventa = estimatedOneRm(90, 6);

    expect(seisPorNoventa).toBeGreaterThan(diezPorOchenta);
    expect(roundToHalfKg(seisPorNoventa)).toBe(108);
  });
});
