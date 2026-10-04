import { describe, expect, it } from 'vitest';
import {
  MICROSOFT_CONSUMER_TENANT_ID,
  decodeIdTokenClaims,
  isConsumerMicrosoftToken,
} from './microsoft-claims.ts';

const AUTHORITY = 'https://login.microsoftonline.com';
const CLIENT_ID = 'client-de-wasabi';
const ORGANIZATION_TENANT = '5d2f1c0e-7b1a-4c3e-9a55-0f6e8d3b7a21';

const expected = { authority: AUTHORITY, clientId: CLIENT_ID };

function consumerClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tid: MICROSOFT_CONSUMER_TENANT_ID,
    iss: `${AUTHORITY}/${MICROSOFT_CONSUMER_TENANT_ID}/v2.0`,
    aud: CLIENT_ID,
    oid: 'abc',
    ...overrides,
  };
}

function jwt(payload: unknown): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part(payload)}.firma`;
}

describe('isConsumerMicrosoftToken — sólo cuentas personales, aunque llegue por el endpoint consumers', () => {
  it('acepta el token de una cuenta personal, para este cliente y con su issuer', () => {
    expect(isConsumerMicrosoftToken(consumerClaims(), expected)).toBe(true);
  });

  it('rechaza una cuenta de trabajo o escuela: su tid es el de una organización', () => {
    const claims = consumerClaims({
      tid: ORGANIZATION_TENANT,
      iss: `${AUTHORITY}/${ORGANIZATION_TENANT}/v2.0`,
    });

    expect(isConsumerMicrosoftToken(claims, expected)).toBe(false);
  });

  it('rechaza un tid personal con el issuer de otra organización: el iss tiene que nombrar al tid', () => {
    const claims = consumerClaims({ iss: `${AUTHORITY}/${ORGANIZATION_TENANT}/v2.0` });

    expect(isConsumerMicrosoftToken(claims, expected)).toBe(false);
  });

  it('rechaza un issuer de otro servidor, aunque el tid sea el personal', () => {
    const claims = consumerClaims({
      iss: `https://evil.example.com/${MICROSOFT_CONSUMER_TENANT_ID}/v2.0`,
    });

    expect(isConsumerMicrosoftToken(claims, expected)).toBe(false);
  });

  it('rechaza un token emitido para otro cliente', () => {
    expect(isConsumerMicrosoftToken(consumerClaims({ aud: 'otra-app' }), expected)).toBe(false);
  });

  it('acepta una audiencia en lista si incluye a este cliente, y rechaza la que no', () => {
    expect(isConsumerMicrosoftToken(consumerClaims({ aud: ['x', CLIENT_ID] }), expected)).toBe(
      true,
    );
    expect(isConsumerMicrosoftToken(consumerClaims({ aud: ['x', 'y'] }), expected)).toBe(false);
  });

  it.each([
    ['sin tid', { tid: undefined }],
    ['sin iss', { iss: undefined }],
    ['sin aud', { aud: undefined }],
    ['con un tid que no es texto', { tid: 123 }],
    ['con un iss que no es texto', { iss: { url: 'x' } }],
  ])('rechaza un token %s', (_name, overrides) => {
    expect(isConsumerMicrosoftToken(consumerClaims(overrides), expected)).toBe(false);
  });

  it('con otra authority (el IdP falso de desarrollo) el iss se compara contra ésa', () => {
    const authority = 'http://127.0.0.1:3102';
    const claims = consumerClaims({ iss: `${authority}/${MICROSOFT_CONSUMER_TENANT_ID}/v2.0` });

    expect(isConsumerMicrosoftToken(claims, { authority, clientId: CLIENT_ID })).toBe(true);
    expect(isConsumerMicrosoftToken(claims, expected)).toBe(false);
  });

  it('ignora una barra final en la authority', () => {
    expect(
      isConsumerMicrosoftToken(consumerClaims(), {
        authority: `${AUTHORITY}/`,
        clientId: CLIENT_ID,
      }),
    ).toBe(true);
  });
});

describe('decodeIdTokenClaims', () => {
  it('lee los claims del payload de un JWT', () => {
    expect(decodeIdTokenClaims(jwt({ tid: 'x', oid: 'y' }))).toEqual({ tid: 'x', oid: 'y' });
  });

  it.each([
    ['vacío', ''],
    ['sin tres partes', 'una.dos'],
    ['con un payload que no es base64 de un JSON', 'a.@@@.c'],
    ['con un payload que es JSON pero no un objeto', jwt('texto')],
    ['con un payload que es null', jwt(null)],
    ['con un payload que es una lista', jwt(['a'])],
  ])('devuelve null si el token es %s', (_name, token) => {
    expect(decodeIdTokenClaims(token)).toBeNull();
  });
});
