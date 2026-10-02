import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20261002120000-disciplina-musculacion.ts';

/*
 * La disciplina "gimnasio" pasa a ser "musculación": cambia el elemento de `disciplines` en el
 * catálogo y en los ejercicios propios, sin tocar las otras disciplinas ni el orden.
 */

interface ExerciseRow {
  _id: string;
  ownerId: string | null;
  name: string;
  disciplines?: string[];
}

describe('migración: gimnasio pasa a musculación', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('disciplina_musculacion_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  function exercises() {
    return db.collection<ExerciseRow>('exercises');
  }

  async function disciplines(id: string): Promise<string[] | undefined> {
    return (await exercises().findOne({ _id: id }))?.disciplines;
  }

  beforeEach(async () => {
    await exercises().deleteMany({});
    await exercises().insertMany([
      { _id: 'exo_solo', ownerId: null, name: 'Press militar', disciplines: ['gimnasio'] },
      {
        _id: 'exo_varias',
        ownerId: null,
        name: 'Back squat',
        disciplines: ['crossfit', 'gimnasio', 'funcional'],
      },
      { _id: 'exo_propio', ownerId: 'usr_braian0001', name: 'Mío', disciplines: ['gimnasio'] },
      { _id: 'exo_otra', ownerId: null, name: 'Snatch', disciplines: ['crossfit'] },
      { _id: 'exo_vacio', ownerId: 'usr_braian0001', name: 'Sin disciplina', disciplines: [] },
      // De antes de F5-01, sin el campo.
      { _id: 'exo_viejo', ownerId: null, name: 'Clean' },
    ]);
  });

  it('cambia gimnasio por musculación en el catálogo y en los propios', async () => {
    await up(db);

    expect(await disciplines('exo_solo')).toEqual(['musculacion']);
    expect(await disciplines('exo_propio')).toEqual(['musculacion']);
  });

  it('conserva las otras disciplinas y el orden de la lista', async () => {
    await up(db);

    expect(await disciplines('exo_varias')).toEqual(['crossfit', 'musculacion', 'funcional']);
  });

  it('no toca a los que no tenían gimnasio, ni a los que no tienen el campo', async () => {
    await up(db);

    expect(await disciplines('exo_otra')).toEqual(['crossfit']);
    expect(await disciplines('exo_vacio')).toEqual([]);
    expect(await exercises().findOne({ _id: 'exo_viejo' })).not.toHaveProperty('disciplines');
  });

  it('correrla de nuevo no cambia nada', async () => {
    await up(db);
    await up(db);

    expect(await disciplines('exo_varias')).toEqual(['crossfit', 'musculacion', 'funcional']);
  });

  it('down vuelve a gimnasio; up de nuevo lo repone', async () => {
    await up(db);
    await down(db);

    expect(await disciplines('exo_solo')).toEqual(['gimnasio']);
    expect(await disciplines('exo_varias')).toEqual(['crossfit', 'gimnasio', 'funcional']);
    expect(await disciplines('exo_otra')).toEqual(['crossfit']);

    await up(db);
    expect(await disciplines('exo_solo')).toEqual(['musculacion']);
  });
});
