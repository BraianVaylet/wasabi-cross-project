import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { createApp, shouldRetry } from './create-app.ts';

describe('política de reintentos', () => {
  it('un 4xx no se reintenta: no se arregla solo', () => {
    expect(shouldRetry(0, new ApiError(404, 'WC-EXO-404-002', 'No está.', 'r'))).toBe(false);
    expect(shouldRetry(0, new ApiError(401, 'WC-AUTH-401-004', 'Sin sesión.', 'r'))).toBe(false);
  });

  it('sin red o con la API caída, se reintenta hasta dos veces', () => {
    const caida = new ApiError(0, 'WC-SYS-503-004', 'Sin conexión.', 'r');

    expect(shouldRetry(0, caida)).toBe(true);
    expect(shouldRetry(1, new ApiError(500, 'WC-SYS-500-001', 'Error.', 'r'))).toBe(true);
    expect(shouldRetry(2, caida)).toBe(false);
  });
});

describe('createApp', () => {
  it('sin history explícito, usa el del navegador', () => {
    const { router } = createApp({
      session: { current: vi.fn(() => Promise.resolve(null)), signOut: vi.fn() },
    });

    expect(router.history.location.pathname).toBe(window.location.pathname);
  });
});
