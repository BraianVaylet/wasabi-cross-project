import type {
  ExerciseList,
  LogRecordResponse,
  ManagedExerciseSummary,
  RecordHistory,
} from '@wasabi-cross/schemas';
import { screen, waitFor, within } from '@testing-library/react';
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

const historial: RecordHistory = {
  records: [{ id: 'rec_1', value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' }],
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
  best: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
  nextCursor: null,
};

const guardada: LogRecordResponse = {
  record: { id: 'rec_2', value: 105, unit: 'kg', performedAt: '2026-07-10T12:00:00.000Z' },
  current: { value: 105, unit: 'kg', performedAt: '2026-07-10T12:00:00.000Z' },
  best: { value: 105, unit: 'kg', performedAt: '2026-07-10T12:00:00.000Z' },
};

function lista(exercises: ManagedExerciseSummary[]): ExerciseList {
  return {
    exercises,
    usage: { plan: 'free', total: exercises.length, custom: 0, maxTotal: 10, maxCustom: 3 },
  };
}

interface Opciones {
  /**
   * El historial responde una sola vez. Lo que se ve después de eso es obra del rollback y
   * no de un pedido nuevo, que es justo lo que hay que probar.
   */
  historialCongelado?: boolean;
}

function renderDetalle(
  id = 'mex_a1b2c3d4',
  exercises = [backSquat, carrera],
  { historialCongelado = false }: Opciones = {},
) {
  const api = fakeApi(lista(exercises));
  if (historialCongelado) {
    api.client.history
      .mockResolvedValueOnce(historial)
      .mockReturnValue(new Promise(() => undefined));
  } else {
    api.client.history.mockResolvedValue(historial);
  }
  const app = renderApp(`/ejercicios/${id}`, fakeSession(braian).client, api.client);
  return { api, ...app };
}

async function abrirModal(nombreBoton = 'Nuevo RM'): Promise<HTMLElement> {
  const boton = await screen.findByRole('button', { name: nombreBoton });
  await userEvent.click(boton);
  await screen.findByRole('dialog', { name: nombreBoton });
  return boton;
}

async function completar(valor: string, fecha = '2026-07-10'): Promise<void> {
  await userEvent.type(screen.getByLabelText('RM (kg)'), valor);
  await userEvent.type(screen.getByLabelText('Fecha'), fecha);
}

describe('Cargar una marca nueva (F1-14, mockup 11)', () => {
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

  describe('el modal', () => {
    it('se llama "Nuevo RM" en fuerza y "Nueva marca" en el resto (mockup 12)', async () => {
      renderDetalle();
      expect(await screen.findByRole('button', { name: 'Nuevo RM' })).toBeInTheDocument();

      renderDetalle('mex_z9y8x7w6');
      expect(await screen.findByRole('button', { name: 'Nueva marca' })).toBeInTheDocument();
    });

    it('Escape lo cierra y el foco vuelve al botón que lo abrió', async () => {
      renderDetalle();
      const boton = await abrirModal();

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(boton).toHaveFocus();
    });

    it('Cancelar también lo cierra, sin guardar nada', async () => {
      const { api } = renderDetalle();
      await abrirModal();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.client.logRecord).not.toHaveBeenCalled();
    });

    it('pide el valor en la unidad del ejercicio', async () => {
      renderDetalle('mex_z9y8x7w6');
      await abrirModal('Nueva marca');

      expect(screen.getByLabelText('Tiempo (mm:ss)')).toBeInTheDocument();
    });
  });

  describe('guardar', () => {
    it('la marca aparece en el historial antes de que responda la API', async () => {
      const { api } = renderDetalle();
      // La API no responde: lo que se ve mientras tanto es la marca optimista.
      api.client.logRecord.mockReturnValue(new Promise(() => undefined));
      await abrirModal();

      await completar('105');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      const marcas = within(await screen.findByRole('list', { name: 'Historial' })).getAllByRole(
        'listitem',
      );
      expect(within(fila(marcas, 0)).getByText('105 kg')).toBeInTheDocument();
      expect(within(fila(marcas, 0)).getByText('10/07/2026')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('manda el valor y la fecha, y vuelve a pedir la lista para el valor actual', async () => {
      const { api } = renderDetalle();
      api.client.logRecord.mockResolvedValue(guardada);
      await abrirModal();
      // Después de abrir el modal: la pantalla ya pidió lo suyo, y eso no cuenta.
      const llamadas = api.client.listExercises.mock.calls.length;
      const historiales = api.client.history.mock.calls.length;

      await completar('105');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      await waitFor(() => {
        expect(api.client.logRecord).toHaveBeenCalledTimes(1);
      });
      const [id, input] = api.client.logRecord.mock.calls[0] ?? [];
      expect(id).toBe('mex_a1b2c3d4');
      expect(input?.value).toBe(105);
      // Mediodía local: a medianoche un huso negativo mandaría la marca al día anterior.
      expect(input?.performedAt).toMatch(/^2026-07-10T/);
      expect(input?.notes).toBeUndefined();
      // El valor actual y la mejor marca salen de la API: las dos consultas quedaron viejas.
      await waitFor(() => {
        expect(api.client.listExercises.mock.calls.length).toBeGreaterThan(llamadas);
      });
      await waitFor(() => {
        expect(api.client.history.mock.calls.length).toBeGreaterThan(historiales);
      });
    });

    it('los comentarios viajan; sin fecha, la marca es de hoy', async () => {
      const { api } = renderDetalle();
      api.client.logRecord.mockReturnValue(new Promise(() => undefined));
      await abrirModal();

      await userEvent.type(screen.getByLabelText('RM (kg)'), '110');
      await userEvent.type(screen.getByLabelText('Comentarios (opcional)'), 'Con cinturón');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      await waitFor(() => {
        expect(api.client.logRecord).toHaveBeenCalledTimes(1);
      });
      const [, input] = api.client.logRecord.mock.calls[0] ?? [];
      expect(input).toEqual({ value: 110, notes: 'Con cinturón' });

      // Sin fecha elegida, la marca optimista se muestra con la de hoy.
      const marcas = within(await screen.findByRole('list', { name: 'Historial' })).getAllByRole(
        'listitem',
      );
      expect(within(fila(marcas, 0)).getByText('110 kg')).toBeInTheDocument();
      const hoy = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      expect(within(fila(marcas, 0)).getByText(hoy)).toBeInTheDocument();
    });

    it('si la API la rechaza, la marca optimista desaparece y se muestra el motivo', async () => {
      const { api } = renderDetalle('mex_a1b2c3d4', [backSquat, carrera], {
        historialCongelado: true,
      });
      api.client.logRecord.mockRejectedValue(
        new ApiError(422, 'WC-RM-422-001', 'El valor cargado no es válido.', 'req-1'),
      );
      await abrirModal();

      await completar('105');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('El valor cargado no es válido.');
      expect(alert).toHaveTextContent('WC-RM-422-001');

      const marcas = within(screen.getByRole('list', { name: 'Historial' })).getAllByRole(
        'listitem',
      );
      expect(marcas).toHaveLength(1);
      expect(within(fila(marcas, 0)).getByText('100 kg')).toBeInTheDocument();
    });

    it('un tiempo mal escrito se frena en el formulario', async () => {
      const { api } = renderDetalle('mex_z9y8x7w6');
      await abrirModal('Nueva marca');

      await userEvent.type(screen.getByLabelText('Tiempo (mm:ss)'), '4:72');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(await screen.findByText('Escribilo como mm:ss, por ejemplo 4:32')).toBeInTheDocument();
      expect(api.client.logRecord).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('sin valor no se guarda', async () => {
      const { api } = renderDetalle();
      await abrirModal();

      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(api.client.logRecord).not.toHaveBeenCalled();
    });
  });

  it('sin violaciones de accesibilidad con el modal abierto', async () => {
    renderDetalle();
    await abrirModal();

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
