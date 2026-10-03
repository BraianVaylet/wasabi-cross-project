import type { SessionUser } from '@wasabi-cross/schemas';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { braian, braianPro, fakeApi, fakeSession, renderApp } from '../test/app.tsx';

/*
 * F8-04 (spec §5.5): el plan de cada usuario a la vista, la pantalla de suscripción y el aviso de
 * que cambiar de plan todavía no se puede. La pasarela de pago es una segunda etapa.
 */

const AVISO = 'Cambiar de plan todavía no está disponible: se habilita junto con el pago.';

function renderSuscripcion(user: SessionUser = braian) {
  const api = fakeApi();
  const app = renderApp('/suscripcion', fakeSession(user).client, api.client);
  return { api, ...app };
}

/** La sección que lleva ese título: sin aserciones de tipo, y con un mensaje si no está. */
async function seccion(titulo: string): Promise<HTMLElement> {
  const encontrada = (await screen.findByRole('heading', { name: titulo })).closest('section');
  if (!encontrada) {
    throw new Error(`No hay una sección con el título "${titulo}"`);
  }
  return encontrada;
}

/** La tarjeta de un plan, por el nombre de su grupo. */
function tarjeta(plan: 'Free' | 'Pro'): HTMLElement {
  return screen.getByRole('group', { name: new RegExp(`^${plan}`) });
}

