import type { ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setPlan, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { createTestSession } from '../../../test/session.ts';
import { seedCatalog } from '../../exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../../exercises/infrastructure/mongo-exercise.repository.ts';

/*
 * F8-03 (spec §4): las estadísticas son lo único que separa a Free de Pro, y lo hace cumplir el
 * backend. Un permiso mal puesto acá regala la función de pago, así que se prueban los cuatro
 * endpoints, los dos planes, el orden de los guards y el cambio de plan en caliente.
 */

const MENSAJE = 'Las estadísticas son parte del plan Pro.';

describe('estadísticas sólo para Pro (F8-03)', () => {
  let harness: TestHarness;
  let userCount = 0;

  beforeAll(async () => {
    harness = await startTestApi();
    await seedCatalog(createMongoExerciseRepository(harness.mongo.db));
  });

  afterAll(async () => {
    await harness.stop();
  });

  /** Un usuario nuevo, con el plan que se pida: sin pedir nada, queda en Free como en un registro. */
  async function newUser(plan?: 'pro'): Promise<{ cookie: string; email: string }> {
    userCount += 1;
    const email = `plan${String(userCount)}@example.com`;
    const session = await createTestSession(harness, {
      email,
      name: `Plan ${String(userCount)}`,
      ...(plan ? { plan } : {}),
    });
    return { cookie: session.cookie, email };
  }

  async function addExercise(cookie: string): Promise<ManagedExerciseSummary> {
    const exercise = await createMongoExerciseRepository(harness.mongo.db).findCatalogByName(
      'Sentadilla trasera',
    );
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/exercises',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({
        source: 'catalog',
        exerciseId: exercise?.id,
        level: 'intermedio',
        firstRecord: { value: 100 },
      }),
    });
    expect(response.statusCode).toBe(201);
    return response.json<ManagedExerciseSummary>();
  }

  function get(url: string, cookie?: string) {
    return harness.app.inject({
      method: 'GET',
      url,
      ...(cookie === undefined ? {} : { headers: { cookie } }),
    });
  }

  /** Los cuatro endpoints de `stats`, con un ejercicio gestionado cualquiera para el primero. */
  const endpoints = (id: string) => [
    `/api/v1/stats/exercises/${id}`,
    '/api/v1/stats/summary',
    '/api/v1/stats/breakdown',
    '/api/v1/stats/activity',
  ];

  describe('con plan Free', () => {
    it('los cuatro endpoints responden 403 WC-SUBS-403-002, con el mensaje del catálogo', async () => {
      const { cookie } = await newUser();
      const added = await addExercise(cookie);

      for (const url of endpoints(added.id)) {
        const response = await get(url, cookie);

        expect(response.statusCode, url).toBe(403);
        expect(response.json(), url).toMatchObject({
          errorCode: 'WC-SUBS-403-002',
          message: MENSAJE,
        });
      }
    });

    it('un ejercicio inexistente o ajeno responde 403 igual: el plan se mira antes que el recurso', async () => {
      const { cookie } = await newUser();
      const dueno = await newUser('pro');
      const ajeno = await addExercise(dueno.cookie);

      for (const id of ['mex_inexistente', ajeno.id]) {
        const response = await get(`/api/v1/stats/exercises/${id}`, cookie);

        expect(response.statusCode, id).toBe(403);
        expect(response.json(), id).toMatchObject({ errorCode: 'WC-SUBS-403-002' });
      }
    });

    it('una consulta mal formada también: no se puede sondear el contrato', async () => {
      const { cookie } = await newUser();

      const response = await get('/api/v1/stats/summary?period=no-existe', cookie);

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SUBS-403-002' });
    });

    it('no le saca nada de lo demás: carga ejercicios y marcas, y ve su lista', async () => {
      const { cookie } = await newUser();
      const added = await addExercise(cookie);

      const record = await harness.app.inject({
        method: 'POST',
        url: `/api/v1/exercises/${added.id}/records`,
        headers: { cookie, 'content-type': 'application/json' },
        payload: JSON.stringify({ value: 105 }),
      });
      const history = await get(`/api/v1/exercises/${added.id}/records`, cookie);
      const list = await get('/api/v1/exercises', cookie);

      expect(record.statusCode).toBe(201);
      expect(history.statusCode).toBe(200);
      expect(list.statusCode).toBe(200);
    });
  });

  describe('sin sesión', () => {
    it('responde 401 y no 403: sin sesión no hay plan que mirar', async () => {
      for (const url of endpoints('mex_cualquiera')) {
        const response = await get(url);

        expect(response.statusCode, url).toBe(401);
        expect(response.json(), url).toMatchObject({ errorCode: 'WC-AUTH-401-004' });
      }
    });
  });

  describe('con plan Pro', () => {
    it('los cuatro endpoints responden 200', async () => {
      const { cookie } = await newUser('pro');
      const added = await addExercise(cookie);

      for (const url of endpoints(added.id)) {
        const response = await get(url, cookie);

        expect(response.statusCode, url).toBe(200);
      }
    });

    it('el ejercicio de otro usuario sigue respondiendo 404, no 403', async () => {
      const { cookie } = await newUser('pro');
      const dueno = await newUser('pro');
      const ajeno = await addExercise(dueno.cookie);

      const response = await get(`/api/v1/stats/exercises/${ajeno.id}`, cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-STATS-404-001' });
    });
  });

  describe('cambiar de plan', () => {
    it('al bajar de Pro a Free deja de verlas en el pedido siguiente, y no pierde lo que cargó', async () => {
      const { cookie, email } = await newUser('pro');
      const added = await addExercise(cookie);
      expect((await get('/api/v1/stats/summary', cookie)).statusCode).toBe(200);

      await setPlan(harness, email, 'free');

      expect((await get('/api/v1/stats/summary', cookie)).statusCode).toBe(403);
      const list = await get('/api/v1/exercises', cookie);
      expect(list.json<{ exercises: ManagedExerciseSummary[] }>().exercises).toHaveLength(1);

      // Y al volver a Pro, ve todo de nuevo (spec §4).
      await setPlan(harness, email, 'pro');
      const back = await get(`/api/v1/stats/exercises/${added.id}`, cookie);
      expect(back.statusCode).toBe(200);
    });

    it('un plan que ya no existe (max sin migrar) se trata como Free: da menos, no más', async () => {
      const { cookie, email } = await newUser();
      await harness.mongo.db.collection('user').updateOne({ email }, { $set: { plan: 'max' } });

      const response = await get('/api/v1/stats/summary', cookie);

      expect(response.statusCode).toBe(403);
    });
  });
});
