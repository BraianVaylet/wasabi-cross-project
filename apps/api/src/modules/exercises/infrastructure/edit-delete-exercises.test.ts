import type { ExerciseList, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { seedCatalog } from '../application/seed-catalog.ts';
import { createMongoExerciseRepository } from './mongo-exercise.repository.ts';

describe('editar y borrar ejercicios gestionados (F1-06)', () => {
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
        email: `editor${String(userCount)}@example.com`,
        password: 'una-frase-larga-y-propia',
        name: `Editor ${String(userCount)}`,
      }),
    });
    return cookiesFrom(response.headers);
  }

  async function catalogId(name: string): Promise<string> {
    const exercise = await createMongoExerciseRepository(harness.mongo.db).findCatalogByName(name);
    if (!exercise) throw new Error(`No está en el catálogo: ${name}`);
    return exercise.id;
  }

  async function addFromCatalog(
    cookie: string,
    name: string,
    firstRecordExtra: Record<string, unknown> = {},
  ): Promise<ManagedExerciseSummary> {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/exercises',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({
        source: 'catalog',
        exerciseId: await catalogId(name),
        level: 'intermedio',
        firstRecord: { value: 100, ...firstRecordExtra },
      }),
    });
    expect(response.statusCode, name).toBe(201);
    return response.json<ManagedExerciseSummary>();
  }

  async function addCustom(cookie: string, name: string): Promise<ManagedExerciseSummary> {
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/v1/exercises',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({
        source: 'custom',
        name,
        category: 'gimnastico',
        capacities: ['fuerza'],
        muscleGroups: ['hombro'],
        level: 'principiante',
        firstRecord: { value: 20 },
      }),
    });
    expect(response.statusCode, name).toBe(201);
    return response.json<ManagedExerciseSummary>();
  }

  function patch(cookie: string, id: string, body: Record<string, unknown>) {
    return harness.app.inject({
      method: 'PATCH',
      url: `/api/v1/exercises/${id}`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });
  }

  function remove(cookie: string, id: string) {
    return harness.app.inject({
      method: 'DELETE',
      url: `/api/v1/exercises/${id}`,
      headers: { cookie },
    });
  }

  async function list(cookie: string): Promise<ExerciseList> {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/exercises',
      headers: { cookie },
    });
    return response.json<ExerciseList>();
  }

  const records = () => harness.mongo.db.collection('records');

  describe('editar', () => {
    it('cambia nivel y "con dolor", y devuelve el ejercicio actualizado', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Back squat');

      const response = await patch(cookie, added.id, { level: 'avanzado', withPain: true });

      expect(response.statusCode).toBe(200);
      expect(response.json<ManagedExerciseSummary>()).toMatchObject({
        id: added.id,
        level: 'avanzado',
        withPain: true,
        current: added.current,
      });
      expect((await list(cookie)).exercises[0]).toMatchObject({
        level: 'avanzado',
        withPain: true,
      });
    });

    it('el nivel es de cada usuario: editarlo no toca al de otro con el mismo ejercicio', async () => {
      const braian = await newUser();
      const amigo = await newUser();
      const deBraian = await addFromCatalog(braian, 'Front squat');
      await addFromCatalog(amigo, 'Front squat');

      const response = await patch(braian, deBraian.id, { level: 'elite' });

      // Primero, que el cambio ocurrió: sin esto el test pasaría aunque el PATCH no existiera.
      expect(response.statusCode).toBe(200);
      expect((await list(braian)).exercises[0]?.level).toBe('elite');
      expect((await list(amigo)).exercises[0]?.level).toBe('intermedio');
    });

    it('pone y borra comentarios', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Snatch');

      const conNotas = await patch(cookie, added.id, { notes: 'Cuidar la muñeca' });
      expect(conNotas.json<ManagedExerciseSummary>().notes).toBe('Cuidar la muñeca');

      const sinNotas = await patch(cookie, added.id, { notes: '' });
      expect(sinNotas.json<ManagedExerciseSummary>()).not.toHaveProperty('notes');
    });

    it('renombra uno propio', async () => {
      const cookie = await newUser();
      const added = await addCustom(cookie, 'Wall ball');

      const response = await patch(cookie, added.id, { name: 'Wall ball 9 kg' });

      expect(response.statusCode).toBe(200);
      expect(response.json<ManagedExerciseSummary>().name).toBe('Wall ball 9 kg');
    });

    it('renombrar uno propio con el nombre de uno del catálogo responde WC-EXO-409-004', async () => {
      const cookie = await newUser();
      const added = await addCustom(cookie, 'Mi sentadilla');

      const response = await patch(cookie, added.id, { name: 'back squat' });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-409-004' });
    });

    it('renombrar uno propio con el nombre de otro propio responde WC-EXO-409-003', async () => {
      const cookie = await newUser();
      await addCustom(cookie, 'Box jump');
      const otro = await addCustom(cookie, 'Burpee box');

      const response = await patch(cookie, otro.id, { name: 'BOX JUMP' });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-409-003' });
    });

    it('volver a ponerle a uno propio su mismo nombre no choca consigo mismo', async () => {
      const cookie = await newUser();
      const added = await addCustom(cookie, 'Sled pull');

      const response = await patch(cookie, added.id, { name: 'SLED PULL' });

      expect(response.statusCode).toBe(200);
    });

    it('el nombre de uno del catálogo no se cambia', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Press militar');

      const response = await patch(cookie, added.id, { name: 'Press de hombros' });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SYS-400-002',
        details: [{ path: 'name' }],
      });
      expect(
        await createMongoExerciseRepository(harness.mongo.db).findCatalogByName('Press militar'),
      ).not.toBeNull();
    });

    it('cambiar la categoría se rechaza', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Peso muerto');

      const response = await patch(cookie, added.id, { category: 'running' });

      expect(response.statusCode).toBe(400);
      expect((await list(cookie)).exercises[0]?.category).toBe('fuerza');
    });

    it('un update vacío se rechaza', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Hip thruster');

      expect((await patch(cookie, added.id, {})).statusCode).toBe(400);
    });
  });

  describe('borrar', () => {
    it('uno del catálogo: se va de la lista con todas sus marcas, y el catálogo queda intacto', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Clean and jerk');
      expect(await records().countDocuments({ managedExerciseId: added.id })).toBe(1);

      const response = await remove(cookie, added.id);

      expect(response.statusCode).toBe(204);
      expect((await list(cookie)).exercises).toHaveLength(0);
      expect(await records().countDocuments({ managedExerciseId: added.id })).toBe(0);
      expect(
        await createMongoExerciseRepository(harness.mongo.db).findCatalogByName('Clean and jerk'),
      ).not.toBeNull();
    });

    it('uno propio: se va también su definición', async () => {
      const cookie = await newUser();
      const added = await addCustom(cookie, 'Atlas stone');

      await remove(cookie, added.id);

      expect(
        await harness.mongo.db
          .collection('exercises')
          .countDocuments({ _id: added.exerciseId } as never),
      ).toBe(0);
      expect(await records().countDocuments({ managedExerciseId: added.id })).toBe(0);
    });

    it('libera el cupo: con 10, borrar uno deja agregar otro', async () => {
      const cookie = await newUser();
      const nombres = [
        'Back squat',
        'Front squat',
        'Overhead squat',
        'Peso muerto',
        'Peso muerto rumano',
        'Hip thruster',
        'Press de banca',
        'Floor press',
        'Press militar',
        'Push press',
      ];
      const agregados = [];
      for (const name of nombres) agregados.push(await addFromCatalog(cookie, name));
      const primero = agregados[0];
      if (!primero) throw new Error('no se agregó nada');

      await remove(cookie, primero.id);

      await addFromCatalog(cookie, 'Snatch');
      expect((await list(cookie)).usage.total).toBe(10);
    });

    it('borrar dos veces: la segunda responde 404', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Power clean');

      await remove(cookie, added.id);
      const again = await remove(cookie, added.id);

      expect(again.statusCode).toBe(404);
      expect(again.json()).toMatchObject({ errorCode: 'WC-EXO-404-002' });
    });
  });

  describe('IDOR (spec §13)', () => {
    it('editar el ejercicio de otro usuario responde 404 y no lo toca', async () => {
      const braian = await newUser();
      const amigo = await newUser();
      const deBraian = await addFromCatalog(braian, 'Thruster');

      const response = await patch(amigo, deBraian.id, { level: 'elite', withPain: true });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-404-002' });
      expect((await list(braian)).exercises[0]).toMatchObject({
        level: 'intermedio',
        withPain: false,
      });
    });

    it('borrar el ejercicio de otro usuario responde 404 y no borra nada', async () => {
      const braian = await newUser();
      const amigo = await newUser();
      const deBraian = await addCustom(braian, 'Tire flip');

      const response = await remove(amigo, deBraian.id);

      // El código del ejercicio y no el de "ruta inexistente": si no, pasaría sin endpoint.
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-404-002' });
      expect((await list(braian)).exercises).toHaveLength(1);
      expect(await records().countDocuments({ managedExerciseId: deBraian.id })).toBe(1);
    });

    it('un ID con otro formato se rechaza antes de buscar', async () => {
      const cookie = await newUser();

      expect((await remove(cookie, 'exo_a1b2c3d4')).statusCode).toBe(400);
    });

    it('sin sesión, ni edita ni borra', async () => {
      const cookie = await newUser();
      const added = await addFromCatalog(cookie, 'Butterfly', { weightKg: 30 });

      const sinSesionPatch = await harness.app.inject({
        method: 'PATCH',
        url: `/api/v1/exercises/${added.id}`,
        payload: { level: 'elite' },
      });
      const sinSesionDelete = await harness.app.inject({
        method: 'DELETE',
        url: `/api/v1/exercises/${added.id}`,
      });

      expect(sinSesionPatch.statusCode).toBe(401);
      expect(sinSesionDelete.statusCode).toBe(401);
    });
  });
});
