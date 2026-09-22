import type { ClientSession, Db, MongoClient } from 'mongodb';
import { MongoClient as Client } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMongoRecordGateway } from '../../records/infrastructure/mongo-record.gateway.ts';
import { withExerciseSlot } from '../../subscriptions/application/with-exercise-slot.ts';
import { createMongoUserSerializer } from '../../subscriptions/infrastructure/mongo-user-serializer.ts';
import { migrateUp } from '../../../shared/db/migrations.ts';
import type { ExerciseSlots, RecordsGateway } from '../domain/managed-exercise-ports.ts';
import { createMongoExerciseRepository } from './mongo-exercise.repository.ts';
import { createMongoManagedExerciseStore } from './mongo-managed-exercise.store.ts';
import { createMongoExerciseUsageCounter } from './mongo-usage-counter.ts';
import { addManagedExercise } from '../application/add-managed-exercise.ts';
import { deleteManagedExercise } from '../application/edit-managed-exercise.ts';
import { createMongoTransactionRunner } from '../../../shared/db/transactions.ts';
import { seedCatalog } from '../application/seed-catalog.ts';

/*
 * Todo o nada (F1-05): si la primera marca falla, no puede quedar ni el ejercicio
 * gestionado ni el ejercicio propio que se creó para él. Contra un replica set, porque la
 * garantía es de la transacción.
 */
describe('alta de ejercicio: atomicidad', () => {
  let replSet: MongoMemoryReplSet;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    client = await Client.connect(replSet.getUri());
    db = client.db('alta_test');
    await migrateUp(db, client);
    await seedCatalog(createMongoExerciseRepository(db));
  });

  afterAll(async () => {
    await client.close();
    await replSet.stop();
  });

  function deps(records: RecordsGateway<ClientSession>) {
    const counter = createMongoExerciseUsageCounter(db);
    const serializer = createMongoUserSerializer(client, db);
    const slots: ExerciseSlots<ClientSession> = {
      withSlot: (request, work) => withExerciseSlot({ serializer, counter }, request, work),
    };

    return { store: createMongoManagedExerciseStore(db), slots, records };
  }

  /** Una marca que falla después de que el ejercicio gestionado ya se insertó. */
  function failingRecords(): RecordsGateway<ClientSession> {
    const real = createMongoRecordGateway(db);
    return {
      logFirst: () => Promise.reject(new Error('falla forzada al guardar la marca')),
      currentFor: real.currentFor,
      deleteAllFor: real.deleteAllFor,
    };
  }

  it('uno propio: si falla la marca, no queda ni el ejercicio ni su entrada en la lista', async () => {
    await expect(
      addManagedExercise(deps(failingRecords()), {
        userId: 'usr_atomico0001',
        plan: 'free',
        input: {
          source: 'custom',
          name: 'Wall ball',
          category: 'gimnastico',
          capacities: ['fuerza'],
          muscleGroups: ['hombro'],
          level: 'principiante',
          withPain: false,
          firstRecord: { value: 30 },
        },
      }),
    ).rejects.toThrow('falla forzada');

    expect(await db.collection('exercises').countDocuments({ ownerId: 'usr_atomico0001' })).toBe(0);
    expect(
      await db.collection('managed_exercises').countDocuments({ userId: 'usr_atomico0001' }),
    ).toBe(0);
    expect(await db.collection('records').countDocuments({ userId: 'usr_atomico0001' })).toBe(0);
  });

  it('uno del catálogo: si falla la marca, no queda en la lista', async () => {
    const snatch = await createMongoExerciseRepository(db).findCatalogByName('Snatch');

    await expect(
      addManagedExercise(deps(failingRecords()), {
        userId: 'usr_atomico0002',
        plan: 'free',
        input: {
          source: 'catalog',
          exerciseId: snatch?.id ?? 'exo_inexistente0',
          level: 'intermedio',
          withPain: false,
          firstRecord: { value: 60 },
        },
      }),
    ).rejects.toThrow('falla forzada');

    expect(
      await db.collection('managed_exercises').countDocuments({ userId: 'usr_atomico0002' }),
    ).toBe(0);
  });

  it('con la marca funcionando, quedan las tres cosas', async () => {
    const summary = await addManagedExercise(deps(createMongoRecordGateway(db)), {
      userId: 'usr_atomico0003',
      plan: 'free',
      input: {
        source: 'custom',
        name: 'Sled push',
        category: 'fuerza',
        capacities: ['fuerza'],
        muscleGroups: ['hombro'],
        level: 'avanzado',
        withPain: true,
        notes: 'Con el trineo del box',
        firstRecord: { value: 80, performedAt: '2026-09-10T09:00:00-03:00', notes: 'buen día' },
      },
    });

    expect(summary).toMatchObject({
      isCustom: true,
      withPain: true,
      notes: 'Con el trineo del box',
      // Normalizada a UTC: -03:00 → Z.
      current: { value: 80, unit: 'kg', performedAt: '2026-09-10T12:00:00.000Z' },
    });
    expect(await db.collection('records').countDocuments({ userId: 'usr_atomico0003' })).toBe(1);
  });

  it('borrar: si falla a mitad de camino, no se pierde ninguna marca', async () => {
    const records = createMongoRecordGateway(db);
    const created = await addManagedExercise(deps(records), {
      userId: 'usr_atomico0004',
      plan: 'free',
      input: {
        source: 'custom',
        name: 'Yoke carry',
        category: 'fuerza',
        capacities: ['fuerza'],
        muscleGroups: ['hombro'],
        level: 'avanzado',
        withPain: false,
        firstRecord: { value: 120 },
      },
    });

    // Las marcas se borran primero; después falla el borrado del ejercicio gestionado.
    const store = createMongoManagedExerciseStore(db);
    const failingStore = {
      ...store,
      deleteManaged: () => Promise.reject(new Error('falla forzada al borrar')),
    };

    await expect(
      deleteManagedExercise(
        { store: failingStore, records, transactions: createMongoTransactionRunner(client) },
        { userId: 'usr_atomico0004', managedExerciseId: created.id },
      ),
    ).rejects.toThrow('falla forzada al borrar');

    expect(await db.collection('records').countDocuments({ managedExerciseId: created.id })).toBe(
      1,
    );
    expect(
      await db.collection('managed_exercises').countDocuments({ userId: 'usr_atomico0004' }),
    ).toBe(1);
  });
});
