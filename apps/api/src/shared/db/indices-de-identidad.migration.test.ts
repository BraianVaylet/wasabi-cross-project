import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20261005100000-indices-de-identidad.ts';

/*
 * Índices únicos de la identidad (F9-05, ADR-0012). Better Auth no crea índices, y la identidad de
 * una persona es el par (proveedor, id del proveedor): sin un índice único, dos callbacks
 * simultáneos del mismo ingreso nuevo pueden crear dos cuentas. El email también: con la vinculación
 * apagada, un email repetido es justo lo que no tiene que pasar.
 */

describe('migración: índices únicos de la identidad', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('indices_identidad_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  const accounts = () => db.collection('account');
  const users = () => db.collection('user');

  async function indexNames(collection: string): Promise<string[]> {
    return (await db.collection(collection).indexes()).map((index) => String(index.name));
  }

  beforeEach(async () => {
    await db.dropDatabase();
  });

  const account = (id: string, providerId: string, accountId: string) => ({
    _id: id as never,
    userId: 'usr_1',
    providerId,
    accountId,
  });

  it('crea el índice único (providerId, accountId) en `account` y el de `email` en `user`', async () => {
    await up(db);

    expect(await indexNames('account')).toContain('account_provider_account');
    expect(await indexNames('user')).toContain('user_email');
  });

  it('no deja crear dos cuentas con el mismo proveedor y el mismo id', async () => {
    await up(db);
    await accounts().insertOne(account('acc_1', 'google', 'sub-1'));

    await expect(accounts().insertOne(account('acc_2', 'google', 'sub-1'))).rejects.toThrow(
      /duplicate key/i,
    );
    expect(await accounts().countDocuments()).toBe(1);
  });

  it('el mismo id en otro proveedor, o otro id en el mismo, son cuentas distintas', async () => {
    await up(db);
    await accounts().insertOne(account('acc_1', 'google', 'sub-1'));

    await accounts().insertOne(account('acc_2', 'microsoft', 'sub-1'));
    await accounts().insertOne(account('acc_3', 'google', 'sub-2'));

    expect(await accounts().countDocuments()).toBe(3);
  });

  it('no deja crear dos usuarios con el mismo email', async () => {
    await up(db);
    await users().insertOne({ _id: 'usr_1' as never, email: 'ana@example.com' });

    await expect(
      users().insertOne({ _id: 'usr_2' as never, email: 'ana@example.com' }),
    ).rejects.toThrow(/duplicate key/i);
  });

  it('correrla de nuevo no falla ni cambia nada', async () => {
    await up(db);
    await up(db);

    expect(await indexNames('account')).toContain('account_provider_account');
    expect((await indexNames('user')).filter((name) => name === 'user_email')).toHaveLength(1);
  });

  it('revertirla saca los dos índices, y entonces los repetidos vuelven a entrar', async () => {
    await up(db);
    await down(db);

    expect(await indexNames('account')).not.toContain('account_provider_account');
    expect(await indexNames('user')).not.toContain('user_email');

    await accounts().insertOne(account('acc_1', 'google', 'sub-1'));
    await accounts().insertOne(account('acc_2', 'google', 'sub-1'));
    expect(await accounts().countDocuments()).toBe(2);
  });

  it('revertirla dos veces no falla', async () => {
    await up(db);
    await down(db);

    await expect(down(db)).resolves.toBeUndefined();
  });

  it('revertirla sin haberla corrido tampoco falla: las colecciones ni existen', async () => {
    await expect(down(db)).resolves.toBeUndefined();
  });

  it('al reaplicarla después de revertirla, vuelve a proteger', async () => {
    await up(db);
    await down(db);
    await up(db);
    await accounts().insertOne(account('acc_1', 'google', 'sub-1'));

    await expect(accounts().insertOne(account('acc_2', 'google', 'sub-1'))).rejects.toThrow(
      /duplicate key/i,
    );
  });

  it('con datos repetidos de antes, falla fuerte en vez de dejar un índice a medias', async () => {
    await accounts().insertOne(account('acc_1', 'google', 'sub-1'));
    await accounts().insertOne(account('acc_2', 'google', 'sub-1'));

    await expect(up(db)).rejects.toThrow(/duplicate key/i);
  });
});
