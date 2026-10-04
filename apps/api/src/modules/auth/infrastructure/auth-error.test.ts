import { describe, expect, it } from 'vitest';
import { translateAuthError } from './auth-error.ts';

/*
 * Better Auth responde con su propio formato de error; acá se lo traduce al envelope único de la API.
 * Con el ingreso sólo por OAuth (F9-05) ya no hay credenciales que validar: un 401 no es "email o
 * contraseña incorrectos", y el texto de Better Auth —que habla de callbacks y de proveedores, en
 * inglés— no es algo para mostrarle a una persona.
 */

describe('translateAuthError', () => {
  it('un 401 sale como "Iniciá sesión", no como credenciales inválidas', () => {
    expect(translateAuthError(401, '{"message":"Unauthorized"}')).toEqual({
      errorCode: 'WC-AUTH-401-004',
      message: 'Iniciá sesión para continuar.',
    });
  });

  it('mapea 403, 404 y 429 a sus códigos del catálogo', () => {
    expect(translateAuthError(403, '{}').errorCode).toBe('WC-AUTH-403-002');
    expect(translateAuthError(404, '{}').errorCode).toBe('WC-SYS-404-003');
    expect(translateAuthError(429, '{}').errorCode).toBe('WC-AUTH-429-003');
  });

  it.each([401, 403, 404, 429])(
    'en un %i usa el mensaje del catálogo y no el de Better Auth',
    (status) => {
      const translated = translateAuthError(status, '{"message":"Provider not found: github"}');

      expect(translated.message).not.toContain('github');
      expect(translated.message).not.toContain('Provider');
    },
  );

  it.each([400, 422])('un %i sale genérico, sin repetir el texto de Better Auth', (status) => {
    expect(translateAuthError(status, '{"message":"Invalid callbackURL"}')).toEqual({
      errorCode: 'WC-SYS-400-002',
      message: 'Revisá los datos enviados.',
    });
  });

  it('un body que no es JSON no rompe la traducción', () => {
    expect(translateAuthError(400, '<html>502 Bad Gateway</html>').errorCode).toBe(
      'WC-SYS-400-002',
    );
    expect(translateAuthError(401, 'no es json').errorCode).toBe('WC-AUTH-401-004');
  });

  it('cualquier 5xx sale como error no controlado', () => {
    expect(translateAuthError(500, '{"message":"boom"}')).toEqual({
      errorCode: 'WC-SYS-500-001',
      message: 'Ocurrió un error. Compartí el código {code} con soporte.',
    });
  });
});
