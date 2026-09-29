import type {
  ExerciseList,
  LogRecordResponse,
  ManagedExerciseSummary,
  RecordHistory,
} from '@wasabi-cross/schemas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { seedCatalog } from '../../exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../../exercises/infrastructure/mongo-exercise.repository.ts';

describe('marcas: cargar e historial (F1-07)', () => {
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
        email: `marcas${String(userCount)}@example.com`,
        password: 'una-frase-larga-y-propia',
        name: `Marcas ${String(userCount)}`,
      }),
    });
    return cookiesFrom(response.headers);
  }

  async function addFromCatalog(
    cookie: string,
    name: string,
    value: number,
    performedAt: string,
    firstRecordExtra: Record<string, unknown> = {},
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
        firstRecord: { value, performedAt, ...firstRecordExtra },
      }),
    });
    expect(response.statusCode, name).toBe(201);
    return response.json<ManagedExerciseSummary>();
  }

  function log(cookie: string, id: string, body: Record<string, unknown>) {
    return harness.app.inject({
      method: 'POST',
      url: `/api/v1/exercises/${id}/records`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });
  }

  async function logOk(
    cookie: string,
    id: string,
    value: number,
    performedAt: string,
    extra: Record<string, unknown> = {},
  ) {
    const response = await log(cookie, id, { value, performedAt, ...extra });
    expect(response.statusCode, `${String(value)} @ ${performedAt}`).toBe(201);
    return response.json<LogRecordResponse>();
  }

  function history(cookie: string, id: string, query = '') {
    return harness.app.inject({
      method: 'GET',
      url: `/api/v1/exercises/${id}/records${query}`,
      headers: { cookie },
    });
  }

  describe('cargar una marca', () => {
    it('queda guardada y devuelve cómo quedaron el valor actual y la mejor marca', async () => {
      const cookie = await newUser();
      const squat = await addFromCatalog(
        cookie,
        'Sentadilla trasera',
        100,
        '2026-06-23T10:00:00.000Z',
      );

      const response = await log(cookie, squat.id, {
        value: 105,
        performedAt: '2026-07-01T10:00:00.000Z',
        notes: 'Con cinturón',
      });

      expect(response.statusCode).toBe(201);
      const body = response.json<LogRecordResponse>();
      expect(body.record).toMatchObject({ value: 105, unit: 'kg', notes: 'Con cinturón' });
      expect(body.record.id).toMatch(/^rec_/);
      expect(body.current).toMatchObject({ value: 105, performedAt: '2026-07-01T10:00:00.000Z' });
      expect(body.best).toMatchObject({ value: 105 });
    });

    it('sin fecha, asume ahora', async () => {
      const cookie = await newUser();
      const squat = await addFromCatalog(
        cookie,
        'Sentadilla frontal',
        90,
        '2026-06-01T10:00:00.000Z',
      );
      const antes = Date.now();

      const response = await log(cookie, squat.id, { value: 92 });

      expect(
        Date.parse(response.json<LogRecordResponse>().record.performedAt),
      ).toBeGreaterThanOrEqual(antes - 1000);
    });

    it('actualiza el valor actual que muestra Home', async () => {
      const cookie = await newUser();
      const squat = await addFromCatalog(cookie, 'Overhead Squat', 60, '2026-06-01T10:00:00.000Z');

      await logOk(cookie, squat.id, 65, '2026-06-15T10:00:00.000Z');

      const home = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/exercises',
        headers: { cookie },
      });
      expect(home.json<ExerciseList>().exercises[0]?.current.value).toBe(65);
    });

    it('un valor inválido para la medición responde WC-RM-422-001 con el motivo, y no guarda nada', async () => {
      const cookie = await newUser();
      const pullups = await addFromCatalog(cookie, 'Pull-up', 10, '2026-06-01T10:00:00.000Z');

      const response = await log(cookie, pullups.id, { value: 10.5 });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-RM-422-001',
        details: [{ path: 'value', message: 'Las repeticiones son un número entero' }],
      });
      expect((await history(cookie, pullups.id)).json<RecordHistory>().records).toHaveLength(1);
    });

    it('hipertrofia manda las repeticiones y el peso', async () => {
      const cookie = await newUser();
      const butterfly = await addFromCatalog(
        cookie,
        'Press banca plano',
        12,
        '2026-06-01T10:00:00.000Z',
        {
          weightKg: 30,
        },
      );

      const response = await log(cookie, butterfly.id, {
        value: 14,
        weightKg: 35,
        performedAt: '2026-06-10T10:00:00.000Z',
      });

      expect(response.statusCode).toBe(201);
      const body = response.json<LogRecordResponse>();
      expect(body.record).toMatchObject({ value: 14, unit: 'reps', weightKg: 35 });
      expect(body.current).toMatchObject({ value: 14, weightKg: 35 });
    });

    it('hipertrofia sin peso responde WC-RM-422-001 y no guarda nada', async () => {
      const cookie = await newUser();
      const butterfly = await addFromCatalog(
        cookie,
        'Press banca plano',
        12,
        '2026-06-01T10:00:00.000Z',
        {
          weightKg: 30,
        },
      );

      const response = await log(cookie, butterfly.id, { value: 14 });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-RM-422-001',
        details: [{ path: 'weightKg' }],
      });
      expect((await history(cookie, butterfly.id)).json<RecordHistory>().records).toHaveLength(1);
    });

    it('running sin desnivel responde WC-RM-422-001 y no guarda nada', async () => {
      const cookie = await newUser();
      const carrera = await addFromCatalog(
        cookie,
        'Carrera 1 km',
        300,
        '2026-06-01T10:00:00.000Z',
        {
          elevationGainM: 0,
        },
      );

      const response = await log(cookie, carrera.id, { value: 280 });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-RM-422-001',
        details: [{ path: 'elevationGainM' }],
      });
      expect((await history(cookie, carrera.id)).json<RecordHistory>().records).toHaveLength(1);
    });
  });

  describe('cardio: metros con sus calorías (F5-02a)', () => {
    async function addRemo(cookie: string): Promise<ManagedExerciseSummary> {
      const response = await harness.app.inject({
        method: 'POST',
        url: '/api/v1/exercises',
        headers: { cookie, 'content-type': 'application/json' },
        payload: JSON.stringify({
          source: 'custom',
          name: 'Remo del garage',
          category: 'cardio',
          capacities: ['resistencia'],
          primaryMuscleGroup: 'cuerpo_completo',
          level: 'intermedio',
          firstRecord: { value: 2000, performedAt: '2026-06-01T10:00:00.000Z', caloriesKcal: 120 },
        }),
      });
      expect(response.statusCode).toBe(201);
      return response.json<ManagedExerciseSummary>();
    }

    it('se mide en metros, con las calorías en la marca', async () => {
      const cookie = await newUser();
      const remo = await addRemo(cookie);

      expect(remo.kind).toBe('distance');
      expect(remo.current).toMatchObject({ value: 2000, unit: 'm', caloriesKcal: 120 });

      const list = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/exercises',
        headers: { cookie },
      });
      expect(list.json<ExerciseList>().exercises[0]?.current).toMatchObject({ caloriesKcal: 120 });
    });

    it('sin calorías responde WC-RM-422-001 y no guarda nada', async () => {
      const cookie = await newUser();
      const remo = await addRemo(cookie);

      const response = await log(cookie, remo.id, { value: 2100 });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-RM-422-001',
        details: [{ path: 'caloriesKcal', message: 'Cargá las calorías' }],
      });
      expect((await history(cookie, remo.id)).json<RecordHistory>().records).toHaveLength(1);
    });

    it('la primera marca sin calorías tampoco se guarda', async () => {
      const cookie = await newUser();

      const response = await harness.app.inject({
        method: 'POST',
        url: '/api/v1/exercises',
        headers: { cookie, 'content-type': 'application/json' },
        payload: JSON.stringify({
          source: 'custom',
          name: 'Bici sin calorías',
          category: 'cardio',
          capacities: ['resistencia'],
          primaryMuscleGroup: 'cuerpo_completo',
          level: 'intermedio',
          firstRecord: { value: 5000 },
        }),
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-RM-422-001',
        details: [{ path: 'firstRecord.caloriesKcal' }],
      });
    });

    it('la mejor marca es la de más metros', async () => {
      const cookie = await newUser();
      const remo = await addRemo(cookie);

      await logOk(cookie, remo.id, 2100, '2026-06-10T10:00:00.000Z', { caloriesKcal: 125 });
      const despues = await logOk(cookie, remo.id, 1900, '2026-06-20T10:00:00.000Z', {
        caloriesKcal: 110,
      });

      expect(despues.best).toMatchObject({ value: 2100, unit: 'm', caloriesKcal: 125 });
      expect(despues.current).toMatchObject({ value: 1900, caloriesKcal: 110 });
      const page = (await history(cookie, remo.id)).json<RecordHistory>();
      expect(page.records.map((record) => record.caloriesKcal)).toEqual([110, 125, 120]);
    });
  });

  describe('distancia con carga: metros con su peso (F5-02b)', () => {
    async function addSled(cookie: string): Promise<ManagedExerciseSummary> {
      const response = await harness.app.inject({
        method: 'POST',
        url: '/api/v1/exercises',
        headers: { cookie, 'content-type': 'application/json' },
        payload: JSON.stringify({
          source: 'custom',
          name: 'Sled del box',
          category: 'distancia_carga',
          capacities: ['fuerza'],
          primaryMuscleGroup: 'cuadriceps',
          secondaryMuscleGroups: ['gluteo'],
          level: 'intermedio',
          firstRecord: { value: 50, performedAt: '2026-06-01T10:00:00.000Z', weightKg: 152 },
        }),
      });
      expect(response.statusCode).toBe(201);
      return response.json<ManagedExerciseSummary>();
    }

    it('se mide en metros, con el peso en la marca, y sin tabla de porcentajes', async () => {
      const cookie = await newUser();
      const sled = await addSled(cookie);

      expect(sled.kind).toBe('weighted_distance');
      expect(sled.current).toMatchObject({ value: 50, unit: 'm', weightKg: 152 });
    });

    it('sin peso responde WC-RM-422-001 y no guarda nada', async () => {
      const cookie = await newUser();
      const sled = await addSled(cookie);

      const response = await log(cookie, sled.id, { value: 60 });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-RM-422-001',
        details: [{ path: 'weightKg', message: 'Cargá el peso' }],
      });
      expect((await history(cookie, sled.id)).json<RecordHistory>().records).toHaveLength(1);
    });

    it('la mejor marca es la de más metros, sin importar el peso', async () => {
      const cookie = await newUser();
      const sled = await addSled(cookie);

      // Más metros con menos peso: igual es la mejor. El peso viaja como dato de la marca.
      await logOk(cookie, sled.id, 75, '2026-06-10T10:00:00.000Z', { weightKg: 102 });
      const despues = await logOk(cookie, sled.id, 60, '2026-06-20T10:00:00.000Z', {
        weightKg: 202,
      });

      expect(despues.best).toMatchObject({ value: 75, unit: 'm', weightKg: 102 });
      expect(despues.current).toMatchObject({ value: 60, weightKg: 202 });
    });
  });

  describe('fecha futura (spec §5.1)', () => {
    it('una marca con fecha futura se rechaza con el motivo, y no guarda nada', async () => {
      const cookie = await newUser();
      const squat = await addFromCatalog(
        cookie,
        'Sentadilla trasera',
        100,
        '2026-06-23T10:00:00.000Z',
      );
      const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await log(cookie, squat.id, { value: 200, performedAt: manana });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SYS-400-002',
        details: [{ path: 'performedAt', message: 'La fecha no puede ser futura' }],
      });
      expect((await history(cookie, squat.id)).json<RecordHistory>().records).toHaveLength(1);
    });
  });

  describe('valor actual: la marca de fecha más reciente (spec §5.1)', () => {
    it('una marca con fecha anterior no cambia el valor actual', async () => {
      const cookie = await newUser();
      const squat = await addFromCatalog(
        cookie,
        'Peso muerto convencional',
        100,
        '2026-06-23T10:00:00.000Z',
      );

      const vieja = await logOk(cookie, squat.id, 90, '2026-05-01T10:00:00.000Z');

      expect(vieja.current).toMatchObject({ value: 100, performedAt: '2026-06-23T10:00:00.000Z' });
    });

    it('una marca más reciente pasa a ser el valor actual, aunque sea menor que la mejor', async () => {
      const cookie = await newUser();
      const squat = await addFromCatalog(
        cookie,
        'Peso muerto convencional',
        100,
        '2026-06-23T10:00:00.000Z',
      );

      const nueva = await logOk(cookie, squat.id, 95, '2026-07-01T10:00:00.000Z');

      expect(nueva.current.value).toBe(95);
      expect(nueva.best.value).toBe(100);
    });
  });

  describe('mejor marca por categoría', () => {
    it('en fuerza, la mayor', async () => {
      const cookie = await newUser();
      const press = await addFromCatalog(cookie, 'Press militar', 80, '2026-06-01T10:00:00.000Z');

      await logOk(cookie, press.id, 85, '2026-06-10T10:00:00.000Z');
      const despues = await logOk(cookie, press.id, 82, '2026-06-20T10:00:00.000Z');

      expect(despues.best).toMatchObject({ value: 85, performedAt: '2026-06-10T10:00:00.000Z' });
    });

    it('en repeticiones, la mayor', async () => {
      const cookie = await newUser();
      const fondos = await addFromCatalog(cookie, 'Pull-up', 10, '2026-06-01T10:00:00.000Z');

      await logOk(cookie, fondos.id, 12, '2026-06-10T10:00:00.000Z');
      const despues = await logOk(cookie, fondos.id, 8, '2026-06-20T10:00:00.000Z');

      expect(despues.best.value).toBe(12);
    });

    describe('en hipertrofia, la de mayor RM estimado (F5-04, spec §5.1)', () => {
      it('6 × 90 kg le gana a 10 × 80 kg, aunque tenga menos repeticiones', async () => {
        const cookie = await newUser();
        const press = await addFromCatalog(
          cookie,
          'Press banca plano',
          10,
          '2026-06-01T10:00:00.000Z',
          {
            weightKg: 80,
          },
        );

        const despues = await logOk(cookie, press.id, 6, '2026-06-10T10:00:00.000Z', {
          weightKg: 90,
        });

        // RM estimado: 10 × 80 → 106,7 y 6 × 90 → 108.
        expect(despues.best).toMatchObject({ value: 6, weightKg: 90, unit: 'reps' });
      });

      it('más repeticiones con el mismo peso es mejor', async () => {
        const cookie = await newUser();
        const press = await addFromCatalog(
          cookie,
          'Press banca plano',
          8,
          '2026-06-01T10:00:00.000Z',
          {
            weightKg: 80,
          },
        );

        const despues = await logOk(cookie, press.id, 10, '2026-06-10T10:00:00.000Z', {
          weightKg: 80,
        });

        expect(despues.best).toMatchObject({ value: 10, weightKg: 80 });
      });

      it('con una repetición el RM estimado es el peso', async () => {
        const cookie = await newUser();
        // 1 × 105 kg (RM 105) contra 3 × 90 kg (RM 99): gana la de una repetición.
        const press = await addFromCatalog(
          cookie,
          'Press banca plano',
          3,
          '2026-06-01T10:00:00.000Z',
          {
            weightKg: 90,
          },
        );

        const despues = await logOk(cookie, press.id, 1, '2026-06-10T10:00:00.000Z', {
          weightKg: 105,
        });

        expect(despues.best).toMatchObject({ value: 1, weightKg: 105 });
      });

      it('la mejor no es la última: una marca más floja no la desplaza', async () => {
        const cookie = await newUser();
        const press = await addFromCatalog(
          cookie,
          'Press banca plano',
          6,
          '2026-06-01T10:00:00.000Z',
          {
            weightKg: 90,
          },
        );

        const despues = await logOk(cookie, press.id, 12, '2026-06-20T10:00:00.000Z', {
          weightKg: 60,
        });

        // 12 × 60 → 84 contra 6 × 90 → 108.
        expect(despues.best).toMatchObject({ value: 6, weightKg: 90 });
        expect(despues.current).toMatchObject({ value: 12, weightKg: 60 });
      });

      it('si el RM estimado se repite, cuenta la primera vez que se logró', async () => {
        const cookie = await newUser();
        // 10 × 90 y 15 × 60 dan el mismo RM estimado: 120 kg.
        const press = await addFromCatalog(
          cookie,
          'Press banca plano',
          10,
          '2026-06-01T10:00:00.000Z',
          {
            weightKg: 90,
          },
        );

        const igual = await logOk(cookie, press.id, 15, '2026-06-10T10:00:00.000Z', {
          weightKg: 60,
        });

        expect(igual.best.performedAt).toBe('2026-06-01T10:00:00.000Z');
      });

      it('lo mismo en el historial', async () => {
        const cookie = await newUser();
        const press = await addFromCatalog(
          cookie,
          'Press banca plano',
          10,
          '2026-06-01T10:00:00.000Z',
          {
            weightKg: 80,
          },
        );
        await logOk(cookie, press.id, 6, '2026-06-10T10:00:00.000Z', { weightKg: 90 });

        const response = await history(cookie, press.id);

        expect(response.json<{ best: unknown }>().best).toMatchObject({ value: 6, weightKg: 90 });
      });
    });

    it('en tiempo, la menor: menos es mejor', async () => {
      const cookie = await newUser();
      const km = await addFromCatalog(cookie, 'Carrera 1 km', 300, '2026-06-01T10:00:00.000Z', {
        elevationGainM: 0,
      });

      await logOk(cookie, km.id, 280, '2026-06-10T10:00:00.000Z', { elevationGainM: 0 });
      const despues = await logOk(cookie, km.id, 310, '2026-06-20T10:00:00.000Z', {
        elevationGainM: 0,
      });

      expect(despues.best).toMatchObject({ value: 280, unit: 's' });
      expect(despues.current.value).toBe(310);
    });

    it('si la mejor se repite, cuenta la primera vez que se logró', async () => {
      const cookie = await newUser();
      const floor = await addFromCatalog(
        cookie,
        'Dominadas lastradas',
        70,
        '2026-06-01T10:00:00.000Z',
      );

      await logOk(cookie, floor.id, 75, '2026-06-10T10:00:00.000Z');
      const igual = await logOk(cookie, floor.id, 75, '2026-06-20T10:00:00.000Z');

      expect(igual.best.performedAt).toBe('2026-06-10T10:00:00.000Z');
    });
  });

  describe('historial', () => {
    it('va del más reciente al más viejo, sin importar el orden en que se cargó', async () => {
      const cookie = await newUser();
      const hip = await addFromCatalog(
        cookie,
        'Sentadilla frontal',
        100,
        '2026-06-15T10:00:00.000Z',
      );
      await logOk(cookie, hip.id, 110, '2026-07-01T10:00:00.000Z');
      await logOk(cookie, hip.id, 90, '2026-05-01T10:00:00.000Z');

      const page = (await history(cookie, hip.id)).json<RecordHistory>();

      expect(page.records.map((r) => r.value)).toEqual([110, 100, 90]);
      expect(page.current.value).toBe(110);
      expect(page.best.value).toBe(110);
      expect(page.nextCursor).toBeNull();
    });

    it('con la misma fecha, primero la que se cargó después', async () => {
      const cookie = await newUser();
      const militar = await addFromCatalog(cookie, 'Press militar', 50, '2026-06-01T10:00:00.000Z');
      await logOk(cookie, militar.id, 52, '2026-06-01T10:00:00.000Z');

      const page = (await history(cookie, militar.id)).json<RecordHistory>();

      expect(page.records.map((r) => r.value)).toEqual([52, 50]);
      expect(page.current.value).toBe(52);
    });

    it('pagina sin repetir ni saltear marcas', async () => {
      const cookie = await newUser();
      const push = await addFromCatalog(cookie, 'Push Press', 60, '2026-06-01T10:00:00.000Z');
      for (const [value, day] of [
        [61, '02'],
        [62, '03'],
        [63, '04'],
        [64, '05'],
      ] as const) {
        await logOk(cookie, push.id, value, `2026-06-${day}T10:00:00.000Z`);
      }

      const vistos: number[] = [];
      let cursor: string | null = null;
      let paginas = 0;
      do {
        const query = `?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
        const page: RecordHistory = (await history(cookie, push.id, query)).json<RecordHistory>();
        vistos.push(...page.records.map((r) => r.value));
        cursor = page.nextCursor;
        paginas += 1;
      } while (cursor !== null && paginas < 10);

      expect(vistos).toEqual([64, 63, 62, 61, 60]);
      expect(paginas).toBe(3);
    });

    it('pagina sin repetir ni saltear aunque varias marcas compartan fecha', async () => {
      const cookie = await newUser();
      const mismaFecha = '2026-06-01T10:00:00.000Z';
      const jerk = await addFromCatalog(cookie, 'Clean and Jerk', 70, mismaFecha);
      await logOk(cookie, jerk.id, 71, mismaFecha);
      await logOk(cookie, jerk.id, 72, mismaFecha);

      const vistos: number[] = [];
      let cursor: string | null = null;
      let paginas = 0;
      do {
        const query = `?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
        const page: RecordHistory = (await history(cookie, jerk.id, query)).json<RecordHistory>();
        vistos.push(...page.records.map((r) => r.value));
        cursor = page.nextCursor;
        paginas += 1;
      } while (cursor !== null && paginas < 10);

      // Con la misma fecha, primero la que se cargó después.
      expect(vistos).toEqual([72, 71, 70]);
    });

    it('un cursor inválido responde WC-SYS-400-002', async () => {
      const cookie = await newUser();
      const snatch = await addFromCatalog(cookie, 'Snatch', 50, '2026-06-01T10:00:00.000Z');

      const response = await history(cookie, snatch.id, '?cursor=esto-no-es-un-cursor');

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
    });
  });

  describe('IDOR (spec §13)', () => {
    it('cargar una marca en el ejercicio de otro usuario responde 404 y no guarda nada', async () => {
      const braian = await newUser();
      const amigo = await newUser();
      const deBraian = await addFromCatalog(
        braian,
        'Clean and Jerk',
        60,
        '2026-06-01T10:00:00.000Z',
      );

      const response = await log(amigo, deBraian.id, { value: 500 });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-404-002' });
      expect((await history(braian, deBraian.id)).json<RecordHistory>().records).toHaveLength(1);
    });

    it('leer el historial de otro usuario responde 404', async () => {
      const braian = await newUser();
      const amigo = await newUser();
      const deBraian = await addFromCatalog(braian, 'Snatch', 70, '2026-06-01T10:00:00.000Z');

      const response = await history(amigo, deBraian.id);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-EXO-404-002' });
    });

    it('un ID que no existe responde 404; uno con otro formato, 400', async () => {
      const cookie = await newUser();

      expect((await history(cookie, 'mex_noexiste00000')).statusCode).toBe(404);
      expect((await history(cookie, 'exo_a1b2c3d4')).statusCode).toBe(400);
    });

    it('sin sesión, ni carga ni lee', async () => {
      const cookie = await newUser();
      const squat = await addFromCatalog(cookie, 'Clean and Jerk', 80, '2026-06-01T10:00:00.000Z');

      const post = await harness.app.inject({
        method: 'POST',
        url: `/api/v1/exercises/${squat.id}/records`,
        payload: { value: 1 },
      });
      const get = await harness.app.inject({
        method: 'GET',
        url: `/api/v1/exercises/${squat.id}/records`,
      });

      expect(post.statusCode).toBe(401);
      expect(get.statusCode).toBe(401);
    });
  });
});
