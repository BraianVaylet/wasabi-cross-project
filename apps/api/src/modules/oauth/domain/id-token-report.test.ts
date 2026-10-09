import { describe, expect, it } from 'vitest';
import { MICROSOFT_CONSUMER_TENANT_ID } from './microsoft-claims.ts';
import { describeIdToken, formatIdTokenReport } from './id-token-report.ts';

/*
 * El informe de un ID token de Microsoft (F9-10): qué claims trae y qué decidiría la API con ellos,
 * sin mostrar ningún valor personal. Es lo que se usa con una cuenta real de Outlook para saber si
 * su email llega verificado antes de dar por buena la cuenta (ADR-0012).
 */

const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const PAST = Math.floor(Date.now() / 1000) - 3600;

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', typ: 'JWT', kid: 'clave-1' })}.${encode(claims)}.firma`;
}

const personal = {
  iss: `https://login.microsoftonline.com/${MICROSOFT_CONSUMER_TENANT_ID}/v2.0`,
  aud: CLIENT_ID,
  tid: MICROSOFT_CONSUMER_TENANT_ID,
  oid: '00000000-0000-0000-4a5b-6c7d8e9f0a1b',
  sub: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  name: 'Ana Pérez',
  email: 'ana.perez@outlook.com',
  exp: FUTURE,
};

describe('describeIdToken', () => {
  describe('qué cuenta es', () => {
    it('una cuenta personal: el tid es el de las cuentas de consumo', () => {
      const report = describeIdToken(jwt(personal), { clientId: CLIENT_ID });

      expect(report.decodable).toBe(true);
      expect(report.account).toBe('personal');
      expect(report.tenantId).toBe(MICROSOFT_CONSUMER_TENANT_ID);
    });

    it('una de trabajo o escuela: otro tid', () => {
      const report = describeIdToken(
        jwt({ ...personal, tid: '5d2f1c0e-7b1a-4c3e-9a55-0f6e8d3b7a21' }),
        { clientId: CLIENT_ID },
      );

      expect(report.account).toBe('organizacion');
    });

    it('sin tid, no se sabe', () => {
      const { tid: _tid, ...sinTid } = personal;

      expect(describeIdToken(jwt(sinTid), { clientId: CLIENT_ID }).account).toBe('desconocida');
    });
  });

  describe('si el email llega verificado, con la misma regla que Better Auth', () => {
    it('con email_verified en true, verificado', () => {
      const report = describeIdToken(jwt({ ...personal, email_verified: true }), {
        clientId: CLIENT_ID,
      });

      expect(report.emailVerified).toEqual({
        verified: true,
        because: 'email_verified es true',
      });
    });

    it('con email_verified en false, no verificado, aunque verified_primary_email lo incluya', () => {
      const report = describeIdToken(
        jwt({
          ...personal,
          email_verified: false,
          verified_primary_email: ['ana.perez@outlook.com'],
        }),
        { clientId: CLIENT_ID },
      );

      expect(report.emailVerified.verified).toBe(false);
    });

    it('sin email_verified, con verified_primary_email que incluye el email, verificado', () => {
      const report = describeIdToken(
        jwt({ ...personal, verified_primary_email: ['ana.perez@outlook.com'] }),
        { clientId: CLIENT_ID },
      );

      expect(report.emailVerified).toEqual({
        verified: true,
        because: 'verified_primary_email incluye el email',
      });
    });

    it('con verified_secondary_email que lo incluye, verificado', () => {
      const report = describeIdToken(
        jwt({ ...personal, verified_secondary_email: ['ana.perez@outlook.com'] }),
        { clientId: CLIENT_ID },
      );

      expect(report.emailVerified).toEqual({
        verified: true,
        because: 'verified_secondary_email incluye el email',
      });
    });

    it('con verified_primary_email de otro email, no verificado', () => {
      const report = describeIdToken(
        jwt({ ...personal, verified_primary_email: ['otra@outlook.com'] }),
        { clientId: CLIENT_ID },
      );

      expect(report.emailVerified.verified).toBe(false);
    });

    it('sin ningún claim de verificación, no verificado: la cuenta no se crearía', () => {
      const report = describeIdToken(jwt(personal), { clientId: CLIENT_ID });

      expect(report.emailVerified).toEqual({
        verified: false,
        because:
          'el token no trae email_verified ni verified_primary_email ni verified_secondary_email',
      });
    });

    it('sin email, no verificado', () => {
      const { email: _email, ...sinEmail } = personal;
      const report = describeIdToken(jwt({ ...sinEmail, verified_primary_email: ['x@y.com'] }), {
        clientId: CLIENT_ID,
      });

      expect(report.emailVerified.verified).toBe(false);
      expect(report.emailVerified.because).toContain('no trae email');
    });
  });

  describe('qué claims trae', () => {
    it('lista los nombres, ordenados, y marca los que importan', () => {
      const report = describeIdToken(
        jwt({ ...personal, verified_primary_email: ['ana.perez@outlook.com'] }),
        { clientId: CLIENT_ID },
      );

      expect(report.claimNames).toEqual([...report.claimNames].sort());
      expect(report.claimNames).toContain('verified_primary_email');
      expect(report.present).toMatchObject({
        email: true,
        email_verified: false,
        verified_primary_email: true,
        verified_secondary_email: false,
        oid: true,
        sub: true,
      });
    });

    it('nunca devuelve el valor de un claim personal', () => {
      const report = describeIdToken(
        jwt({ ...personal, verified_primary_email: ['ana.perez@outlook.com'] }),
        { clientId: CLIENT_ID },
      );

      const serialized = JSON.stringify(report);
      for (const secreto of ['ana.perez@outlook.com', 'Ana Pérez', personal.oid, personal.sub]) {
        expect(serialized).not.toContain(secreto);
      }
    });
  });

  describe('lo que chequea la API del token', () => {
    it('el iss y el aud corresponden', () => {
      const report = describeIdToken(jwt(personal), { clientId: CLIENT_ID });

      expect(report.issuerMatches).toBe(true);
      expect(report.audienceMatches).toBe(true);
    });

    it('un aud de otro cliente no corresponde', () => {
      const report = describeIdToken(jwt({ ...personal, aud: 'otro-cliente' }), {
        clientId: CLIENT_ID,
      });

      expect(report.audienceMatches).toBe(false);
    });

    it('un iss de otro tenant no corresponde', () => {
      const report = describeIdToken(
        jwt({
          ...personal,
          iss: 'https://login.microsoftonline.com/5d2f1c0e-7b1a-4c3e-9a55-0f6e8d3b7a21/v2.0',
        }),
        { clientId: CLIENT_ID },
      );

      expect(report.issuerMatches).toBe(false);
    });

    it('sin el id de cliente para comparar, no se afirma nada del aud', () => {
      const report = describeIdToken(jwt(personal), {});

      expect(report.audienceMatches).toBeNull();
    });

    it('un token vencido se avisa', () => {
      expect(describeIdToken(jwt({ ...personal, exp: PAST }), {}).expired).toBe(true);
      expect(describeIdToken(jwt(personal), {}).expired).toBe(false);
      const { exp: _exp, ...sinExp } = personal;
      expect(describeIdToken(jwt(sinExp), {}).expired).toBeNull();
    });
  });

  describe('lo que no es un ID token', () => {
    it.each([
      ['vacío', ''],
      ['sin puntos', 'esto-no-es-un-jwt'],
      ['un payload que no es JSON', 'aaa.bbb.ccc'],
      ['un payload que no es un objeto', `x.${Buffer.from('"texto"').toString('base64url')}.y`],
    ])('%s: no se puede decodificar', (_nombre, token) => {
      const report = describeIdToken(token, { clientId: CLIENT_ID });

      expect(report.decodable).toBe(false);
      expect(report.claimNames).toEqual([]);
    });

    it('tolera espacios y saltos de línea alrededor, como queda al pegarlo', () => {
      const report = describeIdToken(`  \n${jwt(personal)}\n  `, { clientId: CLIENT_ID });

      expect(report.decodable).toBe(true);
    });
  });
});

