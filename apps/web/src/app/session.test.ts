import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type HttpClient } from '../lib/http.ts';
import { browserNavigation, createSessionClient } from './session.ts';

/** La navegación del navegador, en un doble: dónde está el front y a dónde se manda al usuario. */
function navigation() {
  return { origin: 'https://app.wasabi.example', assign: vi.fn<(url: string) => void>() };
}

const braian = { id: 'u1', email: 'braian@example.com', name: 'Braian', plan: 'free' } as const;

function httpWith(request: HttpClient['request']): HttpClient {
  return { request };
}

describe('la navegación del navegador', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('el origen y la navegación son los de la página donde está el front', () => {
    const assign = vi.fn<(url: string) => void>();
    vi.stubGlobal('location', { origin: 'https://app.wasabi.example', assign });
    const navigation = browserNavigation();

    expect(navigation.origin).toBe('https://app.wasabi.example');
    navigation.assign('https://accounts.google.com/o/oauth2/v2/auth');

    expect(assign).toHaveBeenCalledExactlyOnceWith('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('el origen se lee cuando se pide, no al armar el cliente', () => {
    vi.stubGlobal('location', { origin: 'https://uno.example', assign: vi.fn() });
    const navigation = browserNavigation();
    vi.stubGlobal('location', { origin: 'https://dos.example', assign: vi.fn() });

    expect(navigation.origin).toBe('https://dos.example');
  });
});

describe('cliente de sesión', () => {
  it('con sesión, devuelve el usuario de /me', async () => {
    const request = vi.fn().mockResolvedValue(braian);
    const session = createSessionClient(httpWith(request));

    await expect(session.current()).resolves.toEqual(braian);
    expect(request).toHaveBeenCalledWith(expect.anything(), '/api/v1/me');
  });

  it('sin sesión (401), no es un error: no hay usuario', async () => {
    const session = createSessionClient(
      httpWith(
        vi.fn().mockRejectedValue(new ApiError(401, 'WC-AUTH-401-004', 'Iniciá sesión', 'r1')),
      ),
    );

    await expect(session.current()).resolves.toBeNull();
  });

  it('cualquier otro error sí lo es: no se confunde con "sin sesión"', async () => {
    const caida = new ApiError(0, 'WC-SYS-503-004', 'Sin conexión', 'r1');
    const session = createSessionClient(httpWith(vi.fn().mockRejectedValue(caida)));

    await expect(session.current()).rejects.toBe(caida);
  });

  describe('proveedores de ingreso', () => {
    it('pide la lista a la API, sin sesión, y devuelve sólo los proveedores', async () => {
      const providers = [
        { id: 'google', label: 'Google' },
        { id: 'microsoft', label: 'Microsoft' },
      ];
      const request = vi.fn().mockResolvedValue({ providers });
      const session = createSessionClient(httpWith(request), navigation());

      await expect(session.providers()).resolves.toEqual(providers);
      expect(request).toHaveBeenCalledWith(expect.anything(), '/api/v1/oauth/providers');
    });
  });

  describe('entrar con un proveedor', () => {
    const urlDelProveedor = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=abc';

    it('pide la URL a Better Auth y navega a ella', async () => {
      const request = vi.fn().mockResolvedValue({ url: urlDelProveedor, redirect: true });
      const nav = navigation();
      const session = createSessionClient(httpWith(request), nav);

      await session.signInWithProvider('google', { redirect: '/perfil' });

      expect(request).toHaveBeenCalledWith(expect.anything(), '/api/auth/sign-in/social', {
        method: 'POST',
        body: {
          provider: 'google',
          // Absoluta y del front: la API puede estar en otro origen (en desarrollo lo está).
          callbackURL: 'https://app.wasabi.example/perfil',
          errorCallbackURL: 'https://app.wasabi.example/login',
        },
      });
      expect(nav.assign).toHaveBeenCalledExactlyOnceWith(urlDelProveedor);
    });

    it('sin redirect, vuelve a Home', async () => {
      const request = vi.fn().mockResolvedValue({ url: urlDelProveedor });
      const session = createSessionClient(httpWith(request), navigation());

      await session.signInWithProvider('microsoft');

      expect(request).toHaveBeenCalledWith(
        expect.anything(),
        '/api/auth/sign-in/social',
        expect.objectContaining({
          body: expect.objectContaining({
            provider: 'microsoft',
            callbackURL: 'https://app.wasabi.example/',
          }) as unknown,
        }),
      );
    });

    it.each(['//evil.example', 'https://evil.example', '/\\evil.example', '/login'])(
      'un redirect que no es una ruta interna (%s) se ignora: vuelve a Home',
      async (redirect) => {
        const request = vi.fn().mockResolvedValue({ url: urlDelProveedor });
        const session = createSessionClient(httpWith(request), navigation());

        await session.signInWithProvider('google', { redirect });

        expect(request).toHaveBeenCalledWith(
          expect.anything(),
          '/api/auth/sign-in/social',
          expect.objectContaining({
            body: expect.objectContaining({
              callbackURL: 'https://app.wasabi.example/',
            }) as unknown,
          }),
        );
      },
    );

    it('si la API falla, no navega y el error llega a quien lo pidió', async () => {
      const limite = new ApiError(429, 'WC-AUTH-429-003', 'Demasiados intentos.', 'r1');
      const nav = navigation();
      const session = createSessionClient(httpWith(vi.fn().mockRejectedValue(limite)), nav);

      await expect(session.signInWithProvider('google')).rejects.toBe(limite);
      expect(nav.assign).not.toHaveBeenCalled();
    });

    it.each([
      ['javascript:alert(1)'],
      ['data:text/html,<script>alert(1)</script>'],
      ['/relativa'],
      [''],
    ])('una URL que no es http(s) (%s) no se navega: es un contrato roto', async (url) => {
      const nav = navigation();
      const session = createSessionClient(
        httpWith(
          // El cliente HTTP real valida con el schema; este doble lo imita.
          vi.fn((schema: { parse: (value: unknown) => unknown }) =>
            Promise.resolve(schema.parse({ url })),
          ) as unknown as HttpClient['request'],
        ),
        nav,
      );

      await expect(session.signInWithProvider('google')).rejects.toThrow();
      expect(nav.assign).not.toHaveBeenCalled();
    });
  });

  it('cerrar sesión le pide a Better Auth que la invalide', async () => {
    const request = vi.fn().mockResolvedValue({ success: true });
    const session = createSessionClient(httpWith(request));

    await session.signOut();

    expect(request).toHaveBeenCalledWith(expect.anything(), '/api/auth/sign-out', {
      method: 'POST',
      body: {},
    });
  });
});
