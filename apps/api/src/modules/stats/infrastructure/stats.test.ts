import type { ExerciseStats, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { seedCatalog } from '../../exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../../exercises/infrastructure/mongo-exercise.repository.ts';

/*
 * F2-04: la serie de marcas de un ejercicio y sus números. El período recorta lo que se
 * mira; lo de otro usuario responde 404, como todo (spec §13).
 */

describe('estadísticas de un ejercicio (F2-04)', () => {
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
        email: `stats${String(userCount)}@example.com`,
        password: 'una-frase-larga-y-propia',
        name: `Stats ${String(userCount)}`,
      }),
    });
    return cookiesFrom(response.headers);
  }

  async function addFromCatalog(
    cookie: string,
    name: string,
    value: number,
    performedAt: string,
  ): Promise<ManagedExerciseSummary> {
    const exercise = await createMongoExerciseRepository(harness.mongo.db).findCatalogByName(name);
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/exercises',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({
        source: 'catalog',
        exerciseId: exercise?.id,
        level: 'intermedio',
        firstRecord: { value, performedAt },
      }),
    });
    expect(response.statusCode, name).toBe(201);
    return response.json<ManagedExerciseSummary>();
  }

  async function log(cookie: string, id: string, value: number, performedAt: string) {
    const response = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/exercises/${id}/records`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({ value, performedAt }),
    });
    expect(response.statusCode, `${String(value)} @ ${performedAt}`).toBe(201);
  }

  function stats(cookie: string, id: string, query = '') {
    return harness.app.inject({
      method: 'GET',
      url: `/api/v1/stats/exercises/${id}${query}`,
      headers: { cookie },
    });
  }

  /** Hace `meses` atrás, para armar series relativas a hoy sin pelearse con el reloj. */
  function hace(meses: number): string {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - meses);
    return date.toISOString();
  }

  it('devuelve la serie ordenada de la más vieja a la más reciente, con su resumen', async () => {
    const cookie = await newUser();
    const squat = await addFromCatalog(cookie, 'Back squat', 100, hace(5));
    // Desordenadas a propósito: la serie no depende del orden en que se cargaron.
    await log(cookie, squat.id, 120, hace(1));
    await log(cookie, squat.id, 95, hace(3));

    const response = await stats(cookie, squat.id);

    expect(response.statusCode).toBe(200);
    const body = response.json<ExerciseStats>();
    expect(body).toMatchObject({ id: squat.id, name: 'Back squat', kind: 'rm', unit: 'kg' });
    expect(body.series.map((point) => point.value)).toEqual([100, 95, 120]);
    expect(body.summary).toMatchObject({ current: 120, best: 120, worst: 95, records: 3 });
    expect(body.summary?.changePercent).toBe(20);
  });

  it('el período recorta lo que se mira, y por defecto es un año', async () => {
    const cookie = await newUser();
    const squat = await addFromCatalog(cookie, 'Back squat', 80, hace(10));
    await log(cookie, squat.id, 100, hace(1));

    const año = (await stats(cookie, squat.id)).json<ExerciseStats>();
    expect(año.period).toBe('12m');
    expect(año.series).toHaveLength(2);

    const trimestre = (await stats(cookie, squat.id, '?period=3m')).json<ExerciseStats>();
    expect(trimestre.series.map((point) => point.value)).toEqual([100]);
    expect(trimestre.summary).toMatchObject({ records: 1, changePercent: 0 });

    const todo = (await stats(cookie, squat.id, '?period=todo')).json<ExerciseStats>();
    expect(todo.series).toHaveLength(2);
  });

  it('sin marcas en el período, la serie es vacía y el resumen null', async () => {
    const cookie = await newUser();
    const squat = await addFromCatalog(cookie, 'Back squat', 100, hace(10));

    const body = (await stats(cookie, squat.id, '?period=3m')).json<ExerciseStats>();

    expect(body.series).toEqual([]);
    expect(body.summary).toBeNull();
  });

  it('en tiempo, la mejor marca es la más baja', async () => {
    const cookie = await newUser();
    const carrera = await addFromCatalog(cookie, 'Carrera 1 km', 300, hace(4));
    await log(cookie, carrera.id, 270, hace(1));

    const body = (await stats(cookie, carrera.id)).json<ExerciseStats>();

    expect(body).toMatchObject({ kind: 'time', unit: 's' });
    expect(body.summary).toMatchObject({ best: 270, worst: 300, changePercent: 10 });
  });

  it('el ejercicio de otro usuario responde 404, no 403 (spec §13)', async () => {
    const dueño = await newUser();
    const otro = await newUser();
    const squat = await addFromCatalog(dueño, 'Back squat', 100, hace(2));

    const response = await stats(otro, squat.id);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ errorCode: 'WC-STATS-404-001' });
  });

  it('un ID que no existe responde lo mismo', async () => {
    const cookie = await newUser();

    const response = await stats(cookie, 'mex_00000000');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ errorCode: 'WC-STATS-404-001' });
  });

  it('sin sesión no se mira nada', async () => {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/stats/exercises/mex_a1b2c3d4',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ errorCode: 'WC-AUTH-401-004' });
  });

  it('un período inventado se rechaza', async () => {
    const cookie = await newUser();
    const squat = await addFromCatalog(cookie, 'Back squat', 100, hace(1));

    const response = await stats(cookie, squat.id, '?period=2m');

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
  });
});
