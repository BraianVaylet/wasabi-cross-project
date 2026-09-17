import { describe, expect, it } from 'vitest';
import { FIXED_UNIT_BY_KIND, createRecordSchema, recordSchema } from './record.schema.ts';

const identity = {
  id: 'rec_a1b2c3d4',
  userId: 'usr_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  performedAt: '2026-09-17T14:03:11.412Z',
  createdAt: '2026-09-17T14:03:11.412Z',
  updatedAt: '2026-09-17T14:03:11.412Z',
};

const rmRecord = { ...identity, kind: 'rm', value: 100, unit: 'kg' };
const timeRecord = { ...identity, kind: 'time', value: 222, unit: 's' };
const repsRecord = { ...identity, kind: 'reps', value: 15, unit: 'reps' };

describe('recordSchema', () => {
  it('acepta un RM en kg y en lb', () => {
    expect(recordSchema.safeParse(rmRecord).success).toBe(true);
    expect(recordSchema.safeParse({ ...rmRecord, unit: 'lb' }).success).toBe(true);
  });

  it('acepta un registro de tiempo y uno de repeticiones', () => {
    expect(recordSchema.safeParse(timeRecord).success).toBe(true);
    expect(recordSchema.safeParse(repsRecord).success).toBe(true);
  });

  it('no deja medir un RM en repeticiones: la unidad está atada al tipo', () => {
    expect(recordSchema.safeParse({ ...rmRecord, unit: 'reps' }).success).toBe(false);
    expect(recordSchema.safeParse({ ...timeRecord, unit: 'kg' }).success).toBe(false);
    expect(recordSchema.safeParse({ ...repsRecord, unit: 's' }).success).toBe(false);
  });

  it('rechaza un valor de cero o negativo (WC-RM-422-001)', () => {
    expect(recordSchema.safeParse({ ...rmRecord, value: 0 }).success).toBe(false);
    expect(recordSchema.safeParse({ ...rmRecord, value: -5 }).success).toBe(false);
    expect(recordSchema.safeParse({ ...timeRecord, value: 0 }).success).toBe(false);
    expect(recordSchema.safeParse({ ...repsRecord, value: -1 }).success).toBe(false);
  });

  it('el mensaje del valor inválido nombra la medición, no dice "valor inválido"', () => {
    const result = recordSchema.safeParse({ ...rmRecord, value: -5 });

    expect(result.error?.issues[0]?.message).toBe('El RM tiene que ser mayor a cero');
  });

  it('acepta un RM con decimales pero exige repeticiones enteras', () => {
    expect(recordSchema.safeParse({ ...rmRecord, value: 102.5 }).success).toBe(true);
    expect(recordSchema.safeParse({ ...repsRecord, value: 15.5 }).success).toBe(false);
  });

  it('rechaza valores fuera de lo realista', () => {
    expect(recordSchema.safeParse({ ...rmRecord, value: 1001 }).success).toBe(false);
    expect(recordSchema.safeParse({ ...timeRecord, value: 86_401 }).success).toBe(false);
    expect(recordSchema.safeParse({ ...repsRecord, value: 10_001 }).success).toBe(false);
  });

  it('rechaza un kind que no existe', () => {
    expect(recordSchema.safeParse({ ...rmRecord, kind: 'distancia' }).success).toBe(false);
  });

  it('rechaza un exerciseId con prefijo de otra entidad', () => {
    expect(recordSchema.safeParse({ ...rmRecord, exerciseId: 'rec_a1b2c3d4' }).success).toBe(false);
  });

  it('rechaza HTML en las notas', () => {
    expect(recordSchema.safeParse({ ...rmRecord, notes: '<b>pr</b>' }).success).toBe(false);
  });
});

describe('createRecordSchema', () => {
  it('no pide id, userId ni exerciseId: los pone el servidor desde la sesión y la ruta', () => {
    const parsed = createRecordSchema.parse({
      kind: 'rm',
      value: 100,
      unit: 'kg',
      id: 'rec_falsificado',
      userId: 'usr_otrousuario',
      exerciseId: 'exo_deotro',
    });

    expect(parsed).not.toHaveProperty('id');
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed).not.toHaveProperty('exerciseId');
  });

  it('performedAt es opcional: si no viene, se asume ahora', () => {
    expect(createRecordSchema.safeParse({ kind: 'reps', value: 12, unit: 'reps' }).success).toBe(
      true,
    );
    expect(
      createRecordSchema.safeParse({
        kind: 'reps',
        value: 12,
        unit: 'reps',
        performedAt: '2026-09-01T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('sigue validando el valor al crear', () => {
    expect(createRecordSchema.safeParse({ kind: 'rm', value: -1, unit: 'kg' }).success).toBe(false);
  });
});

describe('FIXED_UNIT_BY_KIND', () => {
  it('tiempo y repeticiones tienen unidad fija; el RM la elige el usuario', () => {
    expect(FIXED_UNIT_BY_KIND).toEqual({ time: 's', reps: 'reps' });
    expect(FIXED_UNIT_BY_KIND).not.toHaveProperty('rm');
  });
});
