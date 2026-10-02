import { describe, expect, it } from 'vitest';
import type { StatsExerciseProfile } from '../domain/stats-ports.ts';
import { activityFor } from './training-activity.ts';

/*
 * F7-02: el caso de uso pide todo el historial de una vez y le pasa el reloj al cálculo.
 */

const PERFIL: StatsExerciseProfile = {
  managedExerciseId: 'mex_squat000',
  name: 'Sentadilla trasera',
  kind: 'rm',
  category: 'fuerza',
  capacities: ['fuerza'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps'],
  disciplines: [],
};

describe('activityFor', () => {
  it('pide la serie completa, sin recortar por período, y usa el reloj inyectado', async () => {
    const pedidos: (Date | null)[] = [];
    const actividad = await activityFor(
      {
        lookup: { listOwned: () => Promise.resolve([PERFIL]) },
        records: {
          series: () => Promise.resolve([]),
          seriesFor: (_ids, from) => {
            pedidos.push(from);
            return Promise.resolve(
              new Map([
                [
                  PERFIL.managedExerciseId,
                  [{ performedAt: '2026-06-01T12:00:00.000Z', value: 100 }],
                ],
              ]),
            );
          },
        },
        now: () => new Date('2026-10-02T15:00:00.000Z'),
      },
      { userId: 'usr_atleta001', period: '3m' },
    );

    expect(pedidos).toEqual([null]);
    expect(actividad.daysSinceLast).toBe(123);
    expect(actividad.stale).toEqual([
      {
        id: PERFIL.managedExerciseId,
        name: 'Sentadilla trasera',
        lastRecordAt: '2026-06-01T12:00:00.000Z',
        days: 123,
      },
    ]);
  });

  it('un ejercicio sin marcas no se propone para retestear', async () => {
    const actividad = await activityFor(
      {
        lookup: { listOwned: () => Promise.resolve([PERFIL]) },
        records: {
          series: () => Promise.resolve([]),
          seriesFor: () => Promise.resolve(new Map()),
        },
        now: () => new Date('2026-10-02T15:00:00.000Z'),
      },
      { userId: 'usr_atleta001', period: 'todo' },
    );

    expect(actividad).toMatchObject({ records: 0, lastRecordAt: null, stale: [] });
  });
});
