import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrateDown, migrateUp, migrationsProbe, pendingMigrations } from './migrations.ts';

async function indexNames(db: Db, collection: string): Promise<string[]> {
  const exists = await db.listCollections({ name: collection }).hasNext();
  if (!exists) {
    return [];
  }

  return (await db.collection(collection).indexes()).map((index) => String(index.name));
}

describe('migraciones', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('migraciones_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  it('en una base vacía, todas las migraciones están pendientes', async () => {
    const pending = await pendingMigrations(db);

    expect(pending.length).toBeGreaterThan(0);
  });

  it('con migraciones pendientes, la instancia no está lista para recibir tráfico', async () => {
    const probe = migrationsProbe(db);

    expect(probe.name).toBe('migraciones');
    await expect(probe.check()).resolves.toBe(false);
  });

  it('up aplica todas las migraciones y crea los índices', async () => {
    const applied = await migrateUp(db, client);

    expect(applied.length).toBeGreaterThan(0);
    expect(await pendingMigrations(db)).toEqual([]);
    expect(await indexNames(db, 'exercises')).toContain('owner_name_unique');
    expect(await indexNames(db, 'managed_exercises')).toContain('user_exercise_unique');
  });

  it('con todo migrado, la instancia está lista', async () => {
    await expect(migrationsProbe(db).check()).resolves.toBe(true);
  });

  it('correr up de nuevo no hace nada', async () => {
    await expect(migrateUp(db, client)).resolves.toEqual([]);
  });

  it('el índice de ejercicios gestionados impide agregar dos veces el mismo ejercicio', async () => {
    const managed = db.collection<{ _id: string; userId: string; exerciseId: string }>(
      'managed_exercises',
    );
    await managed.insertOne({ _id: 'mex_a1b2c3d4', userId: 'usr_braian0001', exerciseId: 'exo_1' });

    await expect(
      managed.insertOne({ _id: 'mex_z9y8x7w6', userId: 'usr_braian0001', exerciseId: 'exo_1' }),
    ).rejects.toThrow(/duplicate key/);

    // Otro usuario con el mismo ejercicio, sí.
    await expect(
      managed.insertOne({ _id: 'mex_q1w2e3r4', userId: 'usr_amigo00001', exerciseId: 'exo_1' }),
    ).resolves.toBeDefined();

    await managed.deleteMany({});
  });

  it('down revierte la última migración y saca sus índices', async () => {
    const reverted = await migrateDown(db, client);

    expect(reverted).toHaveLength(1);
    expect(await pendingMigrations(db)).toEqual(reverted);
    expect(await indexNames(db, 'exercises')).not.toContain('owner_name_unique');
    expect(await indexNames(db, 'managed_exercises')).not.toContain('user_exercise_unique');
  });

  it('up de nuevo después de down deja todo como estaba', async () => {
    await migrateUp(db, client);

    expect(await pendingMigrations(db)).toEqual([]);
    expect(await indexNames(db, 'exercises')).toContain('owner_name_unique');
    expect(await indexNames(db, 'managed_exercises')).toContain('user_exercise_unique');
  });

  it('no mezcla modos: si la base se migró con los .js compilados, desde src se niega', async () => {
    // migrate-mongo registra cada migración con su extensión. Si una base se migró desde
    // `dist/` (.js) y después se corre desde `src/` (.ts), vería todo como pendiente y
    // aplicaría dos veces las mismas migraciones.
    const changelog = db.collection('migrations_changelog');
    await changelog.insertOne({
      fileName: '20260918120000-indices-ejercicios.js',
      appliedAt: new Date(),
    });

    await expect(migrateUp(db, client)).rejects.toThrow(/se migró con archivos \.js/);
    await expect(pendingMigrations(db)).rejects.toThrow(/se migró con archivos \.js/);
    await expect(migrationsProbe(db).check()).resolves.toBe(false);

    await changelog.deleteOne({ fileName: '20260918120000-indices-ejercicios.js' });
    await expect(migrateUp(db, client)).resolves.toEqual([]);
  });

  it('si la base no responde, el probe dice que no está lista en vez de romper', async () => {
    const offline = new MongoClient('mongodb://127.0.0.1:1', { serverSelectionTimeoutMS: 200 });

    await expect(migrationsProbe(offline.db('x')).check()).resolves.toBe(false);
    await offline.close();
  });
});
