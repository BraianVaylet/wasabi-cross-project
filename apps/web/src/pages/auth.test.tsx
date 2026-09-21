import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeSession, renderApp } from '../test/app.tsx';

const PASSWORD = 'una-frase-larga-y-propia';

async function expectSinViolaciones(): Promise<void> {
  const results = await axe.run(document.body, {
    rules: { region: { enabled: false } },
  });
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

async function completar(campo: string | RegExp, valor: string): Promise<void> {
  await userEvent.type(screen.getByLabelText(campo), valor);
}

describe('login y registro (F1-10)', () => {
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

  describe('login (mockup 2)', () => {
    it('entra con email y contraseña, y vuelve a donde iba', async () => {
      const session = fakeSession(null);
      const { router } = renderApp('/login?redirect=%2Fperfil', session.client);
      await screen.findByRole('heading', { name: 'Entrar' });

      await completar('Email', 'Braian@Example.com');
      await completar('Contraseña', PASSWORD);
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
      expect(session.client.signIn).toHaveBeenCalledWith({
        // Normalizado: no son dos cuentas distintas.
        email: 'braian@example.com',
        password: PASSWORD,
      });
      expect(router.state.location.pathname).toBe('/perfil');
    });

    it('con credenciales inválidas muestra el mensaje, sin decir qué campo estaba mal', async () => {
      const session = fakeSession(null);
      session.client.signIn.mockRejectedValueOnce(
        new ApiError(401, 'WC-AUTH-401-001', 'Email o contraseña incorrectos.', 'req-1'),
      );
      renderApp('/login', session.client);
      await screen.findByRole('heading', { name: 'Entrar' });

      await completar('Email', 'braian@example.com');
      await completar('Contraseña', 'la-que-no-era');
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Email o contraseña incorrectos.');
      expect(alert).toHaveTextContent('WC-AUTH-401-001');
      // Ningún campo queda marcado: decir cuál falló diría si el email existe (spec §13).
      expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
      expect(screen.getByLabelText('Contraseña')).not.toHaveAttribute('aria-invalid');
    });

    it('con demasiados intentos explica cuánto esperar', async () => {
      const session = fakeSession(null);
      session.client.signIn.mockRejectedValueOnce(
        new ApiError(
          429,
          'WC-AUTH-429-003',
          'Demasiados intentos. Esperá un minuto y probá de nuevo.',
          'req-2',
        ),
      );
      renderApp('/login', session.client);
      await screen.findByRole('heading', { name: 'Entrar' });

      await completar('Email', 'braian@example.com');
      await completar('Contraseña', PASSWORD);
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Esperá un minuto');
    });

    it('un email inválido se rechaza en el formulario, sin llamar a la API', async () => {
      const session = fakeSession(null);
      renderApp('/login', session.client);
      await screen.findByRole('heading', { name: 'Entrar' });

      await completar('Email', 'no-es-un-email');
      await completar('Contraseña', PASSWORD);
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(await screen.findByText('Email inválido')).toBeInTheDocument();
      expect(session.client.signIn).not.toHaveBeenCalled();
    });

    it('se envía con Enter desde el último campo, sin llegar al botón', async () => {
      const session = fakeSession(null);
      renderApp('/login', session.client);
      await screen.findByRole('heading', { name: 'Entrar' });

      await completar('Email', 'braian@example.com');
      await userEvent.type(screen.getByLabelText('Contraseña'), `${PASSWORD}{Enter}`);

      await waitFor(() => {
        expect(session.client.signIn).toHaveBeenCalledOnce();
      });
    });

    it('la contraseña se escribe oculta y el navegador sabe qué guardar', async () => {
      renderApp('/login', fakeSession(null).client);

      const password = await screen.findByLabelText('Contraseña');
      expect(password).toHaveAttribute('type', 'password');
      expect(password).toHaveAttribute('autocomplete', 'current-password');
      expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    });

    it('sin violaciones de accesibilidad', async () => {
      renderApp('/login', fakeSession(null).client);
      await screen.findByRole('heading', { name: 'Entrar' });

      await expectSinViolaciones();
    });
  });

  describe('registro (mockup 3)', () => {
    async function irARegistro(): Promise<void> {
      await screen.findByRole('heading', { name: 'Entrar' });
      await userEvent.click(screen.getByRole('link', { name: 'Crear una cuenta' }));
      await screen.findByRole('heading', { name: 'Crear una cuenta' });
    }

    it('se llega desde login, y se vuelve, sin perder a dónde iba', async () => {
      const { router } = renderApp('/login?redirect=%2Fperfil', fakeSession(null).client);

      await irARegistro();
      expect(router.state.location.pathname).toBe('/registro');
      expect(router.state.location.search).toEqual({ redirect: '/perfil' });

      await userEvent.click(screen.getByRole('link', { name: 'Ya tengo cuenta' }));

      expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
      expect(router.state.location.search).toEqual({ redirect: '/perfil' });
    });

    it('crea la cuenta y entra', async () => {
      const session = fakeSession(null);
      const { router } = renderApp('/registro', session.client);
      await screen.findByRole('heading', { name: 'Crear una cuenta' });

      await completar('Email', 'braian@example.com');
      await completar('Nombre', 'Braian');
      await completar('Contraseña', PASSWORD);
      await completar('Repetir contraseña', PASSWORD);
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(await screen.findByRole('heading', { name: 'Tus ejercicios' })).toBeInTheDocument();
      // La confirmación se queda en el formulario: no viaja a la API.
      expect(session.client.signUp).toHaveBeenCalledWith({
        email: 'braian@example.com',
        name: 'Braian',
        password: PASSWORD,
      });
      expect(router.state.location.pathname).toBe('/');
    });

    it('dos contraseñas distintas: el error va en la confirmación, antes de llamar a la API', async () => {
      const session = fakeSession(null);
      renderApp('/registro', session.client);
      await screen.findByRole('heading', { name: 'Crear una cuenta' });

      await completar('Email', 'braian@example.com');
      await completar('Nombre', 'Braian');
      await completar('Contraseña', PASSWORD);
      await completar('Repetir contraseña', 'otra-frase-distinta');
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
      expect(screen.getByLabelText('Repetir contraseña')).toHaveAttribute('aria-invalid', 'true');
      expect(session.client.signUp).not.toHaveBeenCalled();
    });

    it('una contraseña corta se rechaza en el formulario, con el mismo mínimo que la API', async () => {
      const session = fakeSession(null);
      renderApp('/registro', session.client);
      await screen.findByRole('heading', { name: 'Crear una cuenta' });

      await completar('Email', 'braian@example.com');
      await completar('Nombre', 'Braian');
      await completar('Contraseña', 'corta');
      await completar('Repetir contraseña', 'corta');
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(await screen.findByText(/al menos 10 caracteres/)).toBeInTheDocument();
      expect(session.client.signUp).not.toHaveBeenCalled();
    });

    it('si el email ya existe, lo dice con el mensaje de la API', async () => {
      const session = fakeSession(null);
      session.client.signUp.mockRejectedValueOnce(
        new ApiError(400, 'WC-SYS-400-002', 'Ese email ya está registrado.', 'req-3'),
      );
      renderApp('/registro', session.client);
      await screen.findByRole('heading', { name: 'Crear una cuenta' });

      await completar('Email', 'braian@example.com');
      await completar('Nombre', 'Braian');
      await completar('Contraseña', PASSWORD);
      await completar('Repetir contraseña', PASSWORD);
      await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Ese email ya está registrado.');
    });

    it('las contraseñas se escriben ocultas y el navegador sabe que son nuevas', async () => {
      renderApp('/registro', fakeSession(null).client);

      const password = await screen.findByLabelText('Contraseña');
      expect(password).toHaveAttribute('type', 'password');
      expect(password).toHaveAttribute('autocomplete', 'new-password');
      expect(screen.getByLabelText('Repetir contraseña')).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
    });

    it('sin violaciones de accesibilidad', async () => {
      renderApp('/registro', fakeSession(null).client);
      await screen.findByRole('heading', { name: 'Crear una cuenta' });

      await expectSinViolaciones();
    });
  });

  describe('con sesión', () => {
    it('login y registro llevan a Home: no hay nada que hacer ahí', async () => {
      const { router } = renderApp('/registro', fakeSession(braian).client);

      expect(await screen.findByRole('heading', { name: 'Tus ejercicios' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
    });
  });
});

describe('sin dejar rastros', () => {
  it('el formulario no queda en el DOM con la contraseña escrita después de entrar', async () => {
    const session = fakeSession(null);
    renderApp('/login', session.client);
    await screen.findByRole('heading', { name: 'Entrar' });

    await userEvent.type(screen.getByLabelText('Email'), 'braian@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await screen.findByRole('heading', { name: 'Tus ejercicios' });
    await waitFor(() => {
      expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    });
  });
});
