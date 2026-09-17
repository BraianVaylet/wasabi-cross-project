import { describe, expect, it } from 'vitest';
import { translateAuthError } from './auth-error.ts';

describe('translateAuthError', () => {
  it('un 401 de Better Auth sale como WC-AUTH-401-001 con el mensaje del catálogo', () => {
    expect(translateAuthError(401, '{"message":"Invalid email or password"}')).toEqual({
      errorCode: 'WC-AUTH-401-001',
      message: 'Email o contraseña incorrectos.',
    });
  });

  it('descarta el mensaje de Better Auth en un 401: no puede filtrar si el email existe', () => {
    const translated = translateAuthError(401, '{"message":"User not found"}');

    expect(translated.message).not.toContain('User not found');
  });

  it('mapea 403 y 429 a sus códigos del catálogo', () => {
    expect(translateAuthError(403, '{}').errorCode).toBe('WC-AUTH-403-002');
    expect(translateAuthError(429, '{}').errorCode).toBe('WC-AUTH-429-003');
  });

  it('en un 4xx de validación conserva el mensaje, que es lo que el usuario necesita', () => {
    expect(translateAuthError(422, '{"message":"Password too short"}')).toEqual({
      errorCode: 'WC-SYS-400-002',
      message: 'Password too short',
    });
  });

  it('si el 4xx no trae mensaje usable, cae al mensaje genérico', () => {
    expect(translateAuthError(400, '{}').message).toBe('Revisá los datos enviados.');
    expect(translateAuthError(400, '{"message":""}').message).toBe('Revisá los datos enviados.');
    expect(translateAuthError(400, '{"message":42}').message).toBe('Revisá los datos enviados.');
  });

  it('un body que no es JSON no rompe la traducción', () => {
    expect(translateAuthError(400, '<html>502 Bad Gateway</html>').errorCode).toBe(
      'WC-SYS-400-002',
    );
  });

  it('cualquier 5xx sale como error no controlado', () => {
    expect(translateAuthError(500, '{"message":"boom"}')).toEqual({
      errorCode: 'WC-SYS-500-001',
      message: 'Ocurrió un error. Compartí el código {code} con soporte.',
    });
  });
});
