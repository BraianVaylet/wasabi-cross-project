import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi, type TestHarness } from '../../../test/harness.ts';
import { createTestSession } from '../../../test/session.ts';
import { seedCatalog } from '../../exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../../exercises/infrastructure/mongo-exercise.repository.ts';
import { setPlan } from '../application/set-plan.ts';
import { createMongoPlanStore } from './mongo-plan.store.ts';

/*
 * F3-15 (ADR-0014): el otorgamiento manual de punta a punta. El caso de uso, el store de Mongo y,
 * del otro lado, la API real con la sesión de la persona: lo que importa no es que se escriba un
 * campo sino que el usuario deje (o empiece) de ver las estadísticas en el pedido siguiente.
 */

const FIRST = new Date('2026-10-14T12:00:00.000Z');
const LATER = new Date('2026-10-15T09:30:00.000Z');

interface UserDocument {
  _id: string;
  email: string;
  plan?: string;
  planSource?: string;
  planChangedAt?: Date;
}

describe('plan:set contra la base y la API (F3-15)', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await startTestApi();
    await seedCatalog(createMongoExerciseRepository(harness.mongo.db));
  });

  afterAll(async () => {
    await harness.stop();
  });

  const store = () => createMongoPlanStore(harness.mongo.db);
  const userDocument = (email: string) =>
    harness.mongo.db.collection<UserDocument>('user').findOne({ email });
  const stats = (cookie: string) =>
    harness.app.inject({ method: 'GET', url: '/api/v1/stats/summary', headers: { cookie } });

  it('un Free pasa a ver las estadísticas en el pedido siguiente, sin cerrar sesión', async () => {
    const { cookie, email } = await createTestSession(harness);
    expect((await stats(cookie)).statusCode).toBe(403);

    const outcome = await setPlan(
      { store: store(), now: () => FIRST },
      { email, plan: 'pro', apply: true, source: 'manual' },
    );

    expect(outcome).toMatchObject({ status: 'changed', from: 'free', to: 'pro' });
    expect(await userDocument(email)).toMatchObject({
      plan: 'pro',
      planSource: 'manual',
      planChangedAt: FIRST,
    });
    expect((await stats(cookie)).statusCode).toBe(200);
  });

  it('el dry-run no escribe: el usuario sigue sin ver las estadísticas', async () => {
    const { cookie, email } = await createTestSession(harness);

    const outcome = await setPlan(
      { store: store(), now: () => FIRST },
      { email, plan: 'pro', apply: false, source: 'manual' },
    );

    expect(outcome.status).toBe('would-change');
    const doc = await userDocument(email);
    expect(doc?.plan).toBe('free');
    expect(doc).not.toHaveProperty('planSource');
    expect(doc).not.toHaveProperty('planChangedAt');
    expect((await stats(cookie)).statusCode).toBe(403);
  });

  it('pedir el plan que ya tiene no reescribe: la fecha del otorgamiento queda', async () => {
    const { email } = await createTestSession(harness);
    const apply = { email, plan: 'pro', apply: true, source: 'manual' } as const;

    await setPlan({ store: store(), now: () => FIRST }, apply);
    const outcome = await setPlan({ store: store(), now: () => LATER }, apply);

    expect(outcome.status).toBe('unchanged');
    expect((await userDocument(email))?.planChangedAt).toEqual(FIRST);
  });

  it('bajarlo a Free le saca las estadísticas y no le toca nada de lo que cargó', async () => {
    const { cookie, email } = await createTestSession(harness, { plan: 'pro' });
    const catalogo = await createMongoExerciseRepository(harness.mongo.db).findCatalogByName(
      'Sentadilla trasera',
    );
    const exercise = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/exercises',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({
        source: 'catalog',
        exerciseId: catalogo?.id,
        level: 'intermedio',
        firstRecord: { value: 100 },
      }),
    });
    expect(exercise.statusCode).toBe(201);
    expect((await stats(cookie)).statusCode).toBe(200);

    await setPlan(
      { store: store(), now: () => LATER },
      { email, plan: 'free', apply: true, source: 'manual' },
    );

    expect((await stats(cookie)).statusCode).toBe(403);
    const list = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/exercises',
      headers: { cookie },
    });
    expect(list.statusCode).toBe(200);
    expect(JSON.stringify(list.json())).toContain('Sentadilla trasera');
  });

  it('un email que no existe no crea ningún usuario', async () => {
    const before = await harness.mongo.db.collection('user').countDocuments();

    await expect(
      setPlan(
        { store: store(), now: () => FIRST },
        { email: 'nadie-entro-nunca@example.com', plan: 'pro', apply: true, source: 'manual' },
      ),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });

    expect(await harness.mongo.db.collection('user').countDocuments()).toBe(before);
  });

  it('sólo toca al usuario pedido: otro con otro email queda como estaba', async () => {
    const elegido = await createTestSession(harness);
    const otro = await createTestSession(harness);

    await setPlan(
      { store: store(), now: () => FIRST },
      { email: elegido.email, plan: 'pro', apply: true, source: 'manual' },
    );

    const doc = await userDocument(otro.email);
    expect(doc?.plan).toBe('free');
    expect(doc).not.toHaveProperty('planSource');
    expect((await stats(otro.cookie)).statusCode).toBe(403);
  });

  it('un usuario sin campo plan (documento viejo) cuenta como Free y se puede promover', async () => {
    const { email } = await createTestSession(harness);
    await harness.mongo.db.collection('user').updateOne({ email }, { $unset: { plan: '' } });

    const outcome = await setPlan(
      { store: store(), now: () => FIRST },
      { email, plan: 'pro', apply: true, source: 'manual' },
    );

    expect(outcome).toMatchObject({ status: 'changed', from: 'free', to: 'pro' });
  });

  it('si el usuario desaparece entre leer y escribir, falla fuerte en vez de dar por hecho', async () => {
    await expect(
      store().writePlan('usr_que_no_existe', { plan: 'pro', source: 'manual', at: FIRST }),
    ).rejects.toThrow(/usr_que_no_existe/);
  });
});
