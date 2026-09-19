import { describe, expect, it, vi } from 'vitest';
import { ApiError, type HttpClient } from '../lib/http.ts';
import { createSessionClient } from './session.ts';

const braian = { id: 'u1', email: 'braian@example.com', name: 'Braian', plan: 'free' } as const;

function httpWith(request: HttpClient['request']): HttpClient {
  return { request };
}

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
