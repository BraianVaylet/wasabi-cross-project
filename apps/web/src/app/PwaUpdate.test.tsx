import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { braian, fakeSession, renderApp } from '../test/app.tsx';
import { serviceWorkerStub } from '../test/pwa-register-stub.ts';
import { PwaUpdate } from './PwaUpdate.tsx';

describe('aviso de nueva versión (F1-17, spec §5)', () => {
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

  afterEach(() => {
    serviceWorkerStub.reset();
  });

  it('sin versión nueva, no molesta', () => {
    render(<PwaUpdate />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('con una versión nueva, avisa y ofrece actualizar', () => {
    serviceWorkerStub.needRefresh = true;

    render(<PwaUpdate />);

    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent('Hay una versión nueva');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  it('actualizar le pide al service worker que tome el control', async () => {
    serviceWorkerStub.needRefresh = true;
    render(<PwaUpdate />);

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(serviceWorkerStub.updates).toBe(1);
  });

  it('si se descarta, no vuelve a aparecer hasta la próxima versión', async () => {
    serviceWorkerStub.needRefresh = true;
    render(<PwaUpdate />);

    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(serviceWorkerStub.updates).toBe(0);
  });

  it('se puede cerrar con el teclado, como cualquier aviso', async () => {
    serviceWorkerStub.needRefresh = true;
    render(<PwaUpdate />);

    screen.getByRole('button', { name: 'Ahora no' }).focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('aparece esté donde esté el usuario, no sólo en una pantalla', async () => {
    serviceWorkerStub.needRefresh = true;

    renderApp('/', fakeSession(braian).client);

    await screen.findByRole('heading', { name: 'Tus ejercicios' });
    // Por nombre: en Home también hay un `status`, el de la lista cargando.
    expect(screen.getByRole('status', { name: 'Versión nueva disponible' })).toHaveTextContent(
      'Hay una versión nueva',
    );
  });
});
