import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi, type TestHarness } from '../../../test/harness.ts';
import { isAppError } from '../../../shared/errors/app-error.ts';
import { createMongoRecordGateway } from './mongo-record.gateway.ts';
import type { NewRecordEntry } from '../domain/record-ports.ts';

const base: Omit<NewRecordEntry, 'kind' | 'value'> = {
  userId: 'usr_a1b2c3d4',
  managedExerciseId: 'mex_a1b2c3d4',
  performedAt: '2026-09-23T10:00:00.000Z',
};

/*
 * El caso de uso ya valida el peso y el desnivel antes de llamar al gateway (records.ts,
 * add-managed-exercise.ts): estos tests lo saltean a propósito, para probar que el gateway
 * —dueño de las marcas— tampoco los deja pasar. Es la misma "segunda red" que ya tiene el
 * valor, no algo que un caller real dispare hoy.
 */
describe('createMongoRecordGateway — segunda red del peso y el desnivel', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await startTestApi();
  });

  afterAll(async () => {
    await harness.stop();
  });

  it('no guarda una marca de hipertrofia sin peso', async () => {
    const gateway = createMongoRecordGateway(harness.mongo.db);

    await expect(gateway.append({ ...base, kind: 'weighted_reps', value: 12 })).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.errorCode === 'WC-RM-422-001',
    );
  });

  it('no guarda una marca de running sin desnivel', async () => {
    const gateway = createMongoRecordGateway(harness.mongo.db);

    await expect(gateway.append({ ...base, kind: 'time', value: 222 })).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.errorCode === 'WC-RM-422-001',
    );
  });

  it('sí guarda una marca de hipertrofia con peso válido', async () => {
    const gateway = createMongoRecordGateway(harness.mongo.db);

    const entry = await gateway.append({ ...base, kind: 'weighted_reps', value: 12, weightKg: 40 });

    expect(entry).toMatchObject({ value: 12, unit: 'reps', weightKg: 40 });
  });
});
