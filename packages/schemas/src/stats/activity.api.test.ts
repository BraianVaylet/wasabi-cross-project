import { describe, expect, it } from 'vitest';
import { STALE_AFTER_DAYS, trainingActivitySchema } from './activity.api.ts';

const ACTIVIDAD = {
  period: '3m',
  records: 5,
  byMonth: [
    { month: '2026-07', records: 2 },
    { month: '2026-08', records: 0 },
    { month: '2026-09', records: 3 },
  ],
  lastRecordAt: '2026-09-28T15:00:00.000Z',
  daysSinceLast: 4,
  personalBests: 2,
  topImprovements: [{ id: 'mex_a1b2c3d4', name: 'Sentadilla trasera', changePercent: 12.5 }],
  stale: [
    {
      id: 'mex_e5f6a7b8',
      name: 'Remo',
      lastRecordAt: '2026-06-01T15:00:00.000Z',
      days: 123,
    },
  ],
};

describe('trainingActivitySchema — constancia, récords y para retestear (F7-02)', () => {
  it('acepta la respuesta completa', () => {
    expect(trainingActivitySchema.parse(ACTIVIDAD)).toEqual(ACTIVIDAD);
  });

  it('sin marcas, la última es null y no una fecha inventada', () => {
    const vacia = {
      ...ACTIVIDAD,
      records: 0,
      lastRecordAt: null,
      daysSinceLast: null,
      personalBests: 0,
      topImprovements: [],
      stale: [],
    };

    expect(trainingActivitySchema.parse(vacia).lastRecordAt).toBeNull();
  });

  it('un mes es AAAA-MM', () => {
    for (const month of ['2026-9', '2026-13', '09/2026', '2026-00']) {
      const rota = { ...ACTIVIDAD, byMonth: [{ month, records: 1 }] };

      expect(trainingActivitySchema.safeParse(rota).success, month).toBe(false);
    }
  });

  it('lo que más mejoró es siempre una mejora, y son a lo sumo tres', () => {
    const empeoro = {
      ...ACTIVIDAD,
      topImprovements: [{ id: 'mex_a1b2c3d4', name: 'Remo', changePercent: -3 }],
    };
    const cuatro = {
      ...ACTIVIDAD,
      topImprovements: Array.from({ length: 4 }, () => ACTIVIDAD.topImprovements[0]),
    };

    expect(trainingActivitySchema.safeParse(empeoro).success).toBe(false);
    expect(trainingActivitySchema.safeParse(cuatro).success).toBe(false);
  });

  it('para retestear hace falta pasar el umbral', () => {
    const reciente = {
      ...ACTIVIDAD,
      stale: [{ ...ACTIVIDAD.stale[0], days: STALE_AFTER_DAYS }],
    };

    expect(trainingActivitySchema.safeParse(reciente).success).toBe(false);
  });
});
