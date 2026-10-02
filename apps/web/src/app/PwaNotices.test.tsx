import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSTALL_REMINDER_MS } from '../lib/install.ts';
import { braian, fakeSession, renderApp } from '../test/app.tsx';
import { serviceWorkerStub } from '../test/pwa-register-stub.ts';
import { PwaNotices } from './PwaNotices.tsx';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const DISMISSED_KEY = 'wc:install-dismissed-at';

/** El navegador ofrece instalar: dispara `beforeinstallprompt`, que sólo existe en Chromium. */
function ofrecerInstalacion(outcome: 'accepted' | 'dismissed' = 'accepted'): {
  evento: Event;
  prompt: ReturnType<typeof vi.fn>;
} {
  const prompt = vi.fn(() => Promise.resolve());
  const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
  act(() => {
    window.dispatchEvent(evento);
  });
  return { evento, prompt };
}

function abrirComoAppInstalada(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches: true, media: query }) as MediaQueryList,
  );
}

function usarIphone(): void {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
}

describe('aviso de nueva versión (F1-17, spec §5)', () => {
  afterEach(() => {
    serviceWorkerStub.reset();
  });

  it('sin versión nueva, no molesta', () => {
    render(<PwaNotices />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('con una versión nueva, avisa y ofrece actualizar', () => {
    serviceWorkerStub.needRefresh = true;

    render(<PwaNotices />);

    const aviso = screen.getByRole('status');
    expect(aviso).toHaveTextContent('Hay una versión nueva');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  it('actualizar le pide al service worker que tome el control', async () => {
    serviceWorkerStub.needRefresh = true;
    render(<PwaNotices />);

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(serviceWorkerStub.updates).toBe(1);
  });

  it('si se descarta, no vuelve a aparecer hasta la próxima versión', async () => {
    serviceWorkerStub.needRefresh = true;
    render(<PwaNotices />);

    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(serviceWorkerStub.updates).toBe(0);
  });

  it('se puede cerrar con el teclado, como cualquier aviso', async () => {
    serviceWorkerStub.needRefresh = true;
    render(<PwaNotices />);

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

describe('propuesta de instalación (spec §5)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    serviceWorkerStub.reset();
  });

  describe('en Chromium (Android, escritorio): el navegador ofrece instalar', () => {
    it('hasta que el navegador la ofrece, no hay nada que proponer', () => {
      render(<PwaNotices />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('cuando la ofrece, propone instalar con un popup', () => {
      render(<PwaNotices />);

      ofrecerInstalacion();

      const aviso = screen.getByRole('status', { name: 'Instalar la app' });
      expect(aviso).toHaveTextContent('Instalá Wasabi Cross');
      expect(screen.getByRole('button', { name: 'Instalar' })).toBeInTheDocument();
    });

    it('frena el mini-aviso del navegador: la propuesta es la del popup', () => {
      render(<PwaNotices />);

      const { evento } = ofrecerInstalacion();

      expect(evento.defaultPrevented).toBe(true);
    });

    it('"Instalar" abre el diálogo nativo y el popup se va', async () => {
      render(<PwaNotices />);
      const { prompt } = ofrecerInstalacion('accepted');

      await userEvent.click(screen.getByRole('button', { name: 'Instalar' }));

      expect(prompt).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('si cierra el diálogo nativo sin instalar, no se lo vuelve a proponer enseguida', async () => {
      const { unmount } = render(<PwaNotices />);
      ofrecerInstalacion('dismissed');
      await userEvent.click(screen.getByRole('button', { name: 'Instalar' }));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      unmount();

      // Recarga: el navegador vuelve a ofrecerla, pero el usuario ya dijo que no.
      render(<PwaNotices />);
      ofrecerInstalacion();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('"Ahora no" lo calla sin abrir el diálogo nativo', async () => {
      render(<PwaNotices />);
      const { prompt } = ofrecerInstalacion();

      await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(prompt).not.toHaveBeenCalled();
    });

    it('descartado, tampoco vuelve en la visita siguiente', async () => {
      const { unmount } = render(<PwaNotices />);
      ofrecerInstalacion();
      await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
      unmount();

      render(<PwaNotices />);
      ofrecerInstalacion();

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('pasado el plazo desde el "Ahora no", vuelve a proponer', () => {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now() - INSTALL_REMINDER_MS - 1));
      render(<PwaNotices />);

      ofrecerInstalacion();

      expect(screen.getByRole('status', { name: 'Instalar la app' })).toBeInTheDocument();
    });

    it('si ya la está usando instalada, no se la propone', () => {
      abrirComoAppInstalada();
      render(<PwaNotices />);

      ofrecerInstalacion();

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('si la instala por su cuenta (menú del navegador) con el popup abierto, se va', () => {
      render(<PwaNotices />);
      ofrecerInstalacion();
      expect(screen.getByRole('status')).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('al desmontarse deja de escuchar al navegador', () => {
      const alQuitar = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<PwaNotices />);

      unmount();

      const quitados = alQuitar.mock.calls.map(([tipo]) => tipo);
      expect(quitados).toContain('beforeinstallprompt');
      expect(quitados).toContain('appinstalled');
    });
  });

  describe('en iOS: no hay diálogo nativo, sólo se puede explicar cómo', () => {
    it('en una pestaña de Safari, explica cómo agregarla a la pantalla de inicio', () => {
      usarIphone();

      render(<PwaNotices />);

      const aviso = screen.getByRole('status', { name: 'Instalar la app' });
      expect(aviso).toHaveTextContent('Compartir');
      expect(aviso).toHaveTextContent('Agregar a inicio');
    });

    it('no tiene botón de instalar (no hay a qué llamar), sólo el de entendido', () => {
      usarIphone();

      render(<PwaNotices />);

      expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument();
    });

    it('con la app abierta desde la pantalla de inicio, no explica nada', () => {
      usarIphone();
      Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });

      render(<PwaNotices />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      Reflect.deleteProperty(window.navigator, 'standalone');
    });

    it('"Entendido" lo cierra y no vuelve en la visita siguiente', async () => {
      usarIphone();
      const { unmount } = render(<PwaNotices />);

      await userEvent.click(screen.getByRole('button', { name: 'Entendido' }));
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      unmount();

      render(<PwaNotices />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('con una versión nueva a la vez', () => {
    it('muestra un solo popup, y gana la versión nueva', () => {
      serviceWorkerStub.needRefresh = true;
      render(<PwaNotices />);

      ofrecerInstalacion();

      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(screen.getByRole('status', { name: 'Versión nueva disponible' })).toBeInTheDocument();
    });

    it('descartada la versión nueva, sigue la propuesta de instalación', async () => {
      serviceWorkerStub.needRefresh = true;
      render(<PwaNotices />);
      ofrecerInstalacion();

      await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));

      expect(screen.getByRole('status', { name: 'Instalar la app' })).toBeInTheDocument();
    });
  });
});