describe('formatIdTokenReport', () => {
  const verified = {
    ...personal,
    verified_primary_email: ['ana.perez@outlook.com'],
  };

  it('dice, en una pantalla, qué cuenta es, qué claims trae y qué haría la API', () => {
    const text = formatIdTokenReport(describeIdToken(jwt(verified), { clientId: CLIENT_ID }));

    expect(text).toContain('Cuenta: personal');
    expect(text).toContain('verified_primary_email');
    expect(text).toContain('La API CREARÍA la cuenta');
    expect(text).toContain('verified_primary_email incluye el email');
  });

  it('sin claims de verificación, dice que NO la crearía y por qué', () => {
    const text = formatIdTokenReport(describeIdToken(jwt(personal), { clientId: CLIENT_ID }));

    expect(text).toContain('La API NO crearía la cuenta');
    expect(text).toContain('no trae email_verified ni verified_primary_email');
  });

  it('no deja pasar ningún valor personal', () => {
    const text = formatIdTokenReport(describeIdToken(jwt(verified), { clientId: CLIENT_ID }));

    for (const secreto of ['ana.perez@outlook.com', 'Ana Pérez', personal.oid, personal.sub]) {
      expect(text).not.toContain(secreto);
    }
  });

  it('avisa cuando el token no coincide con lo que la API exige', () => {
    const text = formatIdTokenReport(
      describeIdToken(jwt({ ...verified, aud: 'otro', exp: PAST }), { clientId: CLIENT_ID }),
    );

    expect(text).toContain('Audiencia (aud): NO corresponde');
    expect(text).toContain('VENCIDO');
  });

  it('un texto que no es un ID token se dice sin más', () => {
    const text = formatIdTokenReport(describeIdToken('basura', {}));

    expect(text).toContain('no es un ID token');
  });
});
