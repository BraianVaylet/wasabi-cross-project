import { describe, expect, it } from 'vitest';
import { isExposedAuthRoute } from './auth-route-policy.ts';

/*
 * Qué rutas de Better Auth llegan a la red (F9-05, ADR-0012). Better Auth trae un montón de
 * endpoints de cuenta —cambiar el email, borrar al usuario, listar y desvincular cuentas, poner una
 * contraseña— que Wasabi no usa y que no tienen por qué estar abiertos: con el ingreso sólo por
 * OAuth, la lista de lo que se expone es corta y explícita, y todo lo demás es un 404.
 */

describe('isExposedAuthRoute — lo que sí se expone', () => {
  it.each([
    ['POST', '/sign-in/social'],
    ['GET', '/callback/google'],
    ['GET', '/callback/microsoft'],
    ['GET', '/callback/fake-idp'],
    ['POST', '/sign-out'],
    ['GET', '/get-session'],
  ])('%s %s', (method, path) => {
    expect(isExposedAuthRoute(method, path)).toBe(true);
  });
});

describe('isExposedAuthRoute — el email y la contraseña ya no son un camino de entrada', () => {
  it.each([
    ['POST', '/sign-up/email'],
    ['POST', '/sign-in/email'],
    ['POST', '/forget-password'],
    ['POST', '/reset-password'],
    ['GET', '/reset-password/un-token'],
    ['POST', '/change-password'],
    ['POST', '/set-password'],
    ['POST', '/send-verification-email'],
    ['GET', '/verify-email'],
  ])('%s %s responde como una ruta inexistente', (method, path) => {
    expect(isExposedAuthRoute(method, path)).toBe(false);
  });
});

describe('isExposedAuthRoute — los endpoints de cuenta que Wasabi no usa', () => {
  it.each([
    ['POST', '/update-user'],
    ['POST', '/delete-user'],
    ['GET', '/delete-user/callback'],
    ['POST', '/change-email'],
    ['POST', '/link-social'],
    ['POST', '/unlink-account'],
    ['GET', '/list-accounts'],
    ['GET', '/list-sessions'],
    ['POST', '/revoke-session'],
    ['POST', '/revoke-sessions'],
    ['POST', '/revoke-other-sessions'],
    ['POST', '/refresh-token'],
    ['POST', '/get-access-token'],
    ['GET', '/account-info'],
    ['POST', '/sign-in/anonymous'],
    ['GET', '/error'],
    ['GET', '/ok'],
  ])('%s %s', (method, path) => {
    expect(isExposedAuthRoute(method, path)).toBe(false);
  });
});

describe('isExposedAuthRoute — el método cuenta', () => {
  it.each([
    ['GET', '/sign-in/social'],
    ['PUT', '/sign-in/social'],
    ['DELETE', '/sign-in/social'],
    ['GET', '/sign-out'],
    ['POST', '/get-session'],
    ['POST', '/callback/google'],
    ['DELETE', '/callback/google'],
  ])('%s %s no se expone', (method, path) => {
    expect(isExposedAuthRoute(method, path)).toBe(false);
  });
});

describe('isExposedAuthRoute — variantes de la ruta', () => {
  it.each([
    '/sign-in/social/',
    '//sign-in/social',
    '/sign-in//social',
    '/Sign-In/Social',
    '/sign-in/social/extra',
    '/sign-in/social?x=1',
    '/sign-in/social#hash',
    '/sign-in/%73ocial',
    '/callback/',
    '/callback',
    '/callback/google/extra',
    '/callback/../sign-up/email',
    '/callback/go ogle',
    '/callback/google;x',
    '',
    '/',
  ])('%j no se expone: sólo vale la ruta exacta', (path) => {
    expect(isExposedAuthRoute('POST', path)).toBe(false);
    expect(isExposedAuthRoute('GET', path)).toBe(false);
  });

  it('un proveedor con un id raro no cuela otra ruta por el comodín del callback', () => {
    expect(isExposedAuthRoute('GET', '/callback/x/../../sign-up/email')).toBe(false);
    expect(isExposedAuthRoute('GET', '/callback/%2e%2e/sign-up/email')).toBe(false);
  });
});
