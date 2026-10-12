import type {
  ExerciseList,
  ExerciseStats,
  GeneralStats,
  LogRecordResponse,
  ManagedExerciseSummary,
  OauthProviderInfo,
  RecordHistory,
  SessionUser,
  TrainingActivity,
  TrainingBreakdown,
  UserPreferences,
} from '@wasabi-cross/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../app/App.tsx';
import type { ApiClient } from '../app/api.ts';
import { createApp } from '../app/create-app.ts';
import type { AppRouter } from '../app/router.tsx';
import { SESSION_QUERY_KEY, type SessionClient } from '../app/session.ts';

export const braian: SessionUser = {
  id: 'u1',
  email: 'braian@example.com',
  name: 'Braian',
  plan: 'free',
  hasPhoto: false,
};

/** El mismo atleta con foto: el Perfil la pide a `/api/v1/me/photo` (F9-08). */
export const braianConFoto: SessionUser = { ...braian, hasPhoto: true };

/** El mismo atleta con plan Pro: ve las estadísticas (spec §4). */
export const braianPro: SessionUser = { ...braian, plan: 'pro' };

export interface FakeSession {
  client: {
    [K in keyof SessionClient]: ReturnType<typeof vi.fn<SessionClient[K]>>;
  };
  /** "Entrar" desde el test, sin pasar por el formulario. */
  login: (who: SessionUser) => void;
}

/** Los dos proveedores de verdad, en el orden en que la API los lista (spec §5.6). */
export const proveedores: OauthProviderInfo[] = [
  { id: 'google', label: 'Google' },
  { id: 'microsoft', label: 'Microsoft' },
];

/**
 * Una sesión en memoria: arranca con o sin usuario, y salir la cambia. Entrar no: el ingreso real
 * navega fuera de la app y vuelve con la sesión abierta, así que `signInWithProvider` no abre
 * ninguna acá; el test que quiera ese "volver" usa `login` y `refreshSession`.
 */
export function fakeSession(initial: SessionUser | null): FakeSession {
  let user = initial;

  return {
    client: {
      current: vi.fn<SessionClient['current']>(() => Promise.resolve(user)),
      providers: vi.fn<SessionClient['providers']>(() => Promise.resolve(proveedores)),
      signInWithProvider: vi.fn<SessionClient['signInWithProvider']>(() => Promise.resolve()),
      signOut: vi.fn<SessionClient['signOut']>(() => {
        user = null;
        return Promise.resolve();
      }),
    },
    login: (who) => {
      user = who;
    },
  };
}

export interface FakeApi {
  client: {
    [K in keyof ApiClient]: ReturnType<typeof vi.fn<ApiClient[K]>>;
  };
}

/** Lo que responde un alta en los tests que no miran la respuesta. */
const ALTA_OK: ManagedExerciseSummary = {
  id: 'mex_00000000',
  exerciseId: 'exo_00000000',
  name: 'Ejercicio',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'intermedio',
  withPain: false,
  current: { value: 1, unit: 'kg', performedAt: '2026-01-01T12:00:00.000Z' },
};

const HISTORIAL_VACIO: RecordHistory = {
  records: [],
  current: { value: 1, unit: 'kg', performedAt: '2026-01-01T12:00:00.000Z' },
  best: { value: 1, unit: 'kg', performedAt: '2026-01-01T12:00:00.000Z' },
  nextCursor: null,
};

const MARCA_OK: LogRecordResponse = {
  record: { id: 'rec_00000000', value: 1, unit: 'kg', performedAt: '2026-01-01T12:00:00.000Z' },
  current: { value: 1, unit: 'kg', performedAt: '2026-01-01T12:00:00.000Z' },
  best: { value: 1, unit: 'kg', performedAt: '2026-01-01T12:00:00.000Z' },
};

const ESTADISTICAS_VACIAS: ExerciseStats = {
  id: 'mex_00000000',
  name: 'Ejercicio',
  kind: 'rm',
  unit: 'kg',
  period: '12m',
  series: [],
  summary: null,
};

