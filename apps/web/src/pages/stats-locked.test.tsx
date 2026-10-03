import type { ManagedExerciseSummary, SessionUser } from '@wasabi-cross/schemas';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, braianPro, fakeApi, fakeSession, renderApp } from '../test/app.tsx';

/*
 * F8-05 (spec §4, §5.5): las estadísticas son de Pro. Con plan Free la pantalla Estadísticas y el
 * progreso del detalle muestran un aviso en lugar del contenido, y el front ni pide los datos. La
 * regla está en la API; esto es que el usuario lo entienda y no vea un error.
 */

const AVISO = 'Las estadísticas son parte del plan Pro.';

const backSquat: ManagedExerciseSummary = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Back squat',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'principiante',
  withPain: false,
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
};

function render(path: string, user: SessionUser) {
  const api = fakeApi({ exercises: [backSquat] });
  const app = renderApp(path, fakeSession(user).client, api.client);
  return { api, ...app };
}

/** Ninguna de las cuatro consultas de estadísticas salió. */
function sinPedidosDeEstadisticas(api: ReturnType<typeof render>['api']): void {
  expect(api.client.exerciseStats).not.toHaveBeenCalled();
  expect(api.client.generalStats).not.toHaveBeenCalled();
  expect(api.client.trainingActivity).not.toHaveBeenCalled();
  expect(api.client.trainingBreakdown).not.toHaveBeenCalled();
}

const planCambiado = () =>
  new ApiError(403, 'WC-SUBS-403-002', 'Las estadísticas son parte del plan Pro.', 'req-403');

describe('Estadísticas con plan Free (F8-05)', () => {
  it('muestra el aviso con el camino a los planes, y ningún dato', async () => {
    const { api } = render('/estadisticas', braian);

    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tus estadísticas' })).toBeInTheDocument();
    expect(screen.getByText(/Cargar ejercicios y marcas sigue siendo libre/)).toBeInTheDocument();
    // Nada de lo que hay con Pro: ni el período, ni la lista, ni las secciones.
    expect(screen.queryByRole('group', { name: 'Período' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Ejercicios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    sinPedidosDeEstadisticas(api);
  });

  it('"Ver planes" lleva a la suscripción', async () => {
    const { router } = render('/estadisticas', braian);

    await userEvent.click(await screen.findByRole('link', { name: 'Ver planes' }));

    expect(router.state.location.pathname).toBe('/suscripcion');
  });

  it('un ejercicio abierto en la URL tampoco pide nada', async () => {
    const { api } = render('/estadisticas?abierto=mex_a1b2c3d4&periodo=3m', braian);

    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    sinPedidosDeEstadisticas(api);
  });

  it('sin violaciones de accesibilidad', async () => {
    render('/estadisticas', braian);
    await screen.findByText(AVISO);

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  it('con Pro, sigue viendo todo', async () => {
    const { api } = render('/estadisticas', braianPro);

    expect(await screen.findByRole('list', { name: 'Ejercicios' })).toBeInTheDocument();
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(api.client.generalStats).toHaveBeenCalled();
  });

  it('con Pro, si la API dice que el plan no las incluye, muestra el mismo aviso y no un error', async () => {
    const { api } = render('/estadisticas', braianPro);
    api.client.generalStats.mockRejectedValue(planCambiado());
    api.client.trainingActivity.mockRejectedValue(planCambiado());
    api.client.trainingBreakdown.mockRejectedValue(planCambiado());

    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/WC-SUBS-403-002/)).not.toBeInTheDocument();
  });
});

describe('Progreso del detalle con plan Free (F8-05)', () => {
  it('en lugar del gráfico, el aviso; el resto del detalle sigue igual', async () => {
    const { api } = render('/ejercicios/mex_a1b2c3d4', braian);

    expect(await screen.findByRole('heading', { name: 'Progreso del RM' })).toBeInTheDocument();
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.queryByTestId('aumento')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver estadísticas/ })).not.toBeInTheDocument();
    // Lo que carga y ve del ejercicio, intacto (spec §4).
    expect(screen.getByRole('heading', { name: 'Back squat' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Elegí tu carga' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Historial de RM' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar nuevo RM' })).toBeEnabled();
    expect(api.client.history).toHaveBeenCalled();
    expect(api.client.exerciseStats).not.toHaveBeenCalled();
  });

  it('"Ver planes" lleva a la suscripción', async () => {
    const { router } = render('/ejercicios/mex_a1b2c3d4', braian);

    await userEvent.click(await screen.findByRole('link', { name: 'Ver planes' }));

    expect(router.state.location.pathname).toBe('/suscripcion');
  });

  it('el historial no inventa una cantidad de registros: sale de las estadísticas', async () => {
    render('/ejercicios/mex_a1b2c3d4', braian);
    await screen.findByText(AVISO);

    expect(screen.queryByText(/\d+ registros?/)).not.toBeInTheDocument();
  });

  it('con Pro, si la API dice que el plan no las incluye, lo mismo que con Free', async () => {
    const { api } = render('/ejercicios/mex_a1b2c3d4', braianPro);
    api.client.exerciseStats.mockRejectedValue(planCambiado());

    expect(await screen.findByText(AVISO)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver estadísticas/ })).not.toBeInTheDocument();
  });

  it('con Pro, otro error del progreso se muestra como error, no como el aviso', async () => {
    const { api } = render('/ejercicios/mex_a1b2c3d4', braianPro);
    api.client.exerciseStats.mockRejectedValue(
      new ApiError(404, 'WC-STATS-404-001', 'No encontramos ese ejercicio.', 'req-404'),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('WC-STATS-404-001');
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('sin violaciones de accesibilidad', async () => {
    render('/ejercicios/mex_a1b2c3d4', braian);
    await screen.findByText(AVISO);

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
