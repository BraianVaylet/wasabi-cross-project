import type {
  ExerciseList,
  ExerciseStats,
  GeneralStats,
  LogRecordResponse,
  ManagedExerciseSummary,
  RecordHistory,
  SessionUser,
  UserPreferences,
} from '@wasabi-cross/schemas';
import { createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../app/App.tsx';
import type { ApiClient } from '../app/api.ts';
import { createApp } from '../app/create-app.ts';
import type { SessionClient } from '../app/session.ts';

export const braian: SessionUser = {
  id: 'u1',
  email: 'braian@example.com',
  name: 'Braian',
  plan: 'free',
};

export interface FakeSession {
  client: {
    [K in keyof SessionClient]: ReturnType<typeof vi.fn<SessionClient[K]>>;
  };
  /** "Entrar" desde el test, sin pasar por el formulario. */
  login: (who: SessionUser) => void;
}

/** Una sesión en memoria: arranca con o sin usuario, y entrar o salir la cambia. */
export function fakeSession(initial: SessionUser | null): FakeSession {
  let user = initial;

  return {
    client: {
      current: vi.fn<SessionClient['current']>(() => Promise.resolve(user)),
      signIn: vi.fn<SessionClient['signIn']>(() => {
        user = braian;
        return Promise.resolve();
      }),
      signUp: vi.fn<SessionClient['signUp']>(() => {
        user = braian;
        return Promise.resolve();
      }),
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

const PREFERENCIAS: UserPreferences = {
  theme: 'dark',
  loadPercentages: [65, 75, 80, 85, 90, 95],
};

const LISTA_VACIA: ExerciseList = {
  exercises: [],
  usage: { plan: 'free', total: 0, custom: 0, maxTotal: 10, maxCustom: 3 },
};

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
      preferences: vi.fn<ApiClient['preferences']>(() => Promise.resolve(PREFERENCIAS)),
      savePreferences: vi.fn<ApiClient['savePreferences']>((change) =>
        Promise.resolve({
          theme: change.theme ?? PREFERENCIAS.theme,
          loadPercentages: change.loadPercentages ?? PREFERENCIAS.loadPercentages,
        }),
      ),
    },
  };
}

export function renderApp(path: string, session: SessionClient, api: ApiClient = fakeApi().client) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const app = createApp({ session, api, history });
  render(<App queryClient={app.queryClient} router={app.router} session={session} />);
  return app;
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
