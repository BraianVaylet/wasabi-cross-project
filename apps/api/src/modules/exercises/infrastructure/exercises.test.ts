import {
  bodySegmentFor,
  catalogExerciseDefinitionSchema,
  exerciseSchema,
  measureKindFor,
} from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXERCISE_CATALOG } from '../domain/catalog.ts';
import { seedCatalog } from '../application/seed-catalog.ts';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import {
  EXERCISES_COLLECTION,
  createMongoExerciseRepository,
} from './mongo-exercise.repository.ts';

/** Primera entrada del catálogo, sin `!`: si el catálogo está vacío es un bug real. */
function firstCatalogExercise() {
  const [first] = EXERCISE_CATALOG;

  if (!first) {
    throw new Error('EXERCISE_CATALOG está vacío');
  }

  return first;
}

describe('catálogo de ejercicios', () => {
  let harness: TestHarness;
  let cookie: string;

  beforeAll(async () => {
    harness = await startTestApi();

    const signUp = await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        email: 'atleta@example.com',
        password: 'una-frase-larga-y-propia',
        name: 'Atleta',
      }),
    });
    cookie = cookiesFrom(signUp.headers);
  });

  afterAll(async () => {
    await harness.stop();
  });

  describe('el catálogo del código', () => {
    it('cada entrada es una definición de catálogo completa, con lo que pide Estadísticas', () => {
      for (const definition of EXERCISE_CATALOG) {
        const result = catalogExerciseDefinitionSchema.safeParse(definition);

        expect(result.success, `${definition.name}: ${result.error?.message ?? ''}`).toBe(true);
      }
    });

    it('cada entrada, guardada, es un ejercicio válido según el schema compartido', () => {
      for (const definition of EXERCISE_CATALOG) {
        const result = exerciseSchema.safeParse({
          id: 'exo_a1b2c3d4',
          ownerId: null,
          createdAt: '2026-09-17T14:03:11.412Z',
          updatedAt: '2026-09-17T14:03:11.412Z',
          ...definition,
          bodySegment: bodySegmentFor(definition.primaryMuscleGroup),
        });

        expect(result.success, `${definition.name}: ${result.error?.message ?? ''}`).toBe(true);
      }
    });

    it('son los 62 de la spec §5.3', () => {
      expect(EXERCISE_CATALOG).toHaveLength(62);
    });

    it('la hipertrofia se mide en repeticiones con su peso, como en el Home del mockup 4', () => {
      const pressBanca = EXERCISE_CATALOG.find((exercise) => exercise.name === 'Press banca plano');

      expect(pressBanca && measureKindFor(pressBanca.category)).toBe('weighted_reps');
    });

    it('no incluye la plancha: ninguna categoría la mide en tiempo', () => {
      expect(EXERCISE_CATALOG.map((exercise) => exercise.name)).not.toContain('Plancha');
    });

    it('no hay nombres ni claves repetidos: la clave es la del seed y el nombre, el del índice', () => {
      const names = EXERCISE_CATALOG.map((exercise) => exercise.name);
      const keys = EXERCISE_CATALOG.map((exercise) => exercise.catalogKey);

      expect(new Set(names).size).toBe(names.length);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('el mismo Sled Push en funcional y en Hyrox son dos ejercicios que se miden distinto', () => {
      const porClave = (key: string) =>
        EXERCISE_CATALOG.find((exercise) => exercise.catalogKey === key);

      expect(porClave('sled-push')).toMatchObject({ category: 'hipertrofia' });
      expect(porClave('sled-push-hyrox')).toMatchObject({ category: 'distancia_carga' });
    });

    it('no hay carreras de distancia variable: "mejor marca" sólo compara carreras iguales', () => {
      const running = EXERCISE_CATALOG.filter((exercise) => exercise.category === 'running').map(
        (exercise) => exercise.name,
      );

      expect(running).toEqual([
        'Carrera 1km (estación Hyrox)',
        'Carrera 100 m',
        'Carrera 400 m',
        'Carrera 1 km',
        'Carrera 5 km',
        'Carrera 10 km',
      ]);
    });

    it('cubre las seis categorías', () => {
      const categories = new Set(EXERCISE_CATALOG.map((exercise) => exercise.category));

      expect(categories).toEqual(
        new Set(['fuerza', 'hipertrofia', 'gimnastico', 'running', 'cardio', 'distancia_carga']),
      );
    });

    it('cubre todas las formas de medir', () => {
      const kinds = new Set(EXERCISE_CATALOG.map((exercise) => measureKindFor(exercise.category)));

      expect(kinds.size).toBe(6);
    });
  });

  describe('seed contra Mongo', () => {
    it('carga el catálogo completo', async () => {
      const repository = createMongoExerciseRepository(harness.mongo.db);

      const report = await seedCatalog(repository);

      expect(report.created).toHaveLength(EXERCISE_CATALOG.length);
      expect(await repository.findCatalog()).toHaveLength(EXERCISE_CATALOG.length);
    });

    it('correrlo de nuevo no duplica ejercicios', async () => {
      const repository = createMongoExerciseRepository(harness.mongo.db);

      const report = await seedCatalog(repository);

      expect(report.created).toEqual([]);
      expect(report.unchanged).toHaveLength(EXERCISE_CATALOG.length);
      expect(await repository.findCatalog()).toHaveLength(EXERCISE_CATALOG.length);
    });

    it('el índice único bloquea un duplicado aunque se inserte por fuera del seed', async () => {
      const repository = createMongoExerciseRepository(harness.mongo.db);

      await expect(repository.insertCatalogExercise(firstCatalogExercise())).rejects.toThrow();
    });

    it('una definición cambiada en el código actualiza el documento, no crea otro', async () => {
      const repository = createMongoExerciseRepository(harness.mongo.db);
      const original = firstCatalogExercise();

      const report = await seedCatalog(repository, [
        { ...original, capacities: ['fuerza', 'resistencia'] },
      ]);
      const stored = await repository.findCatalogByName(original.name);

      expect(report.updated).toEqual([original.name]);
      expect(stored?.capacities).toEqual(['fuerza', 'resistencia']);
      expect(await repository.findCatalog()).toHaveLength(EXERCISE_CATALOG.length);

      // Se deja como estaba, para no ensuciar los tests que vienen después.
      await seedCatalog(repository, [original]);
    });

    it('actualizar un ejercicio que no existe falla en vez de crear uno en silencio', async () => {
      const repository = createMongoExerciseRepository(harness.mongo.db);

      await expect(
        repository.updateCatalogExercise('exo_noexiste00000', firstCatalogExercise()),
      ).rejects.toThrow(/exo_noexiste00000/);
    });

    it('el documento guardado no lleva tags ni medición: son del usuario o se derivan', async () => {
      const stored = await harness.mongo.db
        .collection<{ _id: string }>(EXERCISES_COLLECTION)
        .findOne({ name: firstCatalogExercise().name });

      expect(stored).not.toBeNull();
      expect(stored).not.toHaveProperty('tags');
      expect(stored).not.toHaveProperty('kind');
      expect(stored).not.toHaveProperty('notes');
    });

    it('los ejercicios del catálogo no tienen dueño y llevan ID con prefijo', async () => {
      const exercises = await createMongoExerciseRepository(harness.mongo.db).findCatalog();

      for (const exercise of exercises) {
        expect(exercise.ownerId).toBeNull();
        expect(exercise.id).toMatch(/^exo_/);
      }
    });
  });

  describe('GET /api/v1/exercises/catalog', () => {
    it('sin sesión responde 401', async () => {
      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/exercises/catalog',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ errorCode: 'WC-AUTH-401-004' });
    });

    it('un usuario nuevo ve el catálogo pre-cargado sin haber cargado nada', async () => {
      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/exercises/catalog',
        headers: { cookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<{ exercises: unknown[] }>().exercises).toHaveLength(
        EXERCISE_CATALOG.length,
      );
    });

    it('vienen ordenados por nombre', async () => {
      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/exercises/catalog',
        headers: { cookie },
      });

      const names = response.json<{ exercises: { name: string }[] }>().exercises.map((e) => e.name);

      expect(names).toEqual([...names].sort());
    });
  });
});
