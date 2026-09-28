import { describe, expect, it } from 'vitest';
import { improvement, periodStartFor, summarize, type SeriesPoint } from './evolution.ts';

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

describe('improvement — el aumento del progreso en el detalle (spec §5.2)', () => {
  it('de 60 a 80 a 100 kg, mejoró 40: la actual menos la primera', () => {
    const serie = [punto('2025-06-02', 60), punto('2026-02-23', 80), punto('2026-06-23', 100)];

    expect(improvement('rm', serie)).toBe(40);
  });

  it('en tiempo, bajar de 4:40 a 4:32 es una mejora de 8 segundos, positiva', () => {
    expect(improvement('time', [punto('2026-01-10', 280), punto('2026-06-10', 272)])).toBe(8);
  });

  it('en distancia, más metros es mejor: de 2.000 a 2.100 m mejoró 100', () => {
    expect(improvement('distance', [punto('2026-01-10', 2000), punto('2026-06-10', 2100)])).toBe(
      100,
    );
  });

  it('si empeoró, lo dice en negativo', () => {
    expect(improvement('rm', [punto('2026-01-10', 100), punto('2026-06-10', 95)])).toBe(-5);
    expect(improvement('time', [punto('2026-01-10', 272), punto('2026-06-10', 280)])).toBe(-8);
  });

  it('va por fecha, no por el orden en que llegan', () => {
    const desordenada = [punto('2026-06-23', 100), punto('2025-06-02', 60)];

    expect(improvement('rm', desordenada)).toBe(40);
  });

  it('con una sola marca no hay contra qué comparar', () => {
    expect(improvement('rm', [punto('2026-06-23', 100)])).toBeNull();
    expect(improvement('rm', [])).toBeNull();
  });

  it('medio kilo no se pierde en el redondeo', () => {
    expect(improvement('rm', [punto('2026-01-10', 100), punto('2026-06-10', 102.5)])).toBe(2.5);
  });
});
