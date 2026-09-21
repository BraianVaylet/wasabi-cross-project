import { describe, expect, it } from 'vitest';
import { formatDate, formatMark } from './format.ts';

describe('formatDate — es-AR (spec §11)', () => {
  it('día/mes/año, como en los mockups', () => {
    expect(formatDate('2026-06-23T10:00:00.000Z')).toBe('23/06/2026');
  });

  it('completa con ceros: 05/01, no 5/1', () => {
    expect(formatDate('2026-01-05T12:00:00.000Z')).toBe('05/01/2026');
  });
});

describe('formatMark — el valor con su unidad', () => {
  it('la carga va en kg', () => {
    expect(formatMark({ value: 100, unit: 'kg' })).toBe('100 kg');
  });

  it('media carga se muestra con su medio kilo', () => {
    expect(formatMark({ value: 92.5, unit: 'kg' })).toBe('92,5 kg');
  });

  it('las repeticiones, en reps', () => {
    expect(formatMark({ value: 10, unit: 'reps' })).toBe('10 reps');
  });

  it('el tiempo se lee como tiempo, no como un montón de segundos', () => {
    expect(formatMark({ value: 300, unit: 's' })).toBe('5:00');
    expect(formatMark({ value: 272, unit: 's' })).toBe('4:32');
    expect(formatMark({ value: 3725, unit: 's' })).toBe('1:02:05');
  });

  it('menos de un minuto se dice en segundos', () => {
    expect(formatMark({ value: 45, unit: 's' })).toBe('45 s');
    expect(formatMark({ value: 12.4, unit: 's' })).toBe('12,4 s');
  });
});
