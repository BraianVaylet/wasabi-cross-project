import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20260922100000-capacidades-en-propios.ts';

/*
 * F2-02: los ejercicios propios que ya estaban cargados no tienen capacidades ni grupos
 * musculares. La migración los completa sin tocar el catálogo, y `down` los deja como
 * estaban.
 */

interface ExerciseRow {
  _id: string;
  ownerId: string | null;
  name: string;
  category: string;
  capacities?: string[];
  muscleGroups?: string[];
  bodySegment?: string;
}

describe('migración: capacidades en los ejercicios propios', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('capacidades_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  function exercises() {
    return db.collection<ExerciseRow>('exercises');
  }

  beforeEach(async () => {
    await exercises().deleteMany({});
    await exercises().insertMany([
      { _id: 'exo_propio01', ownerId: 'usr_braian0001', name: 'Wall ball', category: 'gimnastico' },
      { _id: 'exo_propio02', ownerId: 'usr_braian0001', name: 'Trote', category: 'running' },
      {
        _id: 'exo_catalogo',
        ownerId: null,
        name: 'Back squat',
        category: 'fuerza',
        capacities: ['fuerza'],
        muscleGroups: ['cuadriceps', 'gluteo'],
        bodySegment: 'tren_inferior',
      },
      // Uno del catálogo al que le faltan: lo completa el seed, no esta migración.
      { _id: 'exo_catviejo', ownerId: null, name: 'Clean', category: 'fuerza' },
    ]);
  });

  async function row(id: string): Promise<ExerciseRow | null> {
    return exercises().findOne({ _id: id });
  }

  it('completa los propios con la capacidad que se deduce de su categoría', async () => {
    await up(db);

    expect(await row('exo_propio01')).toMatchObject({
      capacities: ['fuerza'],
      muscleGroups: ['cuerpo_completo'],
      bodySegment: 'cuerpo_completo',
    });
    expect(await row('exo_propio02')).toMatchObject({ capacities: ['resistencia'] });
  });

  it('no toca el catálogo, que ya los trae del seed', async () => {
    await up(db);

    expect(await row('exo_catalogo')).toMatchObject({
      capacities: ['fuerza'],
      muscleGroups: ['cuadriceps', 'gluteo'],
      bodySegment: 'tren_inferior',
    });
    // Ni siquiera a uno del catálogo al que le falten: ese lo completa el seed.
    expect(await row('exo_catviejo')).not.toHaveProperty('capacities');
  });

  it('no pisa lo que el usuario ya eligió', async () => {
    await exercises().updateOne(
      { _id: 'exo_propio01' },
      {
        $set: { capacities: ['velocidad'], muscleGroups: ['gemelo'], bodySegment: 'tren_inferior' },
      },
    );

    await up(db);

    expect(await row('exo_propio01')).toMatchObject({
      capacities: ['velocidad'],
      muscleGroups: ['gemelo'],
    });
  });

  it('down los deja como estaban, y up de nuevo los vuelve a completar', async () => {
    await up(db);
    await down(db);

    const revertido = await row('exo_propio01');
    expect(revertido).not.toHaveProperty('capacities');
    expect(revertido).not.toHaveProperty('muscleGroups');
    expect(revertido).not.toHaveProperty('bodySegment');
    // El del catálogo sobrevive al down.
    expect(await row('exo_catalogo')).toMatchObject({ capacities: ['fuerza'] });

    await up(db);
    expect(await row('exo_propio01')).toMatchObject({ capacities: ['fuerza'] });
  });
});
