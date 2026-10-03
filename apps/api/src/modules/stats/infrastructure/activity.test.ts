import {
  trainingActivitySchema,
  type ManagedExerciseSummary,
  type TrainingActivity,
} from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, setPlan, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { seedCatalog } from '../../exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../../exercises/infrastructure/mongo-exercise.repository.ts';

/*
 * F7-02 de punta a punta: constancia, récords y para retestear con marcas de verdad en
 * Mongo. Las fechas son relativas a hoy; las cuentas finas, con el reloj fijo, están en el
 * test del dominio.
 */

describe('constancia, récords y para retestear (F7-02)', () => {
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
    const email = `actividad${String(userCount)}@example.com`;
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        email,
        password: 'una-frase-larga-y-propia',
        name: `Actividad ${String(userCount)}`,
      }),
    });
    // Las estadísticas son de Pro (spec §4): el usuario de estos tests lo es.
    await setPlan(harness, email, 'pro');
    return cookiesFrom(response.headers);
  }

  /** Hace `dias` días, al mediodía UTC. */
  function hace(dias: number): string {
    const date = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    date.setUTCHours(12, 0, 0, 0);
    return date.toISOString();
  }

  async function add(
    cookie: string,
    name: string,
    value: number,
    performedAt: string,
    extra: Record<string, unknown> = {},
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
        firstRecord: { value, performedAt, ...extra },
      }),
    });
    expect(response.statusCode, name).toBe(201);
    return response.json<ManagedExerciseSummary>();
  }

  async function log(
    cookie: string,
    id: string,
    value: number,
    performedAt: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const response = await harness.app.inject({
      method: 'POST',
      url: `/api/v1/exercises/${id}/records`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({ value, performedAt, ...extra }),
    });
    expect(response.statusCode, `${String(value)} @ ${performedAt}`).toBe(201);
  }

  async function activity(cookie: string, query = ''): Promise<TrainingActivity> {
    const response = await harness.app.inject({
      method: 'GET',
      url: `/api/v1/stats/activity${query}`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    return trainingActivitySchema.parse(response.json());
  }

  it('cuenta marcas, mejores marcas nuevas y lo que más mejoró en el período', async () => {
    const cookie = await newUser();
    const squat = await add(cookie, 'Sentadilla trasera', 100, hace(40));
    await log(cookie, squat.id, 110, hace(30));
    await log(cookie, squat.id, 105, hace(20));
    await log(cookie, squat.id, 120, hace(10));

    const body = await activity(cookie, '?period=3m');

    expect(body.period).toBe('3m');
    expect(body.records).toBe(4);
    // 110 y 120 superaron a todas las anteriores; la primera no cuenta.
    expect(body.personalBests).toBe(2);
    expect(body.topImprovements).toEqual([
      { id: squat.id, name: 'Sentadilla trasera', changePercent: 20 },
    ]);
    expect(body.lastRecordAt).toBe(hace(10));
    expect(body.daysSinceLast).toBeGreaterThanOrEqual(9);
    expect(body.byMonth.reduce((total, month) => total + month.records, 0)).toBe(4);
    expect(body.stale).toEqual([]);
  });

  it('en hipertrofia compara por RM estimado, y en tiempo menos es mejor', async () => {
    const cookie = await newUser();
    // 10 × 80 kg (106,7 kg estimado) → 6 × 90 kg (108 kg estimado): mejor marca.
    const curl = await add(cookie, 'Curl bíceps con barra', 10, hace(30), {
      weightKg: 80,
    });
    await log(cookie, curl.id, 6, hace(10), { weightKg: 90 });
    // Running pide el desnivel de la marca (spec §5.1).
    const run = await add(cookie, 'Carrera 400 m', 300, hace(30), { elevationGainM: 0 });
    await log(cookie, run.id, 280, hace(10), { elevationGainM: 0 });

    const body = await activity(cookie, '?period=3m');

    expect(body.personalBests).toBe(2);
  });

  it('propone retestear lo que lleva más de 8 semanas sin marca, mire el período que mire', async () => {
    const cookie = await newUser();
    const viejo = await add(cookie, 'Sentadilla trasera', 100, hace(70));
    await add(cookie, 'Remo con barra', 8, hace(30), { weightKg: 60 });

    for (const period of ['3m', 'todo']) {
      const body = await activity(cookie, `?period=${period}`);

      expect(
        body.stale.map((entry) => entry.id),
        period,
      ).toEqual([viejo.id]);
      expect(body.stale[0]?.days, period).toBeGreaterThanOrEqual(69);
    }
  });

  it('sin período, mira el último año; sin ejercicios, no hay nada que contar', async () => {
    const cookie = await newUser();

    const body = await activity(cookie);

    expect(body).toMatchObject({
      period: '12m',
      records: 0,
      lastRecordAt: null,
      daysSinceLast: null,
      personalBests: 0,
      topImprovements: [],
      stale: [],
    });
    expect(body.byMonth).toHaveLength(13);
  });

  it('sin sesión responde 401', async () => {
    const response = await harness.app.inject({ method: 'GET', url: '/api/v1/stats/activity' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ errorCode: 'WC-AUTH-401-004' });
  });
});
