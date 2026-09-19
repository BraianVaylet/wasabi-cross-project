import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG, errorCodeSchema, errorEnvelopeSchema, isErrorCode } from './error.ts';

describe('errorEnvelopeSchema', () => {
  it('acepta el envelope que manda la API, con o sin detalle por campo', () => {
    const base = {
      errorCode: 'WC-AUTH-401-004',
      message: 'Iniciá sesión para continuar.',
      requestId: 'req-1',
    };

    expect(errorEnvelopeSchema.safeParse(base).success).toBe(true);
    expect(
      errorEnvelopeSchema.safeParse({
        ...base,
        errorCode: 'WC-SYS-400-002',
        details: [{ path: 'value', message: 'Requerido' }],
      }).success,
    ).toBe(true);
  });

  it('rechaza un código que no sigue WC-<MÓDULO>-<HTTP>-<NNN>', () => {
    expect(
      errorEnvelopeSchema.safeParse({ errorCode: 'NOT_FOUND', message: 'x', requestId: 'r' })
        .success,
    ).toBe(false);
  });

  it('rechaza lo que no es un envelope, como el HTML de un proxy caído', () => {
    expect(errorEnvelopeSchema.safeParse('<html>502 Bad Gateway</html>').success).toBe(false);
    expect(errorEnvelopeSchema.safeParse({ error: 'Bad Gateway' }).success).toBe(false);
  });
});

describe('ERROR_CATALOG', () => {
  it.each(Object.entries(ERROR_CATALOG))(
    '%s tiene el formato, y su status es el HTTP de su nombre',
    (code, { status }) => {
      expect(errorCodeSchema.safeParse(code).success).toBe(true);
      expect(code.split('-')[2]).toBe(String(status));
    },
  );

  it('isErrorCode distingue un código del catálogo de uno inventado', () => {
    expect(isErrorCode('WC-AUTH-401-004')).toBe(true);
    expect(isErrorCode('WC-AUTH-401-999')).toBe(false);
  });
});
