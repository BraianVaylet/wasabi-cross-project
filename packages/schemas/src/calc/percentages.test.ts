import { describe, expect, it } from 'vitest';
import {
  loadBandFor,
  loadFor,
  percentageTable,
  repsFor,
  supportsPercentages,
} from './percentages.ts';

describe('loadFor — carga = RM × %, al 0,5 kg más cercano (spec §5.1)', () => {
  it.each([
    // [RM, %, carga esperada, por qué]
    [100, 65, 65, 'el ejemplo del mockup 6'],
    [100, 100, 100, 'el 100% es el RM'],
    [87.5, 65, 57, '56,875 → 57 (está más cerca de 57 que de 56,5)'],
    [102.5, 95, 97.5, '97,375 → 97,5'],
    [94.5, 50, 47.5, '47,25 → 47,5: en el empate exacto redondea hacia arriba'],
    [60, 1, 0.5, '0,6 → 0,5'],
    [72.5, 85, 61.5, '61,625 → 61,5'],
  ])('RM %s kg al %s%% → %s kg (%s)', (rm, percentage, expected) => {
    expect(loadFor(rm, percentage)).toBe(expected);
  });
});

describe('repsFor — repeticiones = máximo × %, hacia abajo, mínimo 1', () => {
  it.each([
    [13, 80, 10, '10,4 → 10: nunca por encima de la intensidad pedida'],
    [20, 85, 17, 'exacto'],
    [10, 100, 10, 'el 100% es el máximo'],
    [3, 30, 1, '0,9 → 0, pero el mínimo es 1'],
    [1, 50, 1, 'con 1 repetición, cualquier porcentaje da 1'],
  ])('máximo %s al %s%% → %s (%s)', (max, percentage, expected) => {
    expect(repsFor(max, percentage)).toBe(expected);
  });
});

describe('loadBandFor — bandas <70 / 70–84 / ≥85 (decidido el 2026-09-18)', () => {
  it.each([
    [1, 'liviana'],
    [65, 'liviana'],
    [69, 'liviana'],
    [69.9, 'liviana'],
    [70, 'media'],
    [84, 'media'],
    [84.9, 'media'],
    [85, 'pesada'],
    [100, 'pesada'],
  ] as const)('%s%% → %s', (percentage, band) => {
    expect(loadBandFor(percentage)).toBe(band);
  });
});

describe('supportsPercentages', () => {
  it('fuerza y repeticiones tienen tabla de porcentajes; tiempo no', () => {
    expect(supportsPercentages('rm')).toBe(true);
    expect(supportsPercentages('reps')).toBe(true);
    expect(supportsPercentages('time')).toBe(false);
  });
});

describe('percentageTable', () => {
  it('con los porcentajes por defecto y RM 100, reproduce el mockup 5', () => {
    expect(percentageTable('rm', 100, [65, 75, 80, 85, 90, 95])).toEqual([
      { percentage: 65, target: 65, band: 'liviana' },
      { percentage: 75, target: 75, band: 'media' },
      { percentage: 80, target: 80, band: 'media' },
      { percentage: 85, target: 85, band: 'pesada' },
      { percentage: 90, target: 90, band: 'pesada' },
      { percentage: 95, target: 95, band: 'pesada' },
    ]);
  });

  it('en repeticiones calcula repeticiones, no kilos', () => {
    expect(percentageTable('reps', 20, [65, 75])).toEqual([
      { percentage: 65, target: 13, band: 'liviana' },
      { percentage: 75, target: 15, band: 'media' },
    ]);
  });

  it('en tiempo no hay tabla: la decisión es mostrar mejor marca e historial', () => {
    expect(percentageTable('time', 222, [65, 75])).toBeNull();
  });

  it('respeta el orden en que el usuario configuró sus porcentajes', () => {
    expect(percentageTable('rm', 100, [90, 70])?.map((row) => row.percentage)).toEqual([90, 70]);
  });
});

describe('entradas inválidas', () => {
  it('un porcentaje fuera de 1–100 es un error de quien llama, no un número raro', () => {
    expect(() => loadFor(100, 0)).toThrow(RangeError);
    expect(() => loadFor(100, 101)).toThrow(RangeError);
    expect(() => repsFor(10, -5)).toThrow(RangeError);
    expect(() => loadBandFor(Number.NaN)).toThrow(RangeError);
  });

  it('un RM de cero, negativo o no numérico es un error', () => {
    expect(() => loadFor(0, 50)).toThrow(RangeError);
    expect(() => loadFor(-10, 50)).toThrow(RangeError);
    expect(() => loadFor(Number.POSITIVE_INFINITY, 50)).toThrow(RangeError);
  });

  it('las repeticiones tienen que ser un entero mayor a cero', () => {
    expect(() => repsFor(0, 50)).toThrow(RangeError);
    expect(() => repsFor(2.5, 50)).toThrow(RangeError);
  });
});
