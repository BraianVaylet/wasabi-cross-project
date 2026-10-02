import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INSTALL_REMINDER_MS,
  isInstalled,
  isIosDevice,
  rememberInstallDismissal,
  wasInstallDismissedRecently,
} from './install.ts';

function mockDisplayMode(standalone: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) => ({ matches: standalone, media: query }) as MediaQueryList,
  );
}

function setIosStandalone(value: boolean | undefined): void {
  Object.defineProperty(window.navigator, 'standalone', { value, configurable: true });
}

describe('¿está instalada la app? (spec §5)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window.navigator, 'standalone');
  });

  it('en una pestaña del navegador, no', () => {
    mockDisplayMode(false);

    expect(isInstalled(window)).toBe(false);
  });

  it('abierta como app (display-mode instalado), sí', () => {
    mockDisplayMode(true);

    expect(isInstalled(window)).toBe(true);
  });

  it('en iOS no hay display-mode: lo dice navigator.standalone', () => {
    mockDisplayMode(false);
    setIosStandalone(true);

    expect(isInstalled(window)).toBe(true);
  });

  it('navigator.standalone en false (iOS, pestaña de Safari) no cuenta como instalada', () => {
    mockDisplayMode(false);
    setIosStandalone(false);

    expect(isInstalled(window)).toBe(false);
  });

  it('pregunta por todos los modos con los que se abre una PWA instalada', () => {
    const spy = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation((query) => ({ matches: false, media: query }) as MediaQueryList);

    isInstalled(window);

    const consulta = spy.mock.calls[0]?.[0];
    for (const modo of ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay']) {
      expect(consulta).toContain(`(display-mode: ${modo})`);
    }
  });
});

describe('¿es un dispositivo iOS?', () => {
  it.each([
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15', 5],
    ['iPad viejo', 'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15', 5],
    // Desde iPadOS 13 el iPad se presenta como una Mac, pero con pantalla táctil.
    ['iPadOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5],
  ])('%s, sí', (_nombre, userAgent, maxTouchPoints) => {
    expect(isIosDevice({ userAgent, maxTouchPoints })).toBe(true);
  });

  it.each([
    [
      'una Mac de verdad (sin pantalla táctil)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      0,
    ],
    ['Android', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130', 5],
    ['Windows', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130', 0],
  ])('%s, no', (_nombre, userAgent, maxTouchPoints) => {
    expect(isIosDevice({ userAgent, maxTouchPoints })).toBe(false);
  });
});

describe('el "Ahora no" del aviso de instalación', () => {
  const ahora = Date.UTC(2026, 9, 2);

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sin nada guardado, no se descartó', () => {
    expect(wasInstallDismissedRecently(window.localStorage, ahora)).toBe(false);
  });

  it('descartado hoy, queda callado', () => {
    rememberInstallDismissal(window.localStorage, ahora);

    expect(wasInstallDismissedRecently(window.localStorage, ahora + 1000)).toBe(true);
  });

  it('pasado el plazo, vuelve a avisar', () => {
    rememberInstallDismissal(window.localStorage, ahora);

    expect(wasInstallDismissedRecently(window.localStorage, ahora + INSTALL_REMINDER_MS - 1)).toBe(
      true,
    );
    expect(wasInstallDismissedRecently(window.localStorage, ahora + INSTALL_REMINDER_MS)).toBe(
      false,
    );
  });

  it('un valor guardado que no es una fecha se ignora', () => {
    window.localStorage.setItem('wc:install-dismissed-at', 'basura');

    expect(wasInstallDismissedRecently(window.localStorage, ahora)).toBe(false);
  });

  it('sin acceso al almacenamiento (modo privado, datos bloqueados), la app sigue andando', () => {
    const roto = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };

    expect(wasInstallDismissedRecently(roto, ahora)).toBe(false);
    expect(() => {
      rememberInstallDismissal(roto, ahora);
    }).not.toThrow();
  });
});
