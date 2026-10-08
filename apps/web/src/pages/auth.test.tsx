import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { PROVIDERS_QUERY_KEY } from '../app/session.ts';
import { braian, fakeSession, refreshSession, renderApp } from '../test/app.tsx';

/*
 * La pantalla de ingreso (F9-07, spec §5.6, ADR-0012): sólo botones de proveedores, ningún campo.
 * El ingreso de verdad navega fuera de la app y vuelve con la sesión abierta, así que acá se prueba
 * hasta el pedido de la URL; lo que sigue es del E2E.
 */

async function expectSinViolaciones(): Promise<void> {
  const results = await axe.run(document.body, {
    rules: { region: { enabled: false } },
  });
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

async function abrirLogin(path = '/login', session = fakeSession(null)) {
  const app = renderApp(path, session.client);
  await screen.findByRole('heading', { name: 'Entrar' });
  return { ...app, session };
}

describe('pantalla de ingreso (F9-07)', () => {
  describe('qué muestra', () => {
    it('un botón por proveedor habilitado, y ningún campo de email ni de contraseña', async () => {
      await abrirLogin();

      const botones = await screen.findAllByRole('button');
      expect(botones.map((boton) => boton.textContent)).toEqual([
        'Continuar con Google',
        'Continuar con Microsoft',
      ]);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/email|contraseña/i)).not.toBeInTheDocument();
      expect(document.querySelector('input')).toBeNull();
    });

    it('un texto que cubre las dos cosas: entrar y crear la cuenta son lo mismo', async () => {
      await abrirLogin();

      expect(await screen.findByText(/Entrá o creá tu cuenta/)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /crear una cuenta/i })).not.toBeInTheDocument();
    });

    it('sólo los proveedores que la API habilita', async () => {
      const session = fakeSession(null);
      session.client.providers.mockResolvedValue([{ id: 'google', label: 'Google' }]);
      await abrirLogin('/login', session);

      expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeVisible();
      expect(screen.queryByRole('button', { name: /Microsoft/ })).not.toBeInTheDocument();
      // Y la nota de Microsoft, que sólo corresponde si Microsoft está.
      expect(screen.queryByText(/sólo cuentas personales/)).not.toBeInTheDocument();
    });

    it('cada botón lleva el logo de su proveedor', async () => {
      const session = fakeSession(null);
      session.client.providers.mockResolvedValue([
        { id: 'google', label: 'Google' },
        { id: 'microsoft', label: 'Microsoft' },
        { id: 'fake-idp', label: 'Ingreso de desarrollo' },
      ]);
      await abrirLogin('/login', session);

      const google = await screen.findByRole('button', { name: 'Continuar con Google' });
      const microsoft = screen.getByRole('button', { name: 'Continuar con Microsoft' });
      const desarrollo = screen.getByRole('button', {
        name: 'Continuar con Ingreso de desarrollo',
      });
      expect(google.querySelector('path[fill="#4285F4"]')).not.toBeNull();
      expect(microsoft.querySelector('rect[fill="#F25022"]')).not.toBeNull();
      expect(desarrollo.querySelector('svg')).toHaveAttribute('stroke', 'currentColor');
    });

    it('el ingreso de desarrollo se nombra distinto, para no confundirlo con uno de verdad', async () => {
      const session = fakeSession(null);
      session.client.providers.mockResolvedValue([
        { id: 'fake-idp', label: 'Ingreso de desarrollo' },
      ]);
      await abrirLogin('/login', session);

      expect(
        await screen.findByRole('button', { name: 'Continuar con Ingreso de desarrollo' }),
      ).toBeVisible();
    });

    it('avisa que Microsoft es sólo para cuentas personales', async () => {
      await abrirLogin();

      expect(await screen.findByText(/sólo cuentas personales/)).toBeInTheDocument();
    });

    it('mientras carga la lista, no hay botones ni un aviso de error', async () => {
      const session = fakeSession(null);
      session.client.providers.mockReturnValue(new Promise(() => undefined));
      await abrirLogin('/login', session);

      expect(screen.getByRole('status', { name: /Cargando/ })).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('sin violaciones de accesibilidad', async () => {
      await abrirLogin();
      await screen.findByRole('button', { name: 'Continuar con Google' });

      await expectSinViolaciones();
    });
  });

  describe('al apretar un botón', () => {
    it('pide la URL del proveedor y queda deshabilitado mientras tanto', async () => {
      const session = fakeSession(null);
      let navegar: () => void = () => undefined;
      session.client.signInWithProvider.mockReturnValue(
        new Promise<void>((resolve) => {
          navegar = resolve;
        }),
      );
      await abrirLogin('/login', session);

      await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
      });
      expect(session.client.signInWithProvider).toHaveBeenCalledExactlyOnceWith('google', {
        redirect: undefined,
      });
      // El botón que se apretó dice que está trabajando, y el otro no se puede apretar a la vez.
      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toHaveAttribute(
        'aria-busy',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeDisabled();

      // Cuando la navegación empieza, la página se va: no hay que habilitar nada en el medio. React
      // Query publica el éxito en la vuelta siguiente: hay que dejarlo pasar para que el test mire
      // el estado de después y no el de antes.
      navegar();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeDisabled();
    });

    it('con Microsoft pide el de Microsoft', async () => {
      const { session } = await abrirLogin();

      await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Microsoft' }));

      expect(session.client.signInWithProvider).toHaveBeenCalledExactlyOnceWith('microsoft', {
        redirect: undefined,
      });
    });

    it('le pasa a dónde iba el usuario, para que el ingreso vuelva ahí', async () => {
      const { session } = await abrirLogin('/login?redirect=%2Fejercicios%2Fmex_abc');

      await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));

      expect(session.client.signInWithProvider).toHaveBeenCalledWith('google', {
        redirect: '/ejercicios/mex_abc',
      });
    });

    it('si no se puede pedir la URL, lo dice con su código y deja volver a intentar', async () => {
      const session = fakeSession(null);
      session.client.signInWithProvider.mockRejectedValueOnce(
        new ApiError(
          429,
          'WC-AUTH-429-003',
          'Demasiados intentos. Esperá un minuto y probá de nuevo.',
          'req-2',
        ),
      );
      await abrirLogin('/login', session);

      await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Esperá un minuto');
      expect(alert).toHaveTextContent('WC-AUTH-429-003');
      // Se puede volver a intentar.
      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeEnabled();
    });
  });

  describe('al volver del proveedor sin entrar (?error=)', () => {
    it.each([
      [
        'access_denied',
        'Cancelaste el ingreso. Probá de nuevo cuando quieras.',
        'WC-OAUTH-400-001',
      ],
      [
        'account_not_linked',
        'Ya hay una cuenta con ese email. Entrá con el otro proveedor.',
        'WC-OAUTH-409-003',
      ],
      ['state_mismatch', 'No pudimos completar el ingreso. Probá de nuevo.', 'WC-OAUTH-400-002'],
      [
        'email_not_verified',
        'No pudimos completar el ingreso. Probá de nuevo.',
        'WC-OAUTH-400-002',
      ],
    ])('%s muestra el mensaje del catálogo', async (error, mensaje, codigo) => {
      renderApp(`/login?error=${error}`, fakeSession(null).client);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(mensaje);
      expect(alert).toHaveTextContent(codigo);
    });

    it('un valor inventado no se refleja: nunca se muestra el texto que vino en el link', async () => {
      const link = '<img src=x onerror=alert(1)>Tu cuenta fue bloqueada, llamá al 0800-123';
      renderApp(`/login?error=${encodeURIComponent(link)}`, fakeSession(null).client);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No pudimos completar el ingreso. Probá de nuevo.');
      expect(document.body).not.toHaveTextContent('Tu cuenta fue bloqueada');
      expect(document.body).not.toHaveTextContent('0800-123');
      expect(document.querySelector('img')).toBeNull();
    });

    it('algo que no es un texto (?error=1) cae en el genérico', async () => {
      renderApp('/login?error=1', fakeSession(null).client);

      expect(await screen.findByRole('alert')).toHaveTextContent('WC-OAUTH-400-002');
    });

    it('el parámetro sale de la URL y el aviso se queda, y a dónde iba el usuario también', async () => {
      const { router } = renderApp(
        '/login?error=access_denied&redirect=%2Fperfil',
        fakeSession(null).client,
      );

      expect(await screen.findByRole('alert')).toHaveTextContent('WC-OAUTH-400-001');
      await waitFor(() => {
        expect(router.state.location.search).toEqual({ redirect: '/perfil' });
      });
      expect(router.state.location.pathname).toBe('/login');
      expect(screen.getByRole('alert')).toHaveTextContent('WC-OAUTH-400-001');
    });

    it('el aviso no tapa los botones: se puede volver a intentar', async () => {
      const { session } = await abrirLogin('/login?error=access_denied');

      await screen.findByRole('alert');
      await userEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));

      expect(session.client.signInWithProvider).toHaveBeenCalledOnce();
    });

    it('sin violaciones de accesibilidad con el aviso a la vista', async () => {
      await abrirLogin('/login?error=access_denied');
      await screen.findByRole('alert');
      await screen.findByRole('button', { name: 'Continuar con Google' });

      await expectSinViolaciones();
    });
  });

  describe('si la lista de proveedores no está', () => {
    it('vacía: avisa que el ingreso no está disponible, con Reintentar', async () => {
      const session = fakeSession(null);
      session.client.providers.mockResolvedValueOnce([]);
      await abrirLogin('/login', session);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('El ingreso no está disponible');
      expect(screen.queryByRole('button', { name: /Continuar con/ })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeVisible();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('caída: reintenta sola y, si sigue sin llegar, avisa con el código del pedido', async () => {
      const session = fakeSession(null);
      session.client.providers.mockRejectedValue(
        new ApiError(0, 'WC-SYS-503-004', 'No pudimos conectarnos.', 'req-8'),
      );
      await abrirLogin('/login', session);

      const alert = await screen.findByRole('alert', undefined, { timeout: 8000 });
      expect(alert).toHaveTextContent('El ingreso no está disponible');
      expect(alert).toHaveTextContent('WC-SYS-503-004');
      expect(alert).toHaveTextContent('req-8');
      expect(session.client.providers.mock.calls.length).toBeGreaterThan(1);

      session.client.providers.mockResolvedValue([{ id: 'google', label: 'Google' }]);
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    }, 15_000);

    it('si un refresco falla con los botones a la vista, se los deja: sigue siendo posible entrar', async () => {
      const session = fakeSession(null);
      const app = renderApp('/login', session.client);
      await screen.findByRole('button', { name: 'Continuar con Google' });

      // Un 4xx no se reintenta: el error llega enseguida.
      session.client.providers.mockRejectedValue(
        new ApiError(404, 'WC-SYS-404-003', 'No encontramos lo que buscás.', 'req-3'),
      );
      await app.queryClient.refetchQueries({ queryKey: PROVIDERS_QUERY_KEY });
      await waitFor(() => {
        expect(app.queryClient.getQueryState(PROVIDERS_QUERY_KEY)?.status).toBe('error');
      });

      expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('sin violaciones de accesibilidad', async () => {
      const session = fakeSession(null);
      session.client.providers.mockResolvedValue([]);
      await abrirLogin('/login', session);
      await screen.findByRole('alert');

      await expectSinViolaciones();
    });
  });

  describe('rutas', () => {
    it('/registro ya no existe: responde como cualquier ruta inexistente', async () => {
      const { router } = renderApp('/registro', fakeSession(null).client);

      expect(await screen.findByText('No encontramos lo que buscás.')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Crear una cuenta' })).not.toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/registro');
    });

    it('con sesión, /login lleva a Home: no hay nada que hacer ahí', async () => {
      const { router } = renderApp('/login', fakeSession(braian).client);

      expect(await screen.findByRole('heading', { name: 'Tus ejercicios' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
    });

    it('volver del proveedor con la sesión abierta lleva a donde iba', async () => {
      const session = fakeSession(null);
      const app = renderApp('/login?redirect=%2Fperfil', session.client);
      await screen.findByRole('heading', { name: 'Entrar' });

      session.login(braian);
      await refreshSession(app);

      expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
      expect(app.router.state.location.pathname).toBe('/perfil');
    });
  });
});
