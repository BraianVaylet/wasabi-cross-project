import { describe, expect, it } from 'vitest';
import { periodStartFor, summarize, type SeriesPoint } from './evolution.ts';

function punto(fecha: string, value: number): SeriesPoint {
  return { performedAt: `${fecha}T12:00:00.000Z`, value };
}

describe('summarize — los números de la evolución (spec §5)', () => {
  const rm = [punto('2026-01-10', 100), punto('2026-03-10', 95), punto('2026-06-10', 120)];

  it('sin marcas no inventa un resumen', () => {
    expect(summarize('rm', [])).toBeNull();
  });

  it('en RM, la mejor es la más alta y la peor la más baja', () => {
    const resumen = summarize('rm', rm);

    expect(resumen?.best).toBe(120);
    expect(resumen?.worst).toBe(95);
    expect(resumen?.current).toBe(120);
    expect(resumen?.records).toBe(3);
  });

  it('en tiempo, la mejor es la más baja: menos es mejor', () => {
    const tiempos = [punto('2026-01-10', 300), punto('2026-06-10', 272)];

    const resumen = summarize('time', tiempos);

    expect(resumen?.best).toBe(272);
    expect(resumen?.worst).toBe(300);
  });

  it('la variación va de la primera a la última del período', () => {
    expect(summarize('rm', rm)?.changePercent).toBe(20);
  });

  it('en tiempo la variación se lee al revés: bajar es mejorar', () => {
    const tiempos = [punto('2026-01-10', 300), punto('2026-06-10', 270)];

    expect(summarize('time', tiempos)?.changePercent).toBe(10);
  });

  it('no depende del orden en que lleguen las marcas', () => {
    const desordenadas = [rm[2], rm[0], rm[1]].filter((p): p is SeriesPoint => p !== undefined);

    expect(summarize('rm', desordenadas)).toEqual(summarize('rm', rm));
  });

  it('con una sola marca la variación es cero, no una división por nada', () => {
    const resumen = summarize('rm', [punto('2026-06-10', 100)]);

    expect(resumen?.changePercent).toBe(0);
    expect(resumen?.best).toBe(100);
  });

  it('una primera marca en cero no divide por nada', () => {
    const resumen = summarize('rm', [punto('2026-01-10', 0), punto('2026-06-10', 100)]);

    expect(resumen?.changePercent).toBe(0);
  });

  it('redondea la variación a un decimal', () => {
    const resumen = summarize('rm', [punto('2026-01-10', 90), punto('2026-06-10', 100)]);

    expect(resumen?.changePercent).toBe(11.1);
  });
});

describe('periodStartFor — desde cuándo se miran las marcas', () => {
  const ahora = new Date('2026-09-22T10:00:00.000Z');

  it('cuenta los meses hacia atrás', () => {
    expect(periodStartFor('3m', ahora)?.toISOString()).toBe('2026-06-22T10:00:00.000Z');
    expect(periodStartFor('6m', ahora)?.toISOString()).toBe('2026-03-22T10:00:00.000Z');
    expect(periodStartFor('12m', ahora)?.toISOString()).toBe('2025-09-22T10:00:00.000Z');
  });

  it('"todo" no tiene piso', () => {
    expect(periodStartFor('todo', ahora)).toBeNull();
  });
});
