import type { ExerciseList, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { seedCatalog } from '../application/seed-catalog.ts';
import { createMongoExerciseRepository } from './mongo-exercise.repository.ts';

describe('ejercicios gestionados (F1-05)', () => {
  let harness: TestHarness;
  let userCount = 0;

  beforeAll(async () => {
    harness = await startTestApi();
    await seedCatalog(createMongoExerciseRepository(harness.mongo.db));
  });

  afterAll(async () => {
    await harness.stop();
  });

  /** Un usuario nuevo por test: así el cupo del plan de uno no contamina al siguiente. */
  async function newUser(): Promise<string> {
    userCount += 1;
    const response = await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        email: `atleta${String(userCount)}@example.com`,
        password: 'una-frase-larga-y-propia',
        name: `Atleta ${String(userCount)}`,
      }),
    });

    return cookiesFrom(response.headers);
  }

  async function catalogId(name: string): Promise<string> {
    const exercise = await createMongoExerciseRepository(harness.mongo.db).findCatalogByName(name);
    if (!exercise) throw new Error(`No está en el catálogo: ${name}`);
    return exercise.id;
  }

  function add(cookie: string, body: Record<string, unknown>) {
    return harness.app.inject({
      method: 'POST',
      url: '/api/v1/exercises',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });
  }

  async function addFromCatalog(cookie: string, name: string, value = 100) {
    return add(cookie, {
      source: 'catalog',
      exerciseId: await catalogId(name),
      level: 'intermedio',
      firstRecord: { value, performedAt: '2026-06-23T10:00:00.000Z' },
    });
  }

  function addCustom(cookie: string, name: string, category = 'gimnastico', value = 30) {
    return add(cookie, {
      source: 'custom',
      name,
      category,
      capacities: ['fuerza'],
      muscleGroups: ['hombro'],
      level: 'principiante',
      firstRecord: { value },
    });
  }

  /** El ejercicio como quedó guardado: la lista no devuelve capacidades ni grupos. */
  function guardado(name: string) {
    return harness.mongo.db.collection('exercises').findOne({ name });
  }

  async function list(cookie: string): Promise<ExerciseList> {
    const response = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/exercises',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    return response.json<ExerciseList>();
  }

  describe('agregar del catálogo', () => {
    it('queda en la lista con su primera marca como valor actual', async () => {
      const cookie = await newUser();

      const response = await addFromCatalog(cookie, 'Back squat', 100);

      expect(response.statusCode).toBe(201);
      expect(response.json<ManagedExerciseSummary>()).toMatchObject({
        name: 'Back squat',
        category: 'fuerza',
        kind: 'rm',
        isCustom: false,
        level: 'intermedio',
        withPain: false,
        current: { value: 100, unit: 'kg', performedAt: '2026-06-23T10:00:00.000Z' },
      });
      expect((await list(cookie)).exercises.map((e) => e.name)).toEqual(['Back squat']);
    });

    it('la medición sale de la categoría: la hipertrofia va en repeticiones', async () => {
      const cookie = await newUser();

      const response = await addFromCatalog(cookie, 'Butterfly', 12);

      expect(response.json<ManagedExerciseSummary>()).toMatchObject({
        kind: 'reps',
        current: { value: 12, unit: 'reps' },
      });
    });

    it('si la marca no trae fecha, asume ahora', async () => {
      const cookie = await newUser();
      const antes = Date.now();

      const response = await add(cookie, {
        source: 'catalog',
        exerciseId: await catalogId('Front squat'),
        level: 'avanzado',
        firstRecord: { value: 90 },
      });

      const performedAt = Date.parse(response.json<ManagedExerciseSummary>().current.performedAt);
      expect(performedAt).toBeGreaterThanOrEqual(antes - 1000);
    });

    it('agregar dos veces el mismo ejercicio responde WC-EXO-409-003', async () => {
      const cookie = await newUser();
      await addFromCatalog(cookie, 'Snatch');

      const response = await addFromCatalog(cookie, 'Snatch');

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-409-003' });
      expect((await list(cookie)).exercises).toHaveLength(1);
    });

    it('un ID que no existe responde 404', async () => {
      const cookie = await newUser();

      const response = await add(cookie, {
        source: 'catalog',
        exerciseId: 'exo_noexiste00000',
        level: 'intermedio',
        firstRecord: { value: 100 },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-404-002' });
    });
  });

  describe('crear uno propio', () => {
    it('queda en la lista, marcado como propio, con la medición de su categoría', async () => {
      const cookie = await newUser();

      const response = await addCustom(cookie, 'Wall ball', 'gimnastico', 30);

      expect(response.statusCode).toBe(201);
      expect(response.json<ManagedExerciseSummary>()).toMatchObject({
        name: 'Wall ball',
        isCustom: true,
        kind: 'reps',
        current: { value: 30, unit: 'reps' },
      });
    });

    it('con el nombre de uno del catálogo, aunque cambien mayúsculas o acentos, responde WC-EXO-409-004', async () => {
      const cookie = await newUser();

      for (const name of ['Back squat', 'back SQUAT', 'Elevacion de gemelos']) {
        const response = await addCustom(cookie, name, 'fuerza', 100);
        expect(response.statusCode, name).toBe(409);
        expect(response.json(), name).toMatchObject({ errorCode: 'WC-EXO-409-004' });
      }
      expect((await list(cookie)).exercises).toHaveLength(0);
    });

    it('dos propios con el mismo nombre, aunque cambien las mayúsculas, responde WC-EXO-409-003', async () => {
      const cookie = await newUser();
      await addCustom(cookie, 'Wall ball');

      const response = await addCustom(cookie, 'wall BALL');

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-409-003' });
    });

    it('guarda capacidades y grupos musculares, y deriva el segmento (F2-02, spec §5.1)', async () => {
      const cookie = await newUser();

      const response = await add(cookie, {
        source: 'custom',
        name: 'Peso muerto rumano del garage',
        category: 'fuerza',
        capacities: ['fuerza'],
        muscleGroups: ['isquiotibiales', 'gluteo'],
        level: 'intermedio',
        firstRecord: { value: 80 },
      });

      expect(response.statusCode).toBe(201);
      expect(await guardado('Peso muerto rumano del garage')).toMatchObject({
        capacities: ['fuerza'],
        muscleGroups: ['isquiotibiales', 'gluteo'],
        bodySegment: 'tren_inferior',
      });
    });

    it('con grupos de segmentos distintos, el ejercicio es de cuerpo completo', async () => {
      const cookie = await newUser();

      await add(cookie, {
        source: 'custom',
        name: 'Thruster del garage',
        category: 'gimnastico',
        capacities: ['fuerza', 'resistencia'],
        muscleGroups: ['cuadriceps', 'hombro'],
        level: 'intermedio',
        firstRecord: { value: 20 },
      });

      expect(await guardado('Thruster del garage')).toMatchObject({
        bodySegment: 'cuerpo_completo',
      });
    });

    it('sin capacidades no se crea nada', async () => {
      const cookie = await newUser();

      const response = await add(cookie, {
        source: 'custom',
        name: 'Sin capacidades',
        category: 'gimnastico',
        muscleGroups: ['hombro'],
        level: 'intermedio',
        firstRecord: { value: 20 },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
      expect(await guardado('Sin capacidades')).toBeNull();
      expect((await list(cookie)).exercises).toHaveLength(0);
    });
  });

  describe('carreras: dos altas iguales al mismo tiempo', () => {
    // Las dos pasan juntas el chequeo previo de duplicado; la segunda choca con el índice
    // único dentro de la transacción. Tiene que responder 409, no 500.
    it('del catálogo: una entra y la otra responde WC-EXO-409-003', async () => {
      const cookie = await newUser();

      const responses = await Promise.all([
        addFromCatalog(cookie, 'Thruster'),
        addFromCatalog(cookie, 'Thruster'),
      ]);

      expect(responses.map((r) => r.statusCode).sort()).toEqual([201, 409]);
      expect(responses.find((r) => r.statusCode === 409)?.json()).toMatchObject({
        errorCode: 'WC-EXO-409-003',
      });
      expect((await list(cookie)).exercises).toHaveLength(1);
    });

    it('propios con el mismo nombre: uno entra y el otro responde WC-EXO-409-003', async () => {
      const cookie = await newUser();

      const responses = await Promise.all([
        addCustom(cookie, 'Farmer walk'),
        addCustom(cookie, 'Farmer walk'),
      ]);

      expect(responses.map((r) => r.statusCode).sort()).toEqual([201, 409]);
      expect((await list(cookie)).exercises).toHaveLength(1);
    });
  });

  describe('IDOR (spec §13)', () => {
    it('el propio de un usuario no aparece en la lista ni en el catálogo de otro', async () => {
      const braian = await newUser();
      const amigo = await newUser();
      await addCustom(braian, 'Box jump secreto');

      expect((await list(amigo)).exercises).toHaveLength(0);
      const catalog = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/exercises/catalog',
        headers: { cookie: amigo },
      });
      expect(catalog.body).not.toContain('Box jump secreto');
    });

    it('agregar el ejercicio propio de otro usuario por su ID responde 404, no 403', async () => {
      const braian = await newUser();
      const amigo = await newUser();
      const created = await addCustom(braian, 'Sled push');
      const ajeno = created.json<ManagedExerciseSummary>().exerciseId;

      const response = await add(amigo, {
        source: 'catalog',
        exerciseId: ajeno,
        level: 'elite',
        firstRecord: { value: 10 },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-404-002' });
      expect((await list(amigo)).exercises).toHaveLength(0);
    });
  });

  describe('validación', () => {
    it('un valor inválido para la medición responde WC-RM-422-001 con el motivo, y no crea nada', async () => {
      const cookie = await newUser();

      const response = await addFromCatalog(cookie, 'Pull-ups', 12.5);

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-RM-422-001',
        details: [{ path: 'firstRecord.value', message: 'Las repeticiones son un número entero' }],
      });
      expect((await list(cookie)).exercises).toHaveLength(0);
    });

    it('una primera marca con fecha futura se rechaza con el motivo, y no crea nada', async () => {
      const cookie = await newUser();
      const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await add(cookie, {
        source: 'catalog',
        exerciseId: await catalogId('Back squat'),
        level: 'intermedio',
        firstRecord: { value: 100, performedAt: manana },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SYS-400-002',
        details: [{ path: 'firstRecord.performedAt', message: 'La fecha no puede ser futura' }],
      });
      expect((await list(cookie)).exercises).toHaveLength(0);
    });

    it('un cuerpo incompleto responde WC-SYS-400-002', async () => {
      const cookie = await newUser();

      const response = await add(cookie, { source: 'catalog', exerciseId: 'exo_a1b2c3d4' });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
    });

    it('sin sesión, ni agrega ni lista', async () => {
      const post = await harness.app.inject({
        method: 'POST',
        url: '/api/v1/exercises',
        payload: {},
      });
      const get = await harness.app.inject({ method: 'GET', url: '/api/v1/exercises' });

      expect(post.statusCode).toBe(401);
      expect(get.statusCode).toBe(401);
    });
  });

  describe('cupo del plan Free', () => {
    it('la lista informa el uso del plan', async () => {
      const cookie = await newUser();
      await addFromCatalog(cookie, 'Back squat');
      await addCustom(cookie, 'Wall ball');

      expect((await list(cookie)).usage).toEqual({
        plan: 'free',
        total: 2,
        custom: 1,
        maxTotal: 10,
        maxCustom: 3,
      });
    });

    it('el 11.º ejercicio no entra, y el mensaje dice por qué', async () => {
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
      for (const name of nombres) {
        expect((await addFromCatalog(cookie, name)).statusCode, name).toBe(201);
      }

      const response = await addFromCatalog(cookie, 'Snatch');

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SUBS-403-001',
        message: 'Alcanzaste el máximo de 10 ejercicios de tu plan Free.',
      });
    });

    it('el 4.º propio no entra aunque sobre lugar en el total', async () => {
      const cookie = await newUser();
      for (const name of ['Propio uno', 'Propio dos', 'Propio tres']) {
        expect((await addCustom(cookie, name)).statusCode, name).toBe(201);
      }

      const response = await addCustom(cookie, 'Propio cuatro');

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        message: 'Alcanzaste el máximo de 3 ejercicios propios de tu plan Free.',
      });
    });
  });

  describe('búsqueda en el catálogo', () => {
    async function search(cookie: string, q: string): Promise<string[]> {
      const response = await harness.app.inject({
        method: 'GET',
        url: `/api/v1/exercises/catalog?q=${encodeURIComponent(q)}`,
        headers: { cookie },
      });
      expect(response.statusCode).toBe(200);
      return response.json<{ exercises: { name: string }[] }>().exercises.map((e) => e.name);
    }

    it('encuentra por parte del nombre, sin distinguir mayúsculas', async () => {
      const cookie = await newUser();

      expect(await search(cookie, 'SQU')).toEqual(['Back squat', 'Front squat', 'Overhead squat']);
    });

    it('sin distinguir acentos', async () => {
      const cookie = await newUser();

      expect(await search(cookie, 'elevacion')).toEqual(['Elevación de gemelos']);
    });
  });
});
