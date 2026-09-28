import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20260928120000-grupo-primario.ts';

/*
 * F5-01: cada ejercicio pasa a tener un grupo primario, y el segmento sale sólo de él. Los
 * que ya estaban toman el primero de su lista; `down` vuelve a la regla de antes.
 */

interface ExerciseRow {
  _id: string;
  ownerId: string | null;
  name: string;
  muscleGroups?: string[];
  bodySegment?: string;
  primaryMuscleGroup?: string;
  disciplines?: string[];
  equipment?: string;
  catalogKey?: string;
}

describe('migración: grupo primario y disciplinas', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('grupo_primario_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  function exercises() {
    return db.collection<ExerciseRow>('exercises');
  }

  async function row(id: string): Promise<ExerciseRow | null> {
    return exercises().findOne({ _id: id });
  }

  beforeEach(async () => {
    await exercises().deleteMany({});
    await exercises().insertMany([
      {
        _id: 'exo_catalogo',
        ownerId: null,
        name: 'Back squat',
        muscleGroups: ['cuadriceps', 'gluteo', 'core'],
        // Con la regla vieja, mezclar core con tren inferior daba cuerpo completo.
        bodySegment: 'cuerpo_completo',
      },
      {
        _id: 'exo_propio01',
        ownerId: 'usr_braian0001',
        name: 'Press con pausa',
        muscleGroups: ['pectoral', 'triceps'],
        bodySegment: 'tren_superior',
      },
      // Uno del catálogo sin grupos, de antes de F2-02: lo completa el seed, no esta migración.
      { _id: 'exo_catviejo', ownerId: null, name: 'Clean' },
    ]);
  });

  it('el primario es el primero de la lista, y el segmento sale de él', async () => {
    await up(db);

    expect(await row('exo_catalogo')).toMatchObject({
      primaryMuscleGroup: 'cuadriceps',
      bodySegment: 'tren_inferior',
      disciplines: [],
    });
    expect(await row('exo_propio01')).toMatchObject({
      primaryMuscleGroup: 'pectoral',
      bodySegment: 'tren_superior',
      disciplines: [],
    });
  });

  it('no toca a uno sin grupos: no hay de dónde sacar el primario', async () => {
    await up(db);

    expect(await row('exo_catviejo')).not.toHaveProperty('primaryMuscleGroup');
  });

  it('un grupo que el mapa no conoce cae en cuerpo completo, a la ida y a la vuelta', async () => {
    // Una base tocada a mano, con un grupo que el schema nunca tuvo y otro sin ninguno: la
    // migración no inventa un segmento más preciso que el más genérico.
    await exercises().insertMany([
      { _id: 'exo_rarito01', ownerId: 'usr_braian0001', name: 'Raro', muscleGroups: ['aductor'] },
      { _id: 'exo_vacio001', ownerId: 'usr_braian0001', name: 'Vacío', muscleGroups: [] },
    ]);

    await up(db);
    expect(await row('exo_rarito01')).toMatchObject({
      primaryMuscleGroup: 'aductor',
      bodySegment: 'cuerpo_completo',
    });
    expect(await row('exo_vacio001')).not.toHaveProperty('primaryMuscleGroup');

    await down(db);
    expect(await row('exo_rarito01')).toMatchObject({ bodySegment: 'cuerpo_completo' });
    expect(await row('exo_vacio001')).toMatchObject({ bodySegment: 'cuerpo_completo' });
  });

  it('no pisa un primario que ya está, ni las disciplinas', async () => {
    await exercises().updateOne(
      { _id: 'exo_catalogo' },
      { $set: { primaryMuscleGroup: 'gluteo', disciplines: ['gimnasio'] } },
    );

    await up(db);

    expect(await row('exo_catalogo')).toMatchObject({
      primaryMuscleGroup: 'gluteo',
      disciplines: ['gimnasio'],
    });
  });

  it('down vuelve a la regla vieja y saca los campos nuevos; up de nuevo los repone', async () => {
    await up(db);
    await exercises().updateOne(
      { _id: 'exo_catalogo' },
      { $set: { equipment: 'barra', catalogKey: 'back-squat' } },
    );

    await down(db);

    const revertido = await row('exo_catalogo');
    expect(revertido).toMatchObject({ bodySegment: 'cuerpo_completo' });
    for (const campo of ['primaryMuscleGroup', 'disciplines', 'equipment', 'catalogKey']) {
      expect(revertido).not.toHaveProperty(campo);
    }
    expect(await row('exo_propio01')).toMatchObject({ bodySegment: 'tren_superior' });

    await up(db);
    expect(await row('exo_catalogo')).toMatchObject({
      primaryMuscleGroup: 'cuadriceps',
      bodySegment: 'tren_inferior',
    });
  });
});
