import { describe, expect, it } from 'vitest';
import {
  UNIT_BY_KIND,
  createRecordSchemaFor,
  recordSchema,
  recordValueSchemaFor,
} from './record.schema.ts';

const identity = {
  id: 'rec_a1b2c3d4',
  userId: 'usr_a1b2c3d4',
  managedExerciseId: 'mex_a1b2c3d4',
  performedAt: '2026-09-17T14:03:11.412Z',
  createdAt: '2026-09-17T14:03:11.412Z',
  updatedAt: '2026-09-17T14:03:11.412Z',
};

const rmRecord = { ...identity, kind: 'rm', value: 100, unit: 'kg' };
const repsRecord = { ...identity, kind: 'reps', value: 15, unit: 'reps' };
const weightedRepsRecord = {
  ...identity,
  kind: 'weighted_reps',
  value: 12,
  unit: 'reps',
  weightKg: 80,
};
const timeRecord = {
  ...identity,
  kind: 'time',
  value: 222,
  unit: 's',
  elevationGainM: 150,
};

describe('recordSchema', () => {
  it('acepta una marca de cada tipo', () => {
    expect(recordSchema.safeParse(rmRecord).success).toBe(true);
    expect(recordSchema.safeParse(repsRecord).success).toBe(true);
    expect(recordSchema.safeParse(weightedRepsRecord).success).toBe(true);
    expect(recordSchema.safeParse(timeRecord).success).toBe(true);
  });

  it('hipertrofia sin peso no es una marca válida: no existe ese estado', () => {
    const { weightKg: _w, ...sinPeso } = weightedRepsRecord;

    expect(recordSchema.safeParse(sinPeso).success).toBe(false);
  });

  it('running sin desnivel no es una marca válida: plano es 0, no ausente', () => {
    const { elevationGainM: _e, ...sinDesnivel } = timeRecord;

    expect(recordSchema.safeParse(sinDesnivel).success).toBe(false);
  });

  it('el peso es sólo en kg: una marca en lb se rechaza', () => {
    expect(recordSchema.safeParse({ ...rmRecord, unit: 'lb' }).success).toBe(false);
  });

  it('referencia al ejercicio gestionado, no al ejercicio compartido', () => {
    const { managedExerciseId: _m, ...sinGestionado } = rmRecord;

    expect(recordSchema.safeParse(sinGestionado).success).toBe(false);
    expect(recordSchema.safeParse({ ...rmRecord, managedExerciseId: 'exo_a1b2c3d4' }).success).toBe(
      false,
    );
  });

  it('no deja medir un RM en repeticiones: la unidad está atada al tipo', () => {
    expect(recordSchema.safeParse({ ...rmRecord, unit: 'reps' }).success).toBe(false);
    expect(recordSchema.safeParse({ ...timeRecord, unit: 'kg' }).success).toBe(false);
    expect(recordSchema.safeParse({ ...repsRecord, unit: 's' }).success).toBe(false);
  });

  it('rechaza HTML en los comentarios', () => {
    expect(recordSchema.safeParse({ ...rmRecord, notes: '<b>pr</b>' }).success).toBe(false);
  });
});

describe('recordValueSchemaFor', () => {
  it('RM: mayor a cero, con decimales, hasta 1000 kg', () => {
    const rm = recordValueSchemaFor('rm');

    expect(rm.safeParse(102.5).success).toBe(true);
    expect(rm.safeParse(0).success).toBe(false);
    expect(rm.safeParse(1001).success).toBe(false);
  });

  it('repeticiones: enteras y mayores a cero', () => {
    const reps = recordValueSchemaFor('reps');

    expect(reps.safeParse(15).success).toBe(true);
    expect(reps.safeParse(15.5).success).toBe(false);
    expect(reps.safeParse(0).success).toBe(false);
    expect(reps.safeParse(10_001).success).toBe(false);
  });

  it('tiempo: en segundos, mayor a cero y hasta 24 horas', () => {
    const time = recordValueSchemaFor('time');

    expect(time.safeParse(222).success).toBe(true);
    expect(time.safeParse(0).success).toBe(false);
    expect(time.safeParse(86_401).success).toBe(false);
  });

  it('el mensaje nombra la medición, no dice "valor inválido"', () => {
    const result = recordValueSchemaFor('rm').safeParse(-5);

    expect(result.error?.issues[0]?.message).toBe('El RM tiene que ser mayor a cero');
  });
});

describe('createRecordSchemaFor', () => {
  it('el cliente manda sólo valor, fecha y comentario: el tipo lo sabe el servidor', () => {
    const parsed = createRecordSchemaFor('rm').parse({
      value: 100,
      performedAt: '2026-09-01T10:00:00.000Z',
      kind: 'reps',
      unit: 'lb',
      id: 'rec_falsificado',
      userId: 'usr_otrousuario',
      managedExerciseId: 'mex_deotro0001',
    });

    expect(parsed).toEqual({ value: 100, performedAt: '2026-09-01T10:00:00.000Z' });
  });

  it('la fecha es opcional: si no viene, el servidor asume ahora', () => {
    expect(createRecordSchemaFor('reps').safeParse({ value: 12 }).success).toBe(true);
  });

  it('valida el valor según el tipo que le dice el servidor', () => {
    expect(createRecordSchemaFor('reps').safeParse({ value: 12.5 }).success).toBe(false);
    expect(createRecordSchemaFor('rm').safeParse({ value: 12.5 }).success).toBe(true);
  });

  it('hipertrofia exige el peso, junto a las repeticiones', () => {
    expect(createRecordSchemaFor('weighted_reps').safeParse({ value: 12 }).success).toBe(false);
    expect(
      createRecordSchemaFor('weighted_reps').safeParse({ value: 12, weightKg: 80 }).success,
    ).toBe(true);
  });

  it('running exige el desnivel, junto al tiempo — 0 vale, es una carrera plana', () => {
    expect(createRecordSchemaFor('time').safeParse({ value: 222 }).success).toBe(false);
    expect(createRecordSchemaFor('time').safeParse({ value: 222, elevationGainM: 0 }).success).toBe(
      true,
    );
  });
});

describe('UNIT_BY_KIND', () => {
  it('cada medición tiene una sola unidad', () => {
    expect(UNIT_BY_KIND).toEqual({ rm: 'kg', reps: 'reps', weighted_reps: 'reps', time: 's' });
  });
});
