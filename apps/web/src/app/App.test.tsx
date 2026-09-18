import type { SessionUser } from '@wasabi-cross/schemas';
import { createMemoryHistory } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { App } from './App.tsx';
import { createApp, refreshSession } from './create-app.ts';
import type { SessionClient } from './session.ts';

const braian: SessionUser = { id: 'u1', email: 'braian@example.com', name: 'Braian', plan: 'free' };

/** Una sesión en memoria: arranca con o sin usuario, y se puede "entrar" desde el test. */
function fakeSession(initial: SessionUser | null) {
  let user = initial;
  const client = {
    current: vi.fn<SessionClient['current']>(() => Promise.resolve(user)),
    signOut: vi.fn<SessionClient['signOut']>(() => {
      user = null;
      return Promise.resolve();
    }),
  } satisfies SessionClient;

  return {
    client,
    login: (who: SessionUser) => {
      user = who;
    },
  };
}

function renderApp(path: string, session: SessionClient) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const app = createApp({ session, history });
  render(<App queryClient={app.queryClient} router={app.router} session={session} />);
  return app;
}

describe('shell de la app (F1-09)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  describe('al abrir la app', () => {
    it('muestra el splash mientras averigua si hay sesión (mockup 1)', () => {
      const session = fakeSession(null);
      session.client.current.mockReturnValue(new Promise(() => undefined));

      renderApp('/', session.client);

      expect(screen.getByRole('status')).toHaveTextContent('Wasabi Cross');
    });

    it('si no puede averiguarlo, muestra el código y el requestId, y deja reintentar', async () => {
      const session = fakeSession(braian);
      session.client.current.mockRejectedValueOnce(
        new ApiError(0, 'WC-SYS-503-004', 'No pudimos conectarnos.', 'req-42'),
      );

      renderApp('/', session.client);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No pudimos conectarnos.');
      expect(alert).toHaveTextContent('WC-SYS-503-004');
      expect(alert).toHaveTextContent('req-42');

      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByRole('heading', { name: 'Tus ejercicios' })).toBeInTheDocument();
    });
  });

  describe('rutas protegidas', () => {
    it('sin sesión, una ruta protegida redirige a login recordando a dónde iba', async () => {
      const { router } = renderApp('/perfil', fakeSession(null).client);

      expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.location.search).toEqual({ redirect: '/perfil' });
    });

    it('después de entrar, vuelve a donde iba', async () => {
      const session = fakeSession(null);
      const app = renderApp('/perfil', session.client);
      await screen.findByRole('heading', { name: 'Entrar' });

      session.login(braian);
      await refreshSession(app);

      expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
      expect(app.router.state.location.pathname).toBe('/perfil');
    });

    it('con sesión, login lleva directo a Home', async () => {
      const { router } = renderApp('/login', fakeSession(braian).client);

      expect(await screen.findByRole('heading', { name: 'Tus ejercicios' })).toBeInTheDocument();
      expect(screen.getByText('¡Hola, Braian!')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
    });

    it.each(['//evil.example', 'https://evil.example'])(
      'un redirect que apunta afuera (%s) termina en Home: no es un open redirect',
      async (redirect) => {
        const { router } = renderApp(
          `/login?redirect=${encodeURIComponent(redirect)}`,
          fakeSession(braian).client,
        );

        await screen.findByRole('heading', { name: 'Tus ejercicios' });
        expect(router.state.location.pathname).toBe('/');
      },
    );

    it('si la sesión vence (WC-AUTH-401-004), vuelve a login recordando dónde estaba', async () => {
      const app = renderApp('/perfil', fakeSession(braian).client);
      await screen.findByRole('heading', { name: 'Perfil' });

      await app.queryClient
        .query({
          queryKey: ['algo'],
          queryFn: () =>
            Promise.reject(new ApiError(401, 'WC-AUTH-401-004', 'Iniciá sesión.', 'req-1')),
        })
        .catch(() => undefined);

      expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
      expect(app.router.state.location.search).toEqual({ redirect: '/perfil' });
    });

    it('otro error de una consulta no cierra la sesión', async () => {
      const app = renderApp('/perfil', fakeSession(braian).client);
      await screen.findByRole('heading', { name: 'Perfil' });

      await app.queryClient
        .query({
          queryKey: ['algo'],
          retry: false,
          queryFn: () => Promise.reject(new ApiError(404, 'WC-EXO-404-002', 'No está.', 'req-1')),
        })
        .catch(() => undefined);
      // Que el router termine de recargar antes de mirar: si el error cerrara la sesión, la
      // redirección a login llega recién ahí.
      await app.router.invalidate();

      expect(app.router.state.location.pathname).toBe('/perfil');
      expect(screen.getByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
    });

    it('si la sesión no se puede recargar, muestra el error con su código', async () => {
      const session = fakeSession(braian);
      const app = renderApp('/perfil', session.client);
      await screen.findByRole('heading', { name: 'Perfil' });

      session.client.current.mockRejectedValue(
        new ApiError(0, 'WC-SYS-503-004', 'No pudimos conectarnos.', 'req-9'),
      );
      await refreshSession(app).catch(() => undefined);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('WC-SYS-503-004');
      expect(alert).toHaveTextContent('req-9');
    });

    it('una ruta que no existe lo dice, con un camino de vuelta', async () => {
      renderApp('/no-existe', fakeSession(braian).client);

      expect(await screen.findByText('No encontramos lo que buscás.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Volver a tus ejercicios' })).toBeInTheDocument();
    });
  });

  describe('header (mockup 4a)', () => {
    it('logo y nombre a la izquierda; tema y menú a la derecha', async () => {
      renderApp('/', fakeSession(braian).client);

      const banner = await screen.findByRole('banner');
      expect(banner).toHaveTextContent('Wasabi Cross');
      expect(screen.getByRole('link', { name: 'Wasabi Cross' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('button', { name: 'Cambiar a tema claro' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('arranca en oscuro y el toggle cambia el tema de toda la app', async () => {
      renderApp('/', fakeSession(braian).client);

      await userEvent.click(await screen.findByRole('button', { name: 'Cambiar a tema claro' }));

      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });

  describe('menú', () => {
    it('con teclado: el foco entra al abrirlo, y Escape lo cierra y lo devuelve al botón', async () => {
      renderApp('/', fakeSession(braian).client);
      const menuButton = await screen.findByRole('button', { name: 'Abrir menú' });

      menuButton.focus();
      await userEvent.keyboard('{Enter}');

      const menu = screen.getByRole('dialog', { name: 'Menú principal' });
      expect(menu).toContainElement(document.activeElement as HTMLElement);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(menuButton).toHaveFocus();
    });

    it('marca dónde estás y navega cerrándose', async () => {
      const { router } = renderApp('/', fakeSession(braian).client);
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir menú' }));

      expect(screen.getByRole('link', { name: 'Tus ejercicios' })).toHaveAttribute(
        'aria-current',
        'page',
      );

      await userEvent.click(screen.getByRole('link', { name: 'Perfil' }));

      expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/perfil');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cerrar sesión la invalida y lleva a login', async () => {
      const session = fakeSession(braian);
      const { router } = renderApp('/', session.client);
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir menú' }));

      await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

      expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
      expect(session.client.signOut).toHaveBeenCalledOnce();
      expect(router.state.location.pathname).toBe('/login');
    });

    it('si cerrar sesión falla, lo dice con su código y no finge haber salido', async () => {
      const session = fakeSession(braian);
      session.client.signOut.mockRejectedValueOnce(
        new ApiError(0, 'WC-SYS-503-004', 'No pudimos conectarnos.', 'req-7'),
      );
      const { router } = renderApp('/', session.client);
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir menú' }));

      await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('WC-SYS-503-004');
      expect(alert).toHaveTextContent('req-7');
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
    });
  });
});
