import { describe, expect, it } from 'vitest';
import { NAVIGATE_FALLBACK_DENYLIST } from './pwa-config.ts';

/*
 * Qué navegaciones NO contesta el service worker con el shell de la app (F9-05, ADR-0012).
 *
 * Workbox contesta toda navegación con `index.html`, para que las rutas del front anden sin
 * conexión. El callback de OAuth es una navegación —el proveedor redirige al navegador a
 * `/api/auth/callback/<id>`—: con la PWA activa, el service worker le devolvía el shell y la API
 * jamás veía el código, así que no se abría la sesión (lo mostró el E2E de producción). Workbox
 * compara cada regla contra `pathname + search`.
 */

const denied = (path: string) => NAVIGATE_FALLBACK_DENYLIST.some((rule) => rule.test(path));

describe('NAVIGATE_FALLBACK_DENYLIST — lo que tiene que llegar a la API', () => {
  it.each([
    '/api/auth/callback/google',
    '/api/auth/callback/microsoft',
    '/api/auth/callback/fake-idp',
    '/api/auth/callback/google?code=abc&state=xyz',
    '/api/auth/sign-in/social',
    '/api/auth/sign-out',
    '/api/v1/me',
    '/api/v1/oauth/providers',
    '/docs',
    '/docs/',
    '/docs/json',
    '/docs/static/swagger-ui-bundle.js',
  ])('%s va a la red', (path) => {
    expect(denied(path)).toBe(true);
  });
});

describe('NAVIGATE_FALLBACK_DENYLIST — lo que sigue siendo del front', () => {
  it.each([
    '/',
    '/login',
    '/login?redirect=%2Fejercicios',
    '/login?error=access_denied',
    '/ejercicios',
    '/ejercicios/nuevo',
    '/ejercicios/mex_abc123',
    '/estadisticas',
    '/perfil',
    '/suscripcion',
    // Empiezan parecido, pero no son /api ni /docs.
    '/apis',
    '/api',
    '/apuntes',
    '/docs-de-entrenamiento',
    '/documentos',
  ])('%s lo contesta el service worker', (path) => {
    expect(denied(path)).toBe(false);
  });
});
