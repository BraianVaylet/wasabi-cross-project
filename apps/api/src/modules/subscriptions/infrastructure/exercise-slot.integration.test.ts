import type { ClientSession, Db, MongoClient } from 'mongodb';
import { MongoClient as Client } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createMongoExerciseUsageCounter } from '../../exercises/infrastructure/mongo-usage-counter.ts';
import { migrateUp } from '../../../shared/db/migrations.ts';
import { isAppError } from '../../../shared/errors/app-error.ts';
import { withExerciseSlot } from '../application/with-exercise-slot.ts';
import { createMongoUserSerializer } from './mongo-user-serializer.ts';

/*
 * Las garantías de este archivo dependen de transacciones, así que corre contra un replica
 * set de verdad y no contra un Mongo standalone: en standalone no hay transacciones y el
 * test no probaría nada.
 */

interface ManagedDoc {
  _id: string;
  userId: string;
  exerciseId: string;
}

describe('cupo de ejercicios, contra un replica set', () => {
  let replSet: MongoMemoryReplSet;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    client = await Client.connect(replSet.getUri());
    db = client.db('cupo_test');
    await migrateUp(db, client);
  });

  afterAll(async () => {
    await client.close();
    await replSet.stop();
  });

  beforeEach(async () => {
    await db.collection('managed_exercises').deleteMany({});
    await db.collection('exercises').deleteMany({});
    await db.collection('entitlement_locks').deleteMany({});
  });

  const managed = () => db.collection<ManagedDoc>('managed_exercises');

  async function seedManaged(userId: string, count: number): Promise<void> {
    if (count === 0) return;
    await managed().insertMany(
      Array.from({ length: count }, (_, i) => ({
        _id: `mex_${userId.slice(4, 10)}${String(i).padStart(6, '0')}`,
        userId,
        exerciseId: `exo_catalogo${String(i).padStart(4, '0')}`,
      })),
    );
  }

  function deps() {
    return {
      serializer: createMongoUserSerializer(client, db),
      counter: createMongoExerciseUsageCounter(db),
    };
  }

  /** Lo que haría F1-05: agregar el ejercicio gestionado dentro de la transacción. */
  function addManaged(userId: string, exerciseId: string) {
    return withExerciseSlot(
      deps(),
      { userId, plan: 'free', isCustom: false },
      async (session: ClientSession) => {
        const _id = `mex_${exerciseId.slice(4)}`;
        await managed().insertOne({ _id, userId, exerciseId }, { session });
        return _id;
      },
    );
  }

  describe('el contador', () => {
    it('cuenta el total de la lista y, aparte, los propios', async () => {
      await seedManaged('usr_braian0001', 4);
      // Con nombre: el índice único (ownerId, name) de F1-02 rechaza dos propios sin nombre.
      await db
        .collection<{ _id: string; ownerId: string | null; name: string }>('exercises')
        .insertMany([
          { _id: 'exo_propio0001', ownerId: 'usr_braian0001', name: 'Wall ball' },
          { _id: 'exo_propio0002', ownerId: 'usr_braian0001', name: 'Box jump' },
          { _id: 'exo_catalogo01', ownerId: null, name: 'Back squat' },
          { _id: 'exo_deotro0001', ownerId: 'usr_amigo00001', name: 'Wall ball' },
        ]);

      const usage = await client.withSession((session) =>
        createMongoExerciseUsageCounter(db).count('usr_braian0001', session),
      );

      expect(usage).toEqual({ total: 4, custom: 2 });
    });
  });

  describe('concurrencia', () => {
    it('dos altas simultáneas con 9 ejercicios: entra una sola', async () => {
      await seedManaged('usr_braian0001', 9);

      const results = await Promise.allSettled([
        addManaged('usr_braian0001', 'exo_snatch000001'),
        addManaged('usr_braian0001', 'exo_thruster0001'),
      ]);

      const ok = results.filter((result) => result.status === 'fulfilled');
      const rejected = results.filter((result) => result.status === 'rejected');
      expect(ok).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(
        rejected.every(
          (result) => isAppError(result.reason) && result.reason.errorCode === 'WC-SUBS-403-001',
        ),
      ).toBe(true);
      expect(await managed().countDocuments({ userId: 'usr_braian0001' })).toBe(10);
    });

    it('cinco altas simultáneas con 8 ejercicios: entran exactamente dos', async () => {
      await seedManaged('usr_braian0001', 8);

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) =>
          addManaged('usr_braian0001', `exo_nuevo${String(i).padStart(6, '0')}`),
        ),
      );

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
      expect(await managed().countDocuments({ userId: 'usr_braian0001' })).toBe(10);
    });

    it('un usuario no le bloquea el cupo a otro', async () => {
      await seedManaged('usr_braian0001', 9);
      await seedManaged('usr_amigo00001', 9);

      const results = await Promise.allSettled([
        addManaged('usr_braian0001', 'exo_snatch000001'),
        addManaged('usr_amigo00001', 'exo_snatch000002'),
      ]);

      expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    });
  });

  describe('atomicidad', () => {
    it('si el trabajo falla después de insertar, no queda nada: todo o nada', async () => {
      await seedManaged('usr_braian0001', 2);

      await expect(
        withExerciseSlot(
          deps(),
          { userId: 'usr_braian0001', plan: 'free', isCustom: false },
          async (session: ClientSession) => {
            await managed().insertOne(
              { _id: 'mex_abortado001', userId: 'usr_braian0001', exerciseId: 'exo_x0000001' },
              { session },
            );
            throw new Error('falló la primera marca');
          },
        ),
      ).rejects.toThrow('falló la primera marca');

      expect(await managed().countDocuments({ userId: 'usr_braian0001' })).toBe(2);
    });

    it('el rechazo por límite no deja nada escrito', async () => {
      await seedManaged('usr_braian0001', 10);

      await expect(addManaged('usr_braian0001', 'exo_snatch000001')).rejects.toMatchObject({
        errorCode: 'WC-SUBS-403-001',
      });
      expect(await managed().countDocuments({ userId: 'usr_braian0001' })).toBe(10);
    });
  });
});
