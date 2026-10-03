import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20261003120000-plan-pro.ts';

/*
 * El plan Max pasa a llamarse Pro: cambia el valor de `plan` en los usuarios de Better Auth, y
 * sólo ése. Los Free y los documentos sin plan quedan como estaban.
 */

interface UserRow {
  _id: string;
  email: string;
  plan?: string;
}

describe('migración: el plan Max pasa a Pro', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('plan_pro_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  function users() {
    return db.collection<UserRow>('user');
  }

  async function planOf(id: string): Promise<string | undefined> {
    return (await users().findOne({ _id: id }))?.plan;
  }

  beforeEach(async () => {
    await users().deleteMany({});
    await users().insertMany([
      { _id: 'usr_max0000001', email: 'max@example.com', plan: 'max' },
      { _id: 'usr_max0000002', email: 'otro-max@example.com', plan: 'max' },
      { _id: 'usr_free000001', email: 'free@example.com', plan: 'free' },
      // De antes de que existiera el campo.
      { _id: 'usr_viejo00001', email: 'viejo@example.com' },
    ]);
  });

  it('pasa los Max a Pro', async () => {
    await up(db);

    expect(await planOf('usr_max0000001')).toBe('pro');
    expect(await planOf('usr_max0000002')).toBe('pro');
  });

  it('no toca a los Free ni a los que no tienen plan', async () => {
    await up(db);

    expect(await planOf('usr_free000001')).toBe('free');
    expect(await users().findOne({ _id: 'usr_viejo00001' })).not.toHaveProperty('plan');
  });

  it('correrla de nuevo no cambia nada', async () => {
    await up(db);
    await up(db);

    expect(await planOf('usr_max0000001')).toBe('pro');
    expect(await planOf('usr_free000001')).toBe('free');
  });

  it('down vuelve a Max; up de nuevo lo repone', async () => {
    await up(db);
    await down(db);

    expect(await planOf('usr_max0000001')).toBe('max');
    expect(await planOf('usr_free000001')).toBe('free');

    await up(db);
    expect(await planOf('usr_max0000001')).toBe('pro');
  });
});
