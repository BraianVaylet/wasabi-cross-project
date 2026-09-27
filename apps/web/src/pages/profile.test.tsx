import type { UserPreferences } from '@wasabi-cross/schemas';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp, type FakeApi } from '../test/app.tsx';

const DEFAULT: UserPreferences = {
  loadPercentages: [65, 75, 80, 85, 90, 95],
};

function renderPerfil(preferences: UserPreferences = DEFAULT): FakeApi & { api: FakeApi } {
  const api = fakeApi();
  api.client.preferences.mockResolvedValue(preferences);
  api.client.savePreferences.mockImplementation((patch) =>
    Promise.resolve({
      loadPercentages: patch.loadPercentages ?? preferences.loadPercentages,
    }),
  );
  renderApp('/perfil', fakeSession(braian).client, api.client);
  return { ...api, api };
}

function campo(indice: number): HTMLElement {
  return screen.getByLabelText(`Porcentaje ${String(indice + 1)}`);
}

function campoAsync(indice: number): Promise<HTMLElement> {
  return screen.findByLabelText(`Porcentaje ${String(indice + 1)}`);
}

describe('Perfil: porcentajes por defecto (F1-16)', () => {
  describe('porcentajes por defecto', () => {
    it('muestra los guardados, uno por campo', async () => {
      renderPerfil();

      expect(await campoAsync(0)).toHaveValue('65');
      expect(campo(5)).toHaveValue('95');
    });

    it('un porcentaje repetido se marca en ese campo y no se guarda', async () => {
      const { api } = renderPerfil();
      await screen.findByLabelText('Porcentaje 1');

      await userEvent.clear(campo(2));
      await userEvent.type(campo(2), '65');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar porcentajes' }));

      expect(await screen.findByText('Ese porcentaje está repetido')).toBeInTheDocument();
      expect(campo(2)).toHaveAttribute('aria-invalid', 'true');
      expect(campo(0)).not.toHaveAttribute('aria-invalid');
      expect(api.client.savePreferences).not.toHaveBeenCalled();
    });

    it('se agregan, se quitan y se guardan', async () => {
      const { api } = renderPerfil({ loadPercentages: [70, 80] });
      await screen.findByLabelText('Porcentaje 1');

      await userEvent.click(screen.getByRole('button', { name: 'Agregar porcentaje' }));
      await userEvent.type(campo(2), '90');
      await userEvent.click(screen.getByRole('button', { name: 'Quitar el porcentaje 1' }));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar porcentajes' }));

      await waitFor(() => {
        expect(api.client.savePreferences).toHaveBeenCalledWith({ loadPercentages: [80, 90] });
      });
      expect(await screen.findByRole('status')).toHaveTextContent('Guardamos tus porcentajes');
    });

    it('si la API rechaza el cambio, lo dice con su código', async () => {
      const { api } = renderPerfil();
      api.client.savePreferences.mockRejectedValueOnce(
        new ApiError(400, 'WC-SYS-400-002', 'Revisá los datos enviados.', 'req-1'),
      );
      await screen.findByLabelText('Porcentaje 1');

      await userEvent.click(screen.getByRole('button', { name: 'Guardar porcentajes' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Revisá los datos enviados.');
      expect(alert).toHaveTextContent('WC-SYS-400-002');
    });
  });

  it('sin violaciones de accesibilidad', async () => {
    renderPerfil();
    await screen.findByLabelText('Porcentaje 1');

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
