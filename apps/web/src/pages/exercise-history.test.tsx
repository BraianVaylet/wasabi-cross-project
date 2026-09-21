import type { ExerciseList, ManagedExerciseSummary, RecordHistory } from '@wasabi-cross/schemas';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, fila, renderApp } from '../test/app.tsx';

const backSquat: ManagedExerciseSummary = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Back squat',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'intermedio',
  withPain: false,
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
};

const carrera: ManagedExerciseSummary = {
  ...backSquat,
  id: 'mex_z9y8x7w6',
  name: 'Carrera 1 km',
  category: 'running',
  kind: 'time',
  current: { value: 272, unit: 's', performedAt: '2026-07-01T12:00:00.000Z' },
};

function lista(exercises: ManagedExerciseSummary[]): ExerciseList {
  return {
    exercises,
    usage: { plan: 'free', total: exercises.length, custom: 0, maxTotal: 10, maxCustom: 3 },
  };
}

const primeraPagina: RecordHistory = {
  records: [
    { id: 'rec_1', value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
    { id: 'rec_2', value: 80, unit: 'kg', performedAt: '2026-02-23T12:00:00.000Z' },
    { id: 'rec_3', value: 60, unit: 'kg', performedAt: '2025-06-02T12:00:00.000Z' },
  ],
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
  best: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
  nextCursor: 'cursor-2',
};

const segundaPagina: RecordHistory = {
  records: [{ id: 'rec_4', value: 50, unit: 'kg', performedAt: '2025-01-10T12:00:00.000Z' }],
  current: primeraPagina.current,
  best: primeraPagina.best,
  nextCursor: null,
};

function renderDetalle(id = 'mex_a1b2c3d4', exercises = [backSquat, carrera]) {
  const api = fakeApi(lista(exercises));
  const app = renderApp(`/ejercicios/${id}`, fakeSession(braian).client, api.client);
  return { api, ...app };
}

describe('Historial del detalle (F1-13b, mockups 5 y 6)', () => {
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

  it('muestra las marcas con su fecha y valor, la más reciente marcada como actual', async () => {
    const { api } = renderDetalle();
    api.client.history.mockResolvedValue(primeraPagina);

    const historial = await screen.findByRole('list', { name: 'Historial' });
    const marcas = within(historial).getAllByRole('listitem');

    expect(marcas).toHaveLength(3);
    expect(within(fila(marcas, 0)).getByText('23/06/2026')).toBeInTheDocument();
    expect(within(fila(marcas, 0)).getByText('100 kg')).toBeInTheDocument();
    expect(within(fila(marcas, 0)).getByText('actual')).toBeInTheDocument();
    // Sólo la primera lo está.
    expect(within(fila(marcas, 1)).queryByText('actual')).not.toBeInTheDocument();
    expect(within(fila(marcas, 2)).getByText('02/06/2025')).toBeInTheDocument();
  });

  it('pide el historial de ese ejercicio, no de otro', async () => {
    const { api } = renderDetalle();

    // El fake responde sin marcas: alcanza con que la pantalla haya pedido el historial.
    await screen.findByText('Todavía no hay marcas cargadas.');

    expect(api.client.history).toHaveBeenCalledWith('mex_a1b2c3d4', { limit: 3 });
  });

  it('trae las siguientes sin repetir, y cuando no hay más deja de ofrecerlo', async () => {
    const { api } = renderDetalle();
    api.client.history.mockResolvedValueOnce(primeraPagina).mockResolvedValueOnce(segundaPagina);
    await screen.findByRole('list', { name: 'Historial' });

    await userEvent.click(screen.getByRole('button', { name: 'Ver más' }));

    const marcas = within(await screen.findByRole('list', { name: 'Historial' })).getAllByRole(
      'listitem',
    );
    expect(marcas).toHaveLength(4);
    expect(within(fila(marcas, 3)).getByText('50 kg')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver más' })).not.toBeInTheDocument();
  });

  it('en tiempo se ve la mejor marca, que es la menor', async () => {
    const { api } = renderDetalle('mex_z9y8x7w6');
    api.client.history.mockResolvedValue({
      records: [
        { id: 'rec_1', value: 272, unit: 's', performedAt: '2026-07-01T12:00:00.000Z' },
        { id: 'rec_2', value: 265, unit: 's', performedAt: '2026-05-01T12:00:00.000Z' },
      ],
      current: { value: 272, unit: 's', performedAt: '2026-07-01T12:00:00.000Z' },
      best: { value: 265, unit: 's', performedAt: '2026-05-01T12:00:00.000Z' },
      nextCursor: null,
    });

    const mejor = await screen.findByTestId('mejor-marca');
    expect(mejor).toHaveTextContent('4:25');
    expect(mejor).toHaveTextContent('01/05/2026');
  });

  it('mientras llega se ven skeletons, no la lista vacía', async () => {
    const { api } = renderDetalle();
    api.client.history.mockReturnValue(new Promise(() => undefined));

    expect(
      await screen.findByRole('status', { name: 'Cargando el historial' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Historial' })).not.toBeInTheDocument();
  });

  it('si el historial no llega, lo dice sin romper el resto de la pantalla', async () => {
    const { api } = renderDetalle();
    api.client.history.mockRejectedValue(
      new ApiError(404, 'WC-EXO-404-002', 'No encontramos ese ejercicio.', 'req-1'),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('WC-EXO-404-002');
    // La tabla de porcentajes sigue estando: no depende del historial.
    expect(screen.getByRole('group', { name: 'Porcentajes' })).toBeInTheDocument();
  });

  it('sin violaciones de accesibilidad', async () => {
    const { api } = renderDetalle();
    api.client.history.mockResolvedValue(primeraPagina);
    await screen.findByRole('list', { name: 'Historial' });

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
