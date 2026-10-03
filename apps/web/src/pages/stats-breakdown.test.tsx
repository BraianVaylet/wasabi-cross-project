import type { ManagedExerciseSummary, TrainingBreakdown } from '@wasabi-cross/schemas';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp } from '../test/app.tsx';

/*
 * F7-06: "Tu entrenamiento" en Estadísticas — tres donas y las barras de grupos (spec §5.4).
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

const reparto: TrainingBreakdown = {
  exercises: 3,
  byDiscipline: [
    { discipline: 'crossfit', exercises: 2, percent: 50 },
    { discipline: 'hyrox', exercises: 1, percent: 25 },
    { discipline: null, exercises: 1, percent: 25 },
  ],
  byCategory: [
    { category: 'fuerza', exercises: 2, percent: 67 },
    { category: 'gimnastico', exercises: 1, percent: 33 },
  ],
  bySegment: [
    { segment: 'tren_inferior', exercises: 2, percent: 67 },
    { segment: 'tren_superior', exercises: 1, percent: 33 },
  ],
  byMuscleGroup: [
    { muscleGroup: 'cuadriceps', primary: 2, secondary: 0, score: 2, percent: 57 },
    { muscleGroup: 'gluteo', primary: 0, secondary: 2, score: 1, percent: 29 },
    { muscleGroup: 'core', primary: 0, secondary: 1, score: 0.5, percent: 14 },
  ],
};

function renderStats(breakdown: TrainingBreakdown | Error = reparto) {
  const api = fakeApi({
    exercises: [backSquat],
  });
  api.client.trainingBreakdown.mockImplementation(() =>
    breakdown instanceof Error ? Promise.reject(breakdown) : Promise.resolve(breakdown),
  );
  const app = renderApp('/estadisticas', fakeSession(braian).client, api.client);
  return { api, ...app };
}

function leyenda(nombre: string): HTMLElement[] {
  return within(screen.getByRole('list', { name: nombre })).getAllByRole('listitem');
}

describe('Estadísticas: tu entrenamiento (F7-06)', () => {
  it('dice que mira todos los ejercicios y no el período', async () => {
    renderStats();

    const seccion = await screen.findByRole('region', { name: 'Tu entrenamiento' });
    expect(within(seccion).getByText('Todos tus ejercicios')).toBeInTheDocument();
  });

  it('la dona de disciplinas cuenta menciones, con "Sin disciplina" en castellano', async () => {
    renderStats();
    await screen.findByRole('figure', { name: 'Disciplinas' });

    const items = leyenda('Disciplinas');
    expect(items.map((item) => item.textContent)).toEqual([
      'CrossFit2 ejercicios50%',
      'Hyrox1 ejercicio25%',
      'Sin disciplina1 ejercicio25%',
    ]);
    const dona = screen.getByRole('figure', { name: 'Disciplinas' });
    expect(within(dona).getByText('4')).toBeInTheDocument();
    expect(within(dona).getByText('menciones')).toBeInTheDocument();
  });

  it('categorías y segmento, con sus nombres y el total de ejercicios', async () => {
    renderStats();
    await screen.findByRole('figure', { name: 'Categorías' });

    expect(leyenda('Categorías').map((item) => item.textContent)).toEqual([
      'Fuerza2 ejercicios67%',
      'Gimnástico1 ejercicio33%',
    ]);
    expect(leyenda('Segmento del cuerpo').map((item) => item.textContent)).toEqual([
      'Tren inferior2 ejercicios67%',
      'Tren superior1 ejercicio33%',
    ]);
    const segmento = screen.getByRole('figure', { name: 'Segmento del cuerpo' });
    expect(within(segmento).getByText('ejercicios')).toBeInTheDocument();
  });

  it('las barras de grupos dicen el porcentaje y, al lector, primario y secundario', async () => {
    renderStats();
    await screen.findByRole('figure', { name: 'Grupos musculares' });

    const items = leyenda('Grupos musculares');
    expect(items[0]).toHaveTextContent('Cuádriceps');
    expect(items[0]).toHaveTextContent('57%');
    expect(items[1]).toHaveTextContent('Glúteo');
    expect(items[1]).toHaveTextContent('0 como primario y 2 como secundario');
  });

  it('sin ejercicios en el reparto, la sección no aparece', async () => {
    renderStats({
      ...reparto,
      exercises: 0,
      byDiscipline: [],
      byCategory: [],
      bySegment: [],
      byMuscleGroup: [],
    });
    await screen.findByRole('region', { name: 'Constancia' });

    expect(screen.queryByRole('region', { name: 'Tu entrenamiento' })).not.toBeInTheDocument();
  });

  it('si la API falla, lo cuenta con su código', async () => {
    renderStats(new ApiError(400, 'WC-SYS-400-002', 'Los datos no son válidos.', 'req-1'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('WC-SYS-400-002');
  });

  it('borrar un ejercicio vuelve a pedir el reparto', async () => {
    const { api, router } = renderStats();
    await screen.findByRole('region', { name: 'Tu entrenamiento' });
    const antes = api.client.trainingBreakdown.mock.calls.length;

    await router.navigate({ to: '/ejercicios/$id/editar', params: { id: backSquat.id } });
    await userEvent.type(
      await screen.findByLabelText('Escribí "Back squat" para confirmar'),
      'Back squat',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Borrar ejercicio' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    await router.navigate({ to: '/estadisticas' });

    await waitFor(() => {
      expect(api.client.trainingBreakdown.mock.calls.length).toBeGreaterThan(antes);
    });
  });

  it('pasa axe sin violaciones', async () => {
    renderStats();
    await screen.findByRole('figure', { name: 'Grupos musculares' });

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
