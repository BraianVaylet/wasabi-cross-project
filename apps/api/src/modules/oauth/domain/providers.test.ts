import { oauthProviderSchema, type OauthProvider } from '@wasabi-cross/schemas';
import { describe, expect, it } from 'vitest';
import { DISPLAY_ORDER, providersFrom } from './providers.ts';

describe('providersFrom', () => {
  it('todo proveedor del schema tiene su lugar en el orden: sumar uno no lo deja sin botón', () => {
    expect([...DISPLAY_ORDER].sort()).toEqual([...oauthProviderSchema.options].sort());
  });

  it('lista sólo los proveedores habilitados, cada uno con su nombre de botón', () => {
    expect(providersFrom(new Set<OauthProvider>(['google']))).toEqual([
      { id: 'google', label: 'Google' },
    ]);
    expect(providersFrom(new Set<OauthProvider>(['microsoft']))).toEqual([
      { id: 'microsoft', label: 'Microsoft' },
    ]);
  });

  it('sin ninguno habilitado, la lista está vacía', () => {
    expect(providersFrom(new Set())).toEqual([]);
  });

  it('siempre en el mismo orden, sin importar en qué orden se habilitaron', () => {
    const habilitados = new Set<OauthProvider>(['fake-idp', 'microsoft', 'google']);

    expect(providersFrom(habilitados).map((provider) => provider.id)).toEqual([
      'google',
      'microsoft',
      'fake-idp',
    ]);
  });

  it('el IdP de desarrollo se nombra distinto: no se confunde con un proveedor de verdad', () => {
    const [devIdp] = providersFrom(new Set<OauthProvider>(['fake-idp']));

    expect(devIdp?.label).toBe('Ingreso de desarrollo');
  });
});
