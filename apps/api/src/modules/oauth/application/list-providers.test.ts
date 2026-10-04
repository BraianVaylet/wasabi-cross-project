import { oauthProvidersResponseSchema, type OauthProvider } from '@wasabi-cross/schemas';
import { describe, expect, it } from 'vitest';
import { listProviders } from './list-providers.ts';

describe('listProviders', () => {
  it('responde con la forma que el front espera, validada por el schema compartido', () => {
    const response = listProviders(new Set<OauthProvider>(['google', 'microsoft']));

    expect(oauthProvidersResponseSchema.parse(response)).toEqual({
      providers: [
        { id: 'google', label: 'Google' },
        { id: 'microsoft', label: 'Microsoft' },
      ],
    });
  });

  it('sin proveedores habilitados responde la lista vacía, no un error', () => {
    expect(listProviders(new Set())).toEqual({ providers: [] });
  });
});
