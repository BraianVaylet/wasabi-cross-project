import { trainingBreakdownSchema, type TrainingBreakdown } from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { seedCatalog } from '../../exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../../exercises/infrastructure/mongo-exercise.repository.ts';

/*
 * F7-01: "Tu entrenamiento" de punta a punta — los ejercicios del catálogo y los propios,
 * repartidos por disciplina, categoría, segmento y grupo muscular (spec §5.4).
 */

describe('cómo se reparte el entrenamiento (F7-01)', () => {
  let harness: TestHarness;
  let userCount = 0;

  beforeAll(async () => {
    harness = await startTestApi();
    await seedCatalog(createMongoExerciseRepository(harness.mongo.db));
  });

  afterAll(async () => {
    await harness.stop();
  });

  async function newUser(): Promise<string> {
    userCount += 1;
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        email: `reparto${String(userCount)}@example.com`,
        password: 'una-frase-larga-y-propia',
        name: `Reparto ${String(userCount)}`,
      }),
    });
    return cookiesFrom(response.headers);
  }

  async function add(cookie: string, body: Record<string, unknown>): Promise<void> {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/exercises',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({ level: 'intermedio', firstRecord: { value: 10 }, ...body }),
    });
    expect(response.statusCode, JSON.stringify(body)).toBe(201);
  }

  async function fromCatalog(cookie: string, name: string): Promise<void> {
    const exercise = await createMongoExerciseRepository(harness.mongo.db).findCatalogByName(name);
    await add(cookie, { source: 'catalog', exerciseId: exercise?.id });
  }

  async function breakdown(cookie: string): Promise<TrainingBreakdown> {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/stats/breakdown',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    return trainingBreakdownSchema.parse(response.json());
  }

  it('reparte los del catálogo y los propios, con "sin disciplina" al final', async () => {
    const cookie = await newUser();
    // Sentadilla trasera: fuerza; musculación, crossfit, hybrid; cuádriceps con glúteo y core.
    await fromCatalog(cookie, 'Sentadilla trasera');
    // Wall Ball: gimnástico; crossfit, hyrox, funcional, hybrid; cuerpo completo con
    // cuádriceps y hombro.
    await fromCatalog(cookie, 'Wall Ball');
    await add(cookie, {
      source: 'custom',
      name: 'Press en máquina',
      category: 'fuerza',
      capacities: ['fuerza'],
      primaryMuscleGroup: 'pectoral',
      secondaryMuscleGroups: ['triceps'],
    });

    const body = await breakdown(cookie);

    expect(body.exercises).toBe(3);
    // Ocho menciones: CrossFit e Hybrid están en dos ejercicios cada una.
    expect(body.byDiscipline).toEqual([
      { discipline: 'crossfit', exercises: 2, percent: 25 },
      { discipline: 'hybrid', exercises: 2, percent: 25 },
      { discipline: 'musculacion', exercises: 1, percent: 13 },
      { discipline: 'hyrox', exercises: 1, percent: 13 },
      { discipline: 'funcional', exercises: 1, percent: 12 },
      { discipline: null, exercises: 1, percent: 12 },
    ]);
    expect(body.byCategory).toEqual([
      { category: 'fuerza', exercises: 2, percent: 67 },
      { category: 'gimnastico', exercises: 1, percent: 33 },
    ]);
    expect(body.bySegment.map((share) => share.segment)).toEqual([
      'tren_superior',
      'tren_inferior',
      'cuerpo_completo',
    ]);
    // Cuádriceps es primario en la sentadilla y secundario en el Wall Ball: 1 + ½.
    expect(body.byMuscleGroup[0]).toMatchObject({
      muscleGroup: 'cuadriceps',
      primary: 1,
      secondary: 1,
      score: 1.5,
    });
    expect(body.byMuscleGroup.reduce((sum, group) => sum + group.percent, 0)).toBe(100);
  });

  it('cuenta sólo los ejercicios propios del usuario', async () => {
    const otro = await newUser();
    await fromCatalog(otro, 'Wall Ball');
    const cookie = await newUser();
    await fromCatalog(cookie, 'Sentadilla trasera');

    const body = await breakdown(cookie);

    expect(body.exercises).toBe(1);
    expect(body.byCategory).toEqual([{ category: 'fuerza', exercises: 1, percent: 100 }]);
  });

  it('sin ejercicios, responde un reparto vacío', async () => {
    const cookie = await newUser();

    expect(await breakdown(cookie)).toEqual({
      exercises: 0,
      byDiscipline: [],
      byCategory: [],
      bySegment: [],
      byMuscleGroup: [],
    });
  });

  it('sin sesión responde 401', async () => {
    const response = await harness.app.inject({ method: 'GET', url: '/api/v1/stats/breakdown' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ errorCode: 'WC-AUTH-401-004' });
  });
});