const GENERALES_VACIAS: GeneralStats = {
  period: '12m',
  byCapacity: [],
  byMuscleGroup: [],
  insufficient: { capacities: [], muscleGroups: [] },
};

const ACTIVIDAD_VACIA: TrainingActivity = {
  period: '12m',
  records: 0,
  byMonth: [],
  lastRecordAt: null,
  daysSinceLast: null,
  personalBests: 0,
  topImprovements: [],
  stale: [],
};

const REPARTO_VACIO: TrainingBreakdown = {
  exercises: 0,
  byDiscipline: [],
  byCategory: [],
  bySegment: [],
  byMuscleGroup: [],
};

const PREFERENCIAS: UserPreferences = {
  loadPercentages: [65, 75, 80, 85, 90, 95],
};

const LISTA_VACIA: ExerciseList = { exercises: [] };

/** La API del front, en memoria: devuelve lo que le pasa el test. */
export function fakeApi(list: ExerciseList = LISTA_VACIA): FakeApi {
  return {
    client: {
      listExercises: vi.fn<ApiClient['listExercises']>(() => Promise.resolve(list)),
      catalog: vi.fn<ApiClient['catalog']>(() => Promise.resolve([])),
      addExercise: vi.fn<ApiClient['addExercise']>(() => Promise.resolve(ALTA_OK)),
      updateExercise: vi.fn<ApiClient['updateExercise']>(() => Promise.resolve(ALTA_OK)),
      deleteExercise: vi.fn<ApiClient['deleteExercise']>(() => Promise.resolve()),
      history: vi.fn<ApiClient['history']>(() => Promise.resolve(HISTORIAL_VACIO)),
      logRecord: vi.fn<ApiClient['logRecord']>(() => Promise.resolve(MARCA_OK)),
      exerciseStats: vi.fn<ApiClient['exerciseStats']>((id, period) =>
        Promise.resolve({ ...ESTADISTICAS_VACIAS, id, period }),
      ),
      generalStats: vi.fn<ApiClient['generalStats']>((period) =>
        Promise.resolve({ ...GENERALES_VACIAS, period }),
      ),
      trainingBreakdown: vi.fn<ApiClient['trainingBreakdown']>(() =>
        Promise.resolve(REPARTO_VACIO),
      ),
      trainingActivity: vi.fn<ApiClient['trainingActivity']>((period) =>
        Promise.resolve({ ...ACTIVIDAD_VACIA, period }),
      ),
      preferences: vi.fn<ApiClient['preferences']>(() => Promise.resolve(PREFERENCIAS)),
      savePreferences: vi.fn<ApiClient['savePreferences']>((change) =>
        Promise.resolve({
          loadPercentages: change.loadPercentages ?? PREFERENCIAS.loadPercentages,
        }),
      ),
    },
  };
}

export function renderApp(
  path: string,
  session: SessionClient,
  api: ApiClient = fakeApi().client,
  options: { photoUrl?: string } = {},
) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const app = createApp({ session, api, history, ...options });
  render(<App queryClient={app.queryClient} router={app.router} session={session} />);
  return app;
}

/**
 * Vuelve a pedir la sesión y deja que el router decida a dónde ir: lo que pasa cuando el usuario
 * vuelve del proveedor con la sesión ya abierta, o cuando la sesión cambia por otro lado.
 */
export async function refreshSession({
  queryClient,
  router,
}: {
  queryClient: QueryClient;
  router: AppRouter;
}): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY, refetchType: 'all' });
  await router.invalidate();
}

/**
 * La fila `index` de una lista, sin aserciones: `as HTMLElement` y `!` los pelea el lint
 * entre sí, y un índice que no existe tiene que fallar con un mensaje que se entienda.
 */
export function fila(items: HTMLElement[], index: number): HTMLElement {
  const found = items[index];
  if (!found) {
    throw new Error(`No hay fila ${String(index)}: la lista tiene ${String(items.length)}`);
  }
  return found;
}