describe('Suscripción (F8-04)', () => {
  describe('con plan Free', () => {
    it('muestra el plan actual y lo que se paga: $0', async () => {
      renderSuscripcion();

      const dentro = within(await seccion('Tu plan actual'));
      expect(dentro.getByText('Plan')).toBeInTheDocument();
      expect(dentro.getByText('Free')).toBeInTheDocument();
      expect(dentro.getByText('Lo que pagás')).toBeInTheDocument();
      expect(dentro.getByText('$0')).toBeInTheDocument();
    });

    it('la tarjeta de Free es la actual y no tiene botón; la de Pro ofrece pasar', async () => {
      renderSuscripcion();
      await screen.findByRole('heading', { name: 'Planes' });

      expect(within(tarjeta('Free')).getByText('Tu plan actual')).toBeInTheDocument();
      expect(within(tarjeta('Free')).queryByRole('button')).not.toBeInTheDocument();
      expect(within(tarjeta('Pro')).queryByText('Tu plan actual')).not.toBeInTheDocument();
      expect(within(tarjeta('Pro')).getByRole('button', { name: 'Pasar a Pro' })).toBeEnabled();
    });

    it('dice qué incluye cada plan: las estadísticas son lo único que Free no tiene', async () => {
      renderSuscripcion();
      await screen.findByRole('heading', { name: 'Planes' });

      const free = within(tarjeta('Free'));
      expect(free.getByText(/No incluye:/).closest('li')).toHaveTextContent('Estadísticas');
      expect(free.getAllByText(/^Incluye:/)).toHaveLength(2);

      const pro = within(tarjeta('Pro'));
      expect(pro.queryByText(/No incluye:/)).not.toBeInTheDocument();
      expect(pro.getAllByText(/^Incluye:/)).toHaveLength(3);
      expect(pro.getByText(/Estadísticas de cada ejercicio/)).toBeInTheDocument();
    });

    it('el precio de Pro está a definir: no se inventa un monto', async () => {
      renderSuscripcion();
      await screen.findByRole('heading', { name: 'Planes' });

      expect(within(tarjeta('Pro')).getByText('A definir')).toBeInTheDocument();
      expect(within(tarjeta('Free')).getByText('$0')).toBeInTheDocument();
    });

    it('"Pasar a Pro" avisa que todavía no está disponible, y no llama a la API', async () => {
      const { api } = renderSuscripcion();
      await screen.findByRole('heading', { name: 'Planes' });
      expect(screen.queryByText(AVISO)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Pasar a Pro' }));

      expect(await screen.findByRole('status')).toHaveTextContent(AVISO);
      for (const call of Object.values(api.client)) {
        expect(call).not.toHaveBeenCalled();
      }
    });

    it('sin violaciones de accesibilidad, ni con el aviso abierto', async () => {
      renderSuscripcion();
      await screen.findByRole('heading', { name: 'Planes' });
      const auditar = () => axe.run(document.body, { rules: { region: { enabled: false } } });

      expect((await auditar()).violations.map((violation) => violation.id)).toEqual([]);

      await userEvent.click(screen.getByRole('button', { name: 'Pasar a Pro' }));
      await screen.findByRole('status');
      expect((await auditar()).violations.map((violation) => violation.id)).toEqual([]);
    });
  });

  describe('con plan Pro', () => {
    it('muestra Pro como el plan actual y avisa que todavía no se cobra', async () => {
      renderSuscripcion(braianPro);

      const dentro = within(await seccion('Tu plan actual'));
      expect(dentro.getByText('Pro')).toBeInTheDocument();
      expect(dentro.getByText('A definir')).toBeInTheDocument();
      expect(dentro.getByText(/Todavía no se cobra/)).toBeInTheDocument();
    });

    it('la tarjeta de Pro es la actual; la de Free ofrece pasar', async () => {
      renderSuscripcion(braianPro);
      await screen.findByRole('heading', { name: 'Planes' });

      expect(within(tarjeta('Pro')).getByText('Tu plan actual')).toBeInTheDocument();
      expect(within(tarjeta('Pro')).queryByRole('button')).not.toBeInTheDocument();
      expect(within(tarjeta('Free')).getByRole('button', { name: 'Pasar a Free' })).toBeEnabled();
    });

    it('"Pasar a Free" avisa lo mismo y el plan no cambia', async () => {
      const { api } = renderSuscripcion(braianPro);
      await screen.findByRole('heading', { name: 'Planes' });

      await userEvent.click(screen.getByRole('button', { name: 'Pasar a Free' }));

      expect(await screen.findByRole('status')).toHaveTextContent(AVISO);
      expect(within(tarjeta('Pro')).getByText('Tu plan actual')).toBeInTheDocument();
      for (const call of Object.values(api.client)) {
        expect(call).not.toHaveBeenCalled();
      }
    });

    it('sin violaciones de accesibilidad', async () => {
      renderSuscripcion(braianPro);
      await screen.findByRole('heading', { name: 'Planes' });

      const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  });
});

describe('el plan en el Perfil y en el header (F8-04)', () => {
  it('el Perfil de un usuario Free dice Free y lleva a la suscripción', async () => {
    const { router } = renderApp('/perfil', fakeSession(braian).client, fakeApi().client);

    const dentro = within(await seccion('Tu plan'));
    expect(dentro.getByText('Free')).toBeInTheDocument();
    expect(dentro.getByText(/Las estadísticas son parte del plan Pro/)).toBeInTheDocument();

    await userEvent.click(dentro.getByRole('link', { name: 'Administrar suscripción' }));

    expect(router.state.location.pathname).toBe('/suscripcion');
  });

  it('el Perfil de un usuario Pro dice Pro', async () => {
    renderApp('/perfil', fakeSession(braianPro).client, fakeApi().client);

    const dentro = within(await seccion('Tu plan'));
    expect(dentro.getByText('Pro')).toBeInTheDocument();
    expect(dentro.getByText(/ves las estadísticas de cada ejercicio/)).toBeInTheDocument();
  });

  it('con plan Pro, el header tiene la etiqueta PRO, en todas las pantallas, y lleva a la suscripción', async () => {
    const { router } = renderApp('/', fakeSession(braianPro).client, fakeApi().client);

    const etiqueta = await screen.findByRole('link', { name: 'Plan Pro: administrar suscripción' });
    expect(etiqueta).toHaveTextContent('Pro');

    await userEvent.click(etiqueta);
    expect(router.state.location.pathname).toBe('/suscripcion');
    // Sigue ahí en la pantalla nueva: es parte del shell.
    expect(
      screen.getByRole('link', { name: 'Plan Pro: administrar suscripción' }),
    ).toBeInTheDocument();
  });

  it('con plan Free, el header no tiene etiqueta: no se marca lo que no se tiene', async () => {
    renderApp('/', fakeSession(braian).client, fakeApi().client);
    await screen.findByRole('heading', { name: 'Tus ejercicios' });

    expect(
      screen.queryByRole('link', { name: 'Plan Pro: administrar suscripción' }),
    ).not.toBeInTheDocument();
  });

  it('la suscripción no está en el menú: se llega desde el Perfil o la etiqueta', async () => {
    renderApp('/', fakeSession(braian).client, fakeApi().client);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menú' }));

    const menu = within(await screen.findByRole('navigation', { name: 'Principal' }));
    expect(menu.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Tus ejercicios',
      'Estadísticas',
      'Perfil',
    ]);
  });
});
