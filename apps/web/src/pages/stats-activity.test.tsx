import type { ManagedExerciseSummary, TrainingActivity } from '@wasabi-cross/schemas';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp } from '../test/app.tsx';

/*
 * F7-05: constancia, récords y para retestear en Estadísticas (spec §5.4).
 */

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

const actividad: TrainingActivity = {
  period: '12m',
  records: 7,
  byMonth: [
    { month: '2026-07', records: 3 },
    { month: '2026-08', records: 0 },
    { month: '2026-09', records: 4 },
  ],
  lastRecordAt: '2026-09-23T12:00:00.000Z',
  daysSinceLast: 9,
  personalBests: 2,
  topImprovements: [
    { id: 'mex_a1b2c3d4', name: 'Back squat', changePercent: 20 },
    { id: 'mex_z9y8x7w6', name: 'Clean', changePercent: 5.5 },
  ],
  stale: [
    { id: 'mex_r3m0r3m0', name: 'Remo', lastRecordAt: '2026-06-01T12:00:00.000Z', days: 123 },
  ],
};

function renderStats(activity: Partial<TrainingActivity> | Error = {}) {
  const api = fakeApi({
    exercises: [backSquat],
    usage: { plan: 'free', total: 1, custom: 0, maxTotal: 10, maxCustom: 3 },
  });
  api.client.trainingActivity.mockImplementation((period) =>
    activity instanceof Error
      ? Promise.reject(activity)
      : Promise.resolve({ ...actividad, ...activity, period }),
  );
  const app = renderApp('/estadisticas', fakeSession(braian).client, api.client);
  return { api, ...app };
}

describe('Estadísticas: constancia, récords y para retestear (F7-05)', () => {
  it('muestra las marcas del período, los récords nuevos y los días desde la última', async () => {
    renderStats();

    const seccion = await screen.findByRole('region', { name: 'Constancia' });
    const numeros = within(seccion).getByTestId('constancia');
    expect(numeros).toHaveTextContent('Marcas7');
    expect(numeros).toHaveTextContent('Récords nuevos2');
    expect(numeros).toHaveTextContent('Última marcahace 9 días');
  });

  it('las marcas por mes se leen en una tabla, con el mes vacío en cero', async () => {
    renderStats();

    const tabla = await screen.findByRole('table', { name: 'Marcas por mes' });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.map((fila) => fila.textContent)).toEqual(['jul3', 'ago0', 'sept4']);
  });

  it('con más de un año en el eje, el mes lleva el año', async () => {
    const meses = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'];
    const masMeses = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    renderStats({
      byMonth: [...meses, ...masMeses].map((month) => ({ month, records: 1 })),
    });

    const tabla = await screen.findByRole('table', { name: 'Marcas por mes' });
    expect(within(tabla).getByText('oct 25')).toBeInTheDocument();
    expect(within(tabla).getByText('oct 26')).toBeInTheDocument();
  });

  it('una última marca de hoy se dice "hoy"', async () => {
    renderStats({ daysSinceLast: 0 });

    expect(await screen.findByText('hoy')).toBeInTheDocument();
  });

  it('una de ayer, "ayer"', async () => {
    renderStats({ daysSinceLast: 1 });

    expect(await screen.findByText('ayer')).toBeInTheDocument();
  });

  it('lo que más mejoró lleva al detalle de cada ejercicio', async () => {
    renderStats();

    const seccion = await screen.findByRole('region', { name: 'Lo que más mejoró' });
    const link = within(seccion).getByRole('link', { name: /Back squat/ });
    expect(link).toHaveAttribute('href', '/ejercicios/mex_a1b2c3d4');
    expect(link).toHaveTextContent('+20%');
    expect(within(seccion).getByRole('link', { name: /Clean/ })).toHaveTextContent('+5.5%');
  });

  it('sin mejoras lo explica, y sin nada para retestear no muestra la sección', async () => {
    renderStats({ topImprovements: [], stale: [] });

    const seccion = await screen.findByRole('region', { name: 'Lo que más mejoró' });
    expect(within(seccion).getByText(/hacen falta dos marcas/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Para retestear' })).not.toBeInTheDocument();
  });

  it('propone retestear con link al detalle y cuánto hace de la última marca', async () => {
    renderStats();

    const seccion = await screen.findByRole('region', { name: 'Para retestear' });
    expect(within(seccion).getByText('Más de 8 semanas')).toBeInTheDocument();
    const link = within(seccion).getByRole('link', { name: /Remo/ });
    expect(link).toHaveAttribute('href', '/ejercicios/mex_r3m0r3m0');
    expect(link).toHaveTextContent('Última marca el 01/06/2026, hace 123 días');
  });

  it('cambiar el período vuelve a pedir la constancia', async () => {
    const { api } = renderStats();
    await screen.findByRole('region', { name: 'Constancia' });

    await userEvent.click(screen.getByRole('radio', { name: 'Últimos 3 meses' }));

    await waitFor(() => {
      expect(api.client.trainingActivity).toHaveBeenCalledWith('3m');
    });
  });

  it('sin marcas todavía, no dice cuándo fue la última', async () => {
    renderStats({ lastRecordAt: null, daysSinceLast: null });

    const numeros = await screen.findByTestId('constancia');
    expect(numeros).not.toHaveTextContent('Última marca');
  });

  it('si la API falla, lo cuenta con su código', async () => {
    renderStats(new ApiError(400, 'WC-SYS-400-002', 'Los datos no son válidos.', 'req-1'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('WC-SYS-400-002');
  });

  it('pasa axe sin violaciones', async () => {
    renderStats();
    await screen.findByRole('region', { name: 'Para retestear' });

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
