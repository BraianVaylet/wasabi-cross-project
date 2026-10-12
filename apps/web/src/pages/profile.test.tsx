import type { UserPreferences } from '@wasabi-cross/schemas';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import {
  braian,
  braianConFoto,
  fakeApi,
  fakeSession,
  renderApp,
  type FakeApi,
} from '../test/app.tsx';

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

describe('Perfil: la cuenta, con foto o con iniciales (F9-08)', () => {
  const PHOTO_URL = '/api/v1/me/photo';

  async function abrirPerfil(
    user = braian,
    options: { photoUrl?: string } = {},
  ): Promise<HTMLElement> {
    renderApp('/perfil', fakeSession(user).client, fakeApi().client, options);
    await screen.findByRole('heading', { name: 'Perfil' });
    return screen.getByRole('region', { name: 'Tu cuenta' });
  }

  it('arriba de todo: la foto, el nombre y el email', async () => {
    const cuenta = await abrirPerfil(braianConFoto);

    expect(within(cuenta).getByText('Braian')).toBeInTheDocument();
    expect(within(cuenta).getByText('braian@example.com')).toBeInTheDocument();
    expect(cuenta.querySelector('img')).toHaveAttribute('src', PHOTO_URL);
  });

  it('la foto se pide a la API, a la ruta sin id: no hay forma de pedir la de otro', async () => {
    const cuenta = await abrirPerfil(braianConFoto);

    const src = cuenta.querySelector('img')?.getAttribute('src') ?? '';
    expect(src).toBe(PHOTO_URL);
    expect(src).not.toContain(braianConFoto.id);
  });

  it('con la API en otro origen (desarrollo), la foto se pide a esa API', async () => {
    const cuenta = await abrirPerfil(braianConFoto, {
      photoUrl: 'http://127.0.0.1:3100/api/v1/me/photo',
    });

    expect(cuenta.querySelector('img')).toHaveAttribute(
      'src',
      'http://127.0.0.1:3100/api/v1/me/photo',
    );
  });

  it('sin foto: las iniciales, y no se pide ninguna imagen', async () => {
    const cuenta = await abrirPerfil(braian);

    expect(within(cuenta).getByText('B')).toBeInTheDocument();
    expect(cuenta.querySelector('img')).toBeNull();
  });

  it('las iniciales son las de las dos primeras palabras del nombre', async () => {
    const cuenta = await abrirPerfil({ ...braian, name: 'Ana María García' });

    expect(within(cuenta).getByText('AM')).toBeInTheDocument();
  });

  it('si la foto falla al cargar (la API contesta 404), cae a las iniciales sin dejar un ícono roto', async () => {
    const cuenta = await abrirPerfil(braianConFoto);
    const foto = cuenta.querySelector('img');
    if (!foto) {
      throw new Error('La cuenta con foto no mostró la imagen');
    }

    fireEvent.error(foto);

    await waitFor(() => {
      expect(cuenta.querySelector('img')).toBeNull();
    });
    expect(within(cuenta).getByText('B')).toBeInTheDocument();
  });

  it('el nombre y el email se leen: la foto es decorativa, no el único dato', async () => {
    const cuenta = await abrirPerfil(braianConFoto);

    expect(cuenta.querySelector('img')).toHaveAttribute('alt', '');
    expect(cuenta).toHaveTextContent('Braian');
    expect(cuenta).toHaveTextContent('braian@example.com');
  });

  it.each([
    ['con foto', braianConFoto],
    ['con iniciales', braian],
  ])('sin violaciones de accesibilidad %s', async (_nombre, user) => {
    await abrirPerfil(user);
    await screen.findByLabelText('Porcentaje 1');

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
