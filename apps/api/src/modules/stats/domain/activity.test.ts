import { describe, expect, it } from 'vitest';
import { trainingActivity, type ActivityExercise } from './activity.ts';

/*
 * Constancia, récords y para retestear (F7-02, spec §5.4). El reloj está fijo: el 2 de
 * octubre de 2026 a las 15 UTC.
 */

const AHORA = new Date('2026-10-02T15:00:00.000Z');

/** Una marca hace `dias` días, al mediodía UTC como las guarda la app. */
function hace(dias: number, value: number, weightKg?: number) {
  const date = new Date(AHORA.getTime() - dias * 24 * 60 * 60 * 1000);
  date.setUTCHours(12, 0, 0, 0);
  return {
    performedAt: date.toISOString(),
    value,
    ...(weightKg === undefined ? {} : { weightKg }),
  };
}

function ejercicio(
  id: string,
  kind: ActivityExercise['kind'],
  points: ActivityExercise['points'],
  name = id,
): ActivityExercise {
  return { managedExerciseId: `mex_${id.padEnd(8, '0')}`, name, kind, points };
}

describe('trainingActivity — constancia', () => {
  it('cuenta las marcas del período y deja fuera las de antes', () => {
    const actividad = trainingActivity(
      [ejercicio('squat', 'rm', [hace(200, 90), hace(40, 100), hace(5, 105)])],
      '3m',
      AHORA,
    );

    expect(actividad.records).toBe(2);
  });

  it('pone todos los meses del período, los vacíos en cero', () => {
    // 3 meses antes del 2 de octubre es el 2 de julio: julio, agosto, septiembre y octubre.
    const actividad = trainingActivity(
      [ejercicio('squat', 'rm', [hace(85, 100), hace(80, 102), hace(20, 105)])],
      '3m',
      AHORA,
    );

    expect(actividad.byMonth).toEqual([
      { month: '2026-07', records: 2 },
      { month: '2026-08', records: 0 },
      { month: '2026-09', records: 1 },
      { month: '2026-10', records: 0 },
    ]);
  });

  it('en todo el historial, los meses van de la primera marca a hoy', () => {
    const actividad = trainingActivity(
      [ejercicio('squat', 'rm', [hace(70, 100)]), ejercicio('run', 'time', [hace(10, 300)])],
      'todo',
      AHORA,
    );

    expect(actividad.byMonth.map((month) => month.month)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(actividad.records).toBe(2);
  });

  it('la última marca no depende del período', () => {
    const actividad = trainingActivity(
      [ejercicio('squat', 'rm', [hace(200, 100), hace(150, 110)])],
      '3m',
      AHORA,
    );

    expect(actividad.records).toBe(0);
    expect(actividad.lastRecordAt).toBe(hace(150, 110).performedAt);
    expect(actividad.daysSinceLast).toBe(150);
  });

  it('sin marcas, no hay última ni meses inventados en "todo"', () => {
    const actividad = trainingActivity([ejercicio('squat', 'rm', [])], 'todo', AHORA);

    expect(actividad).toMatchObject({
      records: 0,
      byMonth: [],
      lastRecordAt: null,
      daysSinceLast: null,
      personalBests: 0,
      topImprovements: [],
      stale: [],
    });
  });
});

describe('trainingActivity — mejores marcas nuevas', () => {
  it('cuenta las que superan a todas las anteriores; la primera y el empate no', () => {
    const actividad = trainingActivity(
      [
        ejercicio('squat', 'rm', [
          hace(50, 100),
          hace(40, 110),
          hace(30, 105),
          hace(20, 110),
          hace(10, 120),
        ]),
      ],
      '3m',
      AHORA,
    );

    // 110 supera a 100 y 120 supera a 110; 105 no, y el segundo 110 empata.
    expect(actividad.personalBests).toBe(2);
  });

  it('se comparan con las marcas de antes del período, aunque no se cuenten', () => {
    const actividad = trainingActivity(
      [ejercicio('squat', 'rm', [hace(200, 130), hace(20, 120), hace(10, 135)])],
      '3m',
      AHORA,
    );

    // 120 no supera al 130 de hace 200 días; 135, sí.
    expect(actividad.personalBests).toBe(1);
  });

  it('en tiempo, menos es mejor', () => {
    const actividad = trainingActivity(
      [ejercicio('run', 'time', [hace(30, 300), hace(20, 280), hace(10, 290)])],
      '3m',
      AHORA,
    );

    expect(actividad.personalBests).toBe(1);
  });

  it('en hipertrofia, la vara es el RM estimado y no las repeticiones', () => {
    // 10 × 80 kg → 106,7 kg; 6 × 90 kg → 108 kg: menos repeticiones, pero mejor marca.
    const actividad = trainingActivity(
      [ejercicio('press', 'weighted_reps', [hace(30, 10, 80), hace(10, 6, 90)])],
      '3m',
      AHORA,
    );

    expect(actividad.personalBests).toBe(1);
  });
});

describe('trainingActivity — lo que más mejoró', () => {
  it('vuelven los tres que más mejoraron, sin los que empeoraron', () => {
    const actividad = trainingActivity(
      [
        ejercicio('a', 'rm', [hace(30, 100), hace(10, 105)], 'A'),
        ejercicio('b', 'rm', [hace(30, 100), hace(10, 120)], 'B'),
        ejercicio('c', 'rm', [hace(30, 100), hace(10, 110)], 'C'),
        ejercicio('d', 'rm', [hace(30, 100), hace(10, 102)], 'D'),
        ejercicio('e', 'rm', [hace(30, 100), hace(10, 90)], 'E'),
      ],
      '3m',
      AHORA,
    );

    expect(actividad.topImprovements.map((entry) => [entry.name, entry.changePercent])).toEqual([
      ['B', 20],
      ['C', 10],
      ['A', 5],
    ]);
  });

  it('mira sólo el período, y una sola marca no es mejora', () => {
    const actividad = trainingActivity(
      [
        // La mejora fue antes del período: adentro hay una sola marca.
        ejercicio('a', 'rm', [hace(200, 80), hace(10, 100)], 'A'),
        // Sin marcas en el período.
        ejercicio('b', 'rm', [hace(200, 80)], 'B'),
      ],
      '3m',
      AHORA,
    );

    expect(actividad.topImprovements).toEqual([]);
  });

  it('en tiempo, bajar es mejorar; en el empate, por nombre', () => {
    const actividad = trainingActivity(
      [
        ejercicio('run', 'time', [hace(30, 300), hace(10, 270)], 'Remo'),
        ejercicio('squat', 'rm', [hace(30, 100), hace(10, 110)], 'Banco'),
      ],
      '3m',
      AHORA,
    );

    expect(actividad.topImprovements.map((entry) => entry.name)).toEqual(['Banco', 'Remo']);
  });
});

describe('trainingActivity — para retestear', () => {
  it('propone los que llevan más de 8 semanas sin marca, del más olvidado al más reciente', () => {
    const actividad = trainingActivity(
      [
        ejercicio('a', 'rm', [hace(90, 100)], 'A'),
        ejercicio('b', 'rm', [hace(200, 100), hace(60, 100)], 'B'),
        ejercicio('c', 'rm', [hace(50, 100)], 'C'),
        ejercicio('d', 'rm', [hace(56, 100)], 'D'),
      ],
      '3m',
      AHORA,
    );

    expect(actividad.stale.map((entry) => [entry.name, entry.days])).toEqual([
      ['A', 90],
      ['B', 60],
    ]);
    expect(actividad.stale[1]?.lastRecordAt).toBe(hace(60, 100).performedAt);
  });

  it('no depende del período, y en el empate va por nombre', () => {
    const actividad = trainingActivity(
      [
        ejercicio('b', 'rm', [hace(400, 100)], 'Remo'),
        ejercicio('a', 'rm', [hace(400, 100)], 'Banco'),
      ],
      '3m',
      AHORA,
    );

    expect(actividad.stale.map((entry) => entry.name)).toEqual(['Banco', 'Remo']);
  });
});
