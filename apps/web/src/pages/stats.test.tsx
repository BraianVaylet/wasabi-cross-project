import type { ExerciseList, ExerciseStats, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp } from '../test/app.tsx';

const backSquat: ManagedExerciseSummary = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Back squat',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'intermedio',
  withPain: false,
  current: { value: 120, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
};

const clean: ManagedExerciseSummary = {
  ...backSquat,
  id: 'mex_z9y8x7w6',
  exerciseId: 'exo_z9y8x7w6',
  name: 'Clean',
  current: { value: 70, unit: 'kg', performedAt: '2026-06-01T12:00:00.000Z' },
};

const estadisticas: ExerciseStats = {
  id: 'mex_a1b2c3d4',
  name: 'Back squat',
  kind: 'rm',
  unit: 'kg',
  period: '12m',
  series: [
    { performedAt: '2026-01-10T12:00:00.000Z', value: 100 },
    { performedAt: '2026-06-23T12:00:00.000Z', value: 120 },
  ],
  summary: { current: 120, best: 120, worst: 100, changePercent: 20, records: 2 },
};

function lista(exercises: ManagedExerciseSummary[]): ExerciseList {
  return {
    exercises,
    usage: { plan: 'free', total: exercises.length, custom: 0, maxTotal: 10, maxCustom: 3 },
  };
}

function renderStats(path = '/estadisticas', exercises = [backSquat, clean]) {
  const api = fakeApi(lista(exercises));
  api.client.exerciseStats.mockResolvedValue(estadisticas);
  const app = renderApp(path, fakeSession(braian).client, api.client);
  return { api, ...app };
}

describe('Estadísticas (F2-07, mockup 10)', () => {
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

  it('lista los ejercicios, cerrados y sin pedir estadísticas de ninguno', async () => {
    const { api } = renderStats();

    expect(await screen.findByRole('heading', { name: 'Tus estadísticas' })).toBeInTheDocument();
    const acordeon = within(await screen.findByRole('list')).getAllByRole('button');

    expect(acordeon.map((boton) => boton.textContent)).toEqual(['Back squat', 'Clean']);
    expect(acordeon.every((boton) => boton.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(api.client.exerciseStats).not.toHaveBeenCalled();
  });

  it('abrir uno pide sus estadísticas y las muestra', async () => {
    const { api } = renderStats();

    await userEvent.click(await screen.findByRole('button', { name: 'Back squat' }));

    await waitFor(() => {
      expect(api.client.exerciseStats).toHaveBeenCalledWith('mex_a1b2c3d4', '12m');
    });
    expect(await screen.findByRole('figure', { name: /Back squat/ })).toBeInTheDocument();

    const numeros = screen.getByTestId('numeros');
    expect(
      within(numeros)
        .getAllByRole('term')
        .map((dt) => dt.textContent),
    ).toEqual(['Actual', 'Mejor', 'Peor', 'Variación']);
    expect(
      within(numeros)
        .getAllByRole('definition')
        .map((dd) => dd.textContent),
    ).toEqual(['120 kg', '120 kg', '100 kg', '+20%']);
    // La del otro sigue sin pedirse.
    expect(api.client.exerciseStats).toHaveBeenCalledTimes(1);
  });

  it('cuál quedó abierto vive en la URL', async () => {
    const { router } = renderStats();

    await userEvent.click(await screen.findByRole('button', { name: 'Clean' }));

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ abierto: 'mex_z9y8x7w6' });
    });
  });

  it('con un ejercicio en la URL, ese arranca abierto', async () => {
    const { api } = renderStats('/estadisticas?abierto=mex_a1b2c3d4');

    await waitFor(() => {
      expect(api.client.exerciseStats).toHaveBeenCalledWith('mex_a1b2c3d4', '12m');
    });
    expect(await screen.findByRole('button', { expanded: true })).toHaveTextContent('Back squat');
  });

  it('volver a tocarlo lo cierra y lo saca de la URL', async () => {
    const { router } = renderStats('/estadisticas?abierto=mex_a1b2c3d4');
    const boton = await screen.findByRole('button', { name: 'Back squat' });

    await userEvent.click(boton);

    expect(boton).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => {
      expect(router.state.location.search).toEqual({});
    });
  });

  it('se abre con el teclado, que es como se maneja un acordeón', async () => {
    const { api } = renderStats();
    const boton = await screen.findByRole('button', { name: 'Back squat' });

    // Se llega tabulando: ni se enfoca a mano ni se dispara el click a dedo.
    for (let intento = 0; intento < 10 && document.activeElement !== boton; intento += 1) {
      await userEvent.tab();
    }
    expect(boton).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(api.client.exerciseStats).toHaveBeenCalledWith('mex_a1b2c3d4', '12m');
    });
  });

  it('un ejercicio sin marcas en el período lo dice, sin gráfico vacío', async () => {
    const { api } = renderStats();
    api.client.exerciseStats.mockResolvedValue({
      ...estadisticas,
      series: [],
      summary: null,
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Back squat' }));

    expect(await screen.findByText('Todavía no hay marcas en este período')).toBeInTheDocument();
  });

  it('si la API falla, lo cuenta con su código', async () => {
    const { api } = renderStats();
    api.client.exerciseStats.mockRejectedValue(
      new ApiError(404, 'WC-STATS-404-001', 'No encontramos ese ejercicio.', 'req-1'),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Back squat' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No encontramos ese ejercicio.');
    expect(alert).toHaveTextContent('WC-STATS-404-001');
  });

  it('sin ejercicios, invita a cargar el primero', async () => {
    renderStats('/estadisticas', []);

    expect(await screen.findByText('Todavía no tenés ejercicios')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agregar el primero' })).toBeInTheDocument();
  });

  it('sin violaciones de accesibilidad, abierto y cerrado', async () => {
    renderStats();
    await screen.findByRole('button', { name: 'Back squat' });

    const cerrado = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(cerrado.violations.map((violation) => violation.id)).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'Back squat' }));
    await screen.findByRole('figure', { name: /Back squat/ });

    const abierto = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(abierto.violations.map((violation) => violation.id)).toEqual([]);
  });

  it('desde el detalle de un ejercicio se llega a su evolución', async () => {
    const { router } = renderStats('/ejercicios/mex_a1b2c3d4');

    await userEvent.click(await screen.findByRole('link', { name: 'Estadísticas' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/estadisticas');
    });
    expect(router.state.location.search).toMatchObject({ abierto: 'mex_a1b2c3d4' });
  });
});
