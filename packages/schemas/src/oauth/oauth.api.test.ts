import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG, type ErrorCode } from '../common/error.ts';
import {
  oauthErrorFor,
  oauthProviderInfoSchema,
  oauthProviderSchema,
  oauthProvidersResponseSchema,
} from './oauth.api.ts';

describe('oauthProviderSchema', () => {
  it.each(['google', 'microsoft', 'fake-idp'])('acepta %s', (provider) => {
    expect(oauthProviderSchema.parse(provider)).toBe(provider);
  });

  it.each(['github', 'Google', '', 'credential', 'email'])('rechaza %j', (provider) => {
    expect(oauthProviderSchema.safeParse(provider).success).toBe(false);
  });
});

describe('oauthProvidersResponseSchema', () => {
  it('es la lista de proveedores habilitados, cada uno con su id y su nombre', () => {
    const response = {
      providers: [
        { id: 'google', label: 'Google' },
        { id: 'microsoft', label: 'Microsoft' },
      ],
    };

    expect(oauthProvidersResponseSchema.parse(response)).toEqual(response);
  });

  it('acepta la lista vacía: sin proveedores no hay con qué entrar, y el front lo avisa', () => {
    expect(oauthProvidersResponseSchema.parse({ providers: [] })).toEqual({ providers: [] });
  });

  it('rechaza un proveedor con campos de más, como el id de cliente', () => {
    expect(
      oauthProviderInfoSchema.safeParse({ id: 'google', label: 'Google', clientId: 'abc' }).success,
    ).toBe(false);
    expect(
      oauthProvidersResponseSchema.safeParse({
        providers: [{ id: 'google', label: 'Google', clientSecret: 'shh' }],
      }).success,
    ).toBe(false);
  });

  it('rechaza un proveedor sin nombre o con un id que no existe', () => {
    expect(oauthProviderInfoSchema.safeParse({ id: 'google', label: '' }).success).toBe(false);
    expect(oauthProviderInfoSchema.safeParse({ id: 'github', label: 'GitHub' }).success).toBe(
      false,
    );
  });
});

describe('oauthErrorFor', () => {
  it('traduce la cancelación en el proveedor', () => {
    expect(oauthErrorFor('access_denied')).toBe('WC-OAUTH-400-001');
  });

  it('traduce el email que ya tiene cuenta con el otro proveedor', () => {
    expect(oauthErrorFor('account_not_linked')).toBe('WC-OAUTH-409-003');
  });

  it.each([
    // Los que Better Auth pone en el redirect del callback.
    'state_mismatch',
    'invalid_code',
    'no_code',
    'email_not_verified',
    'email_not_found',
    'unable_to_get_user_info',
    'unable_to_create_user',
    'issuer_mismatch',
    'oauth_provider_not_found',
    // Lo que no es un código de Better Auth.
    'algo_que_nunca_vimos',
    '',
    'ACCESS_DENIED',
  ])('manda %j al código genérico', (value) => {
    expect(oauthErrorFor(value)).toBe('WC-OAUTH-400-002');
  });

  it.each([undefined, null, 42, ['access_denied'], { error: 'access_denied' }])(
    'un parámetro que no es un texto (%j) también es el genérico',
    (value) => {
      expect(oauthErrorFor(value)).toBe('WC-OAUTH-400-002');
    },
  );

  it('nunca devuelve el texto recibido: un `error` armado por otro no llega a la pantalla', () => {
    const hostile = '<script>alert(1)</script>';

    expect(oauthErrorFor(hostile)).not.toContain('script');
    expect(oauthErrorFor(hostile)).toBe('WC-OAUTH-400-002');
  });

  it('cada resultado es un código del catálogo, con su mensaje para el usuario', () => {
    const values = ['access_denied', 'account_not_linked', 'cualquier otra cosa'];

    for (const value of values) {
      const code: ErrorCode = oauthErrorFor(value);
      expect(ERROR_CATALOG[code].userMessage.length).toBeGreaterThan(0);
    }
  });
});

describe('códigos WC-OAUTH-* del catálogo', () => {
  it.each([
    ['WC-OAUTH-400-001', 400],
    ['WC-OAUTH-400-002', 400],
    ['WC-OAUTH-409-003', 409],
  ] as const)('%s responde %i', (code, status) => {
    expect(ERROR_CATALOG[code].status).toBe(status);
  });
});
