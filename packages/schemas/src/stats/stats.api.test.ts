import { describe, expect, it } from 'vitest';
import {
  exerciseStatsSchema,
  generalStatsSchema,
  statsQuerySchema,
  seriesPointSchema,
} from './stats.api.ts';

const SERIE = [
  { performedAt: '2026-01-10T12:00:00.000Z', value: 100 },
  { performedAt: '2026-06-10T12:00:00.000Z', value: 120 },
];

const ESTADISTICAS = {
  id: 'mex_a1b2c3d4',
  name: 'Back squat',
  kind: 'rm',
  unit: 'kg',
  period: '12m',
  series: SERIE,
  summary: { current: 120, best: 120, worst: 100, changePercent: 20, records: 2 },
};

describe('statsQuerySchema — el período que se pide', () => {
  it('sin período, mira el último año', () => {
    expect(statsQuerySchema.parse({})).toEqual({ period: '12m' });
  });

  it('acepta los cuatro períodos y rechaza cualquier otro', () => {
    for (const period of ['3m', '6m', '12m', 'todo']) {
      expect(statsQuerySchema.parse({ period })).toEqual({ period });
    }

    expect(statsQuerySchema.safeParse({ period: '2m' }).success).toBe(false);
  });
});

describe('exerciseStatsSchema — lo que devuelve la API por ejercicio', () => {
  it('acepta la respuesta completa', () => {
    expect(exerciseStatsSchema.parse(ESTADISTICAS)).toEqual(ESTADISTICAS);
  });

  it('la unidad viaja una sola vez, no en cada punto', () => {
    expect(seriesPointSchema.parse({ ...SERIE[0], unit: 'kg' })).toEqual(SERIE[0]);
  });

  it('sin marcas, el resumen es null y no un cero inventado', () => {
    const vacio = { ...ESTADISTICAS, series: [], summary: null };

    expect(exerciseStatsSchema.parse(vacio).summary).toBeNull();
  });

  it('una fecha que no es ISO no pasa', () => {
    const rota = { ...ESTADISTICAS, series: [{ performedAt: '10/06/2026', value: 120 }] };

    expect(exerciseStatsSchema.safeParse(rota).success).toBe(false);
  });
});

describe('generalStatsSchema — los agregados de la pantalla', () => {
  const GENERAL = {
    period: '6m',
    byCapacity: [{ capacity: 'fuerza', changePercent: 12.5, exercises: 3 }],
    byMuscleGroup: [{ muscleGroup: 'cuadriceps', changePercent: 8, exercises: 2 }],
    insufficient: { capacities: ['velocidad'], muscleGroups: [] },
  };

  it('acepta el resumen general', () => {
    expect(generalStatsSchema.parse(GENERAL)).toEqual(GENERAL);
  });

  it('una capacidad que no existe no pasa', () => {
    const rota = {
      ...GENERAL,
      byCapacity: [{ capacity: 'flexibilidad', changePercent: 1, exercises: 1 }],
    };

    expect(generalStatsSchema.safeParse(rota).success).toBe(false);
  });

  it('un agregado sin ejercicios detrás no pasa: eso va en `insufficient`', () => {
    const rota = {
      ...GENERAL,
      byCapacity: [{ capacity: 'fuerza', changePercent: 0, exercises: 0 }],
    };

    expect(generalStatsSchema.safeParse(rota).success).toBe(false);
  });
});
