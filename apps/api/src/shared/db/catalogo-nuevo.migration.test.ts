import { MongoClient, type Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { down, up } from '../../migrations/20260928130000-catalogo-nuevo.ts';
import { seedCatalog } from '../../modules/exercises/application/seed-catalog.ts';
import { EXERCISE_CATALOG } from '../../modules/exercises/domain/catalog.ts';
import { createMongoExerciseRepository } from '../../modules/exercises/infrastructure/mongo-exercise.repository.ts';

/*
 * F5-06: fuera el catálogo viejo. Se borra lo que no sobrevive al reemplazo —con lo gestionado
 * y las marcas que apuntan a ello—, los propios no se tocan, y queda un índice único por clave.
 */

interface ExerciseRow {
  _id: string;
  ownerId: string | null;
  name: string;
  category?: string;
  catalogKey?: string;
}

const KEY_INDEX = {
  unique: true,
  name: 'catalog_key_unique',
  partialFilterExpression: { catalogKey: { $type: 'string' } },
} as const;

describe('migración: fuera el catálogo viejo', () => {
  let mongod: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = await MongoClient.connect(mongod.getUri());
    db = client.db('catalogo_nuevo_test');
  });

  afterAll(async () => {
    await client.close();
    await mongod.stop();
  });

  const exercises = () => db.collection<ExerciseRow>('exercises');
  const managed = () => db.collection<{ _id: string; exerciseId: string }>('managed_exercises');
  const records = () => db.collection<{ _id: string; managedExerciseId: string }>('records');

  async function exerciseIds(): Promise<string[]> {
    return (await exercises().find().toArray()).map((row) => row._id).sort();
  }

  beforeEach(async () => {
    await db.dropDatabase();
    await exercises().insertMany([
      // Del catálogo de la Fase 0, sin clave.
      { _id: 'exo_viejosinclave', ownerId: null, name: 'Back squat' },
      // Con la clave de una versión intermedia que ya no está en el catálogo.
      { _id: 'exo_viejoconclave', ownerId: null, name: 'Butterfly', catalogKey: 'butterfly' },
      // La clave sigue, pero la categoría cambió: sus marcas quedarían en otra unidad.
      {
        _id: 'exo_categoriaotra',
        ownerId: null,
        name: 'Thruster',
        catalogKey: 'thruster',
        category: 'fuerza',
      },
      // Sobrevive: misma clave y misma categoría.
      {
        _id: 'exo_sobrevive001',
        ownerId: null,
        name: 'Snatch',
        catalogKey: 'snatch',
        category: 'fuerza',
      },
      { _id: 'exo_propio000001', ownerId: 'usr_braian0001', name: 'Sentadilla del garage' },
    ]);
    await managed().insertMany([
      { _id: 'mex_sobreviejo01', exerciseId: 'exo_viejosinclave' },
      { _id: 'mex_sobrethruster', exerciseId: 'exo_categoriaotra' },
      { _id: 'mex_sobresnatch01', exerciseId: 'exo_sobrevive001' },
      { _id: 'mex_sobrepropio01', exerciseId: 'exo_propio000001' },
    ]);
    await records().insertMany([
      { _id: 'rec_viejo0000001', managedExerciseId: 'mex_sobreviejo01' },
      { _id: 'rec_viejo0000002', managedExerciseId: 'mex_sobreviejo01' },
      { _id: 'rec_thruster0001', managedExerciseId: 'mex_sobrethruster' },
      { _id: 'rec_snatch000001', managedExerciseId: 'mex_sobresnatch01' },
      { _id: 'rec_propio000001', managedExerciseId: 'mex_sobrepropio01' },
    ]);
  });

  describe('up', () => {
    it('borra el viejo con su gestionado y sus marcas, y el propio sigue intacto', async () => {
      await up(db);

      expect(await exercises().findOne({ _id: 'exo_viejosinclave' })).toBeNull();
      expect(await managed().findOne({ _id: 'mex_sobreviejo01' })).toBeNull();
      expect(await records().countDocuments({ managedExerciseId: 'mex_sobreviejo01' })).toBe(0);

      expect(await exercises().findOne({ _id: 'exo_propio000001' })).toMatchObject({
        name: 'Sentadilla del garage',
      });
      expect(await managed().findOne({ _id: 'mex_sobrepropio01' })).not.toBeNull();
      expect(await records().findOne({ _id: 'rec_propio000001' })).not.toBeNull();
    });

    it('borra el de una clave que ya no está en el catálogo', async () => {
      await up(db);

      expect(await exercises().findOne({ _id: 'exo_viejoconclave' })).toBeNull();
    });

    it('borra el que cambia de categoría, con lo que apunta a él', async () => {
      await up(db);

      expect(await exercises().findOne({ _id: 'exo_categoriaotra' })).toBeNull();
      expect(await managed().findOne({ _id: 'mex_sobrethruster' })).toBeNull();
      expect(await records().findOne({ _id: 'rec_thruster0001' })).toBeNull();
    });

    it('conserva el de la misma clave y categoría, con su gestionado y sus marcas', async () => {
      await up(db);

      expect(await exercises().findOne({ _id: 'exo_sobrevive001' })).not.toBeNull();
      expect(await managed().findOne({ _id: 'mex_sobresnatch01' })).not.toBeNull();
      expect(await records().findOne({ _id: 'rec_snatch000001' })).not.toBeNull();
    });

    it('se puede correr de nuevo sin borrar nada más', async () => {
      await up(db);
      await exercises().dropIndex('catalog_key_unique');
      const antes = await exerciseIds();

      await up(db);

      expect(await exerciseIds()).toEqual(antes);
    });

    it('en una base sin catálogo, sólo crea el índice', async () => {
      await db.dropDatabase();

      await up(db);

      expect(await exercises().countDocuments()).toBe(0);
      expect((await exercises().indexes()).map((index) => index.name)).toContain(
        'catalog_key_unique',
      );
    });

    it('el índice impide dos ejercicios del catálogo con la misma clave', async () => {
      await up(db);

      await expect(
        exercises().insertOne({
          _id: 'exo_repetido0001',
          ownerId: null,
          name: 'Otro',
          catalogKey: 'snatch',
        }),
      ).rejects.toThrow(/duplicate key/);
    });

    it('el índice deja que los propios no tengan clave, todos los que hagan falta', async () => {
      await up(db);

      await exercises().insertMany([
        { _id: 'exo_propio000002', ownerId: 'usr_braian0001', name: 'Otro propio' },
        { _id: 'exo_propio000003', ownerId: 'usr_amigo00001', name: 'Otro propio' },
      ]);

      expect(await exercises().countDocuments({ ownerId: { $ne: null } })).toBe(3);
    });
  });

  describe('con el seed nuevo (F5-05)', () => {
    it('migrar y sembrar deja los 62, y el que sobrevivió conserva su ID con el nombre nuevo', async () => {
      const back = EXERCISE_CATALOG.find((exercise) => exercise.catalogKey === 'back-squat');
      if (!back) throw new Error('el catálogo no tiene back-squat');
      // Un Back squat de la versión anterior: la misma clave y categoría, con el nombre viejo.
      await exercises().insertOne({
        _id: 'exo_backsquat0001',
        ownerId: null,
        ...back,
        name: 'Back squat',
        bodySegment: 'tren_inferior',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:00:00.000Z',
      } as never);
      await managed().insertOne({ _id: 'mex_backsquat0001', exerciseId: 'exo_backsquat0001' });
      // El Snatch mínimo de las fixtures no es un documento completo: el seed lo leería y fallaría.
      await exercises().deleteOne({ _id: 'exo_sobrevive001' });

      await up(db);
      const report = await seedCatalog(createMongoExerciseRepository(db));

      expect(report.created).toHaveLength(EXERCISE_CATALOG.length - 1);
      expect(report.updated).toEqual(['Sentadilla trasera']);
      expect(await exercises().countDocuments({ ownerId: null })).toBe(EXERCISE_CATALOG.length);
      expect(await exercises().findOne({ _id: 'exo_backsquat0001' })).toMatchObject({
        name: 'Sentadilla trasera',
      });
      expect(await managed().findOne({ _id: 'mex_backsquat0001' })).not.toBeNull();
    });
  });

  describe('down', () => {
    it('quita el índice y vuelve a poner el catálogo viejo', async () => {
      await up(db);

      await down(db);

      const catalog = await exercises().find({ ownerId: null }).toArray();
      expect(catalog.map((row) => row.name)).toEqual(
        expect.arrayContaining(['Back squat', 'Front squat', 'Butterfly']),
      );
      expect(catalog.length).toBeGreaterThanOrEqual(33);
      expect((await exercises().indexes()).map((index) => index.name)).not.toContain(
        'catalog_key_unique',
      );
    });

    it('no repite uno que ya está, ni por clave ni por nombre', async () => {
      await up(db);
      await down(db);
      const despues = await exercises().countDocuments({ ownerId: null });

      // Un segundo `down` falla porque ya no hay índice: se lo recrea para repetirlo.
      await exercises().createIndex({ catalogKey: 1 }, KEY_INDEX);
      await down(db);

      expect(await exercises().countDocuments({ ownerId: null })).toBe(despues);
    });

    it('no devuelve los gestionados ni las marcas que se borraron', async () => {
      await up(db);
      await down(db);

      expect(await managed().findOne({ _id: 'mex_sobreviejo01' })).toBeNull();
      expect(await records().findOne({ _id: 'rec_viejo0000001' })).toBeNull();
    });

    it('no toca los propios', async () => {
      await up(db);
      await down(db);

      expect(await exercises().findOne({ _id: 'exo_propio000001' })).not.toBeNull();
    });
  });
});
