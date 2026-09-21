import type { ExerciseList, ManagedExerciseSummary, SessionUser } from '@wasabi-cross/schemas';
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
    },
  };
}

export function renderApp(path: string, session: SessionClient, api: ApiClient = fakeApi().client) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const app = createApp({ session, api, history });
  render(<App queryClient={app.queryClient} router={app.router} session={session} />);
  return app;
}
