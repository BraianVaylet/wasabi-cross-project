import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20261003100000-fuera-locks-de-cupo.ts';

/*
 * El cupo de ejercicios se fue (ADR-0011): la colección de locks por usuario que lo
 * serializaba se borra, y volver atrás la deja vacía.
 */

describe('migración: fuera los locks del cupo', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('fuera_locks_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  async function hasLocks(): Promise<boolean> {
    return db.listCollections({ name: 'entitlement_locks' }).hasNext();
  }

  beforeEach(async () => {
    if (await hasLocks()) {
      await db.collection('entitlement_locks').drop();
    }
    await db
      .collection('entitlement_locks')
      .insertOne({ _id: 'usr_braian0001' as never, version: 7 });
  });

  it('borra la colección de locks', async () => {
    await up(db);

    expect(await hasLocks()).toBe(false);
  });

  it('no toca el resto de la base', async () => {
    await db.collection('managed_exercises').insertOne({ _id: 'mex_a1b2c3d4' as never });

    await up(db);

    expect(await db.collection('managed_exercises').countDocuments()).toBe(1);
  });

  it('correrla de nuevo, sin la colección, no falla', async () => {
    await up(db);

    await expect(up(db)).resolves.toBeUndefined();
  });

  it('down repone la colección, vacía: eran sólo coordinación', async () => {
    await up(db);
    await down(db);

    expect(await hasLocks()).toBe(true);
    expect(await db.collection('entitlement_locks').countDocuments()).toBe(0);
  });

  it('down con la colección ya creada no la pisa', async () => {
    await down(db);

    expect(await db.collection('entitlement_locks').countDocuments()).toBe(1);
  });
});
