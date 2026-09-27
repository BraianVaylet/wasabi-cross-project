import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20260927120000-retirar-tema.ts';

/*
 * F4-02 (ADR-0008): se retira el selector dark/light. Los documentos de `user_preferences`
 * que ya tenían `theme` se quedan sin ese campo; el resto de las preferencias no se toca.
 */

interface PreferencesRow {
  _id: string;
  theme?: string;
  loadPercentages: number[];
}

describe('migración: se retira la preferencia de tema', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('retirar_tema_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  function preferences() {
    return db.collection<PreferencesRow>('user_preferences');
  }

  beforeEach(async () => {
    await preferences().deleteMany({});
    await preferences().insertMany([
      { _id: 'usr_braian0001', theme: 'light', loadPercentages: [70, 80] },
      { _id: 'usr_amigo00001', theme: 'dark', loadPercentages: [65, 75, 80, 85, 90, 95] },
      // Uno que nunca cambió el tema: ya no tiene el campo, `up` no tiene nada que hacer.
      { _id: 'usr_sinTema0001', loadPercentages: [65, 75, 80, 85, 90, 95] },
    ]);
  });

  async function row(id: string): Promise<PreferencesRow | null> {
    return preferences().findOne({ _id: id });
  }

  it('saca `theme` de los documentos que lo tenían', async () => {
    await up(db);

    expect(await row('usr_braian0001')).not.toHaveProperty('theme');
    expect(await row('usr_amigo00001')).not.toHaveProperty('theme');
  });

  it('no toca el resto de las preferencias', async () => {
    await up(db);

    expect(await row('usr_braian0001')).toMatchObject({ loadPercentages: [70, 80] });
  });

  it('no rompe con un documento que ya no tenía `theme`', async () => {
    await up(db);

    expect(await row('usr_sinTema0001')).toMatchObject({
      loadPercentages: [65, 75, 80, 85, 90, 95],
    });
  });

  it('down repone el default anterior en lo que quedó sin tema', async () => {
    await up(db);
    await down(db);

    expect(await row('usr_braian0001')).toMatchObject({ theme: 'dark' });
    expect(await row('usr_amigo00001')).toMatchObject({ theme: 'dark' });
  });
});
