import { describe, expect, it } from 'vitest';
import { addExerciseSchema } from '../exercise/managed-exercise.api.ts';
import { historyQuerySchema, recordHistorySchema, recordInputSchema } from './record.api.ts';
import { createRecordSchemaFor } from './record.schema.ts';

describe('recordInputSchema — el modal de "New RM" / "New Record" (mockup 11)', () => {
  it('pide valor; fecha y comentario son opcionales', () => {
    expect(recordInputSchema.parse({ value: 105 })).toEqual({ value: 105 });
    expect(
      recordInputSchema.safeParse({
        value: 105,
        performedAt: '2026-09-18T10:00:00.000Z',
        notes: 'Con cinturón',
      }).success,
    ).toBe(true);
  });

  it('ignora lo que no le corresponde mandar al cliente', () => {
    const parsed = recordInputSchema.parse({
      value: 105,
      kind: 'reps',
      unit: 'lb',
      userId: 'usr_x',
    });

    expect(parsed).toEqual({ value: 105 });
  });

  it('rechaza HTML en el comentario', () => {
    expect(recordInputSchema.safeParse({ value: 1, notes: '<b>pr</b>' }).success).toBe(false);
  });
});

describe('historyQuerySchema — la paginación del historial', () => {
  it('sin nada, trae de a 20', () => {
    expect(historyQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('el limit llega como texto en la URL y se convierte', () => {
    expect(historyQuerySchema.parse({ limit: '5' })).toEqual({ limit: 5 });
  });

  it('el limit va de 1 a 100', () => {
    expect(historyQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('recordHistorySchema', () => {
  it('acepta una página con valor actual, mejor marca y cursor', () => {
    const mark = { value: 100, unit: 'kg', performedAt: '2026-06-23T10:00:00.000Z' };

    expect(
      recordHistorySchema.safeParse({
        records: [{ id: 'rec_a1b2c3d4', ...mark }],
        current: mark,
        best: mark,
        nextCursor: null,
      }).success,
    ).toBe(true);
  });
});

describe('una marca no puede tener fecha futura (spec §5.1)', () => {
  it('ni al cargarla, ni como primera marca, ni en el schema por medición', () => {
    const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(
      recordInputSchema.safeParse({ value: 100, performedAt: manana }).error?.issues[0],
    ).toMatchObject({
      path: ['performedAt'],
      message: 'La fecha no puede ser futura',
    });
    expect(createRecordSchemaFor('rm').safeParse({ value: 100, performedAt: manana }).success).toBe(
      false,
    );
    expect(
      addExerciseSchema.safeParse({
        source: 'catalog',
        exerciseId: 'exo_a1b2c3d4',
        level: 'intermedio',
        firstRecord: { value: 100, performedAt: manana },
      }).error?.issues[0]?.path,
    ).toEqual(['firstRecord', 'performedAt']);
  });
});
