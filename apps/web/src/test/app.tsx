import type { SessionUser } from '@wasabi-cross/schemas';
import { createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../app/App.tsx';
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

export function renderApp(path: string, session: SessionClient) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const app = createApp({ session, history });
  render(<App queryClient={app.queryClient} router={app.router} session={session} />);
  return app;
}
